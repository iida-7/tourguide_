'use client'

import { useState } from 'react'
import type { FitItem, PackageResult } from '@/lib/mock-result'
import { cn } from '@/lib/utils'
import { SegmentBar } from './stat-gauge'

const toneStyle: Record<FitItem['tone'], { bar: string; badge: string }> = {
  warn: { bar: 'bg-warn', badge: 'bg-warn/15 text-warn-ink border-warn' },
  good: { bar: 'bg-mint', badge: 'bg-mint/15 text-mint-ink border-mint' },
  best: { bar: 'bg-navy', badge: 'bg-navy/10 text-navy border-navy' },
}

export function ValuationTab({ result }: { result: PackageResult }) {
  const { valuation } = result
  const [aiOn, setAiOn] = useState(false)
  const score = aiOn ? valuation.aiScore : valuation.baseScore

  return (
    <section aria-labelledby="valuation-title" className="space-y-6">
      <h2 id="valuation-title" className="text-headline-md">
        ⚖️ 최종 가성비 감정서
      </h2>

      <div className="rounded-lg border-[1.5px] border-ink bg-card p-4 shadow-hard md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-label-md uppercase text-ink-muted">종합 가치 점수</p>
            <p className="font-display text-5xl font-bold tabular-nums text-ink" aria-live="polite">
              {score}
              <span className="text-xl text-ink-muted"> / 100</span>
            </p>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded border-[1.5px] border-ink bg-ai-bg px-3 py-2">
            <input
              type="checkbox"
              checked={aiOn}
              onChange={(e) => setAiOn(e.target.checked)}
              className="size-5 cursor-pointer accent-navy"
            />
            <span className="text-sm font-bold">불분명한 항목도 반영해서 재산정</span>
          </label>
        </div>
        <SegmentBar value={score} max={100} segments={25} label={`종합 가치 점수 ${score}점`} className="mt-4" colorClass="bg-navy" />
        <p className="mt-3 min-h-10 text-sm text-ink-muted">
          {aiOn ? valuation.aiNote : '원문에 적힌 관람 방식만으로 계산한 기본 점수예요. 체크하면 관람 방식이 불분명한 항목도 반영해 다시 계산해요.'}
        </p>
      </div>

      <div>
        <h3 className="mb-3 text-headline-sm md:text-headline-md">🎯 여행 취향별 적합도</h3>
        <ul className="grid gap-4 md:grid-cols-3">
          {valuation.fits.map((f) => {
            const t = toneStyle[f.tone]
            return (
              <li key={f.label} className="space-y-3 rounded-lg border-[1.5px] border-ink bg-card p-4 shadow-hard">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <span aria-hidden="true" className="text-2xl">
                    {f.emoji}
                  </span>
                  {f.label}
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-display text-headline-lg tabular-nums">{f.score}점</span>
                  <span className={cn('rounded border px-2 py-0.5 font-mono text-label-md', t.badge)}>{f.verdict}</span>
                </div>
                <SegmentBar value={f.score} max={100} segments={12} label={`${f.label} 적합도 ${f.score}점`} colorClass={t.bar} />
                <p className="text-sm text-ink-muted">{f.note}</p>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border-[1.5px] border-mint bg-mint-bg p-4">
          <p className="mb-1 text-label-lg font-mono text-mint-ink">👍 최고의 장점</p>
          <p className="text-body-md">{valuation.pros}</p>
        </div>
        <div className="rounded-lg border-[1.5px] border-warn bg-warn-bg p-4">
          <p className="mb-1 text-label-lg font-mono text-warn-ink">👎 아쉬운 단점</p>
          <p className="text-body-md">{valuation.cons}</p>
        </div>
      </div>
    </section>
  )
}
