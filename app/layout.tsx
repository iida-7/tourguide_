import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Noto_Sans_KR, Space_Grotesk, Work_Sans } from 'next/font/google'
import { SiteFooter } from '@/components/inspector/site-footer'
import { SiteHeader } from '@/components/inspector/site-header'
import './globals.css'

// Work Sans / Space Grotesk / JetBrains Mono have no Hangul glyphs; Noto Sans KR is the Korean fallback.
const notoKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-noto-kr',
  display: 'swap',
  fallback: ['system-ui', 'Apple SD Gothic Neo', 'Malgun Gothic', 'sans-serif'],
})

const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-work-sans',
  display: 'swap',
  fallback: ['system-ui', 'Apple SD Gothic Neo', 'Malgun Gothic', 'sans-serif'],
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
  fallback: ['system-ui', 'Apple SD Gothic Neo', 'Malgun Gothic', 'sans-serif'],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  fallback: ['ui-monospace', 'monospace'],
})

export const metadata: Metadata = {
  title: '유럽 패키지 감정원 | The Package Inspector',
  description:
    '유럽 패키지여행 일정표를 붙여넣으면 팩트체크와 가성비 감정 결과를 유쾌하게 보여드립니다. 숨은 비용 영수증과 생존 준비물까지 한 번에.',
}

export const viewport: Viewport = {
  themeColor: '#F8FAFC',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className={`${notoKr.variable} ${workSans.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        <div className="mx-auto w-full max-w-[1080px] flex-1 px-4 py-6 md:px-6 md:py-10">
          {children}
        </div>
        <SiteFooter />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
