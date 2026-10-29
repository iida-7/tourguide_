'use client'

import { useMemo, useState } from 'react'
import { formatKrw, type PackageResult, type ReceiptLine } from '@/lib/mock-result'
import { cn } from '@/lib/utils'
import { LineBadge } from './stamp-badge'

function Row({
  line,
  rate,
  children,
}: {
  line: ReceiptLine
  rate: number
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start gap-2">
          {children}
          <span className="text-sm leading-snug font-medium">{line.label}</span>
        </div>
        {line.line > 0 ? (
          <LineBadge line={line.line} />
        ) : (
          <span className="inline-flex rounded border border-dashed border-ink/50 px-1.5 py-0.5 text-xs font-bold text-muted-foreground">
            원문에 없음 · 추정
          </span>
        )}
      </div>
      <div className="shrink-0 text-right font-mono">
        <p className="text-sm font-bold">€{line.eur}</p>
        <p className="text-xs text-muted-foreground">{formatKrw(line.eur * rate)}</p>
      </div>
    </div>
  )
}

const tagStyle = {
  추천: 'bg-mint/15 text-mint-ink border-mint',
  선택: 'bg-gold/25 text-gold-ink border-gold',
  주의: 'bg-warn/15 text-warn-ink border-warn',
} as const

export function ReceiptTab({ result }: { result: PackageResult }) {
  const { receipt } = result
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(receipt.options.filter((o) => o.tag === '추천').map((o) => o.id)),
  )

  const { mandatoryEur, optionEur, totalKrw } = useMemo(() => {
    const m = receipt.mandatory.reduce((a, b) => a + b.eur, 0)
    const o = receipt.options.filter((x) => selected.has(x.id)).reduce((a, b) => a + b.eur, 0)
    return { mandatoryEur: m, optionEur: o, totalKrw: receipt.packagePriceKrw + (m + o) * receipt.eurToKrw }
  }, [receipt, selected])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <section aria-labelledby="receipt-title" className="space-y-4">
      <h2 id="receipt-title" className="text-lg font-black md:text-xl">
        🧾 숨은 비용 영수증
      </h2>

      <div className="mx-auto max-w-xl pb-3">
        <div className="zigzag-top zigzag-bottom mt-3 bg-[#fffefa] px-5 py-6 shadow-hard md:px-8">
          <div className="border-b-2 border-dashed border-ink/60 pb-4 text-center">
            <p className="font-mono text-xs font-bold tracking-[0.3em] text-muted-foreground">HIDDEN COST RECEIPT</p>
            <p className="mt-1 text-xl font-black">현지 지불 경비 예상</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">환율 가정: €1 = {formatKrw(receipt.eurToKrw)}</p>
          </div>

          <div className="flex items-center justify-between border-b-2 border-dashed border-ink/60 py-3">
            <span className="text-sm font-bold">기본 패키지 결제가</span>
            <span className="font-mono text-base font-bold">{formatKrw(receipt.packagePriceKrw)}</span>
          </div>

          <fieldset className="border-b-2 border-dashed border-ink/60 py-2">
            <legend className="sr-only">필수 현지 경비</legend>
            <p className="pt-1 text-xs font-black tracking-widest text-stamp-ink">[필수 현지 경비]</p>
            {receipt.mandatoryEstimated && (
              <p role="note" className="mt-1 rounded-sm bg-warn/15 px-2 py-1 text-xs font-bold text-warn-ink">
                ⚠️ 일정표에서 현지 경비 금액을 찾지 못해 일반적인 평균값으로 추정했어요. 실제 금액은 여행사에 확인하세요.
              </p>
            )}
            <div className="divide-y divide-dashed divide-ink/25">
              {receipt.mandatory.map((l) => (
                <Row key={l.id} line={l} rate={receipt.eurToKrw}>
                  <span aria-hidden="true" className="mt-0.5 font-mono text-sm font-bold text-stamp-ink">
                    ■
                  </span>
                </Row>
              ))}
            </div>
          </fieldset>

          <fieldset className="border-b-2 border-dashed border-ink/60 py-2">
            <legend className="sr-only">선택관광 옵션</legend>
            <p className="pt-1 text-xs font-black tracking-widest text-mint-ink">[선택관광 옵션] 체크하면 합계에 반영</p>
            {receipt.options.length === 0 && (
              <p className="py-3 text-sm text-muted-foreground">
                일정표에서 금액이 적힌 선택관광을 찾지 못했어요. 선택관광이 있다면 여행사에 별도 요금을 꼭 확인하세요.
              </p>
            )}
            <div className="divide-y divide-dashed divide-ink/25">
              {receipt.options.map((o) => {
                const inputId = `opt-${o.id}`
                const checked = selected.has(o.id)
                return (
                  <label
                    key={o.id}
                    htmlFor={inputId}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-start gap-2 rounded-sm transition-colors hover:bg-gold/10',
                      checked && 'bg-gold/15',
                    )}
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(o.id)}
                      className="mt-3.5 ml-1 size-5 shrink-0 cursor-pointer accent-mint"
                    />
                    <div className="min-w-0 flex-1 px-1">
                      <Row line={o} rate={receipt.eurToKrw}>
                        <span
                          className={cn(
                            'shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-black',
                            tagStyle[o.tag],
                          )}
                        >
                          {o.tag}
                        </span>
                      </Row>
                    </div>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="space-y-1 py-3 font-mono text-sm">
            <p className="flex justify-between">
              <span>필수 경비 합계</span>
              <span>€{mandatoryEur}</span>
            </p>
            <p className="flex justify-between">
              <span>선택 옵션 합계</span>
              <span>€{optionEur}</span>
            </p>
          </div>

          <div aria-live="polite" className="rounded-md border-[1.5px] border-ink bg-gold/25 px-3 py-3 text-center">
            <p className="text-xs font-black tracking-widest">최종 예상 총 실지출</p>
            <p className="font-mono text-2xl font-bold text-stamp-ink md:text-3xl">≒ {formatKrw(totalKrw)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              패키지가 대비 +{formatKrw(totalKrw - receipt.packagePriceKrw)}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
