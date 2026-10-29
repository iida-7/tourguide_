import { cn } from '@/lib/utils'

interface SegmentBarProps {
  value: number
  max: number
  segments?: number
  label: string
  colorClass?: string
  className?: string
}

export function SegmentBar({ value, max, segments = 20, label, colorClass = 'bg-mint', className }: SegmentBarProps) {
  const safeMax = max > 0 ? max : 1
  const filled = Math.round((Math.max(0, value) / safeMax) * segments)
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('flex h-4 gap-[2px] rounded-sm border-[1.5px] border-ink bg-paper-deep p-[2px]', className)}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          style={{ animationDelay: `${i * 35}ms` }}
          className={cn(
            'h-full flex-1 origin-bottom',
            i < filled ? cn('animate-seg', colorClass) : 'bg-ink/10',
          )}
        />
      ))}
    </div>
  )
}

interface StatGaugeProps {
  label: string
  weight: number
  score: number
  max: number
  note: string
}

export function StatGauge({ label, weight, score, max, note }: StatGaugeProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="text-sm font-bold">
          {label} <span className="font-mono text-xs font-medium text-muted-foreground">[가중치 {weight}%]</span>
        </p>
        <p className="text-sm">
          <b className="font-mono text-base">
            {score} / {max}점
          </b>{' '}
          <span className="text-muted-foreground">({note})</span>
        </p>
      </div>
      <SegmentBar value={score} max={max} label={`${label} ${score}점 (만점 ${max}점)`} />
    </div>
  )
}
