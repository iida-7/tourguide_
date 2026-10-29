'use client'

import { ArrowLeft, Check, ClipboardCopy, Download, ImageIcon, Scale, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  buildRows,
  compareToMarkdown,
  computeMetrics,
  summarize,
  type CompareRow,
  type PackageMetrics,
  type Side,
} from '@/lib/compare'
import { inspectItinerary } from '@/lib/inspector-engine'
import { MAX_CHARS, departureMonths, type PackageResult } from '@/lib/mock-result'
import { SAMPLE_ITINERARY_TEXT } from '@/lib/sample-itinerary'
import { SAMPLE_ITINERARY_B_TEXT } from '@/lib/sample-itinerary-b'
import { renderCompareCard } from '@/lib/share-card'
import { cn } from '@/lib/utils'
import { ShareCardModal } from './share-card-modal'

interface Analysis {
  ra: PackageResult
  rb: PackageResult
  ma: PackageMetrics
  mb: PackageMetrics
}

const SIDE_STYLE = {
  a: { dot: 'bg-mint', text: 'text-mint-ink', cell: 'bg-mint/15', stroke: '#10b981', fill: 'rgba(16,185,129,0.22)' },
  b: { dot: 'bg-stamp', text: 'text-stamp-ink', cell: 'bg-stamp/15', stroke: '#dc2626', fill: 'rgba(220,38,38,0.18)' },
} as const

/* ---------- 입력 단계 ---------- */

function PackageBox({
  side,
  name,
  onName,
  text,
  onText,
  onSample,
}: {
  side: Side
  name: string
  onName: (v: string) => void
  text: string
  onText: (v: string) => void
  onSample: () => void
}) {
  const s = SIDE_STYLE[side]
  const label = side === 'a' ? 'A' : 'B'
  const over = text.length > MAX_CHARS
  return (
    <section className="space-y-3 rounded-lg border-[1.5px] border-ink bg-card p-4 shadow-hard md:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-black">
          <span className={cn('flex size-7 items-center justify-center rounded border-[1.5px] border-ink font-mono text-sm text-white', s.dot)}>
            {label}
          </span>
          상품 {label}
        </h2>
        <button
          type="button"
          onClick={onSample}
          className="inline-flex min-h-8 items-center gap-1.5 rounded border border-ink/40 bg-gold/25 px-2.5 py-1 text-xs font-bold hover:bg-gold/40 active:translate-y-px"
        >
          <Sparkles className="size-3.5 text-gold-ink" aria-hidden="true" />
          예시 불러오기
        </button>
      </div>
      <input
        type="text"
        value={name}
        maxLength={20}
        onChange={(e) => onName(e.target.value)}
        aria-label={`상품 ${label} 이름`}
        placeholder={`상품 ${label} 이름 (예: ○○투어 서유럽 8일)`}
        className="h-10 w-full rounded-md border-[1.5px] border-ink bg-paper px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <Textarea
        value={text}
        onChange={(e) => onText(e.target.value)}
        aria-label={`상품 ${label} 일정표`}
        aria-invalid={over}
        placeholder="여행사 일정표 전체를 붙여넣으세요."
        className="min-h-72 resize-y rounded-md border-[1.5px] border-ink bg-paper px-3 py-3 font-mono text-sm leading-relaxed placeholder:text-ink/40"
      />
      <p className={cn('font-mono text-xs', over ? 'font-black text-stamp-ink' : 'text-muted-foreground')}>
        {text.length.toLocaleString('ko-KR')} / {MAX_CHARS.toLocaleString('ko-KR')}자
        {over && ' — 글자 수 초과'}
      </p>
    </section>
  )
}

/* ---------- 겹쳐 그리는 레이더 ---------- */

const W = 400
const H = 340
const CX = W / 2
const CY = H / 2
const R = 96

function pt(i: number, n: number, ratio: number, radius = R) {
  const ang = (Math.PI * 2 * i) / n - Math.PI / 2
  return [CX + Math.cos(ang) * radius * ratio, CY + Math.sin(ang) * radius * ratio] as const
}

