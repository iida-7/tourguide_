/**
 * 일정표 원문에서 "필수 현지 경비"와 "선택관광" 금액을 줄 단위로 읽어내는 파서
 * - 원문 줄 번호(1부터)를 함께 기록해 영수증의 "원문 줄번호" 배지와 연결
 * - EUR뿐 아니라 원/만원/$/£/CHF 표기를 읽고 EUR로 환산하되 원문 통화는 `original`에 보존
 * - 금액이 원문에 없으면 만들어내지 않는다 (호출 측에서 추정 여부를 표시하고 로그를 남긴다)
 */

import { findMoney, toEur, type Money } from './money-parser'
import type { OptionLine, ReceiptLine, ReceiptStatus } from './mock-result'

export interface ParsedReceipt {
  mandatory: ReceiptLine[]
  options: OptionLine[]
  /** 폴백 로그용 진단 정보 */
  diagnostics: {
    optionMentionsWithoutAmount: number
    mandatoryMentionsWithoutAmount: number
    converted: { line: number; label: string; original: string; eur: number }[]
    skippedLargeKrw: number
    /** 웹페이지형 선택관광 카드로 읽은 항목 수 */
    optionCards: number
    /** 선택관광 카드는 있는데 금액 줄을 못 찾은 수 */
    optionCardsWithoutAmount: number
    /** 선택관광인데 금액이 적혀 있지 않은 항목 (이름 + 원문 줄) */
    unpricedOptions: { label: string; line: number }[]
  }
}

const OPTION_WORDS = /선택\s*관광|선택\s*옵션|옵션|\[선택\]|\[선택관광/
const MANDATORY_WORDS = /가이드|기사|도시세|City\s*Tax|팁|매너|생수|현지\s*지불|입장료|비자|ETIAS|포터|짐\s*운반/i
const DAY_HEADER = /제\s*\d+\s*일|Day\s*\d+|\d+\s*일차|\[\s*\d+\s*일\s*\]/i

const SECTION_OPTIONS = /선택\s*관광|선택\s*옵션|옵션\s*(?:안내|투어|관광)|옵션\s*$/
const SECTION_MANDATORY = /불포함|현지\s*(?:필수\s*)?(?:경비|지불)|추가\s*경비|별도\s*경비|현지\s*필수/
const SECTION_NONE = /일정\s*안내|포함\s*사항|예약\s*안내|유의\s*사항|약관|취소\s*규정|항공\s*(?:일정|편)/

/** 줄에서 "항목 금액"으로 쓸 금액 하나를 고른다 (환산용 "약 €40" 같은 참고 금액은 뒤로 미룬다) */
function pickAmount(line: string): Money | null {
  const all = findMoney(line)
  return all.find((m) => !m.approx) ?? all[0] ?? null
}

/** 헤더 줄 판별: 금액이 없고 짧으며 섹션 키워드를 담은 줄 (기호로 시작하지 않아도 인정) */
function sectionOf(line: string, hasAmount: boolean): 'none' | 'mandatory' | 'options' | null {
  const symbolLed = /^[\[■□◆◇▶▷●※]/.test(line) && !/^[-·•]/.test(line)
  const short = line.length <= 40 && !hasAmount && !/^[-·•*]/.test(line) && !/[.。]$/.test(line)
  if (!symbolLed && !short) return null
  if (DAY_HEADER.test(line) || SECTION_NONE.test(line)) return 'none'
  if (SECTION_OPTIONS.test(line)) return 'options'
  if (SECTION_MANDATORY.test(line)) return 'mandatory'
  return null
}

/** 줄에서 항목 이름만 뽑는다: 번호/기호 제거, 금액·"1인당" 같은 꼬리 제거 */
function cleanLabel(line: string, amt: { index: number; length: number }): string {
  const strip = (s: string) =>
    s
      .replace(/^[\s\-–—·•●○■□▶▷◆◇※*]+/, '')
      .replace(/^(?:\d+[.)]|[①-⑩]|\(\d+\))\s*/, '')
      .replace(/^\[(?:선택관광|선택|옵션)(?:\/[^\]]*)?\]\s*/, '')
      .trim()
  const tail = /[\s:：\-–—(（\[/,·]*(?:1인당|1인|인당|전\s*일정|전체\s*일정|누적|권장|per\s*person|약)?[\s:：\-–—(（\[/,·]*$/i

  let before = strip(line.slice(0, amt.index))
  for (let i = 0; i < 3; i++) before = before.replace(tail, '').trim()
  let label = before

  if (!label) {
    // 금액이 앞에 오는 경우: "€70 곤돌라 투어"
    label = strip(line.slice(amt.index + amt.length)).replace(/^[\s)）\]:：\-–—/]*(?:1인당|1인)?[\s)）\]:：\-–—/]*/, '').trim()
  }
  label = label.replace(/\s{2,}/g, ' ')
  return label.length > 42 ? `${label.slice(0, 41)}…` : label
}

