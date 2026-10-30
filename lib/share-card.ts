/**
 * 공유용 카드 뉴스 이미지 생성기 (Canvas 2D, 브라우저 전용 · 서버/외부 라이브러리 없음)
 * - 단일 감정 결과: 3장 (종합 / 일정 팩트체크 / 숨은 비용)
 * - 1:1 비교 결과: 1장
 * 출력: 1080 x 1350 PNG (카카오톡·인스타 세로형 카드 비율 4:5)
 */

import type { CompareRow, CompareSummary, PackageMetrics } from './compare'
import type { PackageResult } from './mock-result'

const W = 1080
const H = 1350

const C = {
  paper: '#f8fafc',
  paperDeep: '#f1f5f9',
  ink: '#0f172a',
  inkSoft: 'rgba(15,23,42,0.62)',
  stamp: '#dc2626',
  stampInk: '#b91c1c',
  gold: '#b45309',
  warn: '#f59e0b',
  window: '#ea580c',
  mint: '#10b981',
  mintInk: '#065f46',
  card: '#ffffff',
}

export interface NamedBlob {
  name: string
  title: string
  blob: Blob
}

type Ctx = CanvasRenderingContext2D

/* ---------- 공통 유틸 ---------- */

async function prepareFont(): Promise<string> {
  const family = getComputedStyle(document.body).fontFamily || 'sans-serif'
  const stack = `${family}, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`
  try {
    await Promise.all(
      [400, 700, 900].map((w) => document.fonts.load(`${w} 40px ${family}`, '감정 유럽 패키지 0123 ABC')),
    )
    await document.fonts.ready
  } catch {
    /* 폰트 로딩 실패 시 폴백 폰트로 진행 */
  }
  return stack
}

function makeCanvas(): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas를 사용할 수 없는 환경입니다.')
  ctx.textBaseline = 'alphabetic'
  return { canvas, ctx }
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지 변환에 실패했어요.'))), 'image/png')
  })
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function font(ctx: Ctx, stack: string, weight: number, size: number) {
  ctx.font = `${weight} ${size}px ${stack}`
}

function fit(ctx: Ctx, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1)
  return `${t}…`
}

function wrap(ctx: Ctx, text: string, maxW: number, maxLines: number): string[] {
  const lines: string[] = []
  let cur = ''
  for (const ch of text) {
    if (ctx.measureText(cur + ch).width > maxW && cur) {
      lines.push(cur)
      cur = ch.trim() === '' ? '' : ch
    } else {
      cur += ch
    }
  }
  if (cur) lines.push(cur)
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    kept[maxLines - 1] = fit(ctx, `${kept[maxLines - 1]}${lines[maxLines].slice(0, 1)}…`, maxW)
    return kept
  }
  return lines
}

function cleanItemText(t: string): string {
  return t.replace(/^\s*\[[^\]]+\]\s*/, '').replace(/\s+/g, ' ').trim()
}

/** 카드 공통 틀: 배경, 테두리, 상단 브랜드/제목, 하단 면책/쪽수 */
function frame(ctx: Ctx, stack: string, title: string, page: number, total: number) {
  ctx.fillStyle = C.paper
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = C.ink
  ctx.lineWidth = 6
  rr(ctx, 30, 30, W - 60, H - 60, 24)
  ctx.stroke()

  ctx.fillStyle = C.ink
  font(ctx, stack, 700, 30)
  ctx.textAlign = 'left'
  ctx.fillText('🕵️ EUROPE PACKAGE INSPECTOR', 76, 104)

  // 제목 알약
  font(ctx, stack, 900, 34)
  const tw = ctx.measureText(title).width
  ctx.fillStyle = C.gold
  rr(ctx, W - 76 - tw - 44, 66, tw + 44, 62, 31)
  ctx.fill()
  ctx.strokeStyle = C.ink
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.fillStyle = C.ink
  ctx.textAlign = 'center'
  ctx.fillText(title, W - 76 - (tw + 44) / 2, 109)

  ctx.textAlign = 'left'
  ctx.fillStyle = C.inkSoft
  font(ctx, stack, 400, 24)
  ctx.fillText('※ 일정표 원문 기반 룰 엔진 결과 · 참고용', 76, H - 66)
  ctx.textAlign = 'right'
  ctx.fillText(`${page} / ${total}`, W - 76, H - 66)
  ctx.textAlign = 'left'
}

