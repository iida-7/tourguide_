import type { InventoryItem } from '@/lib/mock-result'
import { cn } from '@/lib/utils'

const rarity: Record<InventoryItem['rarity'], { label: string; slot: string }> = {
  common: { label: '일반', slot: 'border-ink/50 bg-card' },
  rare: { label: '레어', slot: 'border-mint bg-mint/10' },
  epic: { label: '에픽', slot: 'border-ai bg-ai/10' },
  legend: { label: '전설', slot: 'border-gold bg-gold/25' },
}

export function InventoryTab({ items }: { items: InventoryItem[] }) {
  return (
    <section aria-labelledby="inventory-title" className="space-y-4">
      <div>
        <h2 id="inventory-title" className="text-lg font-black md:text-xl">
          🎒 생존 인벤토리
        </h2>
        <p className="text-sm text-muted-foreground">이 일정에서 살아남기 위해 챙겨야 할 아이템 {items.length}종</p>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {items.map((item, i) => {
          const r = rarity[item.rarity]
          return (
            <li
              key={item.name}
              style={{ animationDelay: `${i * 60}ms` }}
              className={cn(
                'animate-fade-up flex flex-col gap-2 rounded-lg border-[1.5px] p-3 shadow-hard-sm transition-transform hover:-translate-y-0.5',
                r.slot,
              )}
            >
              <div className="flex items-start justify-between">
                <span aria-hidden="true" className="text-4xl leading-none">
                  {item.emoji}
                </span>
                <span className="rounded border border-ink/60 bg-card px-1.5 py-0.5 text-[10px] font-black">{r.label}</span>
              </div>
              <p className="text-sm font-black md:text-base">{item.name}</p>
              <ul className="space-y-0.5 text-xs leading-snug text-muted-foreground">
                {item.reasons.map((reason) => (
                  <li key={reason}>· {reason}</li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
