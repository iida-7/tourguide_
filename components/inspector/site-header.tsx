import Link from 'next/link'
import { BookOpenText, Scale } from 'lucide-react'

export function SiteHeader() {
  return (
    <header className="print-hidden border-b-[1.5px] border-ink bg-paper/95">
      <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-3 px-4 py-2 md:px-6">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 rounded-md font-mono text-sm font-bold tracking-tight text-ink md:text-base"
        >
          <span aria-hidden="true" className="text-xl">
            🕵️
          </span>
          <span>EUROPE PACKAGE INSPECTOR</span>
        </Link>
        <nav aria-label="주요 메뉴" className="flex items-center gap-2">
          <Link
            href="/compare"
            className="flex min-h-11 items-center gap-1.5 rounded-md border-[1.5px] border-ink bg-gold/30 px-3 text-sm font-bold shadow-hard-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            <Scale className="size-4" aria-hidden="true" />
            1:1 비교
          </Link>
          <Link
            href="/about"
            className="flex min-h-11 items-center gap-1.5 rounded-md border-[1.5px] border-ink bg-card px-3 text-sm font-bold shadow-hard-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            <BookOpenText className="size-4" aria-hidden="true" />
            지식 안내소
          </Link>
        </nav>
      </div>
    </header>
  )
}
