/**
 * 패키지 1:1 비교 모드 - 두 감정 결과(PackageResult)를 항목별로 비교하는 순수 함수 모음
 * (서버/외부 호출 없음, 100% 브라우저 내 계산)
 */

import { formatEur, type PackageResult } from './mock-result'

export type Side = 'a' | 'b'
export type Better = 'higher' | 'lower'

export interface PackageMetrics {
  grade: string
  totalScore: number
  days: number
  cities: number
  hotelMoves: number
  entry: number
  exterior: number
  window: number
  unknown: number
  /** 내부 입장 비율 (0~100) */
  entryRate: number
  /** 일정표에 "버스 약 N시간"으로 명시된 이동 시간 합계 */
  busHours: number
  busHoursFound: number
  packagePriceKrw: number
  /** 필수 현지 경비 (EUR) */
  mandatoryEur: number
  /** 선택관광 전체 합계 (EUR) */
  optionsEur: number
  /** 필수 경비를 원문에서 직접 읽었는지 (false면 일부가 평균 참고값) */
  costFromText: boolean
  eurToKrw: number
  /** 상품가 + 필수 현지 경비 (원) */
  realCostKrw: number
  /** 내부 입장 1회당 실지출 (원). 입장이 0이면 null */
  costPerEntry: number | null
  /** 1일당 실지출 (원) */
  costPerDay: number
  stats: Record<string, number>
}

export interface CompareRow {
  key: string
  group: '종합' | '관람 방식' | '이동·동선' | '비용' | '6대 스탯'
  label: string
  a: number | string
  b: number | string
  /** 표시용 문자열 */
  aText: string
  bText: string
  better: Better | null
  winner: Side | 'tie' | null
}

/** 일정 항목에서 "버스 약 N시간" 형태의 이동 시간을 합산 */
function extractBusHours(result: PackageResult): { hours: number; found: number } {
  let hours = 0
  let found = 0
  for (const d of result.days) {
    for (const it of d.items) {
      if (!/버스|차량|전용\s*차/.test(it.text) || /비행|항공/.test(it.text)) continue
      const m = it.text.match(/(\d+(?:\.\d+)?)\s*시간/)
      if (m) {
        hours += parseFloat(m[1])
        found += 1
      }
    }
  }
  return { hours: Math.round(hours * 10) / 10, found }
}

export function computeMetrics(result: PackageResult): PackageMetrics {
  let entry = 0
  let exterior = 0
  let window = 0
  let unknown = 0
  for (const d of result.days) {
    for (const it of d.items) {
      if (it.mode === 'entry') entry++
      else if (it.mode === 'exterior') exterior++
      else if (it.mode === 'window') window++
      else unknown++
    }
  }
  const totalItems = Math.max(1, entry + exterior + window + unknown)
  const { hours, found } = extractBusHours(result)

  const { receipt } = result
  const mandatoryEur = receipt.mandatory.reduce((s, l) => s + l.eur, 0)
  const optionsEur = receipt.options.reduce((s, l) => s + l.eur, 0)

  const realCostKrw = receipt.packagePriceKrw + mandatoryEur * receipt.eurToKrw
  const dayCount = Math.max(1, result.days.length)

  return {
    grade: result.grade,
    totalScore: result.totalScore,
    days: result.days.length,
    cities: result.journeySummary.cities,
    hotelMoves: result.journeySummary.hotelMoves,
    entry,
    exterior,
    window,
    unknown,
    entryRate: Math.round((entry / totalItems) * 100),
    busHours: hours,
    busHoursFound: found,
    packagePriceKrw: receipt.packagePriceKrw,
    mandatoryEur,
    optionsEur,
    costFromText: !receipt.mandatoryEstimated,
    eurToKrw: receipt.eurToKrw,
    realCostKrw,
    costPerEntry: entry > 0 ? Math.round(realCostKrw / entry) : null,
    costPerDay: Math.round(realCostKrw / dayCount),
    stats: Object.fromEntries(result.stats.map((s) => [s.key, s.score])),
  }
}

