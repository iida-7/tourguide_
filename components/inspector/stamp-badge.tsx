import { TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Basis, TourMode } from '@/lib/mock-result'

const modeConfig: Record<TourMode, { label: string; className: string; rotate: string }> = {
  entry: {
    label: '🎟️ 진짜 입장!',
    className: 'border-[4px] border-double border-mint bg-mint/10 text-mint-ink',
    rotate: '-2deg',
  },
  exterior: {
    label: '👀 밖에서 찰칵(외관)',
    className: 'border-2 border-warn bg-warn/10 text-warn-ink',
    rotate: '1.5deg',
  },
  window: {
    label: '🚌 지나가며 조망(차창)',
    className: 'border-2 border-slate-stamp bg-slate-stamp/10 text-slate-ink',
    rotate: '-1deg',
  },
  ai: {
    label: '🤖 AI 판독(참고)',
    className: 'border-2 border-dashed border-ai bg-ai/10 text-ai-ink',
    rotate: '2deg',
  },
}

interface StampBadgeProps {
  mode: TourMode
  onClick?: () => void
  className?: string
}

export function StampBadge({ mode, onClick, className }: StampBadgeProps) {
  const config = modeConfig[mode]
  const base = cn(
    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-black tracking-tight',
    config.className,
    className,
  )
  const style = { transform: `rotate(${config.rotate})` }

  if (mode === 'ai') {
    return (
      <button
        type="button"
        onClick={onClick}
        style={style}
        aria-label="AI 판독 근거 보기 (참고용)"
        className={cn(
          base,
          'min-h-11 cursor-pointer transition-shadow hover:shadow-[3px_3px_0_0_#53299f] focus-visible:shadow-[3px_3px_0_0_#53299f]',
        )}
      >
        <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
        {config.label}
      </button>
    )
  }

  return (
    <span style={style} className={base}>
      {config.label}
    </span>
  )
}

export function BasisBadge({ basis, source }: { basis: Basis; source?: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
      <span className="rounded border border-ink/40 bg-card px-1.5 py-0.5 font-bold">
        🔎 {basis === 'fact' ? '사실 기반' : '키워드 판독'}
      </span>
      {source && (
        <span className="font-mono text-mint-ink underline decoration-dotted underline-offset-2">
          🔎 출처: {source}
        </span>
      )}
    </span>
  )
}

export function LineBadge({ line }: { line: number }) {
  return (
    <span className="inline-flex items-center rounded border border-ink bg-gold/25 px-1.5 py-0.5 font-mono text-xs font-bold whitespace-nowrap text-ink">
      📄 L{line}
    </span>
  )
}
