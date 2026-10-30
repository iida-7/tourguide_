/** 관람 방식 판독 결과. 'unknown'은 원문에 관람 방식 언급이 없어 확정하지 못한 경우다 (외관/입장으로 억지 확정하지 않는다) */
export type TourMode = 'entry' | 'exterior' | 'window' | 'unknown'
/** 판독 근거: 사실(지식베이스) / 원문 표기·키워드 규칙 / Gemini 추정(참고용) */
export type Basis = 'fact' | 'keyword' | 'gemini'
export type TransportKind = 'flight' | 'bus' | 'train'

export interface JourneyNode {
  city: string
  nights?: number
  label?: string
  /** 이 노드 다음으로 이어지는 이동수단 */
  next?: TransportKind
}

export interface StatItem {
  key: string
  label: string
  shortLabel: string
  weight: number
  score: number
  max: number
  note: string
}

export interface CountrySummary {
  flag: string
  name: string
  summary: string
}

/** 규칙으로 못 정한 줄을 Gemini에 물었을 때의 근거 */
export interface AiReason {
  sentence: string
  line: number
  keyword: string
  verdict: string
}

/** 원문 줄 하나 (줄 번호 + 내용) */
export interface SourceLine {
  line: number
  text: string
}

/** 방문지 판독에서 제외된 줄의 사유 (엔진 내부 분류용) */
export type ExcludeReason = 'date' | 'ui' | 'decor' | 'meta' | 'notice' | 'transit' | 'not-site' | 'description' | 'city'

/** 선택관광 카드에서 읽은 부가 정보 (요금 줄은 영수증 탭이 읽는다) */
export interface OptionInfo {
  fee?: string
  duration?: string
  alternative?: string
}

export interface ScheduleItem {
  time: string
  /** 원문 문장 그대로 (불릿 한 줄) */
  text: string
  /** 명소 이름: 설명 문장이 아니라 "카펠교"처럼 장소를 가리키는 말 */
  name?: string
  line: number
  mode: TourMode
  basis: Basis
  source?: string
  /** 판독 근거 (원문에서 무엇을 보고 판단했는지) */
  explain: string
  aiReason?: AiReason
  /** 이 명소에 접어 넣은 설명 문단 (원문 줄 번호 유지) */
  desc?: SourceLine[]
  /** desc의 첫 줄이 설명 카드 제목이면 true (화면에서 소제목으로 보여 준다) */
  descHasTitle?: boolean
  /** 선택관광 카드 */
  option?: OptionInfo
}

/** 일정 흐름 구간: "스위스/루체른"처럼 도시 줄 하나와 그 아래에 모인 내용 */
export interface DaySection {
  country?: string
  city?: string
  cityLine?: number
  /** 도시 소개/이동 문장 (예: "…루체른으로 이동 _ 약 1시간 소요") */
  moves: GroundMove[]
  intro: SourceLine[]
  /** 이 구간의 방문지 (ScheduleItem.line 목록) */
  itemLines: number[]
}

export interface GroundMove {
  line: number
  text: string
  duration?: string
}

/** 항공 이동 카드: 흩어진 날짜/시각/편명/소요시간 줄을 하나로 묶은 것 */
export interface FlightCard {
  from?: string
  to?: string
  depTime?: string
  depDate?: string
  arrTime?: string
  arrDate?: string
  flightNo?: string
  duration?: string
  lines: number[]
}

/** 어느 명소에도 붙지 않은 소개/안내 카드 (본문 줄 번호 유지) */
export interface InfoCard {
  title: SourceLine
  sub?: SourceLine
  lines: SourceLine[]
}

export interface Notice extends SourceLine {
  kind: 'notice' | 'meeting' | 'lodging' | 'meal'
}

export interface DaySchedule {
  day: number
  flag: string
  city: string
  tagline: string
  /** 판독 대상 방문지(불릿=명소, 선택관광). 설명 문단은 각 항목의 desc로 접혀 있다 */
  items: ScheduleItem[]
  /** 일차 헤더 아래 날짜 줄 ("2026-11-10 화요일") */
  date?: SourceLine
  flights?: FlightCard[]
  sections?: DaySection[]
  /** 식사·숙박·유의사항 영역으로 옮긴 원문 줄 */
  notices?: Notice[]
  /** 명소에 붙지 못한 소개/안내 카드 */
  infoCards?: InfoCard[]
  /** 화면에서 숨긴 UI 문구 줄 번호 (펼치기/접기, 자세히보기 등). 데이터에는 남아 있다 */
  hiddenLines?: SourceLine[]
  /** 어느 범주에도 못 넣은 원문 */
  leftover?: SourceLine[]
  /** 식사·숙박으로 읽은 원문 줄 (줄 번호 표시용) */
  mealLines?: SourceLine[]
  lodgingLines?: SourceLine[]
  meals: string
  lodging: string
  /** 원문에서 식사 정보를 찾지 못해 기본값을 채운 경우 */
  mealsEstimated?: boolean
  /** 원문에서 숙박 정보를 찾지 못해 기본값을 채운 경우 */
  lodgingEstimated?: boolean
}

