'use client'

import { BedDouble, Bus, Plane, Utensils } from 'lucide-react'
import { useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import type { AiReason, DaySchedule, FlightCard, GroundMove, Notice, ScheduleItem, SourceLine } from '@/lib/mock-result'
import { BasisBadge, LineBadge, LineRangeBadge, StampBadge } from './stamp-badge'

const dateOf = (d?: string, t?: string) => [d, t].filter(Boolean).join(' ')

/** 흩어져 있던 날짜/시각/편명/소요시간 줄을 하나로 묶은 항공 이동 카드 */
function FlightRow({ flight }: { flight: FlightCard }) {
  const dep = dateOf(flight.depDate, flight.depTime)
  const arr = dateOf(flight.arrDate, flight.arrTime)
  return (
    <li className="space-y-1 rounded border border-ledger bg-card px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Plane className="size-4 shrink-0 text-navy" aria-hidden="true" />
        <p className="min-w-0 text-body-md font-bold">
          {flight.from ?? '출발지 미표기'} 출발 <span aria-hidden="true">→</span> {flight.to ?? '도착지 미표기'} 도착
        </p>
        <LineRangeBadge lines={flight.lines} />
      </div>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-6 font-mono text-label-md text-ink-secondary">
        {flight.flightNo && <span>{flight.flightNo}</span>}
        {flight.duration && <span>소요 {flight.duration}</span>}
        {(dep || arr) && (
          <span className="text-ink-muted">
            {dep || '?'} → {arr || '?'}
          </span>
        )}
      </p>
    </li>
  )
}

function MoveRow({ move }: { move: GroundMove }) {
  return (
    <li className="flex flex-wrap items-start gap-2 rounded border border-dashed border-ledger bg-paper-deep px-3 py-1.5 text-body-sm text-ink-secondary">
      <Bus className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        {move.duration && <b className="mr-1.5 font-mono text-label-md text-ink">이동 {move.duration.replace(/^약\s*/, '약 ')}</b>}
        {move.text}
      </span>
      <LineBadge line={move.line} />
    </li>
  )
}

function SightCard({ item, onOpenAi }: { item: ScheduleItem; onOpenAi: (r: AiReason) => void }) {
  const [open, setOpen] = useState(false)
  const name = item.name ?? item.text
  const descHead = item.descHasTitle ? item.desc?.[0] : undefined
  const descRest = item.descHasTitle ? (item.desc?.slice(1) ?? []) : (item.desc ?? [])
  const first = item.desc?.[0]
  const last = item.desc?.[item.desc.length - 1]

  return (
    <li className="space-y-2 rounded border border-ledger bg-card p-3 md:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-ink px-2 py-0.5 font-mono text-label-md text-paper">{item.time}</span>
        <LineBadge line={item.line} />
        {item.option && (
          <span className="rounded border border-gold bg-gold-bg px-1.5 py-0.5 font-mono text-label-sm text-gold-ink">선택관광</span>
        )}
        <BasisBadge basis={item.basis} source={item.source} />
      </div>
      <h4 className="text-body-lg font-bold break-words">{name}</h4>
      {!item.option && item.name && item.name !== item.text && (
        <p className="text-body-sm text-ink-muted">
          <span className="font-mono text-label-sm">원문 </span>
          {item.text}
        </p>
      )}
      {item.option && (
        <p className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-label-md text-ink-secondary">
          {item.option.fee && <span>요금 {item.option.fee}</span>}
          {item.option.duration && <span>소요 {item.option.duration}</span>}
          {item.option.alternative && <span>대체일정 {item.option.alternative}</span>}
        </p>
      )}
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <div className="shrink-0">
          <StampBadge
            mode={item.mode}
            href={item.mode === 'entry' && item.source ? `https://${item.source}` : undefined}
            onClick={item.aiReason ? () => onOpenAi(item.aiReason as AiReason) : undefined}
          />
        </div>
        <p className="evidence-block flex-1 px-3 py-2 text-body-sm text-slate-ink">
          <span aria-hidden="true">💡 </span>
          {item.explain}
        </p>
      </div>
      {first && last && (
        <div>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="btn-ghost inline-flex min-h-11 items-center gap-2 px-3 font-mono text-label-md"
          >
            {open ? '설명 접기' : '설명 보기'}
            <LineRangeBadge lines={[first.line, last.line]} />
          </button>
          {open && (
            <div className="mt-1 space-y-1.5 rounded border border-ledger bg-paper-deep px-3 py-2 text-body-sm text-ink-secondary">
              {descHead && (
                <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                  {descHead.text}
                  <LineBadge line={descHead.line} />
                </p>
              )}
              {descRest.map((l) => (
                <p key={l.line} className="break-words">
                  {l.text} <LineBadge line={l.line} />
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function MealPills({ meals }: { meals: string }) {
  const parts = meals
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean)
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="식사 구성">
      {parts.map((p) => (
        <li key={p} className="rounded border border-ledger bg-card px-2 py-0.5 font-mono text-label-md">
          {p}
        </li>
      ))}
    </ul>
  )
}

function EstimatedBadge() {
  return (
    <span className="rounded border border-dashed border-ink-muted bg-card px-1.5 py-0.5 font-mono text-label-sm text-ink-muted">
      원문에 없음 · 기본값
    </span>
  )
}

function NoticeList({ notices }: { notices: Notice[] }) {
  return (
    <ul className="space-y-1">
      {notices.map((n) => (
        <li key={n.line} className="flex flex-wrap items-start gap-2 text-body-sm text-ink-secondary">
          <LineBadge line={n.line} />
          <span className="min-w-0 flex-1 break-words">{n.text}</span>
        </li>
      ))}
    </ul>
  )
}

function Lines({ lines }: { lines: SourceLine[] }) {
  return (
    <>
      {lines.map((l) => (
        <p key={l.line} className="flex flex-wrap items-start gap-2 text-body-sm text-ink-secondary">
          <LineBadge line={l.line} />
          <span className="min-w-0 flex-1 break-words">{l.text}</span>
        </p>
      ))}
    </>
  )
}

function DayCard({ day, onOpenAi }: { day: DaySchedule; onOpenAi: (r: AiReason) => void }) {
  const [showCards, setShowCards] = useState(false)
  const [showLeftover, setShowLeftover] = useState(false)

  const itemByLine = new Map(day.items.map((i) => [i.line, i]))
  // 옛 형식(구간 정보가 없는 결과)이면 방문지만 순서대로 보여 준다
  const sections = day.sections ?? [{ moves: [], intro: [], itemLines: day.items.map((i) => i.line) }]
  const notices = day.notices ?? []
  const mealNotes = notices.filter((n) => n.kind === 'meal')
  const lodgingNotes = notices.filter((n) => n.kind === 'lodging')
  const generalNotices = notices.filter((n) => n.kind === 'notice' || n.kind === 'meeting')
  const infoCards = day.infoCards ?? []
  const leftover = day.leftover ?? []
  const hasItems = day.items.length > 0

  return (
    <li className="animate-fade-up overflow-hidden rounded-lg border-[1.5px] border-ledger bg-card shadow-hard-sm">
      <header className="flex flex-col gap-1 border-b-[1.5px] border-ledger bg-paper-deep px-4 py-3 md:flex-row md:items-center md:gap-4">
        <span className="w-fit rounded border-[1.5px] border-ink bg-gold px-2.5 py-1 font-mono text-label-lg text-white shadow-hard-sm">
          DAY {String(day.day).padStart(2, '0')}
        </span>
        <h3 className="text-headline-sm">
          <span aria-hidden="true">{day.flag} </span>
          {day.city}
        </h3>
        {day.date && (
          <span className="flex items-center gap-1.5 font-mono text-label-md text-ink-secondary">
            {day.date.text}
            <LineBadge line={day.date.line} />
          </span>
        )}
        <p className="text-body-sm text-ink-muted md:ml-auto">{day.tagline}</p>
      </header>

      <div className="space-y-4 p-3 md:p-4">
        {day.flights && day.flights.length > 0 && (
          <section aria-label="항공 이동" className="space-y-2">
            <h4 className="font-mono text-label-md text-ink-muted">✈ 항공 이동</h4>
            <ul className="space-y-2">
              {day.flights.map((f) => (
                <FlightRow key={f.lines[0]} flight={f} />
              ))}
            </ul>
          </section>
        )}

        {sections.map((sec, si) => {
          const secItems = sec.itemLines.map((n) => itemByLine.get(n)).filter((i): i is ScheduleItem => Boolean(i))
          const empty = sec.moves.length === 0 && sec.intro.length === 0 && secItems.length === 0
          if (!sec.city && empty) return null
          return (
            <section key={`${sec.cityLine ?? 'x'}-${si}`} aria-label={sec.city ? `${sec.country ?? ''} ${sec.city}` : '일정'} className="space-y-2">
              {sec.city && (
                <h4 className="flex flex-wrap items-center gap-2 font-mono text-label-lg text-navy">
                  <span aria-hidden="true">📍</span>
                  {sec.country} / {sec.city}
                  {sec.cityLine && <LineBadge line={sec.cityLine} />}
                </h4>
              )}
              {(sec.moves.length > 0 || sec.intro.length > 0 || secItems.length > 0) && (
                <ul className="space-y-2">
                  {sec.moves.map((m) => (
                    <MoveRow key={m.line} move={m} />
                  ))}
                  {sec.intro.map((l) => (
                    <li key={l.line} className="flex flex-wrap items-start gap-2 text-body-sm text-ink-secondary">
                      <LineBadge line={l.line} />
                      <span className="min-w-0 flex-1 break-words">{l.text}</span>
                    </li>
                  ))}
                  {secItems.map((item) => (
                    <SightCard key={item.line} item={item} onOpenAi={onOpenAi} />
                  ))}
                </ul>
              )}
            </section>
          )
        })}

        {!hasItems && day.flights?.length === 0 && (
          <p className="rounded border border-dashed border-ledger bg-paper-deep px-3 py-2 text-body-sm text-ink-muted">
            이 일차에는 관람 방식을 판독할 방문지가 없어요. 이동·안내 내용은 위아래에 정리해 두었어요.
          </p>
        )}

        {generalNotices.length > 0 && (
          <section aria-label="유의사항" className="space-y-1.5 rounded border border-ledger bg-paper-deep px-3 py-2">
            <h4 className="font-mono text-label-md text-ink-muted">📌 유의사항·안내</h4>
            <NoticeList notices={generalNotices} />
          </section>
        )}

        {infoCards.length > 0 && (
          <div>
            <button
              type="button"
              aria-expanded={showCards}
              onClick={() => setShowCards((v) => !v)}
              className="btn-ghost print-hidden min-h-11 px-3 font-mono text-label-md"
            >
              {showCards ? '소개·안내 카드 접기' : `소개·안내 카드 ${infoCards.length}개 보기`}
            </button>
            {showCards && (
              <ul className="mt-2 space-y-2">
                {infoCards.map((c) => (
                  <li key={c.title.line} className="space-y-1 rounded border border-ledger bg-paper-deep px-3 py-2">
                    <p className="flex flex-wrap items-center gap-2 text-body-sm font-bold">
                      {c.title.text}
                      <LineBadge line={c.title.line} />
                    </p>
                    {c.sub && <Lines lines={[c.sub]} />}
                    <Lines lines={c.lines} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <footer className="space-y-2 border-t-[1.5px] border-ledger bg-paper-deep px-4 py-3 text-body-sm">
        <div className="flex flex-wrap items-start gap-2">
          <Utensils className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <MealPills meals={day.meals} />
          {day.mealsEstimated && <EstimatedBadge />}
          {day.mealLines && day.mealLines.length > 0 && <LineRangeBadge lines={day.mealLines.map((l) => l.line)} />}
        </div>
        {mealNotes.length > 0 && <NoticeList notices={mealNotes} />}
        <p className="flex flex-wrap items-start gap-2">
          <BedDouble className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <b>숙박</b> · {day.lodging}
          </span>
          {day.lodgingEstimated && <EstimatedBadge />}
          {day.lodgingLines && day.lodgingLines.length > 0 && <LineRangeBadge lines={day.lodgingLines.map((l) => l.line)} />}
        </p>
        {lodgingNotes.length > 0 && <NoticeList notices={lodgingNotes} />}
      </footer>

      {leftover.length > 0 && (
        <div className="print-hidden border-t border-ledger px-3 py-2 md:px-4">
          <button
            type="button"
            aria-expanded={showLeftover}
            onClick={() => setShowLeftover((v) => !v)}
            className="btn-ghost min-h-11 px-3 font-mono text-label-md"
          >
            {showLeftover ? '기타 원문 접기' : `정리하지 못한 원문 ${leftover.length}줄 보기`}
          </button>
          {showLeftover && (
            <div className="mt-2 space-y-1.5 rounded border border-dashed border-ledger bg-paper-deep px-3 py-2">
              <p className="text-body-sm text-ink-muted">방문지·이동·안내·식사·숙박 어디에도 넣을 수 없어 원문 그대로 둔 줄이에요.</p>
              <Lines lines={leftover} />
            </div>
          )}
        </div>
      )}
    </li>
  )
}

export function ScheduleTab({ days }: { days: DaySchedule[] }) {
  const [reason, setReason] = useState<AiReason | null>(null)

  return (
    <section aria-labelledby="schedule-title" className="space-y-4">
      <h2 id="schedule-title" className="text-headline-md">
        📅 일자별 팩트체크 일정
      </h2>
      <ol className="space-y-5">
        {days.map((d) => (
          <DayCard key={d.day} day={d} onOpenAi={setReason} />
        ))}
      </ol>

      <Sheet open={reason !== null} onOpenChange={(open) => !open && setReason(null)}>
        <SheetContent side="bottom" className="md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border-[1.5px]">
          <SheetTitle>판독 근거</SheetTitle>
          <SheetDescription>원문에 관람 방식이 적혀 있지 않아 Gemini에게 문맥을 물어본 결과예요. 참고용이며 확정 사실이 아니에요.</SheetDescription>
          {reason && (
            <dl className="space-y-3 text-body-sm">
              <div className="evidence-block p-3">
                <dt className="mb-1 flex items-center gap-2 font-bold">
                  원문 문장 <LineBadge line={reason.line} />
                </dt>
                <dd className="text-body-md">&ldquo;{reason.sentence}&rdquo;</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-ledger pb-2">
                <dt className="font-bold">근거 키워드</dt>
                <dd className="font-mono font-bold text-navy">{reason.keyword}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-bold">Gemini 응답</dt>
                <dd className="font-bold">{reason.verdict}</dd>
              </div>
            </dl>
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}
