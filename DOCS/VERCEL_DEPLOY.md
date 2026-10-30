# Vercel 배포 가이드 — 유럽 패키지 감정원

> 이 문서는 현재 코드(Next.js 16.4.3 · pnpm · 서버 API 1개)를 Vercel에 올리는 순서를 정리한 것입니다.
> **방법 A(GitHub 연동)** 와 **방법 B(GitHub 없이 CLI로 직접 배포)** 를 모두 설명합니다. 하나만 고르면 됩니다.
> Vercel 화면은 가끔 바뀌므로 버튼 이름이 조금 다를 수 있습니다. 순서와 의미는 같습니다.

---

## 0. 먼저 알아둘 것 (이 프로젝트 기준)

| 항목 | 내용 |
|---|---|
| 프레임워크 | Next.js 16.4.3 (Vercel이 자동 인식) |
| 패키지 매니저 | pnpm (`pnpm-lock.yaml` 있음) |
| 빌드 명령 | `pnpm build` = `next build --webpack` |
| 배포 전 빌드 점검 | 로컬에서 `pnpm build` 성공 확인함 (페이지 6개 정적, `/api/gemini-verify` 만 서버 실행) |
| 환경변수 | `GEMINI_API_KEY` (필수가 아님: 없으면 규칙 판독만 동작), `GEMINI_MODEL` (선택, 기본 `gemini-3.8-flash`) |
| 주의 | `next.config.mjs`에 `ignoreBuildErrors: true`가 있어 **빌드는 타입 오류를 잡아 주지 않습니다.** 배포 전 `tsc`로 직접 확인하세요 (1단계) |

환경변수 이름 앞에 `NEXT_PUBLIC_`을 **붙이지 마세요.** 붙이면 키가 브라우저에 공개됩니다.

---

## 1. 공통 사전 점검 (A·B 모두 필요)

PowerShell을 열고 프로젝트 폴더(`C:\Users\della\zip`)에서 진행합니다.

### 1-1. 타입·빌드 점검
```powershell
node node_modules/typescript/bin/tsc --noEmit -p .
pnpm build
```
- 두 명령 모두 오류 없이 끝나야 합니다. (`tsc`는 아무 출력이 없으면 성공)
- `pnpm build` 마지막에 `Route (app)` 목록이 나오면 성공입니다.

### 1-2. 올라가면 안 되는 파일 확인
| 파일 | 상태 | 조치 |
|---|---|---|
| `.env` (Gemini 키) | `.gitignore`에 있어 GitHub에는 안 올라감 | 값은 3단계에서 Vercel에 **따로 입력** |
| `DOCS/원문.txt`, `DOCS/원문2.txt` | 개인 입력 데이터. 아직 git에 없음 | **방법 B에서는 업로드될 수 있으니** 아래 `.vercelignore`로 제외 |
| `scripts/` | 진단 스크립트(앱 동작과 무관) | 방법 B에서 제외 권장 |

### 1-3. `.vercelignore` 만들기 (방법 B에서 특히 중요)
프로젝트 루트에 `.vercelignore` 파일을 만들고 아래를 넣습니다.
```
.env
.env.*
!.env.example
node_modules
.next
DOCS/원문*.txt
scripts
```
> `.vercelignore`가 있으면 CLI는 `.gitignore` 대신 이 파일을 기준으로 업로드 대상을 정합니다.
> 그래서 `.env`, `node_modules`, `.next`도 직접 적어 둔 것입니다.

---

## 2. 방법 A — GitHub 연동 배포 (가장 쉬움, 이후 자동 배포)

현재 `origin`은 `https://github.com/iida-7/tourguide_.git`, 브랜치는 `main`입니다.
지금까지의 커밋은 **아직 push 하지 않은 상태**입니다.

**순서**
1. **push** — 커밋을 GitHub에 올립니다.
   ```powershell
   git push origin main
   ```
2. **Vercel 로그인** — https://vercel.com 에 로그인합니다. (GitHub 계정으로 가입했다면 연결이 이미 되어 있음)
3. **새 프로젝트** — 대시보드에서 `Add New…` → `Project`.
4. **저장소 가져오기** — `tourguide_` 저장소 옆 `Import`.
   - 목록에 없으면 `Adjust GitHub App Permissions`에서 이 저장소 접근을 허용합니다.
5. **프로젝트 설정 화면**
   - `Framework Preset`: **Next.js** (자동)
   - `Root Directory`: `./` (그대로)
   - `Build Command`: 값이 `next build`로 보이면 `Override`를 켜고 **`pnpm build`** 로 바꿉니다. (이 프로젝트는 `--webpack` 옵션을 쓰기 때문)
   - `Install Command`: 비워 둠 (pnpm 자동 인식)
