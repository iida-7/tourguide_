/**
 * 일정표 원문에서 "필수 현지 경비"와 "선택관광" 금액(EUR)을 줄 단위로 읽어내는 파서
 * - 원문 줄 번호(1부터)를 함께 기록해 영수증의 "원문 줄번호" 배지와 연결
 * - 금액이 원문에 없으면 만들어내지 않는다 (호출 측에서 추정 여부를 표시)
 */

import type { OptionLine, ReceiptLine } from './mock-result'

export interface ParsedReceipt {
  mandatory: ReceiptLine[]
  options: OptionLine[]
}

const EUR_RE = /(?:€\s*(\d{1,4}(?:,\d{3})*)|(\d{1,4}(?:,\d{3})*)\s*(?:유로|EUR|euro))/gi

const OPTION_WORDS = /선택\s*관광|선택\s*옵션|옵션|\[선택\]/
const MANDATORY_WORDS = /가이드|기사|도시세|City\s*Tax|팁|매너|생수|현지\s*지불|입장료|비자|ETIAS|포터|짐\s*운반/i
const DAY_HEADER = /제\s*\d+\s*일|Day\s*\d+|\d+\s*일차|\[\s*\d+\s*일\s*\]/i

function firstEur(line: string): { eur: number; index: number; length: number } | null {
  EUR_RE.lastIndex = 0
  const m = EUR_RE.exec(line)
  if (!m) return null
  return { eur: parseInt((m[1] ?? m[2]).replace(/,/g, ''), 10), index: m.index, length: m[0].length }
}

/** 줄에서 항목 이름만 뽑는다: 번호/기호 제거, 금액·"1인당" 같은 꼬리 제거 */
function cleanLabel(line: string, amt: { index: number; length: number }): string {
  const strip = (s: string) =>
    s
      .replace(/^[\s\-–—·•●○■□▶▷◆◇※*]+/, '')
      .replace(/^(?:\d+[.)]|[①-⑩]|\(\d+\))\s*/, '')
      .replace(/^\[(?:선택|옵션)\]\s*/, '')
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

export function parseReceipt(raw: string): ParsedReceipt {
  const mandatory: ReceiptLine[] = []
  const options: OptionLine[] = []
  const seen = new Set<string>()
  let section: 'none' | 'mandatory' | 'options' = 'none'

  raw.split(/\r?\n/).forEach((rawLine, idx) => {
    const lineNum = idx + 1
    const t = rawLine.trim()
    if (!t) {
      section = 'none'
      return
    }

    const isHeader = /^[\[■□◆◇▶▷●※]/.test(t) && !/^[-·•]/.test(t)
    if (isHeader) {
      if (DAY_HEADER.test(t) || /일정\s*안내/.test(t)) section = 'none'
      else if (/선택\s*관광|옵션/.test(t)) section = 'options'
      else if (/불포함|현지\s*(?:필수\s*)?경비|현지\s*지불|추가\s*경비|별도\s*경비/.test(t)) section = 'mandatory'
    }

    const amt = firstEur(t)
    if (!amt || amt.eur <= 0) return

    const label = cleanLabel(t, amt)
    if (!label) return

    let kind: 'mandatory' | 'options' | null = null
    if (section === 'options') kind = 'options'
    else if (section === 'mandatory') kind = OPTION_WORDS.test(t) ? 'options' : 'mandatory'
    else if (OPTION_WORDS.test(t)) kind = 'options'
    else if (MANDATORY_WORDS.test(t) && !DAY_HEADER.test(t)) kind = 'mandatory'
    if (!kind) return

    const key = `${kind}:${label.slice(0, 10)}:${amt.eur}`
    if (seen.has(key)) return
    seen.add(key)

    if (kind === 'mandatory') {
      mandatory.push({ id: `m${mandatory.length + 1}`, label, eur: amt.eur, line: lineNum })
    } else {
      options.push({ id: `o${options.length + 1}`, label, eur: amt.eur, line: lineNum, tag: optionTag(t) })
    }
  })

  return { mandatory, options }
}
