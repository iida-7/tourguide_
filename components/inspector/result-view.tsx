'use client'

import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PackageResult } from '@/lib/mock-result'
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
      const saved = sessionStorage.getItem('inspected_result')
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
    sessionStorage.removeItem('inspected_result')
    sessionStorage.removeItem('inspected_raw_text')
    sessionStorage.removeItem('inspected_month')
    setResult(initialResult)
    setIsCustom(false)
  }

  return (
    <div className="space-y-6">
      <div className="print-hidden flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-1.5 rounded-md text-sm font-bold underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          다른 일정 감정하기
        </Link>

        {isCustom && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-mint bg-mint/10 px-3 py-1 font-mono text-xs font-bold text-mint-ink">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              직접 입력한 일정 감정 완료
            </span>
            <button
              type="button"
              onClick={resetToSample}
              className="inline-flex items-center gap-1 rounded border border-ink/40 bg-card px-2.5 py-1 text-xs font-bold text-muted-foreground hover:text-ink"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              기본 예시 보기
            </button>
          </div>
        )}
      </div>

      <VerdictHeader result={result} />

      <Tabs defaultValue="overview" className="gap-5">
        <div className="print-hidden sticky top-0 z-30 -mx-4 border-y-[1.5px] border-ink bg-paper px-4 py-2 md:-mx-6 md:px-6">
          <TabsList className="no-scrollbar h-auto w-full justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0">
            {tabs.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="h-11 flex-none rounded-md border-[1.5px] border-ink/40 bg-card px-4 text-sm font-bold text-ink/70 hover:text-ink data-active:border-ink data-active:bg-gold data-active:text-ink data-active:shadow-hard-sm"
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
  )
}
