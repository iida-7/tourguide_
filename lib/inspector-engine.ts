import { EUROPE_CITIES_DB, EUROPE_SIGHTS_DB, type CityInfo } from './knowledge-base'
import { classifyVisit, tagVerdict, type VisitVerdict } from './itinerary-preprocess'
import { cardName, collectAirportCodes, extractSightName, findCityKey, structureDay, type CardDraft, type CityLine } from './itinerary-structure'
import { DEFAULT_PACKAGE_PRICE_KRW, extractPackagePrice } from './money-parser'
import { buildMandatory, parseReceipt } from './receipt-parser'
import type {
  AiReason,
  Basis,
  CountrySummary,
  DaySchedule,
  DaySection,
  FitItem,
  InventoryItem,
  JourneyNode,
  Notice,
  OptionLine,
  PackageResult,
  ReceiptLine,
  ScheduleItem,
  SourceLine,
  StatItem,
  TourMode,
  TransportKind,
} from './mock-result'

const PRICE_RANGE_LABEL = '50만~2,000만원'

const CITIES_DB = EUROPE_CITIES_DB
const SIGHTS_SOURCE: Record<string, string> = Object.fromEntries(
  Object.entries(EUROPE_SIGHTS_DB).map(([k, v]) => [k, v.source])
)
const SIGHT_KEYS = Object.keys(SIGHTS_SOURCE)
const CITY_KEYS = Object.keys(CITIES_DB)
const DEFAULT_MEALS = '조(호텔식) / 중(현지식) / 석(한식)'

/** 여러 도시에 걸쳐 있는데 지식베이스 출처가 한 도시 것뿐인 명소: 다른 도시 일정에는 출처를 붙이지 않는다 */
const SIGHT_ONLY_IN: Record<string, string> = { 두오모: '밀라노' }

const COUNTRY_FLAG: Record<string, string> = {
  ...Object.fromEntries(Object.values(CITIES_DB).map((c) => [c.country, c.flag])),
  대한민국: '🇰🇷',
  핀란드: '🇫🇮',
  바티칸시국: '🇻🇦',
}

function matchSight(text: string, dayCity: string): string | undefined {
  for (const [sight, src] of Object.entries(SIGHTS_SOURCE)) {
    if (!text.includes(sight)) continue
    const only = SIGHT_ONLY_IN[sight]
    if (only && only !== dayCity) continue
    return src
  }
  return undefined
}

/** "국가/도시" 줄을 1순위로, 없으면 본문에서 단어 경계 매칭으로 도시 정보를 만든다 */
function cityInfoFor(line: CityLine | undefined, fallbackText: string): CityInfo {
  const generic = { city: '유럽 현지', country: '유럽', flag: '🇪🇺', tagline: '낭만과 역사가 숨쉬는 여정' }
  if (line) {
    const hit = CITIES_DB[line.city] ?? CITIES_DB[findCityKey(line.city, CITY_KEYS) ?? '']
    return {
      city: hit?.city ?? line.city,
      country: line.country,
      flag: hit?.flag ?? COUNTRY_FLAG[line.country] ?? generic.flag,
      tagline: hit?.tagline ?? generic.tagline,
      isNature: hit?.isNature,
      isCulture: hit?.isCulture,
    }
  }
  const key = findCityKey(fallbackText, CITY_KEYS)
  return key ? CITIES_DB[key] : generic
}

interface ParsedDayRaw {
  dayNum: number
  headerLine: number
  titleText: string
  lines: { lineNum: number; text: string }[]
}

/** "제 1일", "Day 1", "1일차", "[1일]", "제1일" */
const DAY_HEADER_RE = /(?:제\s*(\d+)\s*일|Day\s*(\d+)|(\d+)\s*일차|\[\s*(\d+)\s*일\s*\])/i

const MODE_PHRASE: Record<Exclude<TourMode, 'unknown'>, string> = {
  entry: '내부 입장',
  exterior: '외부 관람',
  window: '차창 조망',
}

export const UNKNOWN_EVIDENCE = '원문에 관람 방식 표기가 없어 확인 불가'

