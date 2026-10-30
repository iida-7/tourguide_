/**
 * 일정표 원문 속 금액 표기를 읽는 공통 파서
 * - 1,890,000원 / 1890000원 / 189만원 / 18만 9천원 / ₩1,890,000
 * - €180 / 180€ / 180유로 / EUR 180
 * - $50 / 50달러 / £30 / 30파운드 / CHF 120 / 120프랑
 */

import type { Currency } from './mock-result'

/** EUR 1단위당 각 통화의 가정 환율 (실시간 환율 아님. 영수증 화면에 "환율 가정"으로 표기됨) */
export const EUR_PER_UNIT: Record<Currency, number> = {
  EUR: 1,
  USD: 0.92,
  GBP: 1.17,
  CHF: 1.05,
  KRW: 1 / 1500,
}

export interface Money {
  currency: Currency
  amount: number
  /** 원문 줄 안에서의 위치 */
  index: number
  length: number
  /** "약 €40"처럼 환산 참고용으로 덧붙은 금액인지 */
  approx: boolean
}

const NUM = String.raw`\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?`

const SYMBOL_CUR: Record<string, Currency> = {
  '€': 'EUR',
  EUR: 'EUR',
  '$': 'USD',
  'US$': 'USD',
  USD: 'USD',
  '£': 'GBP',
  GBP: 'GBP',
  CHF: 'CHF',
  '₩': 'KRW',
  KRW: 'KRW',
}

const WORD_CUR: Record<string, Currency> = {
  원: 'KRW',
  krw: 'KRW',
  유로: 'EUR',
  euro: 'EUR',
  euros: 'EUR',
  eur: 'EUR',
  '€': 'EUR',
  달러: 'USD',
  usd: 'USD',
  $: 'USD',
  파운드: 'GBP',
  gbp: 'GBP',
  '£': 'GBP',
  프랑: 'CHF',
  chf: 'CHF',
}

function toNumber(s: string): number {
  return parseFloat(s.replace(/,/g, ''))
}

function isApprox(text: string, index: number): boolean {
  return /(?:약|≒|대략|환산|approx\.?)\s*[(（]?\s*$/i.test(text.slice(Math.max(0, index - 8), index))
}

/** 줄 안의 모든 금액을 위치 순으로 반환한다. 겹치는 표기는 먼저 잡힌(더 구체적인) 쪽만 남긴다. */
export function findMoney(text: string): Money[] {
  const found: Money[] = []
  const taken: [number, number][] = []
  const overlaps = (s: number, e: number) => taken.some(([a, b]) => s < b && e > a)
  const push = (currency: Currency, amount: number, index: number, length: number) => {
    if (!Number.isFinite(amount) || amount <= 0 || overlaps(index, index + length)) return
    taken.push([index, index + length])
    found.push({ currency, amount, index, length, approx: isApprox(text, index) })
  }

  // 1) 189만원, 18만 9천원, 1.5만원
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*만\s*(?:(\d+)\s*천\s*)?원/g)) {
    push('KRW', parseFloat(m[1]) * 10_000 + (m[2] ? parseInt(m[2], 10) * 1_000 : 0), m.index ?? 0, m[0].length)
  }

  // 2) 통화 기호/코드가 앞에 오는 표기: €180, EUR 180, $50, US$50, £30, CHF 120, ₩1,890,000
  const pre = new RegExp(String.raw`(US\$|[€$£₩]|EUR|USD|GBP|CHF|KRW)\s*(${NUM})`, 'gi')
  for (const m of text.matchAll(pre)) {
    const cur = SYMBOL_CUR[m[1].toUpperCase()] ?? SYMBOL_CUR[m[1]]
    if (cur) push(cur, toNumber(m[2]), m.index ?? 0, m[0].length)
  }

  // 3) 단위가 뒤에 오는 표기: 180유로, 180€, 1,890,000원, 50달러, 30파운드, 120프랑, 180 EUR
  const suf = new RegExp(String.raw`(${NUM})\s*(원|유로|euros?|EUR|USD|GBP|CHF|KRW|달러|파운드|프랑|[€$£])(?![A-Za-z])`, 'gi')
  for (const m of text.matchAll(suf)) {
    const cur = WORD_CUR[m[2].toLowerCase()]
    if (cur) push(cur, toNumber(m[1]), m.index ?? 0, m[0].length)
  }

  return found.sort((a, b) => a.index - b.index)
}

export function toEur(m: Pick<Money, 'currency' | 'amount'>): number {
  return m.amount * EUR_PER_UNIT[m.currency]
}

export function toKrw(m: Pick<Money, 'currency' | 'amount'>, eurToKrw: number): number {
  return m.currency === 'KRW' ? m.amount : m.amount * EUR_PER_UNIT[m.currency] * eurToKrw
}

// ──────────────────────────────────────────────────────────────
// 기본 패키지 상품가
// ──────────────────────────────────────────────────────────────

export const PRICE_MIN_KRW = 500_000
export const PRICE_MAX_KRW = 20_000_000
export const DEFAULT_PACKAGE_PRICE_KRW = 1_990_000

const PRICE_LABEL = /상품\s*(?:가|가격|금액|요금)|판매\s*(?:가|가격)|패키지\s*(?:가|가격|요금)|여행\s*(?:요금|경비|금액)|총\s*(?:요금|금액|경비)|1인\s*(?:요금|기준|가격)|성인|요금|가격|상품가|Price/i
const PRICE_PENALTY = /싱글|추가|할증료?(?!\s*포함)|아동|유아|소아|선택|옵션|현지|가이드|기사|팁|도시세|보험|비자|환불|취소|위약|예약금|계약금|보증금|할인|쿠폰/
const DAY_HEADER = /제\s*\d+\s*일|Day\s*\d+|\d+\s*일차|\[\s*\d+\s*일\s*\]/i

export interface PriceResult {
  value: number
  source: 'label' | 'before-itinerary' | 'any-in-range' | 'default'
  line?: number
  /** 범위 안/밖으로 걸러진 후보 수 (폴백 로그용) */
  candidates: number
  rejected: number
}

/** 원문에서 기본 패키지 상품가(원)를 찾는다. 라벨이 붙은 금액을 우선하고, 못 찾으면 기본값으로 폴백한다. */
export function extractPackagePrice(raw: string): PriceResult {
  const lines = raw.split(/\r?\n/)
  let firstDay = lines.findIndex((l) => DAY_HEADER.test(l))
  if (firstDay < 0) firstDay = lines.length

  let best: { value: number; score: number; line: number; label: boolean } | null = null
  let candidates = 0
  let rejected = 0

  lines.forEach((text, idx) => {
    for (const m of findMoney(text)) {
      if (m.currency !== 'KRW' || m.approx) continue
      candidates++
      if (m.amount < PRICE_MIN_KRW || m.amount > PRICE_MAX_KRW) {
        rejected++
        continue
      }
      const label = PRICE_LABEL.test(text)
      let score = 0
      if (label) score += 3
      if (idx < firstDay) score += 1
      if (PRICE_PENALTY.test(text)) score -= 3
      if (!best || score > best.score) best = { value: m.amount, score, line: idx + 1, label }
    }
  })

  if (!best) return { value: DEFAULT_PACKAGE_PRICE_KRW, source: 'default', candidates, rejected }
  const b = best as { value: number; score: number; line: number; label: boolean }
  const source: PriceResult['source'] = b.label ? 'label' : b.line <= firstDay ? 'before-itinerary' : 'any-in-range'
  return { value: b.value, source, line: b.line, candidates, rejected }
}