6. **환경변수 입력** — `Environment Variables` 펼치기.
   - `Key`: `GEMINI_API_KEY` / `Value`: (본인 키) → `Add`
   - (선택) `Key`: `GEMINI_MODEL` / `Value`: `gemini-3.8-flash` → `Add`
7. **Deploy** 클릭 → 1~2분 뒤 `Congratulations!` 화면과 주소(`https://프로젝트명.vercel.app`)가 나옵니다.
8. **이후 업데이트** — 코드를 고치고 `git push origin main` 하면 자동으로 새로 배포됩니다.
   `main` 이외 브랜치를 push 하면 **미리보기 주소**가 따로 생깁니다.

---

## 3. 방법 B — GitHub 없이 직접 배포 (Vercel CLI)

내 컴퓨터의 폴더를 그대로 Vercel로 올립니다. GitHub 저장소가 필요 없습니다.

> ⚠️ 방법 B는 **작업 폴더의 파일 그대로** 올라갑니다. 커밋하지 않은 파일도 포함되므로 1-3의 `.vercelignore`를 꼭 먼저 만드세요.

**순서**
1. **Vercel CLI 설치** (한 번만)
   ```powershell
   pnpm add -g vercel
   ```
   설치 없이 쓰려면 아래 명령의 `vercel`을 `npx vercel`로 바꿔도 됩니다.
2. **로그인**
   ```powershell
   vercel login
   ```
   브라우저가 열리면 계정으로 인증합니다. 터미널에 `Congratulations! You are now signed in.` 이 나오면 완료.
3. **프로젝트 폴더로 이동**
   ```powershell
   cd C:\Users\della\zip
   ```
4. **첫 배포 (미리보기)**
   ```powershell
   vercel
   ```
   질문에 이렇게 답합니다.
   | 질문 | 답 |
   |---|---|
   | Set up and deploy? | `Y` |
   | Which scope? | 본인 계정 선택 |
   | Link to existing project? | `N` |
   | What's your project's name? | 원하는 이름 (예: `europe-package-inspector`) |
   | In which directory is your code located? | `./` (그냥 Enter) |
   | Want to modify these settings? | `N` (아래 5번에서 대시보드로 확인) |

   끝나면 `Preview: https://…vercel.app` 주소가 출력됩니다. 이 단계의 `GEMINI_API_KEY`는 아직 없으므로 Gemini 기능은 꺼져 있고 규칙 판독만 됩니다.
5. **빌드 명령 확인** — Vercel 대시보드 → 해당 프로젝트 → `Settings` → `Build & Development Settings`.
   `Build Command`가 `next build`면 `Override`를 켜고 **`pnpm build`** 로 저장합니다.
6. **환경변수 등록** — 값은 입력 시 화면에 보이지 않습니다.
   ```powershell
   vercel env add GEMINI_API_KEY production
   vercel env add GEMINI_API_KEY preview
   ```
   `What's the value of GEMINI_API_KEY?` 에 키를 붙여넣고 Enter. (선택: `GEMINI_MODEL`도 같은 방식)
   - `preview` 를 물어볼 때 `Add to which Git branch?` 가 나오면 그냥 Enter(전체 브랜치).
   - 대시보드 `Settings` → `Environment Variables` 에서도 같은 일을 할 수 있습니다.
7. **프로덕션 배포**
   ```powershell
   vercel --prod
   ```
   `Production: https://프로젝트명.vercel.app` 이 최종 주소입니다.
8. **이후 업데이트** — 코드를 고친 뒤 `vercel --prod` 를 다시 실행하면 됩니다. (환경변수는 유지됨)

> 참고: 대시보드에서 폴더를 끌어다 놓는 방식은 Next.js 프로젝트에는 쓸 수 없습니다. 파일 업로드 방식은 위 CLI가 유일합니다.

---

## 4. 배포 후 확인 체크리스트

배포 주소(`https://…vercel.app`)에서 순서대로 확인합니다.

- [ ] `/` 메인 화면이 열린다
- [ ] `/about`, `/compare` 가 열린다
- [ ] `/api/gemini-verify` 주소를 브라우저로 열면 `{"serverKey":true}` 가 보인다
      (`false`면 환경변수가 등록되지 않았거나, 등록 후 **재배포**를 하지 않은 것)
- [ ] 메인에서 `예시 일정표 불러오기` → `감정하기` → 결과 화면으로 이동한다
- [ ] 결과 화면의 탭 5개가 모두 보이고, 활성 탭이 남색(navy)이다
- [ ] 일정 탭에서 판독 배지가 `내부 입장 / 외부 관람 / 차창 조망 / 판독 불가` 중 하나로 보인다
- [ ] 폰(또는 브라우저 폭 390px)에서 여정 트랙이 박스 밖으로 넘치지 않는다