function optionTag(line: string): OptionLine['tag'] {
  if (/호텔\s*(?:휴식|대기)|숙소\s*(?:휴식|대기)/.test(line)) return '주의'
  if (/곤돌라|유람선|바토무슈|크루즈|추천/.test(line)) return '추천'
  return '선택'
}

/** 원화 금액이 이 값을 넘으면 선택관광/현지경비가 아니라 상품가로 본다 */
const KRW_ITEM_MAX = 1_000_000

/**
 * 여행사 웹페이지형 선택관광 카드:
 *   루체른 크루즈          ← 제목 (금액 줄 위쪽)
 *   선택관광               ← 마커
 *   루체른 크루즈          ← 부제
 *   자세히보기
 *   요금
 *   성인 : 60유로 / 아동 : 60유로 / 유아 : 60유로   ← 금액 줄
 * 항목 이름은 제목에서, 금액은 마커 아래 첫 금액(성인)에서 읽는다.
 */
const CARD_MARKER = /^\[?\s*선택\s*관광\s*\]?$/
const CARD_SCAN_AHEAD = 14
/** "명소명 [선택관광]" 한 줄 형식 */
const TAGGED_OPTION = /^(.*\S)\s*\[\s*선택\s*관광\s*\]\s*$/
const TAGGED_SCAN_AHEAD = 4

interface CardOption {
  title: string
  titleLine: number
  amtLine: number
  amount: Money
  tag: OptionLine['tag']
}

function parseOptionCards(rawLines: string[]): { cards: CardOption[]; withoutAmount: number; unpriced: { label: string; line: number }[] } {
  const out: CardOption[] = []
  const unpriced: { label: string; line: number }[] = []
  let withoutAmount = 0
  rawLines.forEach((raw, i) => {
    if (!CARD_MARKER.test(raw.trim())) return
    let titleIdx = i - 1
    while (titleIdx >= 0 && !rawLines[titleIdx].trim()) titleIdx--
    if (titleIdx < 0) return
    const title = rawLines[titleIdx].trim().replace(/^[-•·]\s*/, '')

    let descIdx = i + 1
    while (descIdx < rawLines.length && !rawLines[descIdx].trim()) descIdx++
    const desc = rawLines[descIdx]?.trim() ?? ''

    let found = false
    for (let j = i + 1; j < Math.min(rawLines.length, i + 1 + CARD_SCAN_AHEAD); j++) {
      const t = rawLines[j].trim()
      if (CARD_MARKER.test(t) || DAY_HEADER.test(t)) break // 다음 카드/일차로 넘어감
      const amt = pickAmount(t)
      if (amt && !(amt.currency === 'KRW' && amt.amount > KRW_ITEM_MAX)) {
        const label = title.length > 42 ? `${title.slice(0, 41)}…` : title
        out.push({ title: label, titleLine: titleIdx + 1, amtLine: j + 1, amount: amt, tag: optionTag(`${title} ${desc}`) })
        found = true
        break
      }
    }
    if (!found) {
      withoutAmount++
      unpriced.push({ label: title.length > 42 ? `${title.slice(0, 41)}…` : title, line: titleIdx + 1 })
    }
  })

  // 제목 줄에 "[선택관광]" 태그가 붙은 형식(모두투어): "빛의 채석장 [선택관광]". 아래 몇 줄에 금액이 없으면 금액 미표기 항목으로 남긴다.
  rawLines.forEach((raw, i) => {
    const m = raw.trim().match(TAGGED_OPTION)
    if (!m) return
    const title = m[1].replace(/^[-•·]\s*/, '').trim()
    for (let j = i + 1; j < Math.min(rawLines.length, i + 1 + TAGGED_SCAN_AHEAD); j++) {
      const t = rawLines[j].trim()
      if (!t) continue
      if (DAY_HEADER.test(t) || TAGGED_OPTION.test(t)) break
      const amt = pickAmount(t)
      if (amt && !(amt.currency === 'KRW' && amt.amount > KRW_ITEM_MAX)) {
        out.push({ title, titleLine: i + 1, amtLine: j + 1, amount: amt, tag: optionTag(title) })
        return
      }
    }
    withoutAmount++
    unpriced.push({ label: title, line: i + 1 })
  })
  return { cards: out, withoutAmount, unpriced }
}

