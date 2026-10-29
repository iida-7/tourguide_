'use client'

import { Download, Loader2, Share2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { downloadBlob, shareBlobs, type NamedBlob } from '@/lib/share-card'

interface Props {
  title: string
  /** 카드 이미지 생성 함수 (모달이 열릴 때 호출) */
  generate: () => Promise<NamedBlob[]>
  onClose: () => void
}

export function ShareCardModal({ title, generate, onClose }: Props) {
  const [cards, setCards] = useState<(NamedBlob & { url: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const closeRef = useRef<HTMLButtonElement>(null)
  const generateRef = useRef(generate)

  useEffect(() => {
    let cancelled = false
    let made: string[] = []
    generateRef
      .current()
      .then((blobs) => {
        if (cancelled) return
        const withUrl = blobs.map((b) => ({ ...b, url: URL.createObjectURL(b.blob) }))
        made = withUrl.map((c) => c.url)
        setCards(withUrl)
      })
      .catch((e) => {
        console.error('카드 이미지 생성 실패:', e)
        if (!cancelled) setError('이미지를 만들지 못했어요. 브라우저를 최신으로 업데이트하고 다시 시도해 주세요.')
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
      made.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const saveAll = () => {
    cards.forEach((c, i) => setTimeout(() => downloadBlob(c), i * 350))
    setNote(`${cards.length}장 저장을 시작했어요. 브라우저가 여러 파일 다운로드를 물으면 허용해 주세요.`)
  }

  const share = async () => {
    const ok = await shareBlobs(cards)
    setNote(ok ? '' : '이 브라우저는 이미지 공유를 지원하지 않아요. 저장 후 카카오톡에 첨부해 주세요.')
  }

  const btn =
    'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border-[1.5px] border-ink bg-card px-4 text-sm font-bold shadow-hard-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-50'

  return (
    <div className="print-hidden fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 md:items-center md:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-t-xl border-[1.5px] border-ink bg-paper shadow-hard-lg md:rounded-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b-[1.5px] border-ink px-4 py-3 md:px-6">
          <h2 id="share-title" className="text-base font-black md:text-lg">
            🖼️ {title}
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="닫기" className="flex size-11 items-center justify-center rounded-md hover:bg-paper-deep">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
          {loading && (
            <p className="flex items-center justify-center gap-2 py-16 font-bold" role="status">
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              카드 이미지를 만드는 중…
            </p>
          )}
          {error && (
            <p role="alert" className="py-10 text-center font-bold text-stamp-ink">
              {error}
            </p>
          )}
          {!loading && cards.length > 0 && (
            <ul className={cards.length > 1 ? 'grid gap-5 sm:grid-cols-2 md:grid-cols-3' : 'mx-auto max-w-sm'}>
              {cards.map((c) => (
                <li key={c.name} className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.url} alt={`${c.title} 카드 미리보기`} className="w-full rounded-lg border-[1.5px] border-ink shadow-hard-sm" />
                  <button type="button" onClick={() => downloadBlob(c)} className={`${btn} w-full`}>
                    <Download className="size-4" aria-hidden="true" />
                    {c.title} 저장
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2 border-t-[1.5px] border-ink px-4 py-3 md:px-6">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={saveAll} disabled={cards.length === 0} className={btn}>
              <Download className="size-4" aria-hidden="true" />
              전체 저장 ({cards.length}장)
            </button>
            <button type="button" onClick={share} disabled={cards.length === 0} className={btn}>
              <Share2 className="size-4" aria-hidden="true" />
              공유하기 (카카오톡 등)
            </button>
          </div>
          <p role="status" aria-live="polite" className="min-h-5 text-xs text-muted-foreground">
            {note || '이미지는 내 기기에서만 만들어지며 서버로 전송되지 않아요.'}
          </p>
        </div>
      </div>
    </div>
  )
}
