import { Bus, Plane, TrainFront, type LucideIcon } from 'lucide-react'
import type { JourneyNode, PackageResult, TransportKind } from '@/lib/mock-result'

const transport: Record<TransportKind, { icon: LucideIcon; label: string }> = {
  flight: { icon: Plane, label: '항공' },
  bus: { icon: Bus, label: '버스' },
  train: { icon: TrainFront, label: '기차' },
}

function CityNode({ node }: { node: JourneyNode }) {
  const isEnd = !node.nights
  return (
    <div className="flex items-center gap-3 md:w-24 md:flex-col md:gap-2">
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink font-mono text-sm font-bold shadow-hard-sm ${
          isEnd ? 'bg-ink text-paper' : 'bg-gold text-white'
        }`}
        aria-hidden="true"
      >
        {isEnd ? '✈' : node.nights}
      </span>
      <div className="md:text-center">
        <p className="text-base font-black">
          {node.city}
          {node.label && <span className="ml-1 text-xs font-bold text-muted-foreground">({node.label})</span>}
        </p>
        {node.nights && (
          <span className="inline-block rounded border border-ink bg-card px-1.5 py-0.5 font-mono text-xs font-bold">
            {node.nights}박
          </span>
        )}
      </div>
    </div>
  )
}

function Connector({ kind }: { kind: TransportKind }) {
  const { icon: Icon, label } = transport[kind]
  return (
    <div className="flex items-center gap-3 py-1 pl-[21px] md:relative md:h-11 md:min-w-14 md:flex-1 md:justify-center md:p-0">
      <span className="h-8 w-0 border-l-2 border-dashed border-ink md:hidden" aria-hidden="true" />
      <span
        className="absolute inset-x-0 top-1/2 hidden border-t-2 border-dashed border-ink md:block"
        aria-hidden="true"
      />
      <span className="relative z-10 flex items-center gap-1 rounded-full border border-ink bg-card px-2 py-1 text-xs font-bold">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </span>
    </div>
  )
}

export function JourneyTrack({ result }: { result: PackageResult }) {
  const { journey, journeySummary } = result
  return (
    <section
      aria-labelledby="journey-title"
      className="animate-fade-up rounded-lg border-[1.5px] border-ink bg-card p-4 shadow-hard md:p-6"
    >
      <h2 id="journey-title" className="mb-5 text-lg font-black md:text-xl">
        🗺️ 여정 트랙 <span className="text-sm font-medium text-muted-foreground">(루트 &amp; 숙박 이동 띠)</span>
      </h2>
      <ol className="flex flex-col md:flex-row md:items-start">
        {journey.map((node, i) => (
          <li
            key={`${node.city}-${i}`}
            className={`flex flex-col md:flex-row md:items-start ${node.next ? 'md:flex-1' : 'md:flex-none'}`}
          >
            <CityNode node={node} />
            {node.next && <Connector kind={node.next} />}
          </li>
        ))}
      </ol>
      <p className="mt-5 rounded-md border border-dashed border-ink/60 bg-paper px-3 py-2 text-sm font-medium">
        총 이동 도시 <b>{journeySummary.cities}개</b> / 호텔 이동 <b>{journeySummary.hotelMoves}회</b> (이동 피로도:{' '}
        <b className="text-warn-ink">{journeySummary.fatigue}</b>)
      </p>
    </section>
  )
}
