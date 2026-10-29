'use client'

import { Check, ClipboardCopy, Download, ImageIcon, Printer, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { renderResultCards } from '@/lib/share-card'
import { toMarkdown } from '@/lib/to-markdown'
import type { PackageResult } from '@/lib/mock-result'
import { ShareCardModal } from './share-card-modal'

const buttonClass =
  'flex min-h-11 items-center justify-center gap-2 rounded-md border-[1.5px] border-ink bg-card px-4 text-sm font-bold shadow-hard-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none active:translate-x-0.5 active:translate-y-0.5'

export function ActionBar({ result }: { result: PackageResult }) {
  const [toast, setToast] = useState('')
  const [showCards, setShowCards] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const notify = (message: string) => {
    setToast(message)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(''), 2000)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown(result))
      notify('복사됨!')
    } catch {
      notify('복사에 실패했어요. 다운로드를 이용해 주세요.')
    }
  }

  const download = () => {
    const blob = new Blob([toMarkdown(result)], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '유럽패키지-감정결과.md'
    a.click()
    URL.revokeObjectURL(url)
    notify('다운로드 시작!')
  }

  return (
    <div className="print-hidden space-y-3 border-t-[1.5px] border-dashed border-ink/60 pt-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <button type="button" onClick={() => setShowCards(true)} className={`${buttonClass} bg-gold/30`}>
          <ImageIcon className="size-4" aria-hidden="true" />
          카드 이미지 만들기
        </button>
        <button type="button" onClick={copy} className={buttonClass}>
          <ClipboardCopy className="size-4" aria-hidden="true" />
          마크다운 복사
        </button>
        <button type="button" onClick={download} className={buttonClass}>
          <Download className="size-4" aria-hidden="true" />
          .md 다운로드
        </button>
        <button type="button" onClick={() => window.print()} className={buttonClass}>
          <Printer className="size-4" aria-hidden="true" />
          인쇄/PDF 저장
        </button>
        <Link href="/" className={buttonClass}>
          <RefreshCw className="size-4" aria-hidden="true" />
          새 일정 분석
        </Link>
      </div>
      {showCards && (
        <ShareCardModal
          title="카드 뉴스 (공유용 이미지)"
          generate={() => renderResultCards(result)}
          onClose={() => setShowCards(false)}
        />
      )}
      <div role="status" aria-live="polite" className="h-8 text-center">
        {toast && (
          <span className="inline-flex animate-fade-up items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-ink px-4 py-1 text-sm font-bold text-paper">
            <Check className="size-4" aria-hidden="true" />
            {toast}
          </span>
        )}
      </div>
    </div>
  )
}
