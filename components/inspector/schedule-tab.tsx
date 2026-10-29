'use client'

import { BedDouble, Utensils } from 'lucide-react'
import { useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import type { AiReason, DaySchedule, ScheduleItem } from '@/lib/mock-result'
import { BasisBadge, LineBadge, StampBadge } from './stamp-badge'

function ScheduleRow({ item, onOpenAi }: { item: ScheduleItem; onOpenAi: (r: AiReason) => void }) {
  return (
    <li className="space-y-2 rounded-md border border-ink/30 bg-paper p-3 md:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-ink px-2 py-0.5 font-mono text-xs font-bold text-paper">{item.time}</span>
        <LineBadge line={item.line} />
        <BasisBadge basis={item.basis} source={item.source} />
      </div>
      <p className="text-sm leading-relaxed font-bold md:text-base">{item.text}</p>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div className="shrink-0 py-1 pl-1">
          <StampBadge
            mode={item.mode}
            onClick={item.aiReason ? () => onOpenAi(item.aiReason as AiReason) : undefined}
          />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span aria-hidden="true">💡 </span>
          {item.explain}
        </p>
      </div>
    </li>
  )
}

function DayCard({ day, onOpenAi }: { day: DaySchedule; onOpenAi: (r: AiReason) => void }) {
  return (
    <li className="animate-fade-up rounded-lg border-[1.5px] border-ink bg-card shadow-hard">
      <header className="flex flex-col gap-1 border-b-[1.5px] border-dashed border-ink/60 px-4 py-3 md:flex-row md:items-center md:gap-4">
        <span className="w-fit rounded-md border-[1.5px] border-ink bg-gold text-white px-2.5 py-1 font-mono text-sm font-bold shadow-hard-sm">
          DAY {day.day}
        </span>
        <h3 className="text-base font-black md:text-lg">
          <span aria-hidden="true">{day.flag} </span>
          {day.city}
        </h3>
        <p className="text-sm text-muted-foreground md:ml-auto">{day.tagline}</p>
      </header>
      <ul className="space-y-3 p-3 md:p-4">
        {day.items.map((item, i) => (
          <ScheduleRow key={`${day.day}-${i}`} item={item} onOpenAi={onOpenAi} />
        ))}
      </ul>
      <footer className="space-y-1.5 rounded-b-lg border-t-[1.5px] border-dashed border-ink/60 bg-paper-deep/60 px-4 py-3 text-sm">
        <p className="flex items-start gap-2">
          <Utensils className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <b>식사</b> · {day.meals}
          </span>
        </p>
        <p className="flex items-start gap-2">
          <BedDouble className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <b>숙박</b> · {day.lodging}
          </span>
        </p>
      </footer>
    </li>
  )
}

export function ScheduleTab({ days }: { days: DaySchedule[] }) {
  const [reason, setReason] = useState<AiReason | null>(null)

  return (
    <section aria-labelledby="schedule-title" className="space-y-4">
      <h2 id="schedule-title" className="text-lg font-black md:text-xl">
        📅 일자별 팩트체크 일정
      </h2>
      <ol className="space-y-5">
        {days.map((d) => (
          <DayCard key={d.day} day={d} onOpenAi={setReason} />
        ))}
      </ol>

      <Sheet open={reason !== null} onOpenChange={(open) => !open && setReason(null)}>
        <SheetContent side="bottom" className="md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border-[1.5px]">
          <SheetTitle>🤖 AI 판독 근거</SheetTitle>
          <SheetDescription>AI가 문맥을 읽고 추정한 참고용 결과입니다. 확정 사실이 아니에요.</SheetDescription>
          {reason && (
            <dl className="space-y-3 text-sm">
              <div className="rounded-md border border-dashed border-ai bg-ai/10 p-3">
                <dt className="mb-1 flex items-center gap-2 font-bold">
                  원문 문장 <LineBadge line={reason.line} />
                </dt>
                <dd className="leading-relaxed">&ldquo;{reason.sentence}&rdquo;</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-ink/20 pb-2">
                <dt className="font-bold">판독 키워드</dt>
                <dd className="font-mono font-bold text-ai-ink">{reason.keyword}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-bold">AI 판정</dt>
                <dd className="font-bold">{reason.verdict}</dd>
              </div>
            </dl>
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}
