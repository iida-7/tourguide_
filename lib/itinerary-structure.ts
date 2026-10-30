/**
 * 일차 블록 구조 분석
 *
 * 여행사 웹페이지를 복사한 원문은 줄마다 성격이 다르다.
 *   [날짜/시각/편명 줄 묶음] → 국가/도시 줄 → 이동 안내 → "- " 불릿(명소) → 제목·부제·자세히보기·설명 카드 → 선택관광 카드 → 예정/HOTEL → [조식]…
 * 이 모듈은 한 일차의 줄들을 의미 있는 단위(항공 이동, 도시 구간, 명소+설명, 선택관광, 안내, 식사/숙박)로 묶는다.
 * 줄은 지우지 않는다: 어떤 줄이든 정확히 한 곳(묶음, 숨김, 기타)에 담긴다.
 */

import { detectNonSite, isUiResidue } from './itinerary-preprocess'
import type { OptionInfo } from './mock-result'

export interface BlockLine {
  lineNum: number
  text: string
}

export interface CityLine {
  country: string
  city: string
  line: number
  /** 이 도시 구간 안의 불릿 수 (일차의 대표 도시를 고를 때 사용) */
  bullets: number
}

/** 제목·부제·자세히보기·설명으로 이루어진 카드 */
export interface CardDraft {
  title: BlockLine
  sub?: BlockLine
  /** 선택관광 카드의 "선택관광" 마커 줄 */
  marker?: BlockLine
  more?: BlockLine
  body: BlockLine[]
  option: boolean
}

export type SightKind = 'bullet' | 'generic' | 'option' | 'promoted'

export interface SightDraft {
  kind: SightKind
  line: BlockLine
  /** 이 방문지에 접어 넣을 설명 카드 */
  card?: CardDraft
  /** 카드가 본문 매칭이 아니라 "구간에 불릿이 하나뿐"이라는 이유로 붙은 경우 (이름을 카드 제목에서 가져온다) */
  cardByPosition?: boolean
  option?: OptionInfo
}

export interface FlightDraft {
  from?: string
  to?: string
  depTime?: string
  depDate?: string
  arrTime?: string
  arrDate?: string
  flightNo?: string
  duration?: string
  lines: number[]
}

export interface GroundMoveDraft {
  line: BlockLine
  duration?: string
}

export interface SectionDraft {
  city?: CityLine
  moves: GroundMoveDraft[]
  intro: BlockLine[]
  sights: SightDraft[]
}

export interface NoticeDraft extends BlockLine {
  kind: 'notice' | 'meeting' | 'lodging' | 'meal'
}

export interface StructuredDay {
  date?: BlockLine
  flights: FlightDraft[]
  sections: SectionDraft[]
  notices: NoticeDraft[]
  infoCards: CardDraft[]
  hidden: BlockLine[]
  leftover: BlockLine[]
  meals?: string
  lodging?: string
  mealLines: BlockLine[]
  lodgingLines: BlockLine[]
  cities: CityLine[]
  /** 일차의 대표 도시: 불릿이 가장 많은 구간, 불릿이 없으면 마지막 도시 줄 */
  mainCity?: CityLine
  /** 방문지(불릿)가 있는 도시 구간들 (여정 트랙용) */
  sightCities: CityLine[]
  cardLayout: boolean
}

// "스위스/루체른", "이탈리아/노벤타 디 피아베 디자이너 아울렛", "대한민국/인천"
const CITY_LINE = /^([가-힣]{2,10})\s*\/\s*([가-힣A-Za-z][가-힣A-Za-z0-9 ·&()'-]{0,30})$/
const BULLET = /^\s*[-•·▪]\s+\S/
const OPTION_MARKER = /^\[?\s*선택\s*관광\s*\]?$/
const MORE_LINK = /^자세히\s*보기$/
const MEAL_TAG = /^\[\s*(조식|중식|석식)\s*\]\s*(.*)$/
const MEAL_OLD = /^[-*•]?\s*\[\s*식사\s*\]|(?:식사|조식|중식|석식)\s*[:：]/
const HOTEL_OLD = /^[-*•]?\s*\[\s*(?:호텔|숙박|숙소)\s*\]|(?:호텔|숙박|투숙)\s*[:：]/
const EXPLICIT_TAG = /[(\[（]\s*(?:외관|전경|조망|내부|입장|차창|포토\s*타임)[^)\]）]*[)\]）]/
const INFO_CARD_TITLE = /안내|유의|주의|공지|사항/
const OPS_LINE = /미팅|집결|인솔자|카운터|출발\s*\d+\s*시간\s*전/
const GROUND_MOVE = /약\s*\d[\d.\-~\s]*(?:시간|분|뷴)[^]*소요/

