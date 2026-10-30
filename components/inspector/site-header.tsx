import Link from 'next/link'
import { BookOpenText, Scale } from 'lucide-react'

export function SiteHeader() {
  return (
    <header className="print-hidden border-b-[1.5px] border-ink bg-paper/95">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-2 md:px-6 lg:px-10">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 rounded font-display text-headline-sm uppercase tracking-tight text-ink md:text-headline-md"
        >
          <span aria-hidden="true" className="text-xl">
            🕵️
          </span>
          <span>EUROPE PACKAGE INSPECTOR</span>
        </Link>
        <nav aria-label="주요 메뉴" className="flex items-center gap-2">
          <Link
            href="/compare"
            className="flex min-h-11 items-center gap-1.5 btn-ghost px-3 font-mono text-label-lg"
          >
            <Scale className="size-4" aria-hidden="true" />
            1:1 비교
          </Link>
          <Link
            href="/about"
            className="flex min-h-11 items-center gap-1.5 btn-ghost px-3 font-mono text-label-lg"
          >
            <BookOpenText className="size-4" aria-hidden="true" />
            지식 안내소
          </Link>
        </nav>
      </div>
    </header>
  )
}