export type Currency = 'KRW' | 'EUR' | 'USD' | 'GBP' | 'CHF'

/** 원문 확인(금액 있음) / 언급만 있고 금액 없음 / 원문에 언급 자체가 없음 */
export type ReceiptStatus = 'found' | 'mentioned' | 'absent'

export interface ReceiptLine {
  id: string
  label: string
  /** 필수 경비의 상태. 선택관광은 항상 금액이 있는 항목만 담는다 */
  status?: ReceiptStatus
  /** status가 mentioned일 때 원문에서 따온 문구 */
  quote?: string
  /** EUR 환산액. 원문이 EUR이 아니면 `original`의 통화를 가정 환율로 환산한 값 */
  eur: number
  line: number
  /** 원문이 EUR이 아닌 통화로 적혀 있을 때의 원래 금액 */
  original?: { currency: Currency; amount: number }
}

export interface OptionLine extends ReceiptLine {
  tag: '추천' | '선택' | '주의'
}

export interface FitItem {
  emoji: string
  label: string
  score: number
  verdict: string
  tone: 'warn' | 'good' | 'best'
  note: string
}

export interface InventoryItem {
  emoji: string
  name: string
  reasons: [string, string]
  /** 필수(없으면 지장) > 권장(있으면 크게 편함) > 선택(있으면 좋음) */
  level: 'must' | 'recommend' | 'optional'
  /** 분류 근거 한 줄 (예: "도보 1.5만보 이상 → 필수") */
  basis: string
}

export interface PackageResult {
  coverage: { rate: number; matched: number; total: number }
  grade: string
  totalScore: number
  diagnosis: string
  journey: JourneyNode[]
  journeySummary: { cities: number; hotelMoves: number; fatigue: string }
  stats: StatItem[]
  countries: CountrySummary[]
  days: DaySchedule[]
  receipt: {
    packagePriceKrw: number
    eurToKrw: number
    mandatory: ReceiptLine[]
    options: OptionLine[]
    /** 필수 경비 중 원문에 금액이 없어 평균 참고값을 쓴 항목이 있으면 true */
    mandatoryEstimated?: boolean
    /** 금액 없이 이름만 나온 선택관광 수 */
    optionsWithoutAmount?: number
    /** 원문에서 상품가를 찾지 못해 기본값을 쓴 경우 true */
    packagePriceEstimated?: boolean
  }
  valuation: {
    baseScore: number
    /** 불분명한 항목(판독 불가)도 반영해 다시 계산한 점수 */
    aiScore: number
    aiNote: string
    /** aiNote에 쓴 실제 판독 수치 */
    modeCounts?: { entry: number; exterior: number; window: number; unknown: number }
    fits: FitItem[]
    pros: string
    cons: string
  }
  inventory: InventoryItem[]
}

