import type { PackageResult } from '@/lib/mock-result'
import { JourneyTrack } from './journey-track'
import { RadarChart } from './radar-chart'
import { StatGauge } from './stat-gauge'

export function OverviewTab({ result }: { result: PackageResult }) {
  return (
    <div className="space-y-6">
      <JourneyTrack result={result} />

      <section
        aria-labelledby="stats-title"
        className="animate-fade-up rounded-lg border-[1.5px] border-ink bg-card p-4 shadow-hard md:p-6"
      >
        <h2 id="stats-title" className="mb-4 text-lg font-black md:text-xl">
          📊 패키지 6대 스탯 게이지 <span className="text-sm font-medium text-muted-foreground">(Hexagon Stats)</span>
        </h2>
        <div className="grid items-center gap-6 md:grid-cols-[minmax(0,400px)_1fr] md:gap-10">
          <RadarChart stats={result.stats} />
          <div className="space-y-4">
            {result.stats.map((s) => (
              <StatGauge key={s.key} label={s.label} weight={s.weight} score={s.score} max={s.max} note={s.note} />
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="country-title" className="animate-fade-up">
        <h2 id="country-title" className="mb-3 text-lg font-black md:text-xl">
          🌍 방문 국가별 1분 요약
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {result.countries.map((c) => (
            <li
              key={c.name}
              className="rounded-lg border-[1.5px] border-ink bg-card p-4 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
            >
              <p className="flex items-center gap-2 text-lg font-black">
                <span aria-hidden="true" className="text-3xl">
                  {c.flag}
                </span>
                {c.name}
              </p>
              <p className="mt-2 text-sm leading-relaxed">&ldquo;{c.summary}&rdquo;</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