const TAG_STRIP = /[(\[（][^)\]）]*[)\]）]/g
/** 비교용 정규화: 태그·기호·공백 제거 */
const core = (s: string) => s.replace(TAG_STRIP, '').replace(/[^\p{L}\p{N}]/gu, '')

// ──────────────────────────────────────────────────────────────
// 항공 이동: 흩어진 날짜/시각/편명/소요시간 줄을 한 카드로 묶는다
// ──────────────────────────────────────────────────────────────

const TIME_LINE = /^\d{1,2}:\d{2}$/
const DATE_LINE = /^\d{4}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{1,2}\s*(?:\(?\s*[월화수목금토일](?:요일)?\s*\)?)?$/
const AIRPORT_EVENT = /^(.+?)\(([A-Z]{3})\)\s*(출발|도착)$/
const FLIGHT_NO = /^[A-Z][A-Z0-9]\d{2,4}$/
const DURATION_LINE = /^(\d{1,2})\s*시간\s*(\d{1,2})?\s*분?$/
const TRANSPORT_HEAD = /^\[\s*교통편\s*:\s*([A-Z0-9]+)\s*\]$/
const TRANSPORT_FIELD = /^(편명|출발도시|도착도시|이동시간)\s*:\s*(.*)$/

const WEEKDAY = /[월화수목금토일]/

/** "2026.11.10(화요일)" → "11.10(화)" */
function shortDate(t: string): string {
  const m = t.match(/(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/)
  if (!m) return t
  const wd = t.match(WEEKDAY)?.[0]
  return `${m[1]}.${m[2].padStart(2, '0')}.${m[3].padStart(2, '0')}${wd ? `(${wd})` : ''}`
}

const durationText = (h: string, m?: string) => `${Number(h)}시간${m && Number(m) > 0 ? ` ${Number(m)}분` : ''}`

/** 원문 전체에서 공항 코드 → 도시명 표를 만든다 ("로마(FCO) 출발" → FCO: 로마) */
export function collectAirportCodes(rawLines: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const l of rawLines) {
    const m = l.trim().match(AIRPORT_EVENT)
    if (m) out[m[2]] = m[1].trim()
  }
  return out
}

