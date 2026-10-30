/**
 * 일정표 줄 전처리 / 방문지 후보 판별
 *
 * 원문 보존 원칙: 줄을 지우지 않는다. 방문지가 아닌 줄은 `ExcludeReason` 플래그만 달아
 * 판독(entry/exterior/window)·AI(Gemini) 전송·통계 집계에서 제외하고, 화면에는 원문 줄 번호와 함께 남긴다.
 */

import type { ExcludeReason, TourMode } from './mock-result'

export const EXCLUDE_LABEL: Record<ExcludeReason, string> = {
  date: '날짜 줄',
  ui: 'UI 잔여 문구',
  decor: '장식/빈 줄',
  meta: '식사·숙박 안내',
  notice: '안내 문구',
  transit: '교통·이동 줄',
  'not-site': '방문지 아님',
  description: '설명 카드',
  city: '도시 구분 줄',
}

// ──────────────────────────────────────────────────────────────
// 1단계: 내용과 무관하게 방문지가 될 수 없는 줄
// ──────────────────────────────────────────────────────────────

const stripBullet = (t: string) => t.replace(/^[\s\-–—*•·●○▶▷▪‣]+/, '').trim()

/** 날짜·요일·시각만으로 이루어진 줄: "2026-11-10 화요일", "2026.11.10(화요일)", "11월 10일 (화)", "09:30" */
export function isDateLine(text: string): boolean {
  const t = stripBullet(text)
  if (!t) return false
  const rest = t
    .replace(/\d{4}\s*[-./년]\s*\d{1,2}\s*[-./월]\s*\d{1,2}\s*일?/g, '')
    .replace(/\d{1,2}\s*월\s*\d{1,2}\s*일/g, '')
    .replace(/\b\d{1,2}[./]\d{1,2}\b/g, '')
    .replace(/\d{1,2}\s*:\s*\d{2}/g, '')
    .replace(/[월화수목금토일](?:요일)?/g, '')
    .replace(/[\s~\-–—·,()（）[\]/]+/g, '')
  return rest === ''
}

const UI_WORDS = new Set(
  [
    '펼치기',
    '접기',
    '펼쳐보기',
    '전체보기',
    '더보기',
    '자세히보기',
    '상세보기',
    '닫기',
    '열기',
    '목록',
    '맨위로',
    '공유하기',
    '스크랩',
    '인쇄',
    '이전',
    '다음',
    '일정표보기',
    '지도보기',
    '일정접기',
    '일정펼치기',
    '전체펼치기',
    '전체접기',
    'top',
  ].map((w) => w.toLowerCase()),
)

/** "펼치기/접기", "전체보기", "더보기" 같은 웹페이지 복사 잔여물 */
export function isUiResidue(text: string): boolean {
  const compact = stripBullet(text).replace(/\s+/g, '').toLowerCase()
  if (!compact) return false
  return compact.split(/[/·|,>\\]+/).every((tok) => tok === '' || UI_WORDS.has(tok))
}

/** 글자·숫자가 하나도 없는 장식 줄: "-----", "=====", "※※※", "▶▶" */
export function isDecorLine(text: string): boolean {
  return !/[\p{L}\p{N}]/u.test(text)
}

/** [식사]/[호텔] 같은 메타 태그 줄 (일차 파싱에서 식사/숙박으로 따로 읽는다) */
export function isMetaLine(text: string): boolean {
  const t = stripBullet(text)
  return (
    /^\[\s*(?:식사|호텔|숙박|숙소|조식|중식|석식)\s*\]/.test(t) ||
    /^(?:식사|조식|중식|석식|호텔|숙박|투숙)\s*[:：]/.test(t) ||
    /^예정$/.test(t) ||
    /^숙박은\s*출발/.test(t)
  )
}

export function isNoticeLine(text: string): boolean {
  const t = stripBullet(text)
  return /^※/.test(text.trim()) || /^\[\s*(?:안내|유의\s*사항|참고|공지)\s*\]/.test(t)
}

/** 방문지 판독 전에 걸러낼 수 있는 줄이면 사유를 반환한다. */
export function detectNonSite(text: string): ExcludeReason | null {
  if (isDecorLine(text)) return 'decor'
  if (isDateLine(text)) return 'date'
  if (isUiResidue(text)) return 'ui'
  if (isNoticeLine(text)) return 'notice'
  if (isMetaLine(text)) return 'meta'
  return null
}

// ──────────────────────────────────────────────────────────────
// 2단계: 방문지 후보 판별 + 관람 방식 판독
// ──────────────────────────────────────────────────────────────