function pickWinner(a: number, b: number, better: Better | null): Side | 'tie' | null {
  if (better === null) return null
  if (a === b) return 'tie'
  const aWins = better === 'higher' ? a > b : a < b
  return aWins ? 'a' : 'b'
}

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

export function buildRows(
  ma: PackageMetrics,
  mb: PackageMetrics,
  statLabels: { key: string; label: string; max: number }[],
): CompareRow[] {
  const rows: CompareRow[] = []
  const add = (
    key: string,
    group: CompareRow['group'],
    label: string,
    a: number,
    b: number,
    better: Better | null,
    fmt: (n: number) => string = (n) => String(n),
  ) => {
    rows.push({ key, group, label, a, b, aText: fmt(a), bText: fmt(b), better, winner: pickWinner(a, b, better) })
  }

  add('score', '종합', '종합 가치 점수', ma.totalScore, mb.totalScore, 'higher', (n) => `${n}점`)

  add('entry', '관람 방식', '내부 입장', ma.entry, mb.entry, 'higher', (n) => `${n}회`)
  add('entryRate', '관람 방식', '내부 입장 비율', ma.entryRate, mb.entryRate, 'higher', (n) => `${n}%`)
  add('exterior', '관람 방식', '외부 관람', ma.exterior, mb.exterior, 'lower', (n) => `${n}회`)
  add('window', '관람 방식', '차창 조망', ma.window, mb.window, 'lower', (n) => `${n}회`)
  add('unknown', '관람 방식', '판독 불가(관람 방식 불명)', ma.unknown, mb.unknown, 'lower', (n) => `${n}건`)

  const busComparable = ma.busHoursFound > 0 || mb.busHoursFound > 0
  add('bus', '이동·동선', '버스 이동 시간(명시 기준)', ma.busHours, mb.busHours, busComparable ? 'lower' : null, (n) => `${n}시간`)
  add('cities', '이동·동선', '방문 도시 수', ma.cities, mb.cities, null, (n) => `${n}개`)
  add('hotelMoves', '이동·동선', '숙소 이동 횟수', ma.hotelMoves, mb.hotelMoves, 'lower', (n) => `${n}회`)
  add('days', '이동·동선', '여행 일수', ma.days, mb.days, null, (n) => `${n}일`)

  add('price', '비용', '상품가', ma.packagePriceKrw, mb.packagePriceKrw, 'lower', won)
  add('mandatory', '비용', '필수 현지 경비', ma.mandatoryEur, mb.mandatoryEur, 'lower', (n) => formatEur(n))
  add('options', '비용', '선택관광 합계', ma.optionsEur, mb.optionsEur, 'lower', (n) => formatEur(n))
  add('real', '비용', '예상 실지출 (상품가+필수경비)', ma.realCostKrw, mb.realCostKrw, 'lower', won)
  add('perDay', '비용', '1일당 실지출', ma.costPerDay, mb.costPerDay, 'lower', won)
  if (ma.costPerEntry !== null && mb.costPerEntry !== null) {
    add('perEntry', '비용', '내부 입장 1회당 실지출', ma.costPerEntry, mb.costPerEntry, 'lower', won)
  }

  for (const s of statLabels) {
    add(`stat-${s.key}`, '6대 스탯', s.label, ma.stats[s.key] ?? 0, mb.stats[s.key] ?? 0, 'higher', (n) => `${n}/${s.max}`)
  }

  return rows
}

export interface CompareSummary {
  winsA: number
  winsB: number
  ties: number
  overall: Side | 'tie'
  highlights: string[]
}

