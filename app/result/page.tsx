import type { Metadata } from 'next'
import { ResultView } from '@/components/inspector/result-view'
import { mockResult } from '@/lib/mock-result'

export const metadata: Metadata = {
  title: '감정 결과 | 유럽 패키지 감정원',
  description: '유럽 패키지 일정표 팩트체크, 숨은 비용 영수증, 가성비 감정 결과를 확인하세요.',
}

export default function ResultPage() {
  return (
    <main>
      <ResultView result={mockResult} />
    </main>
  )
}