export const mockResult: PackageResult = {
  coverage: { rate: 85, matched: 17, total: 20 },
  grade: 'A-',
  totalScore: 78,
  diagnosis: '🏛️ 눈호강 예술투어, 그러나 버스 탑승 28시간의 압박!',
  journey: [
    { city: '인천', label: '출발', next: 'flight' },
    { city: '파리', nights: 2, next: 'bus' },
    { city: '인터라켄', nights: 2, next: 'train' },
    { city: '밀라노', nights: 1, next: 'bus' },
    { city: '베니스', nights: 1, next: 'bus' },
    { city: '로마', nights: 2, next: 'flight' },
    { city: '인천', label: '귀국' },
  ],
  journeySummary: { cities: 5, hotelMoves: 4, fatigue: '보통' },
  stats: [
    { key: 'culture', label: '문화·역사·예술', shortLabel: '문화·역사', weight: 25, score: 21, max: 25, note: '루브르 등' },
    { key: 'nature', label: '자연·경관', shortLabel: '자연·경관', weight: 10, score: 7, max: 10, note: '융프라우' },
    { key: 'depth', label: '관광 깊이', shortLabel: '관광 깊이', weight: 20, score: 13, max: 20, note: '외관 다수' },
    { key: 'move', label: '이동 부담', shortLabel: '이동 부담', weight: 20, score: 14, max: 20, note: '버스 4시간' },
    { key: 'compose', label: '구성의 알참', shortLabel: '구성', weight: 15, score: 11, max: 15, note: '쇼핑 2회' },
    { key: 'weather', label: '날씨 적합성', shortLabel: '날씨', weight: 10, score: 10, max: 10, note: '5월 최적기' },
  ],
  countries: [
    { flag: '🇫🇷', name: '프랑스', summary: '예술과 낭만의 중심, 이번 여정의 40% 비중 차지' },
    { flag: '🇨🇭', name: '스위스', summary: '알프스 설경과 청정 자연, 물가가 비싸 자유식 대비 필요' },
    { flag: '🇮🇹', name: '이탈리아', summary: '고대 로마와 르네상스의 보고, 도보 이동량 가장 많음' },
  ],
  days: [
    {
      day: 1,
      flag: '🇫🇷',
      city: '프랑스 파리',
      tagline: '"긴 비행 끝, 낭만의 도시 도착"',
      items: [
        {
          time: '오전',
          text: '인천 국제공항 출발 (직항편 이용)',
          line: 4,
          mode: 'entry',
          basis: 'keyword',
          explain: '이동일이라 관광은 없어요. 기내식 2회 제공이 일반적입니다.',
        },
        {
          time: '오후',
          text: '파리 샤를드골 공항 도착 후 가이드 미팅, 호텔 투숙',
          line: 8,
          mode: 'window',
          basis: 'keyword',
          explain: '공항에서 시내까지 버스로 약 1시간. 첫날은 휴식에 집중!',
        },
      ],
      meals: '조(기내식) / 중(기내식) / 석(현지식)',
      lodging: '노보텔 파리 에스트 (파리 외곽 2성급, 시내까지 지하철 40분 소요)',
    },
    {
      day: 2,
      flag: '🇫🇷',
      city: '프랑스 파리',
      tagline: '"예술과 빛의 도시 속으로"',
      items: [
        {
          time: '오전',
          text: '세계 3대 박물관 중 하나인 루브르 박물관 내부 관람',
          line: 14,
          mode: 'entry',
          basis: 'fact',
          source: 'louvre.fr',
          explain: '모나리자가 있는 궁전형 박물관',
        },
        {
          time: '오후',
          text: '에펠탑(외관) 감상 및 샹젤리제 거리 자유 산책',
          line: 18,
          mode: 'exterior',
          basis: 'keyword',
          explain: '꼭대기 전망대는 안 올라갑니다!',
        },
        {
          time: '오후',
          text: '몽마르뜨 언덕 및 사크레쾨르 대성당 조망 및 주변 관광',
          line: 22,
          mode: 'exterior',
          basis: 'keyword',
          explain: "원문에 '조망' 표현이 있어 외부 관람으로 판단 (키워드 기준)",
        },
      ],
      meals: '조(호텔식) / 중(에스카르고 현지식) / 석(한식)',
      lodging: '노보텔 파리 에스트 (파리 외곽 2성급, 시내까지 지하철 40분 소요)',
    },
    {
      day: 3,
      flag: '🇨🇭',
      city: '스위스 인터라켄',
      tagline: '"고속열차로 알프스 품으로"',
      items: [
        {
          time: '오전',
          text: '파리 리옹역에서 TGV 이용 스위스 바젤 이동',
          line: 30,
          mode: 'window',
          basis: 'keyword',
          explain: '약 3시간 소요. 창밖 풍경이 점점 알프스로 바뀝니다.',
        },
        {
          time: '오후',
          text: '인터라켄 시내 및 호수 주변 자유 산책',
          line: 34,
          mode: 'exterior',
          basis: 'keyword',
          explain: '두 호수 사이의 마을. 물가가 높아 간식 예산 필요!',
        },
      ],
      meals: '조(호텔식) / 중(자유식) / 석(현지식)',
      lodging: '인터라켄 시내 4성급 호텔 (기차역까지 도보 10분)',
    },
    {
      day: 4,
      flag: '🇨🇭',
      city: '스위스 → 이탈리아',
      tagline: '"만년설 위에서 밀라노까지 6시간"',
      items: [
        {
          time: '오전',
          text: '융프라우요흐 (산악열차 탑승, 선택관광)',
          line: 42,
          mode: 'entry',
          basis: 'fact',
          source: 'jungfrau.ch',
          explain: '해발 3,454m 유럽 최고 역. 영하 기온에 대비하세요!',
        },
        {
          time: '오후',
          text: '밀라노로 이동 (버스 약 6시간) 및 두오모 성당 외관 관람',
          line: 48,
          mode: 'exterior',
          basis: 'keyword',
          explain: '두오모 내부 입장은 포함되지 않아요. 광장에서 사진 타임!',
        },
      ],
      meals: '조(호텔식) / 중(현지식) / 석(한식)',
      lodging: '밀라노 근교 3성급 호텔',
    },
    {
      day: 5,
      flag: '🇮🇹',
      city: '이탈리아 베니스',
      tagline: '"물의 도시에서 곤돌라 한 척"',
      items: [
        {
          time: '오전',
          text: '밀라노 출발, 베니스 본섬 수상버스 이동',
          line: 56,
          mode: 'window',
          basis: 'keyword',
          explain: '본섬은 차량 진입 불가, 수상버스로 들어갑니다.',
        },
        {
          time: '오후',
          text: '산마르코 광장 및 두칼레 궁전 외관 관광',
          line: 60,
          mode: 'exterior',
          basis: 'fact',
          source: 'palazzoducale.visitmuve.it',
          explain: '궁전 내부는 별도 입장. 광장 분위기를 즐기는 코스예요.',
        },
      ],
      meals: '조(호텔식) / 중(해산물 파스타) / 석(한식)',
      lodging: '베니스 메스트레 3성급 호텔',
    },
    {
      day: 6,
      flag: '🇮🇹',
      city: '이탈리아 로마',
      tagline: '"천 년 제국의 심장으로"',
      items: [
        {
          time: '오전',
          text: '피렌체 경유 로마 이동 (버스 약 5시간)',
          line: 66,
          mode: 'window',
          basis: 'keyword',
          explain: '토스카나 평원을 차창으로 감상. 휴게소 쇼핑 포함.',
        },
        {
          time: '오후',
          text: '콜로세움 외관 및 트레비 분수 방문',
          line: 70,
          mode: 'exterior',
          basis: 'keyword',
          explain: '콜로세움 내부는 포함되지 않아요. 동전 던지기는 가능!',
        },
      ],
      meals: '조(호텔식) / 중(자유식) / 석(현지식)',
      lodging: '로마 외곽 3성급 호텔',
    },
    {
      day: 7,
      flag: '🇮🇹',
      city: '이탈리아 로마 · 바티칸',
      tagline: '"르네상스 걸작 한가운데"',
      items: [
        {
          time: '오전',
          text: '바티칸 박물관 및 시스티나 성당 내부 관람',
          line: 78,
          mode: 'entry',
          basis: 'fact',
          source: 'museivaticani.va',
          explain: '미켈란젤로의 천지창조. 내부 촬영은 금지예요.',
        },
        {
          time: '오후',
          text: '나보나 광장 및 판테온 자유 시간',
          line: 82,
          mode: 'unknown',
          basis: 'keyword',
          explain: '원문에 관람 방식 표기가 없어 확인 불가',
          aiReason: {
            sentence: '나보나 광장 및 판테온 자유 시간',
            line: 82,
            keyword: '자유 시간',
            verdict: '판단불가',
          },
        },
      ],
      meals: '조(호텔식) / 중(한식) / 석(자유식)',
      lodging: '로마 외곽 3성급 호텔',
    },
    {
      day: 8,
      flag: '🇰🇷',
      city: '귀국',
      tagline: '"기억 가득, 캐리어도 가득"',
      items: [
        {
          time: '오전',
          text: '로마 피우미치노 공항 출발, 기내 1박',
          line: 90,
          mode: 'window',
          basis: 'keyword',
          explain: '택스리펀 서류는 공항 데스크에서 미리 준비하세요.',
        },
      ],
      meals: '조(호텔식) / 중(기내식) / 석(기내식)',
      lodging: '기내 숙박 (익일 인천 도착)',
    },
  ],
  receipt: {
    packagePriceKrw: 1_990_000,
    eurToKrw: 1500,
    mandatory: [
      { id: 'guide', label: '기사/가이드 경비 (1인당)', eur: 100, line: 88, status: 'found' },
      { id: 'citytax', label: '유럽 도시세 (City Tax / 전 일정 누적)', eur: 35, line: 92, status: 'found' },
      { id: 'tip', label: '식당 물값 및 테이블 매너 팁 (권장)', eur: 15, line: 104, status: 'found' },
    ],
    options: [
      { id: 'gondola', tag: '추천', label: '베니스 곤돌라 & 수상택시 투어', eur: 70, line: 112 },
      { id: 'jungfrau', tag: '선택', label: '융프라우요흐 등반 산악열차', eur: 120, line: 116 },
      { id: 'night', tag: '주의', label: '야간 시티투어 (선택 안 할 시 호텔 대기)', eur: 50, line: 120 },
    ],
  },
  valuation: {
    baseScore: 78,
    aiScore: 75,
    aiNote: "외부 관람 2곳 · 확인 불가 1곳. 내부 입장이 확인되지 않은 1곳을 '외부 관람 수준'으로 보수적으로 반영해 관광 깊이 점수를 조정했어요.",
    modeCounts: { entry: 3, exterior: 2, window: 0, unknown: 1 },
    fits: [
      { emoji: '👨‍👩‍👧', label: '부모님 효도 관광', score: 58, verdict: '보통', tone: 'warn', note: '4일차 버스 6시간 탑승 주의' },
      { emoji: '👫', label: '2030 커플/신혼', score: 82, verdict: '추천', tone: 'good', note: '파리/로마 낭만 스팟 다수' },
      { emoji: '🏃', label: '벼락치기 정복러', score: 95, verdict: '강추', tone: 'best', note: '8일 만에 4개국 랜드마크!' },
    ],
    pros: '루브르 내부 입장 및 스위스 융프라우 포함으로 핵심 볼거리 충실',
    cons: '파리 숙소가 시외곽에 위치하여 석식 후 자유시간 활용이 제한적임',
  },
  inventory: [
    { emoji: '👟', name: '쿠션 운동화', reasons: ['로마 자갈길', '하루 1.8만보'], level: 'must', basis: '도보 1.5만보 이상 → 필수' },
    { emoji: '🔌', name: '멀티 어댑터', reasons: ['국가별 소켓', '호환 대비'], level: 'must', basis: '스위스 콘센트 규격이 달라 → 필수' },
    { emoji: '💺', name: '버스 방석', reasons: ['이동 28시간', '엉덩이 구출용'], level: 'recommend', basis: '버스 이동 28시간 → 권장' },
    { emoji: '💶', name: '유로 소액권', reasons: ['가이드비·팁', '현금 필수'], level: 'recommend', basis: '현지 지불 경비가 있어 → 권장' },
    { emoji: '🧥', name: '얇은 패딩', reasons: ['융프라우 설산', '영하 기온 대비'], level: 'recommend', basis: '융프라우 고산 일정 → 권장' },
    { emoji: '💊', name: '멀미약·소화제', reasons: ['산악도로 대비', '버스 탑승 전'], level: 'recommend', basis: '산악도로 버스 이동 → 권장' },
    { emoji: '☕', name: '컵라면·고추장', reasons: ['호텔 석식 부실', '대비 비상식량'], level: 'optional', basis: '식사는 일정에 포함 → 있으면 좋음' },
    { emoji: '🧴', name: '접이식 우산', reasons: ['5월 파리 변덕', '소나기 방어'], level: 'optional', basis: '5월 소나기 대비 → 있으면 좋음' },
  ],
}