function bar(ctx: Ctx, x: number, y: number, w: number, h: number, ratio: number, color: string) {
  ctx.fillStyle = C.paperDeep
  rr(ctx, x, y, w, h, h / 2)
  ctx.fill()
  ctx.strokeStyle = C.ink
  ctx.lineWidth = 3
  ctx.stroke()
  const fw = Math.max(0, Math.min(1, ratio)) * w
  if (fw > h) {
    ctx.fillStyle = color
    rr(ctx, x, y, fw, h, h / 2)
    ctx.fill()
    ctx.strokeStyle = C.ink
    ctx.stroke()
  }
}

const eur = (n: number) => `€${n.toLocaleString('ko-KR')}`
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

/* ---------- 카드 1: 종합 감정 ---------- */

function drawSummary(result: PackageResult, stack: string, total: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas()
  frame(ctx, stack, '종합 감정', 1, total)

  // 등급 도장
  const cx = 290
  const cy = 370
  ctx.lineWidth = 12
  ctx.strokeStyle = C.stamp
  ctx.fillStyle = 'rgba(180,83,9,0.2)'
  ctx.beginPath()
  ctx.arc(cx, cy, 160, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(cx, cy, 138, 0, Math.PI * 2)
  ctx.stroke()
  ctx.textAlign = 'center'
  ctx.fillStyle = C.stampInk
  font(ctx, stack, 900, 26)
  ctx.fillText('INSPECTED', cx, cy - 78)
  font(ctx, stack, 900, 150)
  ctx.fillText(result.grade, cx, cy + 50)
  font(ctx, stack, 900, 26)
  ctx.fillText('감정 완료', cx, cy + 105)

  // 점수
  ctx.textAlign = 'left'
  ctx.fillStyle = C.inkSoft
  font(ctx, stack, 700, 30)
  ctx.fillText('종합 가치 점수', 520, 300)
  ctx.fillStyle = C.stampInk
  font(ctx, stack, 900, 170)
  ctx.fillText(String(result.totalScore), 516, 450)
  const sw = ctx.measureText(String(result.totalScore)).width
  ctx.fillStyle = C.inkSoft
  font(ctx, stack, 700, 44)
  ctx.fillText('/ 100', 516 + sw + 14, 450)

  // 진단 문구 (최대 2줄)
  font(ctx, stack, 900, 40)
  const lines = wrap(ctx, result.diagnosis, W - 76 * 2 - 60, 2)
  const boxY = 580
  const boxH = 46 + lines.length * 56
  ctx.fillStyle = 'rgba(180,83,9,0.22)'
  rr(ctx, 76, boxY, W - 152, boxH, 20)
  ctx.fill()
  ctx.setLineDash([14, 10])
  ctx.strokeStyle = C.ink
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = C.ink
  lines.forEach((l, i) => ctx.fillText(l, 106, boxY + 58 + i * 56))

  // 6대 스탯
  let y = boxY + boxH + 50
  result.stats.slice(0, 6).forEach((s) => {
    ctx.fillStyle = C.ink
    font(ctx, stack, 700, 32)
    ctx.fillText(s.shortLabel, 76, y + 28)
    bar(ctx, 330, y, 520, 36, s.max ? s.score / s.max : 0, C.mint)
    ctx.textAlign = 'right'
    font(ctx, stack, 900, 32)
    ctx.fillText(`${s.score}/${s.max}`, W - 76, y + 29)
    ctx.textAlign = 'left'
    y += 62
  })

  // 여정
  const cities = result.journey.filter((j) => j.nights).map((j) => j.city)
  if (cities.length) {
    font(ctx, stack, 700, 30)
    ctx.fillStyle = C.mintInk
    ctx.fillText(fit(ctx, `🧭 ${cities.join(' → ')}`, W - 152), 76, y + 24)
  }
  return canvas
}

/* ---------- 카드 2: 일정 팩트체크 ---------- */

function drawFact(result: PackageResult, stack: string, total: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas()
  frame(ctx, stack, '일정 팩트체크', 2, total)

  const items = result.days.flatMap((d) => d.items)
  const count = (m: string) => items.filter((i) => i.mode === m).length
  const tiles = [
    { label: '🎟️ 내부 입장', n: count('entry'), color: C.mint },
    { label: '👀 외부 관람', n: count('exterior'), color: C.warn },
    { label: '🚌 차창 조망', n: count('window'), color: C.window },
    { label: '❔ 판독 불가', n: count('unknown'), color: '#94a3b8' },
  ]
  const tw = (W - 152 - 30) / 2
  tiles.forEach((t, i) => {
    const x = 76 + (i % 2) * (tw + 30)
    const y = 170 + Math.floor(i / 2) * 200
    ctx.fillStyle = C.card
    rr(ctx, x, y, tw, 170, 20)
    ctx.fill()
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.fillStyle = t.color
    ctx.fillRect(x + 4, y + 20, 14, 130)
    ctx.fillStyle = C.ink
    font(ctx, stack, 700, 32)
    ctx.fillText(t.label, x + 44, y + 58)
    font(ctx, stack, 900, 84)
    const numW = ctx.measureText(String(t.n)).width
    ctx.fillText(String(t.n), x + 44, y + 142)
    font(ctx, stack, 700, 30)
    ctx.fillStyle = C.inkSoft
    ctx.fillText('곳', x + 44 + numW + 12, y + 142)
  })

  // 입장 비율
  const totalN = Math.max(1, items.length)
  const rate = Math.round((count('entry') / totalN) * 100)
  ctx.fillStyle = C.ink
  font(ctx, stack, 900, 36)
  ctx.fillText(`안에 들어가는 비율 ${rate}%`, 76, 620)
  bar(ctx, 76, 644, W - 152, 40, rate / 100, C.mint)

  // 목록 2개
  const list = (title: string, color: string, rows: string[], y0: number) => {
    ctx.fillStyle = color
    font(ctx, stack, 900, 36)
    ctx.fillText(title, 76, y0)
    ctx.fillStyle = C.ink
    font(ctx, stack, 400, 30)
    if (rows.length === 0) {
      ctx.fillStyle = C.inkSoft
      ctx.fillText('해당 항목이 없어요.', 76, y0 + 52)
      return
    }
    rows.forEach((r, i) => ctx.fillText(fit(ctx, `· ${r}`, W - 152), 76, y0 + 52 + i * 48))
  }
  const entries = items
    .filter((i) => i.mode === 'entry')
    .sort((a, b) => Number(b.basis === 'fact') - Number(a.basis === 'fact'))
    .slice(0, 3)
    .map((i) => cleanItemText(i.text))
  const outside = items
    .filter((i) => i.mode === 'exterior' || i.mode === 'window')
    .slice(0, 3)
    .map((i) => `${i.mode === 'window' ? '[차창] ' : '[외관] '}${cleanItemText(i.text)}`)
  list('✅ 안에 들어가요', C.mintInk, entries, 760)
  list('⚠️ 밖에서만 봐요', C.stampInk, outside, 980)
  return canvas
}

/* ---------- 카드 3: 숨은 비용 ---------- */

function drawCost(result: PackageResult, stack: string, total: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas()
  frame(ctx, stack, '숨은 비용', 3, total)
  const { receipt } = result
  const rate = receipt.eurToKrw
  const mandatoryEur = receipt.mandatory.reduce((s, l) => s + l.eur, 0)
  const optionsEur = receipt.options.reduce((s, l) => s + l.eur, 0)
  const real = receipt.packagePriceKrw + mandatoryEur * rate

  // 영수증 용지
  const x = 96
  const w = W - 192
  ctx.fillStyle = C.card
  rr(ctx, x, 160, w, 1060, 12)
  ctx.fill()
  ctx.strokeStyle = C.ink
  ctx.lineWidth = 4
  ctx.stroke()

  const row = (label: string, value: string, y: number, o: { bold?: boolean; color?: string; size?: number } = {}) => {
    const size = o.size ?? 32
    ctx.fillStyle = o.color ?? C.ink
    font(ctx, stack, o.bold ? 900 : 400, size)
    ctx.textAlign = 'left'
    ctx.fillText(fit(ctx, label, w - 80 - 300), x + 40, y)
    ctx.textAlign = 'right'
    ctx.fillText(value, x + w - 40, y)
    ctx.textAlign = 'left'
  }
  const dash = (y: number) => {
    ctx.setLineDash([10, 8])
    ctx.strokeStyle = C.inkSoft
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x + 30, y)
    ctx.lineTo(x + w - 30, y)
    ctx.stroke()
    ctx.setLineDash([])
  }

  ctx.textAlign = 'center'
  ctx.fillStyle = C.ink
  font(ctx, stack, 900, 44)
  ctx.fillText('🧾 숨은 비용 영수증', W / 2, 235)
  ctx.textAlign = 'left'
  dash(268)

  let y = 316
  row('상품가 (광고 가격)', won(receipt.packagePriceKrw), y, { bold: true, size: 34 })
  y += 50
  dash(y - 18)
  y += 26
  font(ctx, stack, 700, 28)
  ctx.fillStyle = C.inkSoft
  ctx.fillText('필수 현지 경비 (현지 지불)', x + 40, y)
  y += 44
  receipt.mandatory.slice(0, 5).forEach((l) => {
    row(l.label, `${eur(l.eur)} (${won(l.eur * rate)})`, y, { size: 27 })
    y += 44
  })
  y += 4
  dash(y)
  y += 52
  row('예상 실지출 (상품가+필수)', won(real), y, { bold: true, color: C.stampInk, size: 34 })
  y += 30
  dash(y)
  y += 54
  font(ctx, stack, 700, 28)
  ctx.fillStyle = C.inkSoft
  ctx.fillText('선택관광 (안 해도 되지만 대부분 권유)', x + 40, y)
  y += 44
  if (receipt.options.length === 0) {
    font(ctx, stack, 400, 27)
    ctx.fillStyle = C.inkSoft
    ctx.fillText('일정표에 금액이 적힌 선택관광이 없어요', x + 40, y)
    y += 44
  }
  receipt.options.slice(0, 5).forEach((l) => {
    row(`[${l.tag}] ${l.label}`, eur(l.eur), y, { size: 27 })
    y += 44
  })
  y += 4
  dash(y)
  y += 52
  row('선택관광 전부 할 경우 추가', `${eur(optionsEur)} (${won(optionsEur * rate)})`, y, { bold: true, size: 29 })
  y += 56
  row('최대 실지출', won(real + optionsEur * rate), y, { bold: true, color: C.stampInk, size: 36 })

  font(ctx, stack, 400, 24)
  ctx.fillStyle = C.inkSoft
  ctx.fillText(`※ 환율 €1 = ${rate.toLocaleString('ko-KR')}원 기준 · 현지 환율에 따라 달라질 수 있어요`, x + 40, 1190)
  if (receipt.mandatoryEstimated) {
    ctx.fillStyle = C.stampInk
    font(ctx, stack, 700, 24)
    ctx.fillText('※ 일정표에 금액이 없는 경비는 평균 참고값이에요', x + 40, 1156)
  }
  return canvas
}

