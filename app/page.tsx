import { PackageInput } from '@/components/inspector/package-input'

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl space-y-8">
      <section className="relative animate-fade-up pt-4 text-center">
        <span
          aria-hidden="true"
          className="absolute -top-1 right-2 inline-block rotate-12 rounded border-[3px] border-gold px-2 py-0.5 font-mono text-label-lg uppercase text-gold-ink opacity-80 md:right-10"
        >
          INSPECTED
        </span>
        <p aria-hidden="true" className="text-5xl md:text-6xl">
          🔍
        </p>
        <h1 className="mt-3 text-headline-xl-mobile text-balance md:text-headline-xl">
          유럽 패키지 일정표, <br className="md:hidden" />
          과연 <span className="text-mint-ink">꿀주일까</span>{' '}
          <span className="text-stamp-ink">겉핥기 지옥일까?</span>
        </h1>
        <p className="mt-3 text-body-lg font-bold text-ink-muted">1초 만에 감정해드립니다!</p>
      </section>
      <PackageInput />
    </main>
  )
}
