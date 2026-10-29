# 유럽 패키지 감정원 (The Package Inspector) — 전체 개발 계획서

> **문서 버전**: v1.0  
> **기준 PRD**: `DOCS/PRD.MD` (v1.2)  
> **작성일**: 2026-10-28  
> **상태**: Phase 1 ~ Phase 6 구현 완료 (Gemini 보조 판독, 50도시 지식 베이스, 1:1 비교, 카드 뉴스) / 후속 과제는 6장 하단 참고  
> **프로젝트 성격**: 클라이언트 사이드 인메모리 룰 엔진 기반 유럽 패키지여행 일정 팩트체크 & 가성비 감정 웹 서비스 (Zero Server Cost, Zero DB, Privacy-First)

---

## 1. 프로젝트 개요 및 개발 배경

### 1.1 개발 목적
한국 여행사들의 유럽 패키지 상품은 "에펠탑 조망", "루브르 박물관 외관", "차창 관광" 등 일반 소비자가 한눈에 파악하기 어려운 관람 방식을 사용합니다. 본 프로젝트는 사용자가 여행사 일정표 원문을 그대로 복사-붙여넣기만 하면 **1초 만에 4대 관람 방식(입장/외관/차창/AI보조), 6대 레이더 스탯, 필수 및 선택 숨은 비용 영수증, 생존 준비물**을 직관적인 인스펙터(감정원) 콘셉트로 시각화하여 정보의 비대칭을 해결하는 것을 목표로 합니다.

### 1.2 핵심 아키텍처 원칙
1. **Zero Server / Zero Cost**: 서버 인프라 및 유료 API 호출을 배제하고 100% 브라우저 내 룰 엔진으로 동작
2. **Privacy First (보안 무결성)**: 사용자가 입력한 일정표 데이터는 외부 서버나 DB로 일체 전송되지 않으며 브라우저 메모리/세션에만 유지
3. **100% 원문 보존 (No Missing Lines)**: 파싱 실패나 정형화 불가능한 텍스트도 원문 라인을 유실하지 않고 보존
4. **Fact-Based Verification**: 명소 해설 및 판정은 검증된 공식 도메인 출처와 규칙 기반으로만 매칭

---

## 2. 시스템 아키텍처 및 기술 스택

```
[User Browser]
   │
   ├─► [Input Phase] : PackageInput (app/page.tsx)
   │        │  - Raw Text Input & .txt File Upload
   │        │  - One-Click Sample Loader (lib/sample-itinerary.ts)
   │        │  - Month Selector (Departure Climate)
   │        ▼
   ├─► [Engine Phase] : inspectItinerary (lib/inspector-engine.ts)
   │        │  - Day Block Regex Segmentation
   │        │  - 4-Tier Tour Mode Matcher (entry / exterior / window / ai)
   │        │  - European 20+ Cities & Sights Database Matcher
   │        │  - Dynamic 6-Axis Scoring & Grade Calculation
   │        │  - Hidden Costs & Live Expense Calculator
   │        │  - 8-Slot Survival Inventory Generator
   │        ▼
   ├─► [Storage Phase] : sessionStorage ('inspected_result', 'inspected_raw_text')
   │        ▼
   └─► [Presentation Phase] : ResultView (app/result/page.tsx)
            │
            ├─► VerdictHeader (Grade Stamp & Matching Rate Progress)
            ├─► 5 Inspector Tabs
            │     ├─ Tab 1: OverviewTab (Journey Track, Radar Chart, Country Summary)
            │     ├─ Tab 2: ScheduleTab (Day Cards, Mode Badges, AI Reason Sheet)
            │     ├─ Tab 3: ReceiptTab (Hidden Cost Receipt & Option Toggle Calculator)
            │     ├─ Tab 4: ValuationTab (AI Toggle Score, Persona Fit, Pros/Cons)
            │     └─ Tab 5: InventoryTab (Survival Item Cards with Rarity Slots)
            └─► ActionBar (Markdown Copy / .md Download / Print & PDF / Reset)
```

