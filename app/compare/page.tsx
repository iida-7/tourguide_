import type { Metadata } from 'next'
import { CompareView } from '@/components/inspector/compare-view'

export const metadata: Metadata = {
  title: '패키지 1:1 비교 | 유럽 패키지 감정원',
  description: '두 여행사의 유럽 패키지 일정표를 나란히 넣고 내부 입장, 이동 부담, 실지출을 항목별로 비교하세요.',
}

export default function ComparePage() {
  return (
    <main className="mx-auto max-w-[1080px] space-y-6">
      <section className="animate-fade-up pt-4 text-center">
        <p aria-hidden="true" className="text-5xl">
          ⚖️
        </p>
        <h1 className="mt-3 text-2xl leading-tight font-black text-balance md:text-4xl">
          두 패키지, <span className="text-mint-ink">어느 쪽이</span> <span className="text-stamp-ink">더 알찰까?</span>
        </h1>
        <p className="mt-3 text-base font-bold text-muted-foreground md:text-lg">일정표 2개를 붙여넣고 나란히 감정해보세요.</p>
      </section>
      <CompareView />
    </main>
  )
}