/* ---------- 비교 카드 ---------- */

function drawCompare(
  rows: CompareRow[],
  ma: PackageMetrics,
  mb: PackageMetrics,
  summary: CompareSummary,
  nameA: string,
  nameB: string,
  stack: string,
): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas()
  frame(ctx, stack, '1:1 비교', 1, 1)

  const colW = (W - 152 - 30) / 2
  ;([['a', nameA, ma, C.mint, C.mintInk], ['b', nameB, mb, C.stamp, C.stampInk]] as const).forEach(
    ([side, name, m, color, ink], i) => {
      const x = 76 + i * (colW + 30)
      const win = summary.overall === side
      ctx.fillStyle = win ? (side === 'a' ? 'rgba(16,185,129,0.16)' : 'rgba(220,38,38,0.14)') : C.card
      rr(ctx, x, 160, colW, 300, 22)
      ctx.fill()
      ctx.strokeStyle = C.ink
      ctx.lineWidth = win ? 6 : 3
      ctx.stroke()
      ctx.textAlign = 'center'
      ctx.fillStyle = ink
      font(ctx, stack, 900, 34)
      ctx.fillText(fit(ctx, name, colW - 40), x + colW / 2, 214)
      ctx.fillStyle = color
      font(ctx, stack, 900, 130)
      ctx.fillText(String(m.totalScore), x + colW / 2, 354)
      ctx.fillStyle = C.inkSoft
      font(ctx, stack, 700, 30)
      ctx.fillText(`등급 ${m.grade}`, x + colW / 2, 404)
      if (win) {
        ctx.fillStyle = C.stampInk
        font(ctx, stack, 900, 28)
        ctx.fillText('👑 종합 우세', x + colW / 2, 446)
      }
    },
  )

  ctx.textAlign = 'center'
  ctx.fillStyle = C.ink
  font(ctx, stack, 900, 38)
  const verdict =
    summary.overall === 'tie' ? '종합: 두 상품이 비슷해요' : `종합: ${summary.overall === 'a' ? nameA : nameB} 우세`
  ctx.fillText(fit(ctx, verdict, W - 152), W / 2, 530)
  font(ctx, stack, 400, 26)
  ctx.fillStyle = C.inkSoft
  ctx.fillText(`항목 승수 ${summary.winsA} : ${summary.winsB} (무승부 ${summary.ties})`, W / 2, 572)
  ctx.textAlign = 'left'

  const keys = ['entry', 'exterior', 'bus', 'hotelMoves', 'real', 'perEntry']
  const picked = keys.map((k) => rows.find((r) => r.key === k)).filter((r): r is CompareRow => Boolean(r))
  let y = 630
  const rowH = 96
  picked.forEach((r) => {
    ctx.fillStyle = C.card
    rr(ctx, 76, y, W - 152, rowH - 12, 16)
    ctx.fill()
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.fillStyle = C.inkSoft
    font(ctx, stack, 700, 24)
    ctx.fillText(fit(ctx, r.label, 300), W / 2, y + 34)
    ;(['a', 'b'] as const).forEach((side, i) => {
      const win = r.winner === side
      const cx = i === 0 ? 76 + 170 : W - 76 - 170
      ctx.fillStyle = win ? (side === 'a' ? C.mintInk : C.stampInk) : C.ink
      font(ctx, stack, win ? 900 : 400, 32)
      ctx.fillText(fit(ctx, `${win ? '✓ ' : ''}${side === 'a' ? r.aText : r.bText}`, 300), cx, y + 58)
    })
    y += rowH
  })
  ctx.textAlign = 'left'
  return canvas
}