function extractFlights(lines: BlockLine[], codes: Record<string, string>) {
  const consumed = new Set<number>()
  const flights: FlightDraft[] = []
  let date: BlockLine | undefined
  let open: FlightDraft | undefined
  const nameOf = (code: string) => (codes[code] ? `${codes[code]}(${code})` : code)

  // 이벤트: 시각 / 날짜 / 공항(출발|도착) 세 줄
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].text.trim()

    if (TIME_LINE.test(t) && lines[i + 1] && DATE_LINE.test(lines[i + 1].text.trim()) && lines[i + 2] && AIRPORT_EVENT.test(lines[i + 2].text.trim())) {
      const ev = lines[i + 2].text.trim().match(AIRPORT_EVENT)!
      const place = `${ev[1].trim()}(${ev[2]})`
      const when = { time: t, date: shortDate(lines[i + 1].text.trim()) }
      const nums = [lines[i].lineNum, lines[i + 1].lineNum, lines[i + 2].lineNum]
      nums.forEach((n) => consumed.add(n))
      if (ev[3] === '출발') {
        open = { from: place, depTime: when.time, depDate: when.date, lines: [...nums] }
        flights.push(open)
      } else if (open && !open.to) {
        open.to = place
        open.arrTime = when.time
        open.arrDate = when.date
        open.lines.push(...nums)
        open = undefined
      } else {
        flights.push({ to: place, arrTime: when.time, arrDate: when.date, lines: [...nums] })
      }
      i += 2
      continue
    }

    // 편명·소요시간 줄은 열린 항공편(출발만 읽은 상태)에 붙는다
    if (open && FLIGHT_NO.test(t) && !open.flightNo) {
      open.flightNo = t
      open.lines.push(lines[i].lineNum)
      consumed.add(lines[i].lineNum)
      continue
    }
    if (open && DURATION_LINE.test(t) && !open.duration) {
      const m = t.match(DURATION_LINE)!
      open.duration = durationText(m[1], m[2])
      open.lines.push(lines[i].lineNum)
      consumed.add(lines[i].lineNum)
    }
  }

  // [교통편 : AY042] 필드 묶음
  for (let i = 0; i < lines.length; i++) {
    const head = lines[i].text.trim().match(TRANSPORT_HEAD)
    if (!head) continue
    const nums = [lines[i].lineNum]
    const f: Record<string, string> = {}
    let j = i + 1
    for (; j < lines.length; j++) {
      const m = lines[j].text.trim().match(TRANSPORT_FIELD)
      if (!m) break
      f[m[1]] = m[2].trim()
      nums.push(lines[j].lineNum)
    }
    nums.forEach((n) => consumed.add(n))
    i = j - 1

    const no = f['편명'] || head[1]
    const hm = f['이동시간']?.match(/^(\d{2})(\d{2})$/)
    const dur = hm ? durationText(hm[1], hm[2]) : undefined
    const hit = flights.find((x) => x.flightNo === no)
    if (hit) {
      if (!hit.from && f['출발도시']) hit.from = nameOf(f['출발도시'])
      if (!hit.to && f['도착도시']) hit.to = nameOf(f['도착도시'])
      if (!hit.duration) hit.duration = dur
      hit.lines.push(...nums)
    } else {
      flights.push({
        from: f['출발도시'] ? nameOf(f['출발도시']) : undefined,
        to: f['도착도시'] ? nameOf(f['도착도시']) : undefined,
        flightNo: no,
        duration: dur,
        lines: nums,
      })
    }
  }

  // 일차 날짜: 항공 이벤트에 속하지 않은 첫 날짜 줄
  for (const l of lines) {
    if (!consumed.has(l.lineNum) && DATE_LINE.test(l.text.trim())) {
      date = l
      consumed.add(l.lineNum)
      break
    }
  }
  return { consumed, flights, date }
}

// ──────────────────────────────────────────────────────────────
// 카드 / 명소 이름
// ──────────────────────────────────────────────────────────────

function detectCards(lines: BlockLine[], consumed: Set<number>, isBoundary: (l: BlockLine) => boolean) {
  const anchors: number[] = []
  lines.forEach((l, i) => MORE_LINK.test(l.text.trim()) && anchors.push(i))
  const cards = new Map<number, { card: CardDraft; end: number }>()

  const startOf = (a: number) => {
    const sub = a - 1
    if (sub >= 0 && lines[sub - 1] && OPTION_MARKER.test(lines[sub - 1].text.trim())) return Math.max(0, sub - 2)
    return Math.max(0, sub - 1)
  }
  const starts = new Set(anchors.map(startOf))

  for (const a of anchors) {
    const sub = a - 1
    const hasMarker = sub >= 0 && !!lines[sub - 1] && OPTION_MARKER.test(lines[sub - 1].text.trim())
    const start = startOf(a)
    const titleIdx = start
    const card: CardDraft = {
      title: lines[titleIdx],
      sub: sub > titleIdx + (hasMarker ? 1 : 0) ? lines[sub] : undefined,
      marker: hasMarker ? lines[sub - 1] : undefined,
      more: lines[a],
      body: [],
      option: hasMarker,
    }
    // 본문: 선택관광·안내 카드는 다음 카드/구조 줄 전까지, 장소 카드는 설명 한 문단
    const multi = hasMarker || INFO_CARD_TITLE.test(card.title.text)
    let end = a + 1
    for (let j = a + 1; j < lines.length; j++) {
      if (starts.has(j) || isBoundary(lines[j]) || consumed.has(lines[j].lineNum)) break
      // 장소 카드: 첫 줄은 설명, 이어지는 줄은 같은 문단의 연속(긴 줄)일 때만 붙인다 (짧은 줄은 홍보 문구 등 다른 내용)
      if (!multi && card.body.length > 0 && lines[j].text.length < 80) break
      card.body.push(lines[j])
      end = j + 1
    }
    cards.set(start, { card, end })
  }
  return cards
}