/** 판독 근거 문장: 원문에서 무엇을 보고 판단했는지 */
function evidence(mode: Exclude<TourMode, 'unknown'>, via: 'tag' | 'keyword', keyword: string | undefined, where = '원문'): string {
  const kw = keyword?.trim()
  if (!kw) return `${where}의 문맥으로 ${MODE_PHRASE[mode]}으로 판단 (키워드 기준)`
  return via === 'tag'
    ? `${where}에 '${kw}' 표기가 있어 ${MODE_PHRASE[mode]}으로 판단`
    : `${where}에 '${kw}' 표현이 있어 ${MODE_PHRASE[mode]}으로 판단 (키워드 기준)`
}

const AI_VERDICT_MODE: Record<string, Exclude<TourMode, 'unknown'> | undefined> = { 입장: 'entry', 외관: 'exterior', 차창: 'window' }

/** 쇼핑·면세 일정은 관람 방식(입장/외관)을 따지는 대상이 아니므로 Gemini에 묻지 않는다 */
const SHOPPING = /쇼핑|아울렛|면세/

/** 규칙으로 확정되지 않아 Gemini에 물어볼 만한 줄 (원문 줄 번호 + 문장) */
export function collectAmbiguous(result: PackageResult): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = []
  for (const d of result.days) {
    for (const i of d.items) {
      if (i.mode !== 'unknown' || SHOPPING.test(i.text)) continue
      const sub = i.option ? i.desc?.[0]?.text : undefined
      out.push({ line: i.line, text: sub ? `${i.name ?? i.text} - ${sub}` : i.text })
    }
  }
  return out
}

/**
 * 텍스트 일정표를 분석하여 감정 결과(PackageResult)를 생성하는 핵심 룰 엔진
 * @param aiVerdicts 규칙으로 확정되지 않은 줄에 대한 Gemini 응답 (원문 줄 번호 → 판정). 없으면 판독 불가로 남긴다.
 */