### 2.1 기술 스택 명세

| 계층 | 기술 요소 | 버전 / 비고 | 선정 사유 |
|---|---|---|---|
| **Core Framework** | Next.js (App Router) | 16.4.3 | 정적 최적화, 최신 React 19 아키텍처 및 RSC 지원 |
| **Language** | TypeScript | 5.7.3 | 엄격한 타입 안정성(Strict Type) 및 인터페이스 무결성 |
| **Package Manager** | pnpm | 12.15.0 | 빠르고 효율적인 디스크 의존성 관리 |
| **Styling & Theme** | Tailwind CSS v4, tw-animate-css | 4.3.3 | 인스펙터/페이퍼 테마 커스텀 변수 및 하드 섀도우 지원 |
| **Headless UI** | Base UI (`@base-ui/react`) | 1.5.0 | 접근성 보장 다이얼로그(Sheet), 탭, 프로그레스 바, 셀렉트 |
| **Icons** | Lucide React | 1.17.0 | 일관된 모던 벡터 아이콘셋 |
| **Build Pipeline** | Webpack / Next Build | Stable Mode | 폐쇄망/오프라인 환경에서도 안정적인 빌드 보장 |

---

## 3. 전체 개발 로드맵 및 단계별 구현 현황 (WBS)

```
[ Phase 1: 환경 구축 및 디자인 시스템 ] ────► 100% 완료
[ Phase 2: 핵심 컴포넌트 및 UI 뷰 개발 ] ──► 100% 완료
[ Phase 3: 일정표 팩트체크 파서 & 룰 엔진 ] ─► 100% 완료
[ Phase 4: 동적 상태 연동 및 인터랙션 ] ────► 100% 완료
[ Phase 5: 안정화, 빌드 최적화 및 로컬 배포 ] ► 100% 완료
[ Phase 6: 고도화 및 서비스 확장 ] ─────────► 100% 완료
```