/* ---------- 공개 API ---------- */

export async function renderResultCards(result: PackageResult): Promise<NamedBlob[]> {
  const stack = await prepareFont()
  const specs: { name: string; title: string; draw: () => HTMLCanvasElement }[] = [
    { name: '1-종합감정', title: '종합 감정', draw: () => drawSummary(result, stack, 3) },
    { name: '2-일정팩트체크', title: '일정 팩트체크', draw: () => drawFact(result, stack, 3) },
    { name: '3-숨은비용', title: '숨은 비용', draw: () => drawCost(result, stack, 3) },
  ]
  const out: NamedBlob[] = []
  for (const s of specs) out.push({ name: `유럽패키지-${s.name}.png`, title: s.title, blob: await toBlob(s.draw()) })
  return out
}

export async function renderCompareCard(
  rows: CompareRow[],
  ma: PackageMetrics,
  mb: PackageMetrics,
  summary: CompareSummary,
  nameA: string,
  nameB: string,
): Promise<NamedBlob[]> {
  const stack = await prepareFont()
  const canvas = drawCompare(rows, ma, mb, summary, nameA, nameB, stack)
  return [{ name: '유럽패키지-1대1비교.png', title: '1:1 비교', blob: await toBlob(canvas) }]
}

export function downloadBlob(b: NamedBlob) {
  const url = URL.createObjectURL(b.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = b.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 모바일 공유 시트(카카오톡 등). 지원하지 않으면 false */
export async function shareBlobs(blobs: NamedBlob[]): Promise<boolean> {
  const files = blobs.map((b) => new File([b.blob], b.name, { type: 'image/png' }))
  if (typeof navigator === 'undefined' || !navigator.canShare || !navigator.canShare({ files })) return false
  try {
    await navigator.share({ files, title: '유럽 패키지 감정 결과' })
    return true
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return true
    return false
  }
}