export function inspectItinerary(rawText: string, departureMonth: number = 5, aiVerdicts: Record<number, AiReason> = {}): PackageResult {
  const allLines = rawText.split(/\r?\n/)
  const airportCodes = collectAirportCodes(allLines)

  // 1. Day 블록 파싱: 일차 헤더 아래의 모든 비어 있지 않은 줄을 그대로 보관한다 (식사/숙박 줄도 지우지 않는다)
  const dayBlocks: ParsedDayRaw[] = []
  let currentBlock: ParsedDayRaw | null = null

  allLines.forEach((text, idx) => {
    const lineNum = idx + 1
    const trimmed = text.trim()
    if (!trimmed) return

    const dayMatch = trimmed.match(DAY_HEADER_RE)
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

    if (currentBlock) currentBlock.lines.push({ lineNum, text: trimmed })
  })

  if (currentBlock) {
    dayBlocks.push(currentBlock)
  }

  // Day 블록이 없으면 전체 텍스트를 1일차 하나로 감싼다 (원문 누락 방지)
  if (dayBlocks.length === 0) {
    console.warn('[inspect] 일차 헤더(제 N일 / Day N / N일차)를 찾지 못해 원문 전체를 1일차 하나로 처리')
    dayBlocks.push({
      dayNum: 1,
      headerLine: 1,
      titleText: '제 1일 일정',
      lines: allLines.map((t, i) => ({ lineNum: i + 1, text: t.trim() })).filter((l) => l.text.length > 0),
    })
  }

  // 2. 일자별 스케줄 객체 생성 및 관람 모드 판독
  let totalEntry = 0
  let totalExterior = 0
  let totalWindow = 0
  let totalUnknown = 0
  let totalGemini = 0
  let matchedSites = 0
  let totalSites = 0
  const visitedCities: string[] = []
  const defaulted: string[] = []
  const addVisited = (city: string) => {
    if (city && city !== '인천' && !visitedCities.includes(city)) visitedCities.push(city)
  }

  const days: DaySchedule[] = dayBlocks.map((block) => {
    // 구조 분석: 항공 이동 / 도시 구간 / 명소+설명 / 선택관광 / 안내 / 식사·숙박으로 묶는다
    const sd = structureDay(block.lines, SIGHT_KEYS, airportCodes)
    const dayText = block.titleText + ' ' + block.lines.map((l) => l.text).join(' ')

    // 도시 판정: ① "국가/도시" 줄 → ② 단어 경계 매칭 (베니스의 "니스" 오탐 방지)
    const matchedCity: CityInfo = cityInfoFor(sd.mainCity, dayText)
    if (sd.sightCities.length > 0) {
      for (const c of sd.sightCities) addVisited(cityInfoFor(c, '').city)
    } else if (!sd.mainCity) {
      addVisited(matchedCity.city)
    }

    const sl = (l: { lineNum: number; text: string }): SourceLine => ({ line: l.lineNum, text: l.text })
    const notices: Notice[] = sd.notices.map((n) => ({ line: n.lineNum, text: n.text, kind: n.kind }))
    const leftover: SourceLine[] = sd.leftover.map(sl)
    const hidden: SourceLine[] = sd.hidden.map(sl)
    const items: ScheduleItem[] = []
    const sections: DaySection[] = []

    // 카드 안의 설명 줄을 SourceLine으로 접는다. 자세히보기/선택관광 마커/제목과 같은 부제는 화면에서 숨긴다.
    const foldCard = (card: CardDraft, withTitle: boolean): SourceLine[] => {
      if (card.more) hidden.push(sl(card.more))
      if (card.marker) hidden.push(sl(card.marker))
      const lines: SourceLine[] = []
      if (withTitle) lines.push(sl(card.title))
      if (card.sub) {
        const dup = card.sub.text.replace(/\s+/g, '') === card.title.text.replace(/\s+/g, '')
        if (dup) hidden.push(sl(card.sub))
        else lines.push(sl(card.sub))
      }
      card.body.forEach((b) => lines.push(sl(b)))
      return lines
    }

    // 판독 결과를 먼저 모으고, 시간대 라벨은 전체 개수를 안 뒤에 붙인다
    type Pending = Omit<ScheduleItem, 'time'>
    const pending: Pending[] = []

    const decide = (
      verdict: Extract<VisitVerdict, { kind: 'visit' }>,
      text: string,
      line: number,
      where?: string,
    ): Pick<Pending, 'mode' | 'basis' | 'explain' | 'aiReason'> => {
      if (verdict.mode !== 'unknown') {
        return { mode: verdict.mode, basis: 'keyword', explain: evidence(verdict.mode, verdict.via === 'tag' ? 'tag' : 'keyword', verdict.keyword, where) }
      }
      // 규칙으로 못 정한 줄: Gemini 응답이 있으면 반영하되 "추정"으로 표시하고, 판단불가면 그대로 판독 불가로 둔다
      const ai = aiVerdicts[line]
      if (ai) {
        const m = AI_VERDICT_MODE[ai.verdict]
        const aiReason: AiReason = { sentence: text, line, keyword: ai.keyword, verdict: ai.verdict }
        if (m) {
          return {
            mode: m,
            basis: 'gemini' as Basis,
            aiReason,
            explain: `Gemini가 문맥에서 '${ai.keyword}'를 근거로 ${MODE_PHRASE[m]}으로 추정 (원문에 직접 표기는 없음 · 참고용)`,
          }
        }
        return { mode: 'unknown', basis: 'keyword', aiReason, explain: `${UNKNOWN_EVIDENCE} (Gemini도 판단 불가로 응답)` }
      }
      return { mode: 'unknown', basis: 'keyword', explain: UNKNOWN_EVIDENCE }
    }

    const infoCardsFromOrphan: CardDraft[] = []

    sd.sections.forEach((sec) => {
      const section: DaySection = {
        country: sec.city?.country,
        city: sec.city?.city,
        cityLine: sec.city?.line,
        moves: sec.moves.map((m) => ({ line: m.line.lineNum, text: m.line.text, duration: m.duration })),
        intro: sec.intro.map(sl),
        itemLines: [],
      }
      sections.push(section)

      for (const sg of sec.sights) {
        const line = sg.line
        const plain = line.text.replace(/^\s*[-*•·▪]\s*/, '')

        if (sg.kind === 'option' && sg.card) {
          const title = sg.card.title.text
          const combined = `${title} ${sg.card.sub?.text ?? ''}`
          const source = matchSight(combined, matchedCity.city)
          const verdict = classifyVisit(combined, source !== undefined, { option: true })
          const v: Extract<VisitVerdict, { kind: 'visit' }> = verdict.kind === 'visit' ? verdict : { kind: 'visit', mode: 'unknown', via: 'none' }
          pending.push({
            text: title,
            name: title,
            line: line.lineNum,
            source,
            desc: foldCard(sg.card, false),
            option: sg.option,
            ...decide(v, `[선택관광] ${title}`, line.lineNum),
          })
          section.itemLines.push(line.lineNum)
          continue
        }

        if (sg.kind === 'promoted' && sg.card) {
          const cardText = `${sg.card.title.text} ${sg.card.sub?.text ?? ''}`
          const tag = tagVerdict(cardText)
          const v: Extract<VisitVerdict, { kind: 'visit' }> = tag
            ? { kind: 'visit', mode: tag.mode, keyword: tag.keyword, via: 'tag' }
            : { kind: 'visit', mode: 'unknown', via: 'none' }
          pending.push({
            text: sg.card.title.text,
            name: cardName(sg.card.title.text),
            line: line.lineNum,
            source: matchSight(cardText, matchedCity.city),
            desc: foldCard(sg.card, false),
            ...decide(v, sg.card.title.text, line.lineNum),
          })
          section.itemLines.push(line.lineNum)
          continue
        }

        if (sg.kind === 'bullet') {
          const source = matchSight(line.text, matchedCity.city)
          const verdict = classifyVisit(line.text, source !== undefined, { bullet: true })
          if (verdict.kind === 'exclude') {
            if (verdict.reason === 'notice') notices.push({ line: line.lineNum, text: plain, kind: 'meeting' })
            else leftover.push(sl(line))
            if (sg.card) {
              // 불릿이 방문지가 아니면 붙어 있던 카드는 안내 카드로 돌려 보낸다
              infoCardsFromOrphan.push(sg.card)
            }
            continue
          }
          let v = verdict
          let where: string | undefined
          if (v.via !== 'tag' && sg.card) {
            const ct = tagVerdict(`${sg.card.title.text} ${sg.card.sub?.text ?? ''}`)
            if (ct) {
              v = { kind: 'visit', mode: ct.mode, keyword: ct.keyword, via: 'tag' }
              where = `원문 L-${String(sg.card.title.lineNum).padStart(2, '0')} 설명 카드 제목`
            }
          }
          const name = sg.card
            ? sg.cardByPosition
              ? cardName(sg.card.title.text)
              : extractSightName(plain, sg.card.title.text)
            : extractSightName(plain)
          pending.push({
            text: plain,
            name: name.length >= 2 ? name : plain,
            line: line.lineNum,
            source,
            desc: sg.card ? foldCard(sg.card, true) : undefined,
            descHasTitle: sg.card ? true : undefined,
            ...decide(v, plain, line.lineNum, where),
          })
          section.itemLines.push(line.lineNum)
          continue
        }

        // 일반 일정표의 줄: 방문지 후보인지부터 판별한다
        const source = matchSight(line.text, matchedCity.city)
        const verdict = classifyVisit(line.text, source !== undefined)
        if (verdict.kind === 'exclude') {
          if (verdict.reason === 'transit') section.moves.push({ line: line.lineNum, text: plain })
          else if (verdict.reason === 'notice') notices.push({ line: line.lineNum, text: plain, kind: 'notice' })
          else leftover.push(sl(line))
          continue
        }
        pending.push({
          text: plain,
          name: plain,
          line: line.lineNum,
          source,
          ...decide(verdict, plain, line.lineNum),
        })
        section.itemLines.push(line.lineNum)
      }
    })

    // 어느 명소에도 붙지 못한 소개/안내 카드
    const infoCards = [...sd.infoCards, ...infoCardsFromOrphan].map((c) => {
      if (c.more) hidden.push(sl(c.more))
      return { title: sl(c.title), sub: c.sub ? sl(c.sub) : undefined, lines: c.body.map(sl) }
    })

    pending.forEach((p, idx) => {
      let time = idx === 0 ? '오전' : idx === pending.length - 1 ? '저녁' : '오후'
      if (/오전|\bAM\b|아침/i.test(p.text)) time = '오전'
      if (/오후|\bPM\b|점심/i.test(p.text)) time = '오후'
      if (/저녁|야간|밤/i.test(p.text)) time = '저녁'

      totalSites++
      if (p.source) matchedSites++
      if (p.basis === 'gemini') totalGemini++
      if (p.mode === 'entry') {
        totalEntry++
        if (p.source) p.basis = 'fact'
      } else if (p.mode === 'exterior') totalExterior++
      else if (p.mode === 'window') totalWindow++
      else totalUnknown++

      items.push({ time, ...p })
    })

    // 식사/숙박: 원문에서 읽은 값을 우선하고, 없을 때만 기본값을 쓰되 화면에 "기본값"으로 표시한다
    const mealsEstimated = !sd.meals
    const lodgingEstimated = !sd.lodging
    if (mealsEstimated || lodgingEstimated) {
      defaulted.push(`DAY ${block.dayNum}(${[mealsEstimated ? '식사' : '', lodgingEstimated ? '숙박' : ''].filter(Boolean).join('·')})`)
    }

    return {
      day: block.dayNum,
      flag: matchedCity.flag,
      city: `${matchedCity.country} ${matchedCity.city}`,
      tagline: `"${matchedCity.tagline}"`,
      items,
      date: sd.date ? sl(sd.date) : undefined,
      flights: sd.flights,
      sections,
      notices,
      infoCards,
      hiddenLines: hidden,
      leftover,
      mealLines: sd.mealLines.map(sl),
      lodgingLines: sd.lodgingLines.map(sl),
      meals: sd.meals ?? DEFAULT_MEALS,
      lodging: sd.lodging ?? `${matchedCity.city} 시내 또는 근교 3성급 호텔`,
      mealsEstimated,
      lodgingEstimated,
    }
  })

  if (defaulted.length > 0) {
    console.info(`[inspect] 원문에서 식사/숙박 줄을 찾지 못해 기본값을 채운 일차: ${defaulted.join(', ')}`)
  }

  // 3. 여정 트랙 (Journey Nodes)
  const journey: JourneyNode[] = []
  journey.push({ city: '인천', label: '출발', next: 'flight' })

  if (visitedCities.length === 0) {
    console.warn('[inspect] 방문 도시를 하나도 읽지 못해 여정 트랙을 예시 도시(파리·인터라켄·로마)로 폴백')
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
  const price = extractPackagePrice(rawText)
  const packagePriceKrw = price.value
  if (price.source === 'default') {
    console.warn(
      `[inspect] 상품가 추출 실패 → 기본값 ${DEFAULT_PACKAGE_PRICE_KRW.toLocaleString('ko-KR')}원으로 폴백 (원 단위 금액 후보 ${price.candidates}개, 그중 ${PRICE_RANGE_LABEL} 밖 ${price.rejected}개)`,
    )
  } else if (price.source === 'any-in-range') {
    console.warn(`[inspect] 상품가 라벨을 못 찾아 원문 ${price.line}줄의 ${packagePriceKrw.toLocaleString('ko-KR')}원을 상품가로 추정`)
  }

  // 원문에서 필수 현지 경비 / 선택관광 금액을 줄 단위로 읽는다 (원문 줄 번호 포함)
  const parsedReceipt = parseReceipt(rawText)
  const options: OptionLine[] = parsedReceipt.options

  // 필수 경비: 가이드·도시세·팁을 항목별로 "원문 확인 / 언급만 있고 금액 없음 / 언급 없음"으로 구분한다
  const mandatory: ReceiptLine[] = buildMandatory(rawText, parsedReceipt.mandatory)
  const mandatoryEstimated = mandatory.some((m) => m.status !== 'found')

  const d = parsedReceipt.diagnostics
  if (mandatoryEstimated) {
    console.info(
      `[inspect] 필수 현지 경비 중 금액이 원문에 없는 항목은 평균 참고값으로 표시: ${mandatory
        .filter((m) => m.status !== 'found')
        .map((m) => `${m.label}(${m.status === 'mentioned' ? `언급만, L${m.line}` : '언급 없음'})`)
        .join(', ')}`,
    )
  }
  if (options.length === 0) {
    console.warn(
      `[inspect] 금액이 적힌 선택관광을 읽지 못함 → 옵션 목록 비어 있음 (금액 없는 선택관광 ${d.optionMentionsWithoutAmount + d.optionCardsWithoutAmount}건, 상품가로 보여 제외한 고액 원화 ${d.skippedLargeKrw}건)`,
    )
  }
  if (d.converted.length > 0) {
    console.info('[inspect] EUR 외 통화를 가정 환율로 환산', d.converted)
  }

  // 5. 6대 스탯 계산
  const totalItemsCount = Math.max(1, totalEntry + totalExterior + totalWindow + totalUnknown)
  const entryRatio = totalEntry / totalItemsCount
  
  // 문화/역사 점수 (입장 비율 반영, 최대 25)
  const cultureScore = Math.min(25, Math.max(12, Math.round(15 + entryRatio * 15)))
  // 관광 깊이 점수 (입장 vs 외관, 최대 20)
  const depthFor = (unknownCount: number) =>
    Math.min(20, Math.max(8, Math.round(10 + (totalEntry / (totalEntry + totalExterior + unknownCount || 1)) * 12)))
  const depthScore = depthFor(0)
  // 판독 불가 곳을 "내부 입장이 확인되지 않은 곳 = 외부 관람 수준"으로 보수적으로 본 경우의 깊이 점수
  const depthConservative = depthFor(totalUnknown)
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

  // 생존 인벤토리: 필수 / 권장 / 있으면 좋음 3단계. 단계는 이 일정의 데이터에서 근거를 찾아 정한다.
  const dayCount = Math.max(1, days.length)
  const sightsPerDay = Math.round((totalSites / dayCount) * 10) / 10
  const longMoves = days
    .flatMap((d) => d.sections?.flatMap((sec) => sec.moves) ?? [])
    .filter((m) => {
      const h = m.duration?.match(/(\d+(?:\.\d+)?)\s*시간/)
      return h && Number(h[1]) >= 3
    }).length
  const mandatoryFound = mandatory.filter((m) => m.status === 'found').length
  const freeMeals = days.reduce((n, d) => n + d.meals.split('/').filter((p) => /자유식|불포함|없음/.test(p)).length, 0)
  const hasUk = days.some((d) => d.city.startsWith('영국'))
  const isCold = [11, 12, 1, 2, 3].includes(departureMonth)
  const isRainy = [3, 4, 9, 10, 11].includes(departureMonth)
  const warm = hasNature || isCold

  const inventoryRaw: InventoryItem[] = [
    {
      emoji: '👟',
      name: '쿠션 러닝화',
      reasons: ['유럽 자갈길', '도보 이동 많음'],
      level: sightsPerDay >= 2 ? 'must' : 'recommend',
      basis: `방문지 ${totalSites}곳을 ${dayCount}일에 소화(하루 평균 ${sightsPerDay}곳) → ${sightsPerDay >= 2 ? '필수' : '권장'}`,
    },
    {
      emoji: '🔌',
      name: '유럽 멀티 어댑터',
      reasons: ['국가별 콘센트 규격', '호환 대비'],
      level: hasUk ? 'must' : 'recommend',
      basis: hasUk ? '영국은 G타입 콘센트라 → 필수' : '국가별 콘센트 규격이 달라 → 권장',
    },
    {
      emoji: '💶',
      name: '유로 소액권(€5, €10)',
      reasons: ['가이드비·화장실 유료', '현금 전용 대비'],
      level: mandatoryFound > 0 ? 'must' : 'recommend',
      basis: mandatoryFound > 0 ? `원문에 금액이 적힌 현지 지불 경비 ${mandatoryFound}건 → 필수` : '원문에 현지 경비 금액은 없지만 화장실·팁에 쓰여 → 권장',
    },
    {
      emoji: '💺',
      name: '에어 버스 방석',
      reasons: [`도시 ${cityCount}개 이동`, '엉덩이 피로 구출용'],
      level: cityCount >= 6 || longMoves >= 2 ? 'recommend' : 'optional',
      basis:
        cityCount >= 6 || longMoves >= 2
          ? `방문 도시 ${cityCount}개 · 3시간 이상 이동 ${longMoves}회 → 권장`
          : `방문 도시 ${cityCount}개, 장거리 이동이 적어 → 있으면 좋음`,
    },
    {
      emoji: '💊',
      name: '소화제 & 멀미약',
      reasons: ['장시간 버스 탑승', '기름진 현지식 대비'],
      level: longMoves >= 2 ? 'recommend' : 'optional',
      basis: longMoves >= 2 ? `3시간 이상 버스 이동 ${longMoves}회 → 권장` : '장거리 이동이 적어 → 있으면 좋음',
    },
    {
      emoji: warm ? '🧥' : '🕶️',
      name: warm ? '경량 패딩/바람막이' : '자외선 차단 선글라스',
      reasons: [hasNature ? '고산지대 영하 기온' : `${departureMonth}월 날씨 대비`, warm ? '체온 유지' : '강한 햇빛 대비'],
      level: hasNature && isCold ? 'must' : warm ? 'recommend' : 'optional',
      basis: hasNature && isCold ? `고산지대 일정 + ${departureMonth}월 출발 → 필수` : warm ? `${hasNature ? '고산지대 일정' : `${departureMonth}월 출발`} → 권장` : `${departureMonth}월 햇빛 대비 → 있으면 좋음`,
    },
    {
      emoji: '🧴',
      name: '초경량 접이식 우산',
      reasons: [`${departureMonth}월 유럽 날씨`, '변덕 소나기 방어'],
      level: isRainy ? 'recommend' : 'optional',
      basis: isRainy ? `${departureMonth}월은 유럽 비가 잦은 시기 → 권장` : `${departureMonth}월은 비가 드문 시기 → 있으면 좋음`,
    },
    {
      emoji: '☕',
      name: '컵라면 & 볶음고추장',
      reasons: ['호텔 조식 단조로움', '비상 식량'],
      level: freeMeals >= 8 ? 'recommend' : 'optional',
      basis: freeMeals >= 8 ? `자유식·식사 없음 ${freeMeals}끼 → 권장` : `자유식·식사 없음 ${freeMeals}끼 · 현지에서도 구할 수 있어 → 있으면 좋음`,
    },
  ]
  const levelOrder = { must: 0, recommend: 1, optional: 2 } as const
  const inventory = inventoryRaw
    .map((it, i) => ({ it, i }))
    .sort((a, b) => levelOrder[a.it.level] - levelOrder[b.it.level] || a.i - b.i)
    .map(({ it }) => it)

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
      optionsWithoutAmount: d.optionCardsWithoutAmount + (d.optionCards === 0 ? d.optionMentionsWithoutAmount : 0),
      packagePriceEstimated: price.source === 'default',
    },
    valuation: {
      baseScore: totalScore,
      aiScore: Math.max(50, totalScore - depthScore + depthConservative),
      aiNote:
        totalUnknown > 0
          ? `관람 방식이 불분명한 ${totalUnknown}곳(내부 입장이 확인되지 않은 곳)을 '외부 관람 수준'으로 보수적으로 반영해 관광 깊이 점수를 조정했어요 (${depthScore}점 → ${depthConservative}점). 현재 판독: 외부 관람 ${totalExterior}곳 / 확인 불가 ${totalUnknown}곳${totalGemini > 0 ? ` (Gemini 추정 ${totalGemini}곳 포함)` : ''}.`
          : `관람 방식이 불분명한 곳이 없어 기본 점수와 같아요. 현재 판독: 외부 관람 ${totalExterior}곳 / 확인 불가 0곳${totalGemini > 0 ? ` (Gemini 추정 ${totalGemini}곳 포함)` : ''}.`,
      modeCounts: { entry: totalEntry, exterior: totalExterior, window: totalWindow, unknown: totalUnknown },
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