export function parseReceipt(raw: string): ParsedReceipt {
  const mandatory: ReceiptLine[] = []
  const options: OptionLine[] = []
  const seen = new Set<string>()
  const diagnostics: ParsedReceipt['diagnostics'] = {
    optionMentionsWithoutAmount: 0,
    mandatoryMentionsWithoutAmount: 0,
    converted: [],
    skippedLargeKrw: 0,
    optionCards: 0,
    optionCardsWithoutAmount: 0,
    unpricedOptions: [],
  }
  let section: 'none' | 'mandatory' | 'options' = 'none'

  const rawLines = raw.split(/\r?\n/)
  // 웹페이지형 선택관광 카드(제목 / 선택관광 / 요금 / 성인 : 60유로)는 카드 단위로 먼저 읽고,
  // 그 금액 줄은 아래 일반 규칙에서 건너뛴다
  const { cards, withoutAmount, unpriced } = parseOptionCards(rawLines)
  diagnostics.optionCards = cards.length
  diagnostics.optionCardsWithoutAmount = withoutAmount
  diagnostics.unpricedOptions = unpriced
  const consumed = new Set(cards.map((c) => c.amtLine))

  rawLines.forEach((rawLine, idx) => {
    const lineNum = idx + 1
    const t = rawLine.trim()
    // 빈 줄은 섹션을 끊지 않는다: 헤더 아래 빈 줄을 두는 형식에서도 항목을 읽어야 하기 때문
    if (!t || consumed.has(lineNum)) return

    const amt = pickAmount(t)

    const next = sectionOf(t, amt !== null)
    if (next) section = next
    // 구분선은 섹션 경계
    else if (/^[-=_~─━]{5,}$/.test(t)) section = 'none'
    // 일차 헤더는 항상 섹션 종료
    if (DAY_HEADER.test(t) && /^[\[■□◆◇▶▷●]?\s*(?:제\s*\d+\s*일|Day\s*\d+|\d+\s*일차|\d+\s*일\s*\])/i.test(t)) section = 'none'

    if (!amt) {
      // 폴백 로그용: 섹션 안의 목록 항목인데 금액을 못 읽은 줄 수
      const listItem = /^[-·•*]|^\d+[.)]|^[①-⑩]/.test(t)
      if (!next && listItem && section === 'options') diagnostics.optionMentionsWithoutAmount++
      else if (!next && listItem && section === 'mandatory') diagnostics.mandatoryMentionsWithoutAmount++
      return
    }

    // 원화 고액은 상품가로 간주하고 영수증 항목에서 제외
    if (amt.currency === 'KRW' && amt.amount > KRW_ITEM_MAX) {
      diagnostics.skippedLargeKrw++
      return
    }

    const label = cleanLabel(t, amt)
    if (!label) return

    let kind: 'mandatory' | 'options' | null = null
    if (section === 'options') kind = 'options'
    else if (section === 'mandatory') kind = OPTION_WORDS.test(t) ? 'options' : 'mandatory'
    else if (OPTION_WORDS.test(t)) kind = 'options'
    else if (MANDATORY_WORDS.test(t) && !DAY_HEADER.test(t)) kind = 'mandatory'
    if (!kind) return

    const eur = Math.round(toEur(amt) * 100) / 100
    if (eur <= 0) return

    const key = `${kind}:${lineNum}:${label.slice(0, 10)}:${eur}`
    if (seen.has(key)) return
    seen.add(key)

    const original = amt.currency === 'EUR' ? undefined : { currency: amt.currency, amount: amt.amount }
    if (original) {
      diagnostics.converted.push({ line: lineNum, label, original: `${amt.amount} ${amt.currency}`, eur })
    }

    if (kind === 'mandatory') {
      mandatory.push({ id: '', label, eur, line: lineNum, original })
    } else {
      options.push({ id: '', label, eur, line: lineNum, tag: optionTag(t), original })
    }
  })

  for (const c of cards) {
    const eur = Math.round(toEur(c.amount) * 100) / 100
    if (eur <= 0) continue
    const original = c.amount.currency === 'EUR' ? undefined : { currency: c.amount.currency, amount: c.amount.amount }
    if (original) {
      diagnostics.converted.push({ line: c.amtLine, label: c.title, original: `${c.amount.amount} ${c.amount.currency}`, eur })
    }
    options.push({ id: '', label: c.title, eur, line: c.amtLine, tag: c.tag, original })
  }

  // 원문 줄 순서로 정렬하고 id를 부여한다
  const byLine = <T extends { line: number }>(a: T, b: T) => a.line - b.line
  options.sort(byLine).forEach((o, i) => (o.id = `o${i + 1}`))
  mandatory.sort(byLine).forEach((m, i) => (m.id = `m${i + 1}`))

  return { mandatory, options, diagnostics }
}

