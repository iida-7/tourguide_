import type { StatItem } from '@/lib/mock-result'

const WIDTH = 400
const HEIGHT = 340
const CX = WIDTH / 2
const CY = HEIGHT / 2
const RADIUS = 96
const LABEL_RADIUS = RADIUS + 26

function point(index: number, total: number, ratio: number, radius = RADIUS) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2
  return [CX + Math.cos(angle) * radius * ratio, CY + Math.sin(angle) * radius * ratio] as const
}

function polygon(total: number, ratioAt: (i: number) => number) {
  return Array.from({ length: total }, (_, i) => point(i, total, ratioAt(i)).join(',')).join(' ')
}

export function RadarChart({ stats }: { stats: StatItem[] }) {
  const n = stats.length
  const summary = stats.map((s) => `${s.label} ${s.score}/${s.max}`).join(', ')

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`패키지 6대 스탯 레이더 차트. ${summary}`}
      className="mx-auto h-auto w-full max-w-[400px]"
    >
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon
          key={r}
          points={polygon(n, () => r)}
          fill={r === 1 ? 'rgba(224,168,46,0.10)' : 'none'}
          stroke="#1F2A44"
          strokeWidth={r === 1 ? 1.5 : 1}
          strokeDasharray={r === 1 ? undefined : '3 3'}
          opacity={r === 1 ? 1 : 0.4}
        />
      ))}
      {stats.map((_, i) => {
        const [x, y] = point(i, n, 1)
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#1F2A44" strokeWidth={1} opacity={0.35} />
      })}

      <g
        className="animate-radar"
        style={{ transformOrigin: `${CX}px ${CY}px`, transformBox: 'view-box' }}
      >
        <polygon
          points={polygon(n, (i) => (stats[i].max ? stats[i].score / stats[i].max : 0))}
          fill="rgba(216,67,47,0.28)"
          stroke="#D8432F"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {stats.map((s, i) => {
          const ratio = s.max ? s.score / s.max : 0
          const [x, y] = point(i, n, ratio)
          return <circle key={s.key} cx={x} cy={y} r={4.5} fill="#E0A82E" stroke="#1F2A44" strokeWidth={1.5} />
        })}
      </g>

      {stats.map((s, i) => {
        const [x, y] = point(i, n, 1, LABEL_RADIUS)
        const anchor = x < CX - 4 ? 'end' : x > CX + 4 ? 'start' : 'middle'
        return (
          <g key={s.key}>
            <text
              x={x}
              y={y - 2}
              textAnchor={anchor}
              fontSize={13}
              fontWeight={700}
              fill="#1F2A44"
              style={{ fontFamily: 'var(--font-noto-kr), sans-serif' }}
            >
              {s.shortLabel}
            </text>
            <text
              x={x}
              y={y + 13}
              textAnchor={anchor}
              fontSize={12}
              fontWeight={700}
              fill="#B02F1D"
              style={{ fontFamily: 'var(--font-plex-mono), monospace' }}
            >
              {s.score}/{s.max}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
