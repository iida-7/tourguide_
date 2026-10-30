import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Basis, TourMode } from '@/lib/mock-result'

// DESIGN.md §Components 2: hairline-bordered, mono label-md badges on fixed tinted fills.
// 배지 이름은 "판독 결과" 자체다. 판독이 안 되면 억지로 외관/입장으로 확정하지 않고 판독 불가로 표시한다.
const modeConfig: Record<TourMode, { label: string; className: string }> = {
  entry: {
    label: '내부 입장',
    className: 'border-mint bg-mint-bg text-mint-ink',
  },
  exterior: {
    label: '외부 관람',
    className: 'border-warn bg-warn-bg text-warn-ink',
  },
  window: {
    label: '차창 조망',
    className: 'border-window bg-window-bg text-window-ink',
  },
  unknown: {
    label: '판독 불가(원문에 관람 방식 언급 없음)',
    className: 'border-slate-stamp border-dashed bg-ai-bg text-slate-ink',
  },
}

export const MODE_LABEL: Record<TourMode, string> = {
  entry: modeConfig.entry.label,
  exterior: modeConfig.exterior.label,
  window: modeConfig.window.label,
  unknown: '판독 불가',
}

interface StampBadgeProps {
  mode: TourMode
  onClick?: () => void
  /** Verified venue URL; entry badges render as an external link when provided. */
  href?: string
  className?: string
}

export function StampBadge({ mode, onClick, href, className }: StampBadgeProps) {
  const config = modeConfig[mode]
  const base = cn(
    'inline-flex max-w-full items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-label-md',
    config.className,
    className,
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${config.label} · 판독 근거 보기`}
        className={cn(base, 'min-h-11 cursor-pointer text-left transition-shadow hover:shadow-hard-sm focus-visible:shadow-hard-sm')}
      >
        {config.label}
      </button>
    )
  }

  if (mode === 'entry' && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${config.label} 공식 출처 열기 (새 창)`}
        className={cn(base, 'min-h-11 transition-shadow hover:shadow-hard-sm focus-visible:shadow-hard-sm')}
      >
        {config.label}
        <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
      </a>
    )
  }

  return <span className={base}>{config.label}</span>
}

const BASIS_LABEL: Record<Basis, string> = {
  fact: '사실 기반',
  keyword: '원문 표기·키워드',
  gemini: 'Gemini 추정(참고용)',
}

// DESIGN.md §Colors: verified source hyperlinks use the Secondary (Navy Archive) token.
export function BasisBadge({ basis, source }: { basis: Basis; source?: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-label-sm uppercase">
      <span className="rounded border border-ledger bg-card px-1.5 py-0.5 text-ink-secondary">🔎 {BASIS_LABEL[basis]}</span>
      {source && (
        <a
          href={`https://${source}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-navy normal-case underline decoration-dotted underline-offset-2 hover:decoration-solid"
        >
          출처: {source}
        </a>
      )}
    </span>
  )
}

// DESIGN.md §Typography: line pointers are label-sm mono on muted slate fills.
export function LineBadge({ line }: { line: number }) {
  return (
    <span className="inline-flex items-center rounded border border-ledger bg-paper-deep px-1.5 py-0.5 font-mono text-label-sm whitespace-nowrap text-ink-muted">
      L-{String(line).padStart(2, '0')}
    </span>
  )
}

/** 여러 줄을 묶은 카드용: L-04–L-24 */
export function LineRangeBadge({ lines }: { lines: number[] }) {
  if (lines.length === 0) return null
  const min = Math.min(...lines)
  const max = Math.max(...lines)
  const fmt = (n: number) => `L-${String(n).padStart(2, '0')}`
  return (
    <span className="inline-flex items-center rounded border border-ledger bg-paper-deep px-1.5 py-0.5 font-mono text-label-sm whitespace-nowrap text-ink-muted">
      {min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`}
    </span>
  )
}