// ──────────────────────────────────────────────────────────────
// 필수 현지 경비: 항목별로 "원문 확인 / 언급만 있고 금액 없음 / 언급 없음"을 구분한다
// ──────────────────────────────────────────────────────────────

interface MandatoryCategory {
  id: string
  label: string
  match: RegExp
  /** 원문에 금액이 없을 때 쓰는 유럽 패키지 평균 참고값 (EUR) */
  avgEur: number
  /** 언급 줄을 고를 때 먼저 보는 단서 */
  prefer: RegExp
}

const MANDATORY_CATEGORIES: MandatoryCategory[] = [
  { id: 'guide', label: '가이드 경비', match: /가이드|기사\s*(?:경비|비용|팁|님)|기사\/가이드/, avgEur: 100, prefer: /경비|비용|팁|동행|지불/ },
  { id: 'citytax', label: '유럽 도시세', match: /도시세|City\s*Tax|관광세/i, avgEur: 35, prefer: /세/ },
  { id: 'tip', label: '식당 매너팁·생수', match: /팁|매너|생수/, avgEur: 15, prefer: /팁|매너/ },
]

/** 언급 줄에서 따올 문구: 짧으면 문장 전체, 길면 끝 두 어절 ("…가이드 및 인솔자는 동행하지 않습니다." → "동행하지 않습니다") */
function quoteOf(line: string): string {
  const t = line.replace(/^[\s*※·•\-]+/, '').replace(/[.。]+$/, '').trim()
  if (t.length <= 20) return t
  return t.split(/\s+/).slice(-2).join(' ')
}

/**
 * 원문에서 읽은 필수 경비(parsed)를 가이드·도시세·팁 3분류에 맞춰 상태를 붙인다.
 * - found: 원문에 금액이 있음 (줄 번호 표시)
 * - mentioned: 항목은 언급되지만 금액이 없음 (언급 문구와 줄 번호를 보여 준다)
 * - absent: 원문에 언급 자체가 없음 → 평균 참고값 (금액을 만들어 내지 않고, 참고값임을 화면에 표시)
 * 3분류에 속하지 않는 금액 항목(입장료·비자 등)은 그대로 found로 둔다.
 */
export function buildMandatory(raw: string, parsed: ReceiptLine[]): ReceiptLine[] {
  const rawLines = raw.split(/\r?\n/)
  const out: ReceiptLine[] = []
  const used = new Set<string>()

  for (const cat of MANDATORY_CATEGORIES) {
    const hits = parsed.filter((m) => cat.match.test(m.label))
    if (hits.length > 0) {
      hits.forEach((h) => {
        used.add(h.id)
        out.push({ ...h, status: 'found' as ReceiptStatus })
      })
      continue
    }

    // 금액은 없지만 말은 나오는 줄을 찾는다 (※ 안내 줄과 경비 단서가 있는 줄을 먼저)
    const mentions = rawLines
      .map((text, i) => ({ text: text.trim(), line: i + 1 }))
      .filter((l) => l.text && cat.match.test(l.text) && !pickAmount(l.text) && !DAY_HEADER.test(l.text))
    const pick = mentions.find((l) => l.text.startsWith('※') && cat.prefer.test(l.text)) ?? mentions.find((l) => cat.prefer.test(l.text)) ?? mentions[0]
    if (pick) {
      out.push({ id: cat.id, label: cat.label, eur: cat.avgEur, line: pick.line, status: 'mentioned', quote: quoteOf(pick.text) })
    } else {
      out.push({ id: cat.id, label: cat.label, eur: cat.avgEur, line: 0, status: 'absent' })
    }
  }

  parsed.filter((m) => !used.has(m.id)).forEach((m) => out.push({ ...m, status: 'found' }))
  out.forEach((m, i) => (m.id = m.id || `m${i + 1}`))
  return out
}
