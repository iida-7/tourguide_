import { formatKrw, type PackageResult } from './mock-result'

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
    for (const i of d.items) lines.push(`- [${i.time}] ${i.text} (원문 L${i.line}) — ${i.explain}`)
    lines.push(`- 식사: ${d.meals}`, `- 숙박: ${d.lodging}`, '')
  }

  lines.push('## 숨은 비용', '')
  lines.push(`- 기본 패키지가: ${formatKrw(r.receipt.packagePriceKrw)}`)
  for (const m of r.receipt.mandatory) lines.push(`- [필수] ${m.label}: €${m.eur}`)
  for (const o of r.receipt.options) lines.push(`- [${o.tag}] ${o.label}: €${o.eur}`)
  lines.push('')

  lines.push('## 최종 감정', '')
  lines.push(`- 장점: ${r.valuation.pros}`, `- 단점: ${r.valuation.cons}`, '')

  lines.push('## 생존 인벤토리', '')
  for (const it of r.inventory) lines.push(`- ${it.emoji} ${it.name} — ${it.reasons.join(', ')}`)
  return lines.join('\n')
}
