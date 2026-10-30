import { Bus, Plane, TrainFront, type LucideIcon } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { JourneyNode, PackageResult, TransportKind } from '@/lib/mock-result'

const transport: Record<TransportKind, { icon: LucideIcon; label: string }> = {
  flight: { icon: Plane, label: '항공' },
  bus: { icon: Bus, label: '버스' },
  train: { icon: TrainFront, label: '기차' },
}

/** md 이상에서 한 줄에 놓을 최대 노드 수. 도시가 이보다 많으면 여러 줄로 나눈다 */
const MAX_PER_ROW = 5
/** 도시(인천 출발·귀국 제외)가 이 수를 넘으면 줄바꿈한다 */
const WRAP_CITIES = 5

/** 노드를 균형 있게 나눈다: 11개 → 4·4·3 (마지막 줄만 외롭게 남지 않도록) */
function splitRows(nodes: JourneyNode[], cities: number): JourneyNode[][] {
  if (cities <= WRAP_CITIES) return [nodes]
  const rowCount = Math.ceil(nodes.length / MAX_PER_ROW)
  const size = Math.ceil(nodes.length / rowCount)
  const rows: JourneyNode[][] = []
  for (let i = 0; i < nodes.length; i += size) rows.push(nodes.slice(i, i + size))
  return rows
}

function fullName(node: JourneyNode) {
  return node.label ? `${node.city}(${node.label})` : node.city
}

function CityNode({ node }: { node: JourneyNode }) {
  const isEnd = !node.nights
  return (
    <div className="flex min-w-0 items-center gap-3 md:flex-col md:gap-2">
      <span
        className={`relative z-20 flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink font-mono text-label-lg shadow-hard-sm ${
          isEnd ? 'bg-ink text-paper' : 'bg-gold text-white'
        }`}
        aria-hidden="true"
      >
        {isEnd ? '✈' : node.nights}
      </span>
      <div className="min-w-0 md:w-full md:px-1 md:text-center">
        {/* 이름은 최대 2줄, 넘치면 말줄임. 전체 이름은 title로 제공 */}
        <p title={fullName(node)} className="line-clamp-2 text-headline-sm [overflow-wrap:anywhere] [word-break:keep-all]">
          {node.city}
          {node.label && <span className="ml-1 font-mono text-label-sm text-ink-muted">({node.label})</span>}
        </p>
        {node.nights && (
          <span className="inline-block rounded border border-ink bg-card px-1.5 py-0.5 font-mono text-label-md">{node.nights}박</span>
        )}
      </div>
    </div>
  )
}

function Chip({ kind }: { kind: TransportKind }) {
  const { icon: Icon, label } = transport[kind]
  return (
    <span className="relative z-10 flex items-center gap-1 rounded-full border border-ink bg-card px-2 py-1 font-mono text-label-md whitespace-nowrap">
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}

/** 모바일: 세로 배치. 노드 사이에 세로 점선과 이동수단 칩 */
function VerticalTrack({ journey }: { journey: JourneyNode[] }) {
  return (
    <ol className="flex flex-col md:hidden">
      {journey.map((node, i) => (
        <li key={`${node.city}-${i}`} className="flex flex-col">
          <CityNode node={node} />
          {node.next && (
            <div className="flex items-center gap-3 py-1 pl-[21px]">
              <span className="h-8 w-0 border-l-2 border-dashed border-ink" aria-hidden="true" />
              <Chip kind={node.next} />
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}

/**
 * md 이상: 같은 폭의 칸(grid)에 노드를 놓고, 칸 사이를 점선과 칩으로 잇는다.
 * 줄이 바뀌는 곳은 "ㄹ"자로 꺾이는 점선(오른쪽 끝 노드 → 아래 → 왼쪽 → 다음 줄 첫 노드)에 칩을 얹어 끊기지 않게 한다.
 * 가로 스크롤 없이 칸 폭이 정해져 있어 이름이 길어도 노드 폭이 커지지 않는다.
 */
function WrapTrack({ rows, cols }: { rows: JourneyNode[][]; cols: number }) {
  const gridStyle: CSSProperties = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
  // 칸 중심 위치(%): 첫 칸 중심 ~ 마지막 칸 중심
  const inset = `${50 / cols}%`
  return (
    <div className="hidden md:block">
      {rows.map((row, r) => {
        const last = row[row.length - 1]
        const isLastRow = r === rows.length - 1
        return (
          <div key={r}>
            <ol className="grid" style={gridStyle}>
              {row.map((node, i) => {
                const hasNext = i < row.length - 1 && node.next
                return (
                  <li key={`${node.city}-${r}-${i}`} className="relative min-w-0">
                    <CityNode node={node} />
                    {hasNext && node.next && (
                      <>
                        {/* 이 칸의 중심에서 다음 칸의 중심까지 (원 높이의 가운데에 맞춘 점선) */}
                        <span aria-hidden="true" className="absolute top-[21px] left-1/2 w-full border-t-2 border-dashed border-ink" />
                        <span className="absolute top-[21px] left-full z-10 -translate-x-1/2 -translate-y-1/2">
                          <Chip kind={node.next} />
                        </span>
                      </>
                    )}
                  </li>
                )
              })}
            </ol>
            {!isLastRow && last.next && (
              <div className="relative h-14" style={{ marginLeft: inset, marginRight: inset }}>
                {/* 오른쪽 끝 노드에서 내려와 왼쪽으로 가는 선 */}
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 border-r-2 border-b-2 border-dashed border-ink" />
                {/* 왼쪽 끝에서 다음 줄 첫 노드로 내려가는 선 */}
                <span aria-hidden="true" className="absolute bottom-0 left-0 h-1/2 border-l-2 border-dashed border-ink" />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <Chip kind={last.next} />
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function JourneyTrack({ result }: { result: PackageResult }) {
  const { journey, journeySummary } = result
  const cities = journey.filter((n) => n.nights).length
  const rows = splitRows(journey, cities)
  const cols = Math.max(...rows.map((r) => r.length))
  return (
    <section
      aria-labelledby="journey-title"
      className="animate-fade-up rounded-lg border-[1.5px] border-ink bg-card p-4 shadow-hard md:p-6"
    >
      <h2 id="journey-title" className="mb-5 text-headline-md">
        🗺️ 여정 트랙 <span className="text-body-sm font-normal text-ink-muted">(루트 &amp; 숙박 이동 띠)</span>
      </h2>
      <VerticalTrack journey={journey} />
      <WrapTrack rows={rows} cols={cols} />
      <p className="mt-5 evidence-block px-3 py-2 text-body-sm">
        총 이동 도시 <b>{journeySummary.cities}개</b> / 호텔 이동 <b>{journeySummary.hotelMoves}회</b> (이동 피로도:{' '}
        <b className="text-warn-ink">{journeySummary.fatigue}</b>)
      </p>
    </section>
  )
}
