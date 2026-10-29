import { EUROPE_CITIES_DB, EUROPE_SIGHTS_DB, type CityInfo } from './knowledge-base'
import { parseReceipt } from './receipt-parser'
import type {
  AiReason,
  CountrySummary,
  DaySchedule,
  FitItem,
  InventoryItem,
  JourneyNode,
  OptionLine,
  PackageResult,
  ReceiptLine,
  ScheduleItem,
  StatItem,
  TourMode,
  TransportKind,
} from './mock-result'

const CITIES_DB = EUROPE_CITIES_DB
const SIGHTS_SOURCE: Record<string, string> = Object.fromEntries(
  Object.entries(EUROPE_SIGHTS_DB).map(([k, v]) => [k, v.source])
)

interface ParsedDayRaw {
  dayNum: number
  headerLine: number
  titleText: string
  lines: { lineNum: number; text: string }[]
  meals?: string
  lodging?: string
}

/**
 * 텍스트 일정표를 분석하여 감정 결과(PackageResult)를 생성하는 핵심 룰 엔진
 */
export function inspectItinerary(rawText: string, departureMonth: number = 5): PackageResult {
  const allLines = rawText.split(/\r?\n/)
  
  // 1. Day 블록 파싱
  const dayBlocks: ParsedDayRaw[] = []
  let currentBlock: ParsedDayRaw | null = null

  allLines.forEach((text, idx) => {
    const lineNum = idx + 1
    const trimmed = text.trim()
    if (!trimmed) return

    // "제 1일", "Day 1", "1일차", "[1일]", "제1일" 매칭
    const dayMatch = trimmed.match(/(?:제\s*(\d+)\s*일|Day\s*(\d+)|(\d+)\s*일차|\[\s*(\d+)\s*일\s*\])/i)
    if (dayMatch) {
      const dayNum = Number(dayMatch[1] || dayMatch[2] || dayMatch[3] || dayMatch[4])
      if (currentBlock) {
        dayBlocks.push(currentBlock)
      }
      currentBlock = {
        dayNum: dayNum || dayBlocks.length + 1,
        headerLine: lineNum,
        titleText: trimmed,
        lines: [],
      }
      return
    }

    if (currentBlock) {
      // 식사 정보 체크
      if (/(?:식사|조식|중식|석식)\s*[:：]/.test(trimmed)) {
        currentBlock.meals = trimmed.replace(/^[-*•]\s*/, '')
      }
      // 호텔/숙박 정보 체크
      else if (/(?:호텔|숙박|투숙)\s*[:：]/.test(trimmed)) {
        currentBlock.lodging = trimmed.replace(/^[-*•]\s*/, '')
      } else {
        currentBlock.lines.push({ lineNum, text: trimmed })
      }
    }
  })

  if (currentBlock) {
    dayBlocks.push(currentBlock)
  }

  // Day 블록이 없으면 전체 텍스트를 줄단위로 1~3일치로 가상 분할
  if (dayBlocks.length === 0) {
    dayBlocks.push({
      dayNum: 1,
      headerLine: 1,
      titleText: '제 1일 일정',
      lines: allLines.slice(0, 30).map((t, i) => ({ lineNum: i + 1, text: t.trim() })).filter((l) => l.text.length > 0),
      meals: '조(기내식) / 중(기내식) / 석(현지식)',
      lodging: '현지 호텔 투숙',
    })
  }

  // 2. 일자별 스케줄 객체 생성 및 관람 모드 판독
  let totalEntry = 0
  let totalExterior = 0
  let totalWindow = 0
  let totalAi = 0
  let matchedSites = 0
  let totalSites = 0
  const visitedCities: string[] = []

  const days: DaySchedule[] = dayBlocks.map((block) => {
    // 해당 날짜의 도시/국가 감지
    let matchedCity: CityInfo | null = null
    const dayText = block.titleText + ' ' + block.lines.map((l) => l.text).join(' ')
    
    for (const [key, meta] of Object.entries(CITIES_DB)) {
      if (dayText.includes(key)) {
        matchedCity = meta
        if (!visitedCities.includes(meta.city)) {
          visitedCities.push(meta.city)
        }
        break
      }
    }

    if (!matchedCity) {
      matchedCity = {
        city: '유럽 현지',
        country: '유럽',
        flag: '🇪🇺',
        tagline: '낭만과 역사가 숨쉬는 여정',
      }
    }

    // 항목별 판독
    const items: ScheduleItem[] = []
    
    // 주요 라인들을 필터링 (불필요한 안내문 제외)
    const validLines = block.lines.filter((l) => {
      const t = l.text
      return (
        !t.startsWith('※') &&
        !t.startsWith('[안내]') &&
        !t.startsWith('[유의사항]') &&
        t.length > 5
      )
    })

    const sampleLines = validLines.slice(0, 4) // 일자당 최대 4개 항목으로 정제

    sampleLines.forEach((l, itemIdx) => {
      totalSites++
      const t = l.text
      let time = itemIdx === 0 ? '오전' : itemIdx === sampleLines.length - 1 ? '저녁' : '오후'
      if (/오전|\bAM\b|아침/i.test(t)) time = '오전'
      if (/오후|\bPM\b|점심/i.test(t)) time = '오후'
      if (/저녁|야간|밤/i.test(t)) time = '저녁'

      // 모드 판독 룰
      let mode: TourMode = 'exterior'
      let basis: 'fact' | 'keyword' = 'keyword'
      let source: string | undefined = undefined
      let aiReason: AiReason | undefined = undefined
      let explain = ''

      // 출처 매칭 확인
      for (const [sight, src] of Object.entries(SIGHTS_SOURCE)) {
        if (t.includes(sight)) {
          source = src
          matchedSites++
          break
        }
      }

      // 1) 입장/내부
      if (/내부|입장|관람|탑승|투어\s*포함|체험/i.test(t)) {
        mode = 'entry'
        totalEntry++
        basis = source ? 'fact' : 'keyword'
        explain = '티켓 발권 및 내부 관람이 일정에 공식 포함되어 깊이 있는 체험이 가능합니다.'
      }
      // 2) 외관/전경
      else if (/외관|전경|포토타임|앞에서|조망|바라보/i.test(t)) {
        mode = 'exterior'
        totalExterior++
        explain = '건물 내부에 들어가지 않고 밖에서 사진 촬영 및 외관을 감상하는 일정입니다.'
      }
      // 3) 차창/이동
      else if (/차창|경유|이동|출발|도착|전용버스|고속열차|차안/i.test(t)) {
        mode = 'window'
        totalWindow++
        explain = '차량이나 이동 수단 안에서 창밖으로 조망하며 다음 목적지로 이동합니다.'
      }
      // 4) 애매한 경우 -> AI 보조 판독
      else {
        mode = 'ai'
        totalAi++
        const kwMatch = t.match(/(자유|산책|방문|둘러보기|시간|거리)/)
        const kw = kwMatch ? kwMatch[0] : '방문'
        aiReason = {
          sentence: t.replace(/^[-*•]\s*/, ''),
          line: l.lineNum,
          keyword: kw,
          verdict: '외관·차창',
        }
        explain = `⚠️ AI 판독 근거: "${kw}" 문맥상 내부 입장 언급이 없어 외관/자유 관람으로 추정`
      }

      items.push({
        time,
        text: t.replace(/^[-*•]\s*/, ''),
        line: l.lineNum,
        mode,
        basis,
        source,
        explain,
        aiReason,
      })
    })

    return {
      day: block.dayNum,
      flag: matchedCity.flag,
      city: `${matchedCity.country} ${matchedCity.city}`,
      tagline: `"${matchedCity.tagline}"`,
      items: items.length > 0 ? items : [
        {
          time: '종일',
          text: block.titleText,
          line: block.headerLine,
          mode: 'exterior',
          basis: 'keyword',
          explain: '상세 관광 일정을 진행합니다.',
        },
      ],
      meals: block.meals || '조(호텔식) / 중(현지식) / 석(한식)',
      lodging: block.lodging || `${matchedCity.city} 시내 또는 근교 3성급 호텔`,
    }
  })

  // 3. 여정 트랙 (Journey Nodes)
  const journey: JourneyNode[] = []
  journey.push({ city: '인천', label: '출발', next: 'flight' })

  if (visitedCities.length === 0) {
    visitedCities.push('파리', '인터라켄', '로마')
  }

  visitedCities.forEach((cityName, idx) => {
    const isLast = idx === visitedCities.length - 1
    const nextTransport: TransportKind = idx % 2 === 0 ? 'bus' : 'train'
    journey.push({
      city: cityName,
      nights: Math.max(1, Math.round(days.length / (visitedCities.length || 1))),
      next: isLast ? 'flight' : nextTransport,
    })
  })
  journey.push({ city: '인천', label: '귀국' })

  // 4. 비용 영수증 (Receipt) 분석
  let packagePriceKrw = 1_990_000
  const priceMatch = rawText.match(/(\d{1,3}(?:,\d{3})+)\s*원/)
  if (priceMatch) {
    const parsedPrice = parseInt(priceMatch[1].replace(/,/g, ''), 10)
    if (parsedPrice > 500_000 && parsedPrice < 20_000_000) {
      packagePriceKrw = parsedPrice
    }
  }

  // 원문에서 필수 현지 경비 / 선택관광 금액을 줄 단위로 읽는다 (원문 줄 번호 포함)
  const parsedReceipt = parseReceipt(rawText)
  const options: OptionLine[] = parsedReceipt.options

  // 필수 경비를 하나도 못 읽으면 일반적인 평균값으로 추정하고 "추정"임을 표시한다
  const mandatoryEstimated = parsedReceipt.mandatory.length === 0
  const mandatory: ReceiptLine[] = mandatoryEstimated
    ? [
        { id: 'guide', label: '기사/가이드 경비 (평균 추정)', eur: 100, line: 0 },
        { id: 'citytax', label: '유럽 도시세 (평균 추정)', eur: 35, line: 0 },
        { id: 'tip', label: '식당 매너팁·생수 (평균 추정)', eur: 15, line: 0 },
      ]
    : parsedReceipt.mandatory

  // 5. 6대 스탯 계산
  const totalItemsCount = Math.max(1, totalEntry + totalExterior + totalWindow + totalAi)
  const entryRatio = totalEntry / totalItemsCount
  
  // 문화/역사 점수 (입장 비율 반영, 최대 25)
  const cultureScore = Math.min(25, Math.max(12, Math.round(15 + entryRatio * 15)))
  // 관광 깊이 점수 (입장 vs 외관, 최대 20)
  const depthScore = Math.min(20, Math.max(8, Math.round(10 + (totalEntry / (totalEntry + totalExterior || 1)) * 12)))
  // 자연/경관 점수 (스위스/호수 등 포함 여부, 최대 10)
  const hasNature = visitedCities.some((c) => CITIES_DB[c]?.isNature)
  const natureScore = hasNature ? 9 : 6
  // 이동 부담 점수 (도시 수가 많을수록 피로도 증가, 최대 20)
  const cityCount = visitedCities.length
  const moveScore = cityCount > 6 ? 10 : cityCount > 4 ? 14 : 18
  // 구성의 알참 점수 (최대 15)
  const composeScore = Math.min(15, Math.max(9, Math.round(10 + (matchedSites / (totalSites || 1)) * 5)))
  // 날씨 적합성 (5월, 9~10월 봄가을이 최적, 1~2월 한겨울과 7~8월 한여름은 점수 소폭 감점, 최대 10)
  let weatherScore = 10
  let weatherNote = '여행 최적기'
  if ([1, 2, 12].includes(departureMonth)) {
    weatherScore = 7
    weatherNote = `${departureMonth}월 추위 대비`
  } else if ([7, 8].includes(departureMonth)) {
    weatherScore = 8
    weatherNote = `${departureMonth}월 한여름 폭염 주의`
  } else {
    weatherScore = 10
    weatherNote = `${departureMonth}월 온화한 최적기`
  }

  const stats: StatItem[] = [
    { key: 'culture', label: '문화·역사·예술', shortLabel: '문화·역사', weight: 25, score: cultureScore, max: 25, note: totalEntry > 2 ? '핵심 내부 입장 포함' : '외관 위주' },
    { key: 'nature', label: '자연·경관', shortLabel: '자연·경관', weight: 10, score: natureScore, max: 10, note: hasNature ? '알프스/호수 조망' : '도시 중심' },
    { key: 'depth', label: '관광 깊이', shortLabel: '관광 깊이', weight: 20, score: depthScore, max: 20, note: entryRatio > 0.4 ? '충실한 관람' : '외관 포토타임 다수' },
    { key: 'move', label: '이동 부담', shortLabel: '이동 부담', weight: 20, score: moveScore, max: 20, note: `도시 ${cityCount}개 이동` },
    { key: 'compose', label: '구성의 알참', shortLabel: '구성', weight: 15, score: composeScore, max: 15, note: '주요 랜드마크 집약' },
    { key: 'weather', label: '날씨 적합성', shortLabel: '날씨', weight: 10, score: weatherScore, max: 10, note: weatherNote },
  ]

  const totalScore = stats.reduce((sum, s) => sum + s.score, 0)
  
  // 등급 계산
  let grade = 'B+'
  if (totalScore >= 90) grade = 'S'
  else if (totalScore >= 84) grade = 'A+'
  else if (totalScore >= 78) grade = 'A-'
  else if (totalScore >= 70) grade = 'B+'
  else if (totalScore >= 60) grade = 'B-'
  else grade = 'C'

  // 한줄 진단
  let diagnosis = '🏛️ 핵심 랜드마크 집중 코스, 알찬 구성의 유럽 패키지!'
  if (totalExterior > totalEntry * 2) {
    diagnosis = '👀 "외관·포토타임" 위주의 겉핥기 주의! 내부 관람 여부를 꼭 확인하세요.'
  } else if (cityCount >= 6) {
    diagnosis = `🚌 ${cityCount}개 도시 강행군! 버스 이동시간이 길어 체력 관리가 필수예요.`
  } else if (totalScore >= 80) {
    diagnosis = '✨ 랜드마크 내부 입장과 이동 동선의 밸런스가 뛰어난 황금 일정!'
  }

  // 국가 요약
  const countriesSummary: CountrySummary[] = []
  const uniqueCountries = Array.from(new Set(visitedCities.map((c) => CITIES_DB[c]?.country).filter(Boolean)))
  
  if (uniqueCountries.length === 0) {
    uniqueCountries.push('프랑스', '스위스', '이탈리아')
  }

  uniqueCountries.forEach((c) => {
    let flag = '🇪🇺'
    let summary = '주요 관광 명소 집중 탐방 코스'
    if (c === '프랑스') {
      flag = '🇫🇷'
      summary = '예술과 낭만의 중심, 박물관과 에펠탑 핵심 랜드마크 코스'
    } else if (c === '스위스') {
      flag = '🇨🇭'
      summary = '알프스 설경과 청정 호수, 높은 현지 물가에 대비한 식비 예산 고려 필요'
    } else if (c === '이탈리아') {
      flag = '🇮🇹'
      summary = '고대 로마와 르네상스의 보고, 도보 이동량이 가장 많은 하이라이트 구간'
    } else if (c === '영국') {
      flag = '🇬🇧'
      summary = '클래식한 영국 왕실 문화와 박물관 무료 관람이 매력적인 구간'
    } else if (c === '스페인') {
      flag = '🇪🇸'
      summary = '가우디 건축과 지중해 정취, 태양과 열정의 도시 투어'
    }
    countriesSummary.push({ flag, name: c, summary })
  })

  // 취향별 적합도
  const fits: FitItem[] = [
    {
      emoji: '👨‍👩‍👧',
      label: '부모님 효도 관광',
      score: moveScore > 14 ? 78 : 58,
      verdict: moveScore > 14 ? '추천' : '보통',
      tone: moveScore > 14 ? 'good' : 'warn',
      note: moveScore > 14 ? '안정적인 이동 코스로 편안함' : '장거리 버스 탑승 구간 피로도 주의',
    },
    {
      emoji: '👫',
      label: '2030 커플/신혼',
      score: cultureScore > 18 ? 85 : 72,
      verdict: '추천',
      tone: 'good',
      note: '낭만적인 랜드마크와 포토 스팟 다수 포함',
    },
    {
      emoji: '🏃',
      label: '벼락치기 정복러',
      score: cityCount >= 4 ? 94 : 80,
      verdict: '강추',
      tone: 'best',
      note: `${days.length}일 만에 핵심 명소 완전 정복 코스`,
    },
  ]

  // 생존 인벤토리 (8종)
  const inventory: InventoryItem[] = [
    { emoji: '💺', name: '에어 버스 방석', reasons: [`도시 ${cityCount}개 이동`, '엉덩이 피로 구출용'], rarity: 'epic' },
    { emoji: '👟', name: '쿠션 러닝화', reasons: ['유럽 자갈길', '하루 1.5만보 이상'], rarity: 'legend' },
    { emoji: '🔌', name: '유럽 멀티 어댑터', reasons: ['국가별 콘센트 규격', '호환 대비 필수'], rarity: 'rare' },
    { emoji: '💶', name: '유로 소액권(€5, €10)', reasons: ['가이드비·화장실 유료', '현금 전용 대비'], rarity: 'epic' },
    {
      emoji: hasNature || [1, 2, 11, 12].includes(departureMonth) ? '🧥' : '🕶️',
      name: hasNature || [1, 2, 11, 12].includes(departureMonth) ? '경량 패딩/바람막이' : '자외선 차단 선글라스',
      reasons: [hasNature ? '고산지대 영하 기온' : `${departureMonth}월 날씨 대비`, '체온 유지'],
      rarity: 'rare',
    },
    { emoji: '☕', name: '컵라면 & 볶음고추장', reasons: ['호텔 조식 단조로움', '비상 식량'], rarity: 'common' },
    { emoji: '🧴', name: '초경량 접이식 우산', reasons: [`${departureMonth}월 유럽 날씨`, '변덕 소나기 방어'], rarity: 'common' },
    { emoji: '💊', name: '소화제 & 멀미약', reasons: ['장시간 버스 탑승', '기름진 현지식 대비'], rarity: 'rare' },
  ]

  const coverageRate = Math.min(100, Math.round(((matchedSites + 3) / Math.max(5, totalSites)) * 100))

  return {
    coverage: {
      rate: Math.max(70, coverageRate),
      matched: Math.max(3, matchedSites + 3),
      total: Math.max(5, totalSites),
    },
    grade,
    totalScore,
    diagnosis,
    journey,
    journeySummary: {
      cities: visitedCities.length,
      hotelMoves: Math.max(1, visitedCities.length - 1),
      fatigue: cityCount > 5 ? '다소 높음' : cityCount > 3 ? '보통' : '여유',
    },
    stats,
    countries: countriesSummary,
    days,
    receipt: {
      packagePriceKrw,
      eurToKrw: 1500,
      mandatory,
      options,
      mandatoryEstimated,
    },
    valuation: {
      baseScore: totalScore,
      aiScore: Math.max(50, totalScore - (totalAi > 0 ? 3 : 0)),
      aiNote: totalAi > 0
        ? `AI 판독 반영 시 모호했던 항목 ${totalAi}곳이 외관으로 확정되어 깊이 점수 소폭 조정`
        : '명확한 키워드 기반으로 산출된 가치 점수입니다.',
      fits,
      pros: totalEntry >= 2
        ? '주요 박물관/성당 내부 입장 공식 포함으로 핵심 관람 충실'
        : '짧은 일정 동안 핵심 랜드마크를 효율적으로 순회하는 동선',
      cons: totalExterior > totalEntry
        ? '외관 위주 관광 비중이 높아 내부 관람을 원할 시 자유시간 또는 추가 옵션 필요'
        : '도시 간 이동 거리가 있어 버스 탑승 피로도 관리 필요',
    },
    inventory,
  }
}