export const MAX_CHARS = 20_000
export const WARN_CHARS = 18_000
export const SAMPLE_CHAR_COUNT = 14_250

export const departureMonths = [
  { value: '1', label: '1월 (한겨울)' },
  { value: '2', label: '2월 (늦겨울)' },
  { value: '3', label: '3월 (초봄)' },
  { value: '4', label: '4월 (봄)' },
  { value: '5', label: '5월 (봄/초여름)' },
  { value: '6', label: '6월 (초여름)' },
  { value: '7', label: '7월 (한여름)' },
  { value: '8', label: '8월 (한여름/휴가철)' },
  { value: '9', label: '9월 (초가을)' },
  { value: '10', label: '10월 (가을)' },
  { value: '11', label: '11월 (늦가을)' },
  { value: '12', label: '12월 (겨울/연말)' },
]

export function formatKrw(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

export function formatEur(n: number) {
  return `€${n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}`
}

const CURRENCY_SYMBOL: Record<Currency, string> = { KRW: '원', EUR: '€', USD: '$', GBP: '£', CHF: 'CHF ' }

/** 원문 통화 금액을 원문 표기에 가깝게 보여준다 (예: $50, 40,000원) */
export function formatOriginal(o: { currency: Currency; amount: number }) {
  const n = o.amount.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
  return o.currency === 'KRW' ? `${n}원` : `${CURRENCY_SYMBOL[o.currency]}${n}`
}
