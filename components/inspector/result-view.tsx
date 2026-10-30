'use client'

import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PackageResult } from '@/lib/mock-result'
import { RESULT_KEY, clearResultCache, purgeLegacyCache } from '@/lib/session-cache'
import { ActionBar } from './action-bar'
import { InventoryTab } from './inventory-tab'
import { OverviewTab } from './overview-tab'
import { ReceiptTab } from './receipt-tab'
import { ScheduleTab } from './schedule-tab'
import { ValuationTab } from './valuation-tab'
import { VerdictHeader } from './verdict-header'

const tabs = [
  { value: 'overview', label: '📋 종합 개요' },
  { value: 'schedule', label: '📅 일정 팩트체크' },
  { value: 'receipt', label: '🧾 숨은 비용 영수증' },
  { value: 'valuation', label: '⚖️ 최종 감정서' },
  { value: 'inventory', label: '🎒 생존 인벤토리' },
]

export function ResultView({ result: initialResult }: { result: PackageResult }) {
  const [result, setResult] = useState<PackageResult>(initialResult)
  const [isCustom, setIsCustom] = useState(false)

  useEffect(() => {
    try {
      purgeLegacyCache()
      const saved = sessionStorage.getItem(RESULT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as PackageResult
        if (parsed && parsed.stats && parsed.days) {
          setResult(parsed)
          setIsCustom(true)
        }
      }
    } catch (e) {
      console.warn('저장된 감정 결과를 불러오는 중 예외 발생:', e)
    }
  }, [])

  const resetToSample = () => {
    clearResultCache()
    setResult(initialResult)
    setIsCustom(false)
  }

  return (
    <div className="space-y-6">
      <div className="print-hidden flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="btn-ghost flex min-h-11 items-center gap-1.5 px-3 text-body-sm"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          다른 일정 감정하기
        </Link>

        {isCustom && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded border border-mint bg-mint-bg px-3 py-1 font-mono text-label-md text-mint-ink">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              직접 입력한 일정 감정 완료
            </span>
            <button
              type="button"
              onClick={resetToSample}
              className="btn-ghost inline-flex min-h-11 items-center gap-1 px-2.5 text-label-md"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              기본 예시 보기
            </button>
          </div>
        )}
      </div>

      {/* DESIGN.md §Layout: single column on mobile, split-column dashboard from lg (verdict rail + analysis tabs). */}
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <aside aria-label="종합 판정" className="lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:pr-1">
          <VerdictHeader result={result} />
        </aside>

        <div className="min-w-0 space-y-6">
          <Tabs defaultValue="overview" className="gap-5">
            <div className="print-hidden sticky top-0 z-30 -mx-4 border-y-[1.5px] border-ink bg-paper px-4 py-1 md:-mx-6 md:px-6 lg:top-4 lg:mx-0 lg:rounded lg:border-[1.5px] lg:px-1">
              {/* TabsList 기본 h-8(32px)이 44px 탭의 위아래와 그림자를 잘라 내므로 높이를 자동으로 풀고, 상하 여백(py-1.5)으로 그림자·포커스 링 자리를 둔다.
                  좁은 화면은 가로 스크롤이며 끝에 pr-4 여백을 둬 마지막 탭이 가장자리에 붙지 않는다. lg 이상은 줄바꿈으로 스크롤 없이 모두 보여 준다. */}
              <TabsList className="no-scrollbar group-data-horizontal/tabs:h-auto w-full justify-start gap-2 overflow-x-auto rounded-none bg-transparent py-1.5 pr-4 pl-0.5 lg:flex-wrap lg:gap-1 lg:overflow-visible lg:pr-0.5">
                {tabs.map((t) => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="h-11 min-h-11 shrink-0 flex-none rounded border-[1.5px] border-ledger bg-card px-4 font-mono text-label-lg whitespace-nowrap text-ink-secondary hover:border-ink hover:text-ink data-active:border-navy data-active:bg-navy data-active:text-white data-active:shadow-hard-sm! dark:text-ink-secondary dark:hover:text-ink dark:data-active:border-navy dark:data-active:bg-navy dark:data-active:text-white"
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="overview">
              <OverviewTab result={result} />
            </TabsContent>
            <TabsContent value="schedule">
              <ScheduleTab days={result.days} />
            </TabsContent>
            <TabsContent value="receipt">
              <ReceiptTab result={result} />
            </TabsContent>
            <TabsContent value="valuation">
              <ValuationTab result={result} />
            </TabsContent>
            <TabsContent value="inventory">
              <InventoryTab items={result.inventory} />
            </TabsContent>
          </Tabs>

          <ActionBar result={result} />
        </div>
      </div>
    </div>
  )
}