/** 선택관광 카드 본문에서 요금/소요시간/대체일정을 읽는다 (요금 줄 자체는 영수증이 읽는다) */
function readOptionInfo(body: BlockLine[]): OptionInfo {
  const info: OptionInfo = {}
  const at = (label: RegExp) => {
    const i = body.findIndex((b) => label.test(b.text.trim()))
    return i >= 0 ? body[i + 1]?.text.trim() : undefined
  }
  info.fee = at(/^요금$/)
  info.duration = at(/^소요\s*시간$/)
  info.alternative = at(/^대체\s*일정$/)
  return info
}

const NAME_TAIL = /\s*(?:자유\s*)?(?:산책|감상|쇼핑|관람|관광|탐방|방문|투어|체험|구경|둘러보기)\s*$/
const MODIFIER_END = /(?:의|은|는|인|한|된|던|을|를|으로|에서|이자|하는|있는|와|과)$/
const GENERIC_LEAD = new Set(['건축물', '하이라이트', '중심', '유적', '도시', '풍경', '정수'])
/** 장소 종류를 뜻하는 말: "광장 포룸"처럼 앞에 종류만 오고 뒤에 고유 이름이 오면 종류를 뗀다 */
const PLACE_TYPES = new Set(['광장', '성당', '대성당', '다리', '궁전', '박물관', '미술관', '유적지', '전시관', '성', '탑', '분수', '거리', '언덕', '마을'])
const MAX_NAME_TOKENS = 6