/** 이동수단에 "타는" 표현: 공항·열차·버스 탑승은 관광이 아니라 교통이다 */
const TRANSPORT_BOARD = /(?:항공(?:기|편)?|비행기|버스|전용\s*차(?:량)?|열차|기차|TGV|ICE|고속\s*열차|페리|지하철|택시)\s*(?:에\s*)?(?:탑승|승차|이용)/i
/** 탑승 자체가 관광 체험인 것들 */
const ATTRACTION_RIDE = /산악\s*열차|등반\s*열차|톱니바퀴|케이블카|곤돌라|유람선|크루즈|수상\s*택시|열기구|관람차|리프트|트램|바토무슈|증기\s*기관차|보트\s*투어/
const TRANSIT_WORDS = /출발|도착|이동|환승|수속|집결|미팅|체크\s*인|체크\s*아웃|귀국|입국|출국|기내|비행|항공편|공항|휴게소|이륙|착륙|하차|승차|탑승|경유|운행|소요/
const ACTIVITY_WORDS = /방문|산책|감상|체험|유람|등반|관람|입장|투어|견학|둘러|포토\s*타임|조망|외관|전경|차창|야경|트레킹|하이킹|전망/
// "탑승"의 '탑', "기다리다"의 '다리'에 걸리지 않도록 제외 조건을 둔다
const LANDMARK_NOUNS = /박물관|미술관|궁전|성당|대성당|성곽|고성|광장|(?<!기)다리|탑(?!승)|언덕|호수|분수|폭포|해변|공원|마을|사원|유적|수도원|전망대|운하|항구|골목|정원|극장|오페라|대학|구시가|올드\s*타운|빙하|계곡|산맥|알프스|야시장|시장|역사\s*지구/

/** 안에 들어가거나(내부) 입장권이 명시된 표현 */
const INSIDE_STRONG = /내부|입장(?!\s*료\s*불포함)|입장권|투어\s*포함|티켓\s*포함/
const EXTERIOR_WORDS = /외부\s*관람|외관|전경|포토\s*타임|밖에서|앞에서|바라보|조망|감상|사진\s*촬영/
const WINDOW_EXPLICIT = /차창|차안|차\s*안에서/
const WINDOW_PASSING = /지나가(?:며|면서|는)?/
const WINDOW_TOUR = /(?:버스|열차|기차)\s*(?:시내\s*)?(?:관광|투어)|패노라마|파노라마/

/** 괄호/대괄호 태그: 원문이 직접 밝힌 관람 방식이므로 키워드 추정보다 우선한다 — "콜로세움(외관)", "바티칸박물관(내부)", "[차창]" */
const TAG_BODY = String.raw`[^)\]）]*`
// "[외부관람]"처럼 '관람'이 들어 있어도 내부 입장으로 새지 않도록 외부 관람 태그를 명시한다
const TAG_EXTERIOR = new RegExp(String.raw`[(\[（]\s*(?:외부\s*관람|외부\s*관광|외관|전경|조망|포토\s*타임)${TAG_BODY}[)\]）]`)
const TAG_ENTRY = new RegExp(String.raw`[(\[（]\s*(?:내부(?:\s*관람)?|입장)${TAG_BODY}[)\]）]`)
const TAG_WINDOW = new RegExp(String.raw`[(\[（]\s*차창${TAG_BODY}[)\]）]`)

/** 여행사 페이지의 이동 시간 표기: "_ 약 1시간 소요", "이동 약 40분" */
const TRAVEL_TIME_NOTE = /_\s*약\s*\d+(?:[.-]\d+)?\s*(?:시간|분)(?:\s*\d+\s*(?:분|뷴))?\s*소요|이동\s*_?\s*약\s*\d+/

/** 운영 문구: 집결/미팅/안내처럼 방문지가 아니라 진행 안내인 줄 */
const OPS_WORDS = /미팅|집결|인솔자|안내|유의\s*사항|공지|홈페이지|유선|카운터|터미널|수속|출발\s*\d+\s*시간\s*전/

export type VisitVerdict =
  | { kind: 'exclude'; reason: ExcludeReason }
  /** via: 원문 괄호 태그로 확정('tag') / 키워드 규칙('keyword'). mode가 'unknown'이면 원문에 관람 방식 표기가 없는 것 */
  | { kind: 'visit'; mode: TourMode; keyword?: string; via: 'tag' | 'keyword' | 'none' }

/** 텍스트에 원문이 직접 적은 관람 방식 태그((외관)/(내부)/(조망)/(차창)…)가 있으면 그 판독을 돌려준다 */
export function tagVerdict(text: string): { mode: TourMode; keyword: string } | null {
  const t = stripBullet(text)
  const tag = t.match(TAG_WINDOW) ?? t.match(TAG_ENTRY) ?? t.match(TAG_EXTERIOR)
  if (!tag) return null
  const mode: TourMode = TAG_WINDOW.test(t) ? 'window' : TAG_ENTRY.test(t) ? 'entry' : 'exterior'
  return { mode, keyword: tag[0] }
}

export interface ClassifyOptions {
  /** 불릿(`- `) 줄: 방문지 후보로 간주하고, 분류가 안 되면 'unknown'(판독 불가)으로 둔다 */
  bullet?: boolean
  /** 선택관광 카드 제목+설명: 탈것이 있으면 입장(체험)으로 본다 */
  option?: boolean
}

