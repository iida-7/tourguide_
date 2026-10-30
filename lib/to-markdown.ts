import { formatEur, formatKrw, formatOriginal, type PackageResult, type TourMode } from './mock-result'

const MODE_LABEL: Record<TourMode, string> = { entry: '내부 입장', exterior: '외부 관람', window: '차창 조망', unknown: '판독 불가' }
const LEVEL_LABEL = { must: '필수', recommend: '권장', optional: '있으면 좋음' } as const

export function toMarkdown(r: PackageResult): string {
  const lines: string[] = []
  lines.push('# 유럽 패키지 감정 결과', '')
  lines.push(`- 종합 등급: **${r.grade}** (${r.totalScore}/100점)`)
  lines.push(`- 한줄 진단: ${r.diagnosis}`)
  lines.push(`- 해설 연결률: ${r.coverage.rate}% (${r.coverage.total}곳 중 ${r.coverage.matched}곳)`, '')

  lines.push('## 6대 스탯', '')
  for (const s of r.stats) lines.push(`- ${s.label}: ${s.score}/${s.max} (${s.note})`)
  lines.push('')

  lines.push('## 일정 팩트체크', '')
  for (const d of r.days) {
    lines.push(`### DAY ${d.day} · ${d.city}`)
    if (d.date) lines.push(`- 날짜: ${d.date.text} (원문 L${d.date.line})`)
    for (const f of d.flights ?? []) {
      const when = [f.depDate && `${f.depDate} ${f.depTime ?? ''}`.trim(), f.arrDate && `${f.arrDate} ${f.arrTime ?? ''}`.trim()].filter(Boolean).join(' → ')
      lines.push(`- ✈ ${f.from ?? '?'} 출발 → ${f.to ?? '?'} 도착${f.flightNo ? ` · ${f.flightNo}` : ''}${f.duration ? ` · 소요 ${f.duration}` : ''}${when ? ` (${when})` : ''} (원문 L${Math.min(...f.lines)}–L${Math.max(...f.lines)})`)
    }
    for (const s of d.sections ?? []) {
      for (const m of s.moves) lines.push(`- 이동: ${m.text} (원문 L${m.line})`)
    }
    for (const i of d.items) {
      lines.push(`- [${i.time}] ${i.name ?? i.text}${i.option ? ' (선택관광)' : ''} — ${MODE_LABEL[i.mode]} (원문 L${i.line}) — ${i.explain}`)
      if (i.option?.fee) lines.push(`  - 요금: ${i.option.fee}${i.option.duration ? ` / 소요 ${i.option.duration}` : ''}`)
    }
    for (const n of d.notices ?? []) lines.push(`- 안내: ${n.text} (원문 L${n.line})`)
    for (const l of d.leftover ?? []) lines.push(`- 기타 원문: ${l.text} (원문 L${l.line})`)
    lines.push(`- 식사: ${d.meals}`, `- 숙박: ${d.lodging}`, '')
  }

  lines.push('## 숨은 비용', '')
  lines.push(`- 기본 패키지가: ${formatKrw(r.receipt.packagePriceKrw)}`)
  for (const m of r.receipt.mandatory) {
    const status =
      m.status === 'mentioned'
        ? `원문 L${m.line}에 '${m.quote}'로만 표기, 금액 없음 · 평균 참고값`
        : m.status === 'absent'
          ? '원문에 별도 표기 없음 · 일반적인 평균 참고값'
          : `원문 확인 L${m.line}`
    lines.push(`- [필수 현지 경비] ${m.label}: ${formatEur(m.eur)} (${status})${m.original ? ` (원문 ${formatOriginal(m.original)})` : ''}`)
  }
  if (r.receipt.options.length === 0) lines.push(r.receipt.optionsWithoutAmount ? `- 선택관광 ${r.receipt.optionsWithoutAmount}건 (금액 표기 없음)` : '- 이 일정표에는 선택관광이 없어요')
  for (const o of r.receipt.options) lines.push(`- [${o.tag}] ${o.label}: ${formatEur(o.eur)}${o.original ? ` (원문 ${formatOriginal(o.original)})` : ''} (원문 L${o.line})`)
  lines.push('')

  lines.push('## 최종 감정', '')
  lines.push(`- 장점: ${r.valuation.pros}`, `- 단점: ${r.valuation.cons}`, '')

  lines.push('## 생존 인벤토리', '')
  for (const it of r.inventory) lines.push(`- [${LEVEL_LABEL[it.level]}] ${it.emoji} ${it.name} — ${it.basis}`)
  return lines.join('\n')
}