> 환경변수는 **추가·수정한 뒤에 새로 배포해야** 적용됩니다.
> 방법 A는 `Deployments` → 최신 항목 `⋯` → `Redeploy`, 방법 B는 `vercel --prod` 를 다시 실행합니다.

---

## 5. 운영 전 꼭 알아둘 것

1. **키 사용량 노출 위험**: `/api/gemini-verify` 에는 로그인·호출 횟수 제한이 없습니다. 주소를 아는 누구나 이 API를 호출하면 **내 Gemini 키의 한도가 소모**될 수 있습니다.
   - 대응 1: Google AI Studio에서 해당 키의 사용 한도·알림을 설정합니다.
   - 대응 2: Vercel `Firewall` 에서 `/api/gemini-verify` 에 호출 횟수 제한(Rate Limit)을 겁니다.
   - 대응 3: 서버 키를 등록하지 않고, 방문자가 직접 자기 키를 입력하게 합니다. (메인 화면의 `[고급] Gemini AI 심층 판독` — 키는 방문자 브라우저에만 저장)
2. **개인정보**: 서버 키를 쓰면 판독이 애매한 문장 몇 줄이 이 앱의 서버를 거쳐 Gemini로 전송됩니다. (메인 화면 안내 문구와 일치)
3. **분석(Analytics)**: 코드에 `@vercel/analytics`가 들어 있고 프로덕션에서만 켜집니다. 방문 통계를 보려면 대시보드 → `Analytics` 탭에서 `Enable` 을 누르세요.
4. **결과 저장 위치**: 분석 결과는 방문자 브라우저의 `sessionStorage`에만 저장됩니다. 서버에는 저장되지 않습니다.

---

## 6. 문제 해결

| 증상 | 원인 / 해결 |
|---|---|
| 빌드가 `pnpm` 버전 오류로 실패 | `package.json`의 `packageManager`(`pnpm@12.3.4`) 버전을 Vercel이 못 찾는 경우. 환경변수 `ENABLE_EXPERIMENTAL_COREPACK=1` 을 추가하고 재배포. 계속 실패하면 `packageManager` 값을 로컬 pnpm 버전(`pnpm -v`)에 맞춤 |
| 빌드 로그에 `Module not found` | 대소문자 차이(Windows는 구분 안 함, Vercel은 구분함). 파일명·import 경로의 대소문자 확인 |
| 배포는 됐는데 Gemini가 동작 안 함 | `/api/gemini-verify` 가 `serverKey:false` → 환경변수 등록 후 **재배포**. 이미 `true`인데 안 되면 키 값 오류 또는 키 한도 초과 |
| Gemini 호출에서 시간 초과 | 판독할 줄이 많으면 오래 걸릴 수 있음. 대시보드 `Settings` → `Functions` 의 최대 실행 시간 확인 |
| 방법 B에서 업로드가 너무 오래 걸림 | `.vercelignore` 에 `node_modules`, `.next` 가 빠졌는지 확인 |
| 예전 화면/결과가 보임 | 브라우저 캐시. 시크릿 창으로 접속. 결과 캐시는 `v3` 키라 이전 버전 결과는 자동으로 무시됨 |
| 잘못 배포했다 | 대시보드 `Deployments` → 이전 정상 배포 항목 `⋯` → `Promote to Production` (즉시 롤백) |

---

## 7. A와 B 한눈에 비교

| | 방법 A (GitHub 연동) | 방법 B (CLI 직접) |
|---|---|---|
| 필요한 것 | GitHub 저장소 + push | Vercel CLI |
| 업데이트 | `git push` 만 하면 자동 | `vercel --prod` 직접 실행 |
| 미리보기 주소 | 브랜치마다 자동 생성 | 필요할 때 `vercel` 실행 |
| 올라가는 파일 | **커밋된 파일만** | **작업 폴더 전체** (→ `.vercelignore` 필수) |
| 추천 상황 | 계속 수정하며 운영 | 한 번 빠르게 올리거나, GitHub에 공개하기 싫을 때 |

## 8. 처음부터 끝까지 요약 (방법 A 기준 6줄)

1. `tsc` + `pnpm build` 통과 확인
2. `git push origin main`
3. vercel.com → `Add New` → `Project` → 저장소 `Import`
4. `Build Command` 를 `pnpm build` 로 지정
5. 환경변수 `GEMINI_API_KEY` 입력
6. `Deploy` → 4단계 체크리스트로 확인