export function summarize(rows: CompareRow[], ma: PackageMetrics, mb: PackageMetrics): CompareSummary {
  const judged = rows.filter((r) => r.winner !== null && r.key !== 'score')
  const winsA = judged.filter((r) => r.winner === 'a').length
  const winsB = judged.filter((r) => r.winner === 'b').length
  const ties = judged.filter((r) => r.winner === 'tie').length

  // 종합 판정: 점수 차가 3점 이상이면 점수로, 비슷하면 항목별 승수로 결정 (승수 차 2 미만은 무승부)
  let overall: Side | 'tie'
  const scoreGap = ma.totalScore - mb.totalScore
  if (Math.abs(scoreGap) >= 3) overall = scoreGap > 0 ? 'a' : 'b'
  else if (Math.abs(winsA - winsB) >= 2) overall = winsA > winsB ? 'a' : 'b'
  else overall = 'tie'

  const highlights: string[] = []
  const diff = (x: number, y: number) => Math.abs(x - y)
  const name = (s: Side) => (s === 'a' ? 'A' : 'B')

  if (ma.entry !== mb.entry) {
    const s: Side = ma.entry > mb.entry ? 'a' : 'b'
    highlights.push(`내부 입장은 ${name(s)}가 ${diff(ma.entry, mb.entry)}회 더 많아요.`)
  }
  if (ma.busHoursFound + mb.busHoursFound > 0 && ma.busHours !== mb.busHours) {
    const s: Side = ma.busHours < mb.busHours ? 'a' : 'b'
    highlights.push(`버스 이동은 ${name(s)}가 ${diff(ma.busHours, mb.busHours)}시간 덜 타요.`)
  }
  if (ma.realCostKrw !== mb.realCostKrw) {
    const s: Side = ma.realCostKrw < mb.realCostKrw ? 'a' : 'b'
    highlights.push(`예상 실지출은 ${name(s)}가 ${won(diff(ma.realCostKrw, mb.realCostKrw))} 저렴해요.`)
  }
  if (ma.costPerEntry !== null && mb.costPerEntry !== null && ma.costPerEntry !== mb.costPerEntry) {
    const s: Side = ma.costPerEntry < mb.costPerEntry ? 'a' : 'b'
    highlights.push(`내부 입장 1회당 비용은 ${name(s)}가 더 낮아요.`)
  }
  if (ma.hotelMoves !== mb.hotelMoves) {
    const s: Side = ma.hotelMoves < mb.hotelMoves ? 'a' : 'b'
    highlights.push(`숙소 이동은 ${name(s)}가 ${diff(ma.hotelMoves, mb.hotelMoves)}회 적어 덜 피곤해요.`)
  }

  return { winsA, winsB, ties, overall, highlights }
}

/** 비교 결과를 마크다운으로 변환 (복사/다운로드용) */
export function compareToMarkdown(
  rows: CompareRow[],
  ma: PackageMetrics,
  mb: PackageMetrics,
  summary: CompareSummary,
  nameA: string,
  nameB: string,
): string {
  const mark = (r: CompareRow, s: Side) => (r.winner === s ? ' ✅' : '')
  const out: string[] = []
  out.push('# 패키지 1:1 비교 감정서', '')
  out.push(`- **${nameA}**: 등급 ${ma.grade} / ${ma.totalScore}점`)
  out.push(`- **${nameB}**: 등급 ${mb.grade} / ${mb.totalScore}점`)
  const verdict =
    summary.overall === 'tie' ? '두 상품의 종합 우열을 가리기 어려워요.' : `종합 판정: **${summary.overall === 'a' ? nameA : nameB}** 우세`
  out.push(`- ${verdict} (항목 승수 ${nameA} ${summary.winsA} : ${nameB} ${summary.winsB}, 무승부 ${summary.ties})`, '')
  if (summary.highlights.length) {
    out.push('## 핵심 차이', ...summary.highlights.map((h) => `- ${h}`), '')
  }
  let group = ''
  for (const r of rows) {
    if (r.group !== group) {
      group = r.group
      out.push('', `## ${group}`, '', `| 항목 | ${nameA} | ${nameB} |`, '|---|---|---|')
    }
    out.push(`| ${r.label} | ${r.aText}${mark(r, 'a')} | ${r.bText}${mark(r, 'b')} |`)
  }
  if (!ma.costFromText || !mb.costFromText) {
    out.push('', '> ※ 일정표에 필수 현지 경비 금액이 없는 항목은 유럽 패키지 평균 참고값으로 비용을 계산했습니다.')
  }
  out.push('', '> 본 비교는 일정표 원문 기반 룰 엔진 결과이며 참고용입니다.')
  return out.join('\n')
}