function CompareRadar({ ra, rb, nameA, nameB }: { ra: PackageResult; rb: PackageResult; nameA: string; nameB: string }) {
  const n = ra.stats.length
  const poly = (stats: PackageResult['stats']) =>
    stats.map((s, i) => pt(i, n, s.max ? s.score / s.max : 0).join(',')).join(' ')
  const desc =
    `${nameA}: ` + ra.stats.map((s) => `${s.shortLabel} ${s.score}`).join(', ') +
    `. ${nameB}: ` + rb.stats.map((s) => `${s.shortLabel} ${s.score}`).join(', ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`두 상품 6대 스탯 겹침 레이더 차트. ${desc}`} className="mx-auto h-auto w-full max-w-[420px]">
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon
          key={r}
          points={Array.from({ length: n }, (_, i) => pt(i, n, r).join(',')).join(' ')}
          fill="none"
          stroke="#0f172a"
          strokeWidth={r === 1 ? 1.5 : 1}
          strokeDasharray={r === 1 ? undefined : '3 3'}
          opacity={r === 1 ? 1 : 0.35}
        />
      ))}
      {ra.stats.map((_, i) => {
        const [x, y] = pt(i, n, 1)
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#0f172a" strokeWidth={1} opacity={0.25} />
      })}
      <polygon points={poly(ra.stats)} fill={SIDE_STYLE.a.fill} stroke={SIDE_STYLE.a.stroke} strokeWidth={2.5} />
      <polygon points={poly(rb.stats)} fill={SIDE_STYLE.b.fill} stroke={SIDE_STYLE.b.stroke} strokeWidth={2.5} strokeDasharray="6 3" />
      {ra.stats.map((s, i) => {
        const [x, y] = pt(i, n, 1, R + 26)
        return (
          <text key={s.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={12} fontWeight={700} fill="#0f172a">
            {s.shortLabel}
          </text>
        )
      })}
    </svg>
  )
}

/* ---------- 결과 단계 ---------- */

function Cell({ row, side }: { row: CompareRow; side: Side }) {
  const win = row.winner === side
  return (
    <td
      className={cn(
        'px-3 py-2 text-right font-mono text-sm tabular-nums md:text-base',
        win ? cn(SIDE_STYLE[side].cell, 'font-black', SIDE_STYLE[side].text) : 'text-ink/80',
      )}
    >
      {win && <Check className="mr-1 inline size-3.5 align-[-2px]" aria-label="우세" />}
      {side === 'a' ? row.aText : row.bText}
    </td>
  )
}

