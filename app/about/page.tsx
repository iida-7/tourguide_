import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '지식 안내소 | 유럽 패키지 감정원',
  description: '유럽 패키지 감정원의 팩트 연구소와 감정 기준, AI 보조 판독 안전장치, 점수 가중치를 안내합니다.',
}

const layers = [
  { n: 3, title: '방문지 팩트 해설', desc: '입장/외관/차창 구분까지 검증된 장소별 해설', width: 'w-full', bg: 'bg-mint text-white' },
  { n: 2, title: '도시/국가 개요', desc: '장소 해설이 없을 때 도시·국가 정보로 안내', width: 'w-[82%]', bg: 'bg-gold text-ink' },
  { n: 1, title: '일정 정리 100% 보존', desc: '원문 일정은 하나도 빠짐없이 유지', width: 'w-[64%]', bg: 'bg-ink text-paper' },
]

const guards = [
  { n: '①', title: '원문 대조', desc: 'AI가 제시한 문장이 실제 원문에 없으면 즉시 폐기' },
  { n: '②', title: '선택지 한정', desc: '[입장/외관·차창/체험/자유/판단불가] 외 답변 금지' },
  { n: '③', title: '숫자 조작 방지', desc: '금액 계산은 AI가 아닌 시스템 프로그램이 직접 연산' },
  { n: '④', title: '감정 코멘트 금지', desc: 'AI의 자의적 소설·평가는 일절 배제' },
]

const weights = [
  { label: '문화·역사', value: 25, cls: 'bg-stamp' },
  { label: '관광 깊이', value: 20, cls: 'bg-gold' },
  { label: '이동 부담', value: 20, cls: 'bg-mint' },
  { label: '구성', value: 15, cls: 'bg-ink' },
  { label: '자연', value: 10, cls: 'bg-ai' },
  { label: '날씨', value: 10, cls: 'bg-slate-stamp' },
]

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={`about-${n}`}
      className="animate-fade-up rounded-lg border-[1.5px] border-ink bg-card p-4 shadow-hard md:p-6"
    >
      <h2 id={`about-${n}`} className="mb-4 flex items-center gap-3 text-base font-black md:text-lg">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 -rotate-6 place-items-center rounded-full border-[3px] border-stamp font-mono text-lg text-stamp"
        >
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-black md:text-3xl">🔬 팩트 연구소 및 감정 기준실</h1>
        <p className="text-sm text-muted-foreground">감정원이 어떤 기준으로 일정표를 읽는지 투명하게 공개합니다.</p>
      </header>

      <Section n={1} title="3층 지식 커버리지 & 폴백 원칙">
        <div className="flex flex-col items-center gap-2">
          {layers.map((l) => (
            <div
              key={l.n}
              className={`${l.width} rounded-md border-[1.5px] border-ink px-4 py-3 text-center shadow-hard-sm ${l.bg}`}
            >
              <p className="text-sm font-black md:text-base">
                {l.n}층 · {l.title}
              </p>
              <p className="text-xs opacity-90 md:text-sm">{l.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed">
          해설이 없는 장소는 <b>도시/국가 개요로 안전하게 안내</b>합니다.
        </p>
      </Section>

      <Section n={2} title="Gemini 무료 AI 보조 판독 4대 안전장치">
        <ul className="grid gap-3 sm:grid-cols-2">
          {guards.map((g) => (
            <li key={g.title} className="rounded-md border-[1.5px] border-ai bg-ai/10 p-3">
              <p className="font-black text-ai-ink">
                {g.n} {g.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed">{g.desc}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section n={3} title="점수 계산 가중치 (총 100점)">
        <div
          role="img"
          aria-label={`가중치: ${weights.map((w) => `${w.label} ${w.value}`).join(', ')}`}
          className="flex h-10 overflow-hidden rounded-md border-[1.5px] border-ink"
        >
          {weights.map((w) => (
            <div
              key={w.label}
              style={{ width: `${w.value}%` }}
              className={`${w.cls} grid place-items-center border-r border-paper font-mono text-xs font-bold text-white last:border-r-0`}
            >
              {w.value}
            </div>
          ))}
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
          {weights.map((w) => (
            <li key={w.label} className="flex items-center gap-2">
              <span aria-hidden="true" className={`size-3.5 rounded-sm border border-ink ${w.cls}`} />
              {w.label} <b className="font-mono">{w.value}</b>
            </li>
          ))}
        </ul>
      </Section>

      <Section n={4} title="운영 정책">
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
          <li>Gemini API 공식 무료 한도는 변동될 수 있으며 Google AI Studio 기준입니다.</li>
          <li>API 오류나 한도 초과 시에도 룰 엔진 기반 100% 정상 작동을 보장합니다.</li>
        </ul>
      </Section>

      <div className="pb-4 text-center">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-md border-[1.5px] border-ink bg-stamp px-5 font-black text-white shadow-hard transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-hard-sm"
        >
          🚀 내 일정 감정하러 가기
        </Link>
      </div>
    </main>
  )
}
