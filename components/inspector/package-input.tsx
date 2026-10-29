'use client'

import { Bot, FileUp, KeyRound, Loader2, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { verifyWithGeminiAI } from '@/lib/gemini-client'
import { inspectItinerary } from '@/lib/inspector-engine'
import { MAX_CHARS, SAMPLE_CHAR_COUNT, WARN_CHARS, departureMonths } from '@/lib/mock-result'
import { SAMPLE_ITINERARY_TEXT } from '@/lib/sample-itinerary'
import { cn } from '@/lib/utils'

const placeholder = `제 1일 : 인천 출발 - 파리 샤를드골 공항 도착 - 호텔 투숙
제 2일 : 파리 시내 관광 (루브르 박물관 외관, 에펠탑 포토타임) - 베르사유 궁전 - 센강 유람선

※ 여행사 일정표 전체를 Ctrl + V 로 붙여넣으세요.`

function status(count: number) {
  if (count > MAX_CHARS) return { label: '초과', cls: 'bg-stamp text-white border-stamp-ink' }
  if (count >= WARN_CHARS) return { label: '주의', cls: 'bg-warn/15 text-warn-ink border-warn-ink' }
  return { label: '정상', cls: 'bg-mint text-white border-mint-ink' }
}

function StepCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border-[1.5px] border-ink bg-card p-4 shadow-hard md:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-base font-black md:text-lg">
        <span className="rounded border-[1.5px] border-ink bg-gold text-white px-2 py-0.5 font-mono text-xs shadow-hard-sm">
          STEP {step}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

export function PackageInput() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [text, setText] = useState('')
  const [month, setMonth] = useState('5')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('감정 중…')
  const [fileError, setFileError] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)

  const [hasEnvKey, setHasEnvKey] = useState(false)

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key')
    if (savedKey) setApiKey(savedKey)
    // 서버 .env 키 설정 여부만 확인 (키 값은 브라우저로 전달되지 않음)
    fetch('/api/gemini-verify')
      .then((r) => r.json())
      .then((d) => setHasEnvKey(Boolean(d.serverKey)))
      .catch(() => setHasEnvKey(false))
    return () => clearTimeout(redirectTimer.current)
  }, [])

  const handleSaveApiKey = (key: string) => {
    setApiKey(key)
    if (typeof window !== 'undefined') {
      if (key.trim()) {
        localStorage.setItem('gemini_api_key', key.trim())
      } else {
        localStorage.removeItem('gemini_api_key')
      }
    }
  }

  const count = text.length
  const displayCount = count === 0 ? SAMPLE_CHAR_COUNT : count
  const badge = status(displayCount)
  const overflow = count > MAX_CHARS
  const empty = text.trim().length === 0
  const disabled = empty || overflow || loading

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setFileError('')
    if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
      setFileError('.txt 텍스트 파일만 올릴 수 있어요.')
      return
    }
    setText(await file.text())
    if (fileRef.current) fileRef.current.value = ''
  }

  const loadSample = () => {
    setText(SAMPLE_ITINERARY_TEXT.trim())
    setFileError('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (disabled) return
    setLoading(true)
    setLoadingMsg('1차 룰 엔진 분석 중…')

    try {
      const analyzed = inspectItinerary(text, Number(month))

      // Gemini API 판독 시도 (서버의 .env 키 또는 사용자가 입력한 키 자동 활용)
      setLoadingMsg('🤖 Gemini AI 4대 안전장치 보조 판독 중…')
      const aiSentences: { line: number; text: string }[] = []
      analyzed.days.forEach((d) => {
        d.items.forEach((i) => {
          if (i.mode === 'ai' && i.aiReason) {
            aiSentences.push({ line: i.line, text: i.text })
          }
        })
      })

      if (aiSentences.length > 0) {
        const verifiedMap = await verifyWithGeminiAI(aiSentences, apiKey.trim() || undefined)
        if (Object.keys(verifiedMap).length > 0) {
          analyzed.days.forEach((d) => {
            d.items.forEach((i) => {
              if (verifiedMap[i.line]) {
                i.aiReason = verifiedMap[i.line]
                i.explain = `🤖 Gemini AI 정밀 판독: [${verifiedMap[i.line].verdict}] 판정 (${verifiedMap[i.line].keyword})`
              }
            })
          })
        }
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('inspected_result', JSON.stringify(analyzed))
        sessionStorage.setItem('inspected_raw_text', text)
        sessionStorage.setItem('inspected_month', month)
      }
    } catch (err) {
      console.error('분석 중 오류 발생:', err)
    }

    setLoadingMsg('감정 완료! 결과 보고서 렌더링 중…')
    redirectTimer.current = setTimeout(() => router.push('/result'), 600)
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <StepCard step={1} title="여행사 일정표를 통째로 붙여넣으세요!">
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="itinerary" className="text-sm font-bold text-muted-foreground">
            일정표 텍스트 붙여넣기
          </label>
          <button
            type="button"
            onClick={loadSample}
            disabled={loading}
            className="inline-flex min-h-8 items-center gap-1.5 rounded border border-ink/40 bg-gold/25 px-2.5 py-1 text-xs font-bold text-ink transition-all hover:bg-gold/40 active:translate-y-px"
          >
            <Sparkles className="size-3.5 text-gold-ink" aria-hidden="true" />
            예시 일정표 불러오기
          </button>
        </div>
        <Textarea
          id="itinerary"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-invalid={overflow}
          aria-describedby="itinerary-help"
          disabled={loading}
          className="min-h-80 resize-y rounded-md border-[1.5px] border-ink bg-paper px-3 py-3 font-mono text-sm leading-relaxed placeholder:text-ink/40"
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p id="itinerary-help" className="flex flex-wrap items-center gap-2 text-sm">
            <span aria-hidden="true">📄</span>
            <span>글자 수:</span>
            <b className={cn('font-mono', overflow && 'text-stamp-ink')}>
              {displayCount.toLocaleString('ko-KR')} / {MAX_CHARS.toLocaleString('ko-KR')}자
            </b>
            <span className={cn('rounded border px-2 py-0.5 text-xs font-black', badge.cls)}>[{badge.label}]</span>
            {count === 0 && <span className="text-xs text-muted-foreground">(예시 기준)</span>}
          </p>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,text/plain"
              className="sr-only"
              id="txt-file"
              onChange={(e) => handleFile(e.target.files?.[0])}
              disabled={loading}
            />
            <label
              htmlFor="txt-file"
              className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border-[1.5px] border-ink bg-card px-4 text-sm font-bold shadow-hard-sm transition-all focus-within:ring-2 hover:translate-x-px hover:translate-y-px hover:shadow-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <FileUp className="size-4" aria-hidden="true" />
              텍스트 파일(.txt) 올리기
            </label>
          </div>
        </div>
        {fileError && (
          <p role="alert" className="mt-2 text-sm font-bold text-stamp-ink">
            {fileError}
          </p>
        )}
        {overflow && (
          <p role="alert" className="mt-2 text-sm font-bold text-stamp-ink">
            글자 수가 {MAX_CHARS.toLocaleString('ko-KR')}자를 넘었어요. {(count - MAX_CHARS).toLocaleString('ko-KR')}자를 줄여주세요.
          </p>
        )}
        {empty && !loading && (
          <p className="mt-2 text-sm text-muted-foreground">
            일정표를 붙여넣거나 &lsquo;예시 일정표 불러오기&rsquo;를 누르면 감정 버튼이 활성화돼요.
          </p>
        )}
      </StepCard>

      <StepCard step={2} title="언제 떠나시나요? (날씨 요정 소환)">
        <label htmlFor="month-select" className="sr-only">
          출발 월
        </label>
        <Select items={departureMonths} value={month} onValueChange={(v) => v && setMonth(v)} disabled={loading}>
          <SelectTrigger
            id="month-select"
            className="h-11 w-full rounded-md border-[1.5px] border-ink bg-paper px-3 text-base font-bold md:w-72"
          >
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

        {/* Gemini AI 심층 판독 옵션 아코디언 */}
        <div className="mt-4 border-t border-dashed border-ink/40 pt-3">
          <button
            type="button"
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="flex items-center gap-1.5 text-xs font-bold text-ai-ink hover:underline"
          >
            <Bot className="size-3.5" aria-hidden="true" />
            {showKeyInput ? '▼ Gemini AI 심층 판독 설정 접기' : '▶ [고급] Gemini AI 심층 판독 옵션 설정 (선택)'}
            {(apiKey || hasEnvKey) && (
              <span className="ml-1 rounded bg-ai/15 px-1.5 py-0.5 text-[10px] text-ai-ink font-bold">
                {apiKey ? '내 키 사용 중' : '.env 키 연동됨'}
              </span>
            )}
          </button>

          {showKeyInput && (
            <div className="mt-2.5 rounded-md border border-ai/40 bg-ai/5 p-3 space-y-2">
              <label htmlFor="gemini-key" className="flex items-center gap-1.5 text-xs font-bold text-ink">
                <KeyRound className="size-3 text-ai" aria-hidden="true" />
                Google AI Studio Gemini API 키 (입력 시 실시간 4대 안전장치 판독 수행)
              </label>
              <input
                id="gemini-key"
                type="password"
                placeholder={hasEnvKey ? '서버 .env 키 사용 중 (직접 입력 시 그 키가 우선)' : 'AIzaSy... (미입력 시 100% 룰 엔진으로 동작)'}
                value={apiKey}
                onChange={(e) => handleSaveApiKey(e.target.value)}
                disabled={loading}
                className="w-full rounded border border-ink/40 bg-paper px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ai"
              />
              <p className="text-[11px] leading-tight text-muted-foreground">
                * 직접 입력한 키는 이 브라우저(localStorage)에만 저장됩니다. 판독 요청 시에는 이 앱의 서버를 거쳐 Gemini로 전달되며 서버에 저장되지는 않아요. 무료 API 키로도 동작합니다.
              </p>
            </div>
          )}
        </div>
      </StepCard>

      <StepCard step={3} title="준비 끝! 감정을 시작해볼까요?">
        <button
          type="submit"
          disabled={disabled}
          className="relative flex min-h-16 w-full items-center justify-center gap-2 overflow-hidden rounded-lg border-[1.5px] border-ink bg-ink font-mono px-4 py-4 text-base font-black text-white shadow-cta transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-cta-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:border-ink/40 disabled:bg-paper-deep disabled:text-ink/60 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0 md:text-xl"
        >
          {loading ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              {loadingMsg}
              <span
                aria-hidden="true"
                className="animate-scan absolute inset-x-0 top-0 h-1 bg-gold shadow-[0_0_12px_3px_rgba(180,83,9,0.9)]"
              />
            </>
          ) : (
            <>🚀 이 패키지 낱낱이 감정하기 (1초 즉시 분석)</>
          )}
        </button>
      </StepCard>

      <aside
        aria-labelledby="privacy-title"
        className="rounded-lg border-[1.5px] border-dashed border-ink bg-paper-deep/70 p-4 md:p-6"
      >
        <h2 id="privacy-title" className="mb-2 font-black">
          🛡️ 팩트체크 보안 및 개인정보 약속
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
          <li>입력하신 원문은 기본적으로 브라우저에서만 분석되며 서버에 저장되지 않습니다.</li>
          <li>&lsquo;입장/외관&rsquo; 구분이 애매한 문장 몇 줄만 Gemini AI 보조 판독을 위해 전송됩니다. (키가 설정된 경우에만, 전체 원문은 보내지 않아요)</li>
        </ul>
      </aside>
    </form>
  )
}