function Results({
  analysis,
  nameA,
  nameB,
  onBack,
}: {
  analysis: Analysis
  nameA: string
  nameB: string
  onBack: () => void
}) {
  const { ra, rb, ma, mb } = analysis
  const [copied, setCopied] = useState(false)
  const [showCard, setShowCard] = useState(false)

  const rows = useMemo(
    () => buildRows(ma, mb, ra.stats.map((s) => ({ key: s.key, label: s.label, max: s.max }))),
    [ma, mb, ra.stats],
  )
  const summary = useMemo(() => summarize(rows, ma, mb), [rows, ma, mb])
  const groups = useMemo(() => Array.from(new Set(rows.map((r) => r.group))), [rows])
  const markdown = useMemo(() => compareToMarkdown(rows, ma, mb, summary, nameA, nameB), [rows, ma, mb, summary, nameA, nameB])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('아래 내용을 복사하세요', markdown)
    }
  }

  const download = () => {
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = '패키지-비교-감정서.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  const overallName = summary.overall === 'a' ? nameA : summary.overall === 'b' ? nameB : null
  const approx = !ma.costFromText || !mb.costFromText

  return (
    <div className="space-y-6">
      {showCard && (
        <ShareCardModal
          title="1:1 비교 카드 (공유용 이미지)"
          generate={() => renderCompareCard(rows, ma, mb, summary, nameA, nameB)}
          onClose={() => setShowCard(false)}
        />
      )}
      <div className="print-hidden flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-11 items-center gap-1.5 rounded-md text-sm font-bold underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          일정표 다시 입력하기
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowCard(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-md border-[1.5px] border-ink bg-gold/30 px-3 text-sm font-bold shadow-hard-sm hover:translate-x-px hover:translate-y-px hover:shadow-none">
            <ImageIcon className="size-4" aria-hidden="true" />
            카드 이미지
          </button>
          <button type="button" onClick={copy} className="inline-flex min-h-10 items-center gap-1.5 rounded-md border-[1.5px] border-ink bg-card px-3 text-sm font-bold shadow-hard-sm hover:translate-x-px hover:translate-y-px hover:shadow-none">
            {copied ? <Check className="size-4" aria-hidden="true" /> : <ClipboardCopy className="size-4" aria-hidden="true" />}
            {copied ? '복사됨!' : '마크다운 복사'}
          </button>
          <button type="button" onClick={download} className="inline-flex min-h-10 items-center gap-1.5 rounded-md border-[1.5px] border-ink bg-card px-3 text-sm font-bold shadow-hard-sm hover:translate-x-px hover:translate-y-px hover:shadow-none">
            <Download className="size-4" aria-hidden="true" />
            .md 다운로드
          </button>
        </div>
      </div>

      {/* 종합 판정 */}
      <section aria-labelledby="cmp-verdict" className="rounded-lg border-[1.5px] border-ink bg-card p-4 shadow-hard md:p-6">
        <h2 id="cmp-verdict" className="mb-4 flex items-center gap-2 text-lg font-black md:text-xl">
          <Scale className="size-5" aria-hidden="true" />
          1:1 비교 감정 결과
        </h2>
        <div className="grid grid-cols-2 gap-3 md:gap-5">
          {([['a', nameA, ma], ['b', nameB, mb]] as const).map(([side, name, m]) => {
            const isWinner = summary.overall === side
            return (
              <div
                key={side}
                className={cn(
                  'rounded-lg border-[1.5px] p-3 text-center md:p-4',
                  isWinner ? cn('border-ink shadow-hard-sm', SIDE_STYLE[side].cell) : 'border-ink/30',
                )}
              >
                <p className={cn('truncate text-sm font-black md:text-base', SIDE_STYLE[side].text)}>{name}</p>
                <p className="mt-1 font-mono text-4xl font-bold md:text-5xl">{m.totalScore}</p>
                <p className="text-xs font-bold text-muted-foreground">등급 {m.grade}</p>
                {isWinner && <p className="mt-1 text-xs font-black text-stamp-ink">👑 종합 우세</p>}
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-sm font-bold md:text-base" aria-live="polite">
          {overallName ? `종합 판정: ${overallName} 우세` : '종합 판정: 두 상품이 비슷해요'}
          <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
            (항목 승수 {summary.winsA} : {summary.winsB}, 무승부 {summary.ties})
          </span>
        </p>
        {summary.highlights.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed">
            {summary.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}
      </section>

      {/* 겹침 레이더 */}
      <section aria-labelledby="cmp-radar" className="rounded-lg border-[1.5px] border-ink bg-card p-4 shadow-hard md:p-6">
        <h3 id="cmp-radar" className="mb-2 text-base font-black md:text-lg">
          🕸️ 6대 스탯 겹쳐 보기
        </h3>
        <CompareRadar ra={ra} rb={rb} nameA={nameA} nameB={nameB} />
        <ul className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs font-bold">
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-6 bg-mint" aria-hidden="true" /> {nameA} (실선)
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block w-6 border-t-2 border-dashed border-stamp" aria-hidden="true" /> {nameB} (점선)
          </li>
        </ul>
      </section>

      {/* 항목별 표 */}
      <section aria-labelledby="cmp-table" className="space-y-4">
        <h3 id="cmp-table" className="text-base font-black md:text-lg">
          📊 항목별 비교
        </h3>
        {groups.map((g) => (
          <div key={g} className="overflow-hidden rounded-lg border-[1.5px] border-ink bg-card shadow-hard">
            <table className="w-full border-collapse text-left">
              <caption className="border-b-[1.5px] border-ink bg-paper-deep px-3 py-2 text-left text-sm font-black">{g}</caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">항목</th>
                  <th scope="col">{nameA}</th>
                  <th scope="col">{nameB}</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((r) => r.group === g)
                  .map((r) => (
                    <tr key={r.key} className="border-b border-dashed border-ink/25 last:border-b-0">
                      <th scope="row" className="px-3 py-2 text-sm font-bold">
                        {r.label}
                        {r.better === null && <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(참고)</span>}
                      </th>
                      <Cell row={r} side="a" />
                      <Cell row={r} side="b" />
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <aside className="rounded-lg border-[1.5px] border-dashed border-ink bg-paper-deep/70 p-4 text-sm leading-relaxed">
        <p className="font-black">📝 읽는 법</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>✓ 표시와 색 배경이 해당 항목에서 더 유리한 쪽이에요. (입장·점수는 높을수록, 외관·차창·이동·비용은 낮을수록 유리)</li>
          <li>버스 이동 시간은 일정표에 &ldquo;버스 약 N시간&rdquo;처럼 적힌 것만 합산해요. 적혀 있지 않으면 0으로 보입니다.</li>
          {approx && (
            <li className="font-bold text-warn-ink">
              일정표에서 필수 현지 경비(€)를 읽지 못한 상품은 평균 추정값(€150)이 적용돼 비용 비교가 부정확할 수 있어요.
            </li>
          )}
          <li>같은 출발 월 기준으로 계산했고, 결과는 참고용입니다.</li>
        </ul>
      </aside>
    </div>
  )
}

/* ---------- 메인 ---------- */

export function CompareView() {
  const [textA, setTextA] = useState('')
  const [textB, setTextB] = useState('')
  const [nameA, setNameA] = useState('')
  const [nameB, setNameB] = useState('')
  const [month, setMonth] = useState('5')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [error, setError] = useState('')

  const disabled =
    textA.trim().length === 0 || textB.trim().length === 0 || textA.length > MAX_CHARS || textB.length > MAX_CHARS

  const displayA = nameA.trim() || '상품 A'
  const displayB = nameB.trim() || '상품 B'

  const run = (e: React.FormEvent) => {
    e.preventDefault()
    if (disabled) return
    setError('')
    try {
      const m = Number(month)
      const ra = inspectItinerary(textA, m)
      const rb = inspectItinerary(textB, m)
      setAnalysis({ ra, rb, ma: computeMetrics(ra), mb: computeMetrics(rb) })
      window.scrollTo({ top: 0 })
    } catch (err) {
      console.error('비교 분석 중 오류:', err)
      setError('분석 중 오류가 발생했어요. 일정표 내용을 확인하고 다시 시도해 주세요.')
    }
  }

  if (analysis) {
    return <Results analysis={analysis} nameA={displayA} nameB={displayB} onBack={() => setAnalysis(null)} />
  }

  return (
    <form onSubmit={run} className="space-y-5">
      <div className="print-hidden">
        <Link href="/" className="flex min-h-11 w-fit items-center gap-1.5 rounded-md text-sm font-bold underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" />
          하나만 감정하기
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <PackageBox side="a" name={nameA} onName={setNameA} text={textA} onText={setTextA} onSample={() => { setTextA(SAMPLE_ITINERARY_TEXT.trim()); if (!nameA) setNameA('서유럽 3국 8일') }} />
        <PackageBox side="b" name={nameB} onName={setNameB} text={textB} onText={setTextB} onSample={() => { setTextB(SAMPLE_ITINERARY_B_TEXT.trim()); if (!nameB) setNameB('서유럽 2국 7일(고급)') }} />
      </div>

      <section className="rounded-lg border-[1.5px] border-ink bg-card p-4 shadow-hard md:p-5">
        <label htmlFor="cmp-month" className="mb-2 block text-sm font-black">
          출발 월 (두 상품 공통 · 날씨 적합성 계산용)
        </label>
        <Select items={departureMonths} value={month} onValueChange={(v) => v && setMonth(v)}>
          <SelectTrigger id="cmp-month" className="h-11 w-full rounded-md border-[1.5px] border-ink bg-paper px-3 text-base font-bold md:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {departureMonths.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {error && (
        <p role="alert" className="text-sm font-bold text-stamp-ink">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={disabled}
        className="flex min-h-16 w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-ink bg-ink font-mono px-4 py-4 text-base font-black text-white shadow-cta transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-cta-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:border-ink/40 disabled:bg-paper-deep disabled:text-ink/60 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0 md:text-xl"
      >
        <Scale className="size-5" aria-hidden="true" />
        ⚖️ 두 패키지 나란히 감정하기
      </button>
      {disabled && (
        <p className="text-center text-sm text-muted-foreground">두 상품 모두 일정표를 넣으면 버튼이 활성화돼요.</p>
      )}

      <aside className="rounded-lg border-[1.5px] border-dashed border-ink bg-paper-deep/70 p-4 text-sm">
        <p className="font-black">
          🛡️ 비교는 100% 브라우저 안에서만 계산돼요. 입력한 일정표는 서버로 보내지지 않습니다.
        </p>
      </aside>
    </form>
  )
}