/** 불릿 문장에서 명소 이름만 뽑는다. 설명 카드 제목이 문장 안에 있으면 그 이름으로 자른다 */
export function extractSightName(sentence: string, cardTitle?: string): string {
  const plain = sentence
    .replace(/^\s*[-•·▪]\s*/, '')
    .replace(TAG_STRIP, ' ')
    .replace(/\+.*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(NAME_TAIL, '')
  const tokens = plain.replace(/\s*,\s*/g, ' , ').split(' ').filter(Boolean)

  // 뒤에서부터 이름 덩어리를 모은다: 수식어로 끝나는 말이 나오면 멈춘다 ("탄식의 다리"처럼 짧은 소유격은 예외)
  const run: string[] = []
  for (let k = tokens.length - 1; k >= 0 && run.length < MAX_NAME_TOKENS; k--) {
    const tk = tokens[k]
    if (run.length > 0 && MODIFIER_END.test(tk)) {
      if (run.length === 1 && /의$/.test(tk) && tk.length <= 4) run.unshift(tk)
      break
    }
    run.unshift(tk)
  }

  // 설명 카드 제목(예: "카펠교 & 워터 타워")의 한 부분이 이름 덩어리 안에 있으면 거기서부터 자른다
  if (cardTitle) {
    const parts = cardTitle
      .replace(TAG_STRIP, ' ')
      .split(/[&＆/·]/)
      .map((p) => p.trim())
      .filter((p) => core(p).length >= 3)
    for (const part of parts) {
      const pc = core(part)
      for (let k = run.length - 1; k >= 0; k--) {
        const suffix = core(run.slice(k).join(''))
        if (suffix.includes(pc)) {
          return tidyName(run.slice(k))
        }
      }
    }
  }
  return tidyName(run)
}

function tidyName(tokens: string[]): string {
  const t = [...tokens]
  while (t.length > 1 && GENERIC_LEAD.has(t[0])) t.shift()
  if (t.length > 2 && t[0] === t[t.length - 1]) t.shift()
  if (t.length >= 2 && PLACE_TYPES.has(t[0]) && !PLACE_TYPES.has(t[t.length - 1])) t.shift()
  const name = t.join(' ').replace(/\s+,/g, ',').replace(/^[,&\s]+|[,&\s]+$/g, '')
  return name
}

/** 카드 제목에서 이름만 남긴다: 태그 제거 */
export function cardName(title: string): string {
  return title.replace(TAG_STRIP, '').replace(/\s+/g, ' ').trim()
}

function cardMatchesBullet(card: CardDraft, bulletText: string, sightKeys: string[]): boolean {
  const bc = core(bulletText)
  const title = card.title.text
  const parts = title
    .replace(TAG_STRIP, ' ')
    .split(/[&＆/·]/)
    .map((p) => core(p))
    .filter((p) => p.length >= 3)
  if (parts.some((p) => bc.includes(p))) return true
  return sightKeys.some((k) => title.includes(k) && bulletText.includes(k))
}

// ──────────────────────────────────────────────────────────────
// 일차 구조
// ──────────────────────────────────────────────────────────────

export function structureDay(lines: BlockLine[], sightKeys: string[], codes: Record<string, string> = {}): StructuredDay {
  const out: StructuredDay = {
    flights: [],
    sections: [],
    notices: [],
    infoCards: [],
    hidden: [],
    leftover: [],
    mealLines: [],
    lodgingLines: [],
    cities: [],
    sightCities: [],
    cardLayout: lines.some((l) => MORE_LINK.test(l.text.trim())),
  }
  const { cardLayout } = out

  const { consumed, flights, date } = extractFlights(lines, codes)
  out.flights = flights
  out.date = date

  const isBoundary = (l: BlockLine) => {
    const t = l.text.trim()
    return CITY_LINE.test(t) || /^예정$/.test(t) || MEAL_TAG.test(t) || MEAL_OLD.test(t) || BULLET.test(l.text) || TRANSPORT_HEAD.test(t)
  }
  const cards = cardLayout ? detectCards(lines, consumed, isBoundary) : new Map<number, { card: CardDraft; end: number }>()

  const mealParts: string[] = []
  let current: SectionDraft | undefined
  const section = () => {
    if (!current) {
      current = { moves: [], intro: [], sights: [] }
      out.sections.push(current)
    }
    return current
  }

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    const t = l.text.trim()
    if (consumed.has(l.lineNum)) continue

    // 카드 (명소 설명 / 선택관광 / 안내)
    const hit = cards.get(i)
    if (hit) {
      const { card } = hit
      const sec = section()
      i = hit.end - 1
      if (card.option) {
        sec.sights.push({ kind: 'option', line: card.title, card, option: readOptionInfo(card.body) })
        continue
      }
      const isInfo = INFO_CARD_TITLE.test(card.title.text)
      const bullets = sec.sights.filter((s) => s.kind === 'bullet' || s.kind === 'promoted')
      const free = bullets.filter((s) => !s.card)
      let target = isInfo ? undefined : free.find((s) => cardMatchesBullet(card, s.line.text, sightKeys))
      let byPosition = false
      if (!target && !isInfo && !EXPLICIT_TAG.test(card.title.text) && bullets.length === 1 && free.length === 1) {
        target = free[0]
        byPosition = true
      }
      if (target) {
        target.card = card
        target.cardByPosition = byPosition
      } else if (!isInfo && EXPLICIT_TAG.test(`${card.title.text} ${card.sub?.text ?? ''}`)) {
        // 태그가 붙은 제목이 어떤 불릿에도 없는 방문지라면 항목으로 올린다
        sec.sights.push({ kind: 'promoted', line: card.title, card })
        if (sec.city) sec.city.bullets++
      } else {
        out.infoCards.push(card)
      }
      continue
    }

    // 식사
    const mt = t.match(MEAL_TAG)
    if (mt) {
      mealParts.push(`${mt[1]} : ${mt[2].trim() || '-'}`)
      out.mealLines.push(l)
      continue
    }
    if (MEAL_OLD.test(t)) {
      out.meals = t.replace(/^[-*•]\s*/, '').replace(/^\[\s*식사\s*\]\s*[:：]?\s*/, '')
      out.mealLines.push(l)
      continue
    }
    if (/^호텔\s*조식\s*후/.test(t)) {
      out.notices.push({ ...l, kind: 'meal' })
      continue
    }

    // 숙박: "예정" 다음 줄이 숙소명, "[호텔] …" / "호텔 : …" 기존 형식
    if (/^예정$/.test(t)) {
      out.lodgingLines.push(l)
      const next = lines[i + 1]
      if (next && !consumed.has(next.lineNum) && !MEAL_TAG.test(next.text.trim()) && !/^\*?\s*숙박은\s*출발/.test(next.text.trim())) {
        out.lodging = next.text.trim()
        out.lodgingLines.push(next)
        i++
      }
      continue
    }
    if (/^\*?\s*숙박은\s*출발/.test(t)) {
      out.notices.push({ ...l, kind: 'lodging' })
      continue
    }
    if (HOTEL_OLD.test(t) && !/^호텔\s*조식\s*후/.test(t)) {
      out.lodging = t
        .replace(/^[-*•]\s*/, '')
        .replace(/^\[\s*(?:호텔|숙박|숙소)\s*\]\s*[:：]?\s*/, '')
        .replace(/^(?:호텔|숙박|투숙)\s*[:：]\s*/, '')
      out.lodgingLines.push(l)
      continue
    }

    // 날짜(이미 일차 날짜로 읽은 것 외)·UI·장식·안내(※)
    if (isUiResidue(t) || MORE_LINK.test(t)) {
      out.hidden.push(l)
      continue
    }
    if (/^[❤♥💕]/.test(t)) {
      out.notices.push({ ...l, kind: 'notice' })
      continue
    }
    const pre = detectNonSite(t)
    if (pre === 'decor') {
      out.hidden.push(l)
      continue
    }
    if (pre === 'notice') {
      out.notices.push({ ...l, kind: 'notice' })
      continue
    }
    if (pre === 'date') {
      out.leftover.push(l)
      continue
    }

    // "국가/도시" 줄: 새 구간 시작
    const cm = t.match(CITY_LINE)
    if (cm) {
      const city: CityLine = { country: cm[1], city: cm[2].trim(), line: l.lineNum, bullets: 0 }
      out.cities.push(city)
      current = { city, moves: [], intro: [], sights: [] }
      out.sections.push(current)
      continue
    }

    const sec = section()

    // 불릿: 카드형 페이지에서는 명소 본문, 일반 일정표에서는 일반 규칙으로 판독할 줄
    if (BULLET.test(l.text)) {
      if (cardLayout) {
        sec.sights.push({ kind: 'bullet', line: l })
        if (sec.city) sec.city.bullets++
      } else {
        sec.sights.push({ kind: 'generic', line: l })
      }
      continue
    }

    if (cardLayout) {
      if (OPS_LINE.test(t)) {
        out.notices.push({ ...l, kind: 'meeting' })
      } else if (GROUND_MOVE.test(t)) {
        const dur = t.match(/약\s*\d[\d.\-~\s]*(?:시간(?:\s*\d+\s*(?:분|뷴))?|분|뷴)/)?.[0].replace(/뷴/g, '분').replace(/\s+/g, ' ')
        sec.moves.push({ line: l, duration: dur })
      } else if (sec.sights.length === 0 && sec.moves.length === 0) {
        sec.intro.push(l)
      } else if (sec.sights.length === 0) {
        sec.intro.push(l)
      } else {
        out.leftover.push(l)
      }
      continue
    }

    sec.sights.push({ kind: 'generic', line: l })
  }

  if (mealParts.length > 0) out.meals = mealParts.join(' / ')

  out.sightCities = out.cities.filter((c) => c.bullets > 0)
  out.mainCity =
    out.sightCities.length > 0
      ? out.sightCities.reduce((best, c) => (c.bullets > best.bullets ? c : best), out.sightCities[0])
      : out.cities[out.cities.length - 1]

  return out
}

// ──────────────────────────────────────────────────────────────
// 도시 판정: "국가/도시" 줄 → 단어 경계 매칭
// ──────────────────────────────────────────────────────────────

/** 키 뒤에 붙으면 다른 단어가 되는 예외 ("로마네스크", "로마인") */
const FOLLOW_EXCLUDE: Record<string, string> = { 로마: '(?!네스크|인|시대|제국)' }

/**
 * 텍스트에서 도시 DB 키를 찾는다. 긴 키부터 시도하고, 키 앞에 한글이 붙어 있으면
 * 다른 단어의 일부로 보고 건너뛴다 ("베니스"의 "니스", "비즈니스"의 "니스").
 */
export function findCityKey(text: string, keys: string[]): string | undefined {
  const sorted = [...keys].sort((a, b) => b.length - a.length)
  for (const key of sorted) {
    const re = new RegExp(`(?<![가-힣A-Za-z])${key}${FOLLOW_EXCLUDE[key] ?? ''}`)
    if (re.test(text)) return key
  }
  return undefined
}