### 3.1 [Phase 1] 환경 구축 및 인스펙터 디자인 시스템 (완료)
- [x] Next.js 16 + Tailwind CSS v4 프로젝트 셋업
- [x] 빈티지 관청/인스펙터 감성의 테마 컬러 시스템 구축:
  - `paper` (#fbf6ea), `paper-deep` (#f3ead2), `ink` (#1f2a44)
  - `stamp` (#d8432f), `stamp-ink` (#b02f1d), `gold` (#e0a82e), `mint` (#2e9e8f), `ai` (#7b4fd0)
- [x] 하드 섀도우(`shadow-hard`, `shadow-hard-sm`, `shadow-hard-lg`) 및 도장 인입 애니메이션(`animate-stamp-in`) 정의

### 3.2 [Phase 2] 핵심 컴포넌트 및 레이아웃 개발 (완료)
- [x] 사이트 헤더(`SiteHeader`) 및 푸터(`SiteFooter`), 지식 안내소 레이아웃(`app/about/page.tsx`) 구축
- [x] Base UI 기반 UI 프리미티브 컴포넌트 셋업:
  - `Select`, `Tabs`, `Sheet` (바텀 시트 모달), `Progress`, `Textarea`
- [x] SVG 기반 육각형 스탯 레이더 차트(`RadarChart`) 컴포넌트 구현
- [x] 세그먼트 막대 게이지(`StatGauge`, `SegmentBar`) 구현

### 3.3 [Phase 3] 일정표 팩트체크 파서 & 분석 엔진 구현 (완료)
- [x] 다중 정규식 기반 일차(`Day`) 및 식사/호텔 메타정보 추출 엔진 개발
- [x] 4대 관람 모드 판독 알고리즘 구현:
  - `entry`: 내부, 입장, 관람, 탑승 키워드 판독
  - `exterior`: 외관, 전경, 조망, 포토타임 키워드 판독
  - `window`: 차창, 경유, 이동, 열차, 버스 키워드 판독
  - `ai`: 모호한 자유 산책/방문 일정에 대한 추정 사유 객체(`AiReason`) 자동 생성
- [x] 유럽 20여 개 핵심 도시(`CITIES_DB`) 및 주요 명소 공식 도메인(`SIGHTS_SOURCE`) 지식 베이스 구축
- [x] 6대 가치 스탯(문화·역사, 자연·경관, 관광 깊이, 이동 부담, 구성의 알참, 날씨 적합성) 및 종합 점수/등급 산출 로직 완성
- [x] 출발 월(1~12월)에 따른 기후 적합성 및 8종 생존 인벤토리 자동 매칭 로직 개발

### 3.4 [Phase 4] 동적 상태 연동 및 인터랙션 강화 (완료)
- [x] **원클릭 샘플 로더**: `lib/sample-itinerary.ts`의 서유럽 3국 8일 일정표를 1클릭으로 입력창에 채우는 기능 추가
- [x] **브라우저 세션 캐싱**: 입력된 일정표 분석 결과를 `sessionStorage`에 직렬화 저장
- [x] **결과 화면 연동**: `ResultView`가 클라이언트 마운트 시 사용자 맞춤 감정 결과를 감지하여 실시간 렌더링하도록 연결
- [x] **숨은 비용 영수증 실시간 계산기**: 지그재그 영수증 용지 디자인에 선택관광 옵션 체크박스 토글 연산 구현
- [x] **AI 판독 근거 바텀 시트**: AI 판독 뱃지 클릭 시 원문 라인 번호와 키워드 사유 모달 표출
- [x] **마크다운 내보내기**: `ActionBar`를 통한 클립보드 복사 및 `.md` 파일 다운로드, 인쇄/PDF 저장 연동

### 3.5 [Phase 5] 안정화, 빌드 최적화 및 로컬 배포 (완료)
- [x] 레이더 차트 및 세그먼트 바의 0 나눗셈(Division by zero) 예외 방어
- [x] 오프라인/샌드박스 환경 빌드 시 Google Fonts 네트워크 실패 방지를 위한 폰트 폴백(fallback) 명시
- [x] `package.json`의 빌드 파이프라인 최적화 (`next build --webpack`)
- [x] 전체 TypeScript 컴파일 에러 0건 검증 (`tsc --noEmit`)
- [x] Next.js 프로덕션 빌드 및 로컬호스트 3000번 포트 데몬 배포 완료 (`pnpm start -p 3000`)

---

## 4. 모듈별 상세 사양 및 파일 구조

```
c:\Users\della\zip\
├── app/
│   ├── about/page.tsx               # 지식 안내소 (3층 커버리지, AI 4대 안전장치, 가중치)
│   ├── compare/page.tsx             # 패키지 1:1 비교 페이지
│   ├── result/page.tsx              # 감정 결과 페이지 (서버 래퍼)
│   ├── globals.css                  # 인스펙터 테마 및 스타일 변수
│   ├── layout.tsx                   # 루트 레이아웃 (Noto Sans KR, IBM Plex Mono)
│   └── page.tsx                     # 메인 홈 페이지 (PackageInput 포함)
├── components/
│   ├── inspector/
│   │   ├── action-bar.tsx           # 결과 내보내기 바 (.md 복사/다운로드, 인쇄, 초기화)
│   │   ├── share-card-modal.tsx     # 카드 이미지 미리보기/저장/공유 모달
│   │   ├── compare-view.tsx         # 1:1 비교 입력/결과 뷰 (겹침 레이더, 비교표)
│   │   ├── inventory-tab.tsx        # 5번 탭: 생존 인벤토리 카드 (희귀도 4단계)
│   │   ├── journey-track.tsx        # 여정 트랙 타임라인 띠 (도시 노드, 숙박, 교통)
│   │   ├── overview-tab.tsx         # 1번 탭: 종합 개요 (여정 트랙, 레이더 차트, 국가 요약)
│   │   ├── package-input.tsx        # 메인 3단계 입력 폼 및 샘플 로더
│   │   ├── radar-chart.tsx          # 6대 스탯 육각형 SVG 레이더 차트
│   │   ├── receipt-tab.tsx          # 3번 탭: 지그재그 숨은 비용 영수증 및 옵션 계산기
│   │   ├── result-view.tsx          # 감정 결과 메인 뷰 (5개 탭 컨테이너 & 세션 연동)
│   │   ├── schedule-tab.tsx         # 2번 탭: 일자별 팩트체크 일정 카드 & AI 시트
│   │   ├── site-footer.tsx          # 사이트 푸터 (면책 조항)
│   │   ├── site-header.tsx          # 사이트 헤더 (브랜드 로고 & 지식 안내소 링크)
│   │   ├── stamp-badge.tsx          # 4대 관람 모드 스탬프 뱃지 & L라인 뱃지
│   │   ├── stat-gauge.tsx           # 세그먼트 막대 게이지 (SegmentBar)
│   │   ├── valuation-tab.tsx        # 4번 탭: 최종 감정서 (AI 점수 토글, 페르소나 적합도)
│   │   └── verdict-header.tsx       # 종합 등급 스탬프(GradeStamp) & 해설 연결률 바
│   └── ui/                          # Base UI 기반 공통 컴포넌트 (select, tabs, sheet 등)
├── lib/
│   ├── share-card.ts                # Canvas 카드 뉴스 PNG 생성 (결과 3장 + 비교 1장)
│   ├── receipt-parser.ts            # 원문 → 필수 경비/선택관광 금액 줄 단위 파서
│   ├── compare.ts                   # 1:1 비교 지표/우세 판정/마크다운 변환
│   ├── sample-itinerary-b.ts        # 비교 모드용 두 번째 예시 일정표
│   ├── inspector-engine.ts          # [핵심] 일정표 파싱, 모드 판독, 6대 스탯/비용 산출 룰 엔진
│   ├── mock-result.ts               # 데이터 타입 인터페이스 및 기본 기준 데이터
│   ├── sample-itinerary.ts          # 서유럽 3국 8일 공식 테스트 일정표 원문
│   ├── to-markdown.ts               # 감정 결과 객체 -> 마크다운 변환 유틸리티
│   └── utils.ts                     # cn (clsx, tailwind-merge) 유틸리티
├── DOCS/
│   ├── PRD.MD                       # 제품 요구사항 정의서 (v1.2)
│   └── DEVELOPMENT_PLAN.MD          # [본 문서] 전체 개발 계획서
└── package.json                     # 의존성 및 실행 스크립트
```

---

## 5. 품질 보증(QA) 및 테스트 계획

### 5.1 테스트 매트릭스

| 테스트 항목 | 테스트 시나리오 | 검증 기준 | 결과 |
|---|---|---|---|
| **입력 유효성 검증** | 빈 텍스트 입력 또는 공백 제출 | 감정 버튼 비활성화 상태 유지 | 통과 |
| **글자 수 한도 검증** | 20,000자 초과 텍스트 입력 | 빨간색 경고 뱃지 표출 및 초과 글자 수 안내, 제출 차단 | 통과 |
| **샘플 로드 테스트** | '예시 일정표 불러오기' 클릭 | 약 14,000자 분량의 실제 일정표가 즉시 채워지고 버튼 활성화 | 통과 |
| **비정형 일정 처리** | '제 N일' 키워드가 없는 자유 형식 텍스트 | 1일차 가상 블록으로 감싸 원문 누락 없이 결과 렌더링 | 통과 |
| **영수증 옵션 계산** | 선택관광 체크박스 클릭 토글 | 옵션 총액 및 최종 총 실지출 금액 즉각 재계산 반영 | 통과 |
| **AI 점수 토글** | AI 판독 결과 포함 토글 클릭 | 종합 가치 점수 및 진단 설명 즉각 갱신 | 통과 |
| **마크다운 내보내기** | '마크다운 복사' 및 '.md 다운로드' | 결과 데이터가 온전한 마크다운 규격으로 복사/저장 | 통과 |
| **반응형 뷰포트** | 모바일(375px) ~ 데스크톱(1440px) | 탭 스크롤, 여정 트랙 세로/가로 전환, 시트 모달 정상 표출 | 통과 |

---

## 6. 향후 고도화 로드맵 (Phase 6)

1. **[구현 완료] Gemini Live API 보조 판독 옵션 (Bring Your Own Key & 4대 안전장치)**
   - `lib/gemini-client.ts` 구축 및 4대 안전장치(원문 대조, 선택지 한정, 숫자 조작 방지, 감정 코멘트 금지) 구현
   - `PackageInput`에 Gemini API 키 입력 옵션 연동 (서버 미전송, 로컬 저장)
   - 모호한 문장에 대한 실시간 LLM 심층 판독 및 검증 뱃지 표출 완료
2. **[구현 완료] 유럽 전역 50대 도시 및 120대 랜드마크 지식 베이스 (`lib/knowledge-base.ts`)**
   - 서유럽, 동유럽, 지중해, 북유럽 공식 도메인 출처 및 도시별 메타데이터 모듈화 완성
3. **[구현 완료] 패키지 1:1 비교 모드 (Side-by-Side Inspector)** — `/compare`
   - 두 여행사의 일정표를 동시에 입력하여 "어느 상품이 내부 입장이 더 많은지", "어느 상품이 버스 탑승 시간이 적은지"를 항목별로 비교하는 대시보드
   - `lib/compare.ts`: 지표 계산(`computeMetrics`), 항목별 우세 판정(`buildRows`), 종합 요약(`summarize`), 마크다운 변환(`compareToMarkdown`)
   - `components/inspector/compare-view.tsx`: 2열 입력 폼 → 종합 판정 카드, 6대 스탯 겹침 레이더, 5개 그룹(종합·관람 방식·이동/동선·비용·6대 스탯) 비교표, 마크다운 복사/다운로드
   - 비용은 엔진이 원문에서 읽은 €금액으로 비교 (필수 경비를 못 읽으면 평균 추정값으로 표시)
   - 100% 브라우저 내 계산 (Gemini·서버 호출 없음), 헤더에 "1:1 비교" 메뉴 추가
   - 종합 판정: 점수 차 3점 이상이면 점수 기준, 그 외에는 항목 승수 차 2 이상일 때 우세, 아니면 무승부
4. **[구현 완료] 고해상도 카드 뉴스 및 PDF 리포트 생성기**
   - `lib/share-card.ts`: Canvas 2D로 1080×1350(4:5) PNG 카드 생성. 서버·외부 라이브러리 없이 100% 브라우저에서 동작
   - 단일 감정 결과 3장(종합 감정 / 일정 팩트체크 / 숨은 비용) + 1:1 비교 결과 1장
   - `components/inspector/share-card-modal.tsx`: 미리보기, 카드별 저장, 전체 저장, 공유하기(Web Share API로 카카오톡 등 공유 시트, 미지원 브라우저는 저장 안내)
   - 결과 화면 `ActionBar`의 "카드 이미지 만들기", 비교 화면의 "카드 이미지" 버튼으로 진입
   - PDF 리포트는 기존 "인쇄/PDF 저장"(브라우저 인쇄)로 제공

5. **[구현 완료] 영수증 원문 금액 파싱 (`lib/receipt-parser.ts`)**
   - 룰 엔진이 필수 현지 경비·선택관광 금액(€/유로)을 원문에서 줄 단위로 읽고, 원문 줄 번호(L번호)를 함께 기록
   - 섹션 헤더(불포함/현지 경비/선택관광/옵션)와 키워드(가이드·도시세·팁 등)로 필수/선택 분류, 선택관광 태그(추천·선택·주의) 자동 판정
   - 원문에 필수 경비 금액이 없으면 평균 추정값(€150)을 쓰되 `receipt.mandatoryEstimated`로 "추정" 표시, 선택관광은 원문에 없으면 만들지 않고 비움
   - 영수증 탭·카드 이미지·마크다운·1:1 비교가 모두 같은 값을 사용 (기존 고정값 제거)

