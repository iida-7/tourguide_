import { Progress } from '@/components/ui/progress'
import type { PackageResult } from '@/lib/mock-result'

const legend = [
  { icon: '📄', label: '원문줄번호' },
  { icon: '🔎', label: '검증된사실' },
  { icon: '💡', label: '쉬운해설' },
  { icon: '📊', label: '근거점수' },
  { icon: '🤖', label: 'AI판독(참고)' },
]

export function VerdictHeader({ result }: { result: PackageResult }) {
  const { coverage, grade, totalScore, diagnosis } = result
  return (
    <section aria-labelledby="verdict-title" className="space-y-4">
      <div className="rounded-lg border-[1.5px] border-ink bg-card p-4 shadow-hard">
        <p className="flex flex-wrap items-center gap-x-2 text-sm font-bold md:text-base">
          <span>🔎 감정 완료!</span>
          <span>
            해설 연결률: <span className="font-mono text-mint-ink">{coverage.rate}%</span>
          </span>
          <span className="text-muted-foreground">
            (방문지 {coverage.total}곳 중 {coverage.matched}곳 매칭 완료)
          </span>
        </p>
        <Progress
          value={coverage.rate}
          aria-label="해설 연결률"
          className="mt-3 gap-0"
          trackClassName="h-4 rounded-sm border-[1.5px] border-ink bg-paper-deep"
          indicatorClassName="bg-mint [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,0.28)_0_6px,transparent_6px_12px)]"
        />
        <ul
          aria-label="범례"
          className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {legend.map((l) => (
            <li
              key={l.label}
              className="flex shrink-0 items-center gap-1 rounded-full border border-ink/50 bg-paper px-2.5 py-1 text-xs font-medium"
            >
              <span aria-hidden="true">{l.icon}</span>
              {l.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col items-center gap-5 rounded-lg border-[1.5px] border-ink bg-card p-5 shadow-hard md:flex-row md:gap-8 md:p-6">
        <GradeStamp grade={grade} />
        <div className="space-y-2 text-center md:text-left">
          <p className="text-xs font-bold tracking-widest text-muted-foreground">종합 감정 판정</p>
          <h1 id="verdict-title" className="text-3xl font-black md:text-4xl">
            종합 가치 점수{' '}
            <span className="font-mono text-stamp-ink">{totalScore}점</span>{' '}
            <span className="text-lg font-bold text-muted-foreground md:text-xl">/ 100점</span>
          </h1>
          <p className="inline-block rounded-md border-[1.5px] border-dashed border-ink bg-gold/20 px-3 py-2 text-base font-bold text-balance md:text-lg">
            {diagnosis}
          </p>
        </div>
      </div>
    </section>
  )
}

export function GradeStamp({ grade }: { grade: string }) {
  return (
    <div
      role="img"
      aria-label={`종합 등급 ${grade}`}
      style={{ '--rot': '-8deg', '--stamp-opacity': '0.92' } as React.CSSProperties}
      className="relative flex size-36 shrink-0 animate-stamp-in items-center justify-center rounded-full border-[5px] border-double border-stamp bg-gold/20 text-stamp-ink md:size-44"
    >
      <span className="absolute inset-2 rounded-full border-2 border-stamp/70" aria-hidden="true" />
      <div className="text-center leading-none">
        <p className="text-[10px] font-black tracking-[0.25em] md:text-xs">INSPECTED</p>
        <p className="my-1 font-mono text-6xl font-bold tracking-tighter md:text-7xl">{grade}</p>
        <p className="text-[10px] font-black tracking-[0.25em] md:text-xs">감정 완료</p>
      </div>
    </div>
  )
}
