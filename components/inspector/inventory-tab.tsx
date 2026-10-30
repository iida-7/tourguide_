import type { InventoryItem } from '@/lib/mock-result'
import { cn } from '@/lib/utils'

// DESIGN.md 색 토큰만 사용: 필수 = Secondary(Navy Archive) 강조, 권장 = 슬레이트, 있으면 좋음 = 가장 옅은 ledger.
// 필수 = 없으면 여행에 지장 / 권장 = 있으면 크게 편함 / 있으면 좋음 = 선택
const levelStyle: Record<InventoryItem['level'], { label: string; slot: string; tag: string }> = {
  must: { label: '필수', slot: 'border-navy bg-navy/10', tag: 'border-navy bg-navy text-white' },
  recommend: { label: '권장', slot: 'border-ink-muted bg-paper-deep', tag: 'border-ink-secondary bg-card text-ink-secondary' },
  optional: { label: '있으면 좋음', slot: 'border-ledger bg-card', tag: 'border-ledger bg-card text-ink-muted' },
}

export function InventoryTab({ items }: { items: InventoryItem[] }) {
  const count = (l: InventoryItem['level']) => items.filter((i) => i.level === l).length
  return (
    <section aria-labelledby="inventory-title" className="space-y-4">
      <div>
        <h2 id="inventory-title" className="text-headline-md">
          🎒 생존 인벤토리
        </h2>
        <p className="text-sm text-ink-muted">
          이 일정에 챙겨야 할 아이템 {items.length}종 · 필수 {count('must')} · 권장 {count('recommend')} · 있으면 좋음 {count('optional')}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {items.map((item, i) => {
          const r = levelStyle[item.level]
          return (
            <li
              key={item.name}
              style={{ animationDelay: `${i * 60}ms` }}
              className={cn(
                'animate-fade-up flex flex-col gap-2 rounded-lg border-[1.5px] p-3 shadow-hard-sm transition-transform hover:-translate-y-0.5',
                r.slot,
              )}
            >
              <div className="flex items-start justify-between gap-1">
                <span aria-hidden="true" className="text-4xl leading-none">
                  {item.emoji}
                </span>
                <span className={cn('rounded border px-1.5 py-0.5 text-center font-mono text-label-sm', r.tag)}>{r.label}</span>
              </div>
              <p className="text-headline-sm">{item.name}</p>
              <p className="evidence-block px-2 py-1 text-body-sm text-slate-ink">{item.basis}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