/**
 * 방문지 후보인지 판별하고, 후보라면 관람 방식을 판독한다.
 * @param sightMatched 지식베이스의 명소 이름이 줄에 들어 있는지
 *
 * 우선순위: ① 괄호 태그 (외관)/(내부)/(조망)/(전경)/(차창) → ② 운영 문구 제외 → ③ 키워드 규칙
 * 'window'(지나가며 조망)는 "차창으로 구경한다"는 표현이 있을 때만 준다.
 * 출발/도착/이동은 교통 줄이지 관광 방식이 아니므로 'transit'으로 제외한다.
 */
export function classifyVisit(text: string, sightMatched: boolean, opts: ClassifyOptions = {}): VisitVerdict {
  const t = stripBullet(text)

  // ① 원문이 직접 적은 태그가 최우선
  const tag = tagVerdict(t)
  if (tag) return { kind: 'visit', mode: tag.mode, keyword: tag.keyword, via: 'tag' }

  // ② 운영 문구 (집결/미팅/안내…)는 방문지가 아니다. 선택관광 카드의 제목은 예외
  if (!opts.option && OPS_WORDS.test(t)) return { kind: 'exclude', reason: 'notice' }

  // 이동 시간 안내 문장: "…피우지로 이동 _ 약 3시간 소요", "…포지타노 전망대 _ 약 1시간 소요"
  if (!opts.bullet && !opts.option && TRAVEL_TIME_NOTE.test(t)) return { kind: 'exclude', reason: 'transit' }

  const ride = ATTRACTION_RIDE.test(t)
  const hasLandmark = LANDMARK_NOUNS.test(t)
  const hasActivity = ACTIVITY_WORDS.test(t) || /관광/.test(t)
  const explicitWindow = WINDOW_EXPLICIT.test(t) || WINDOW_TOUR.test(t)
  const hasWindow = explicitWindow || WINDOW_PASSING.test(t)
  const boardsTransport = TRANSPORT_BOARD.test(t) && !ride
  const forced = Boolean(opts.bullet || opts.option)

  // 방문지 신호: 명소 DB, 관광 탈것, 랜드마크 명사 (일반 "관광" 단어만으로는 부족). 불릿/선택관광은 그 자체로 후보
  const placeSignal = sightMatched || ride || hasLandmark
  const candidate = forced || placeSignal || (hasActivity && /방문|산책|등반|유람|체험|견학|둘러|하이킹|트레킹|투어|야경/.test(t))

  if (!candidate && !explicitWindow) {
    return { kind: 'exclude', reason: TRANSIT_WORDS.test(t) || boardsTransport ? 'transit' : 'not-site' }
  }

  // 교통 줄: 장소 신호가 없고 "타고 이동/출발/도착"만 있는 경우 ("항공편 탑승하여 로마 출발")
  if (!forced && !placeSignal && boardsTransport) return { kind: 'exclude', reason: 'transit' }

  // ③ 관람 방식
  if (hasWindow && !INSIDE_STRONG.test(t)) return { kind: 'visit', mode: 'window', via: 'keyword', keyword: (t.match(WINDOW_EXPLICIT) ?? t.match(WINDOW_PASSING) ?? t.match(WINDOW_TOUR))?.[0] }

  const hasExterior = EXTERIOR_WORDS.test(t)
  const insideStrong = INSIDE_STRONG.test(t)
  if (insideStrong) return { kind: 'visit', mode: 'entry', via: 'keyword', keyword: t.match(INSIDE_STRONG)?.[0] }
  if (ride && (opts.option || /탑승|등반|체험|운행|이용|투어/.test(t))) return { kind: 'visit', mode: 'entry', via: 'keyword', keyword: t.match(ATTRACTION_RIDE)?.[0] }
  if (hasExterior) return { kind: 'visit', mode: 'exterior', via: 'keyword', keyword: t.match(EXTERIOR_WORDS)?.[0] }
  // "관람/체험"은 외관 표시가 없을 때만 내부 관람으로 본다
  if (/관람|체험/.test(t)) return { kind: 'visit', mode: 'entry', via: 'keyword', keyword: t.match(/관람|체험/)?.[0] }

  if (!candidate) return { kind: 'exclude', reason: 'not-site' }
  // 명소 이름은 있지만 "…로 이동/도착/출발"뿐이면 관광이 아니라 교통 줄이다 (불릿/선택관광 제외)
  if (!forced && TRANSIT_WORDS.test(t) && !hasActivity) return { kind: 'exclude', reason: 'transit' }
  // 원문에 관람 방식 표기가 없다: 외관/입장으로 확정하지 않고 '판독 불가'로 둔다
  return { kind: 'visit', mode: 'unknown', via: 'none', keyword: t.match(/자유|산책|방문|둘러보기|거리/)?.[0] }
}
