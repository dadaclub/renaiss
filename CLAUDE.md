# CLAUDE.md — 카드씬 (CardScene)

> 르네시스(Renaiss Protocol) 해커톤 출품작. 이 문서는 Claude Code가 이 프로젝트에서 작업할 때 참고하는 맥락 문서다.

## 프로젝트 한 줄 요약
내 TCG 카드 컬렉션을 **네온 감성 오타쿠 게이머의 방**으로 전시하고, 방 안 가구들을 눌러 컬렉션·미니게임·방명록 등을 즐기는 인터랙티브 웹앱.

## 방향 전환 메모 (2026-07-03)
초기 "자산 관리 대시보드" 컨셉에서 **"놀 수 있는 방"** 컨셉으로 전환됨.
- **제거됨**: 마켓 날씨(창문), 주간 리포트(우편함), 수집 성향(포스터), 포트폴리오, 가챠 하이라이트
- **추가/변경됨**: 핸드폰 로그인, 컴퓨터=미니게임, 액자=사진 확대, 노트=방명록, 앨범=거래내역, 과자=사운드
- **무드**: 다크 베이스 + 네온 퍼플 포인트의 **오타쿠 게이머 방** (주 타깃: 남성 TCG/게이머 유저). 아기자기·파스텔 무드 금지. 상세 토큰은 DESIGN.md.
- UI 텍스트는 **영어**로 통일(다국어 미지원). 폰트는 Fredoka.
- 방 이미지는 아직 **스케치 플레이스홀더**(`public/room3.png`, 정사각). 최종 아트 나오면 교체.

## 핵심 컨셉 (절대 훼손 금지)
1. **방(Scene) 중심 UX**: 리스트/그리드 대시보드가 아니라, 방 이미지 위에 핫스팟을 얹고 클릭하면 카메라가 그 가구로 줌인하는 구조. 참고: anniescene.com
2. **가구 = 기능 진입점** (스팟 ID 기준 — 이미지가 바뀌어도 ID는 고정):
   | 오브젝트 | 스팟 ID | 기능 |
   |---|---|---|
   | 카드 보관함 | `cabinet` | 카드 컬렉션 |
   | 핸드폰 | `phone` | 로그인 (진입 게이트) |
   | 컴퓨터 | `computer` | 미니게임 (피카츄 배구) |
   | 액자 | `photo` | 클릭 시 사진 확대 |
   | 노트 | (예정) | 방명록 남기기 |
   | 앨범 | `album` | 온체인 거래내역 / 하이라이트 |
   | 과자 | (예정) | 클릭 시 사운드 + 부서짐 (이스터에그) |
3. **Renaiss 영역 불침범**: SBT 발급, 가챠 실행, 실거래는 절대 구현하지 않음. 공개 데이터 읽기 전용. (로그인은 프로토타입 목 — 실제 지갑 서명 없음)

## 진입 연출 (로그인)
깜깜한 스플래시("탭해서 입장") → 탭하면 **밝은 방** + 핸드폰만 진동/벨소리로 울림 → 핸드폰 클릭 시 줌인 → 르네시스 지갑 로그인(목) → 로그인 완료 시 오브젝트 활성화(로그인 취소해도 밝은 방 유지, 폰은 계속 울림). `components/scene/LoginIntro.tsx` + `Scene.tsx`의 상태로 게이팅: `entered`(입장=방 밝아짐, `roomBright`), `loggedIn`(로그인=오브젝트·호버 활성, `objectsReady`). 폰 울림은 글로우 없이 진동(ring-shake)+벨소리(`useRingSound`)로만 표현.

## 기술 스택
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (커스텀 토큰은 DESIGN.md와 tailwind.config.ts 참고). 폰트: Fredoka
- 상태: React useState/Context (전역 상태 라이브러리 도입 금지 — 스코프에 불필요)
- 애니메이션: CSS transition 우선. framer-motion은 필요 시에만
- 저장소: 방명록은 **Vercel 마켓플레이스 Upstash Redis(KV)** 또는 Neon(Postgres) 사용 예정 (localStorage 금지)
- 배포: Vercel

## 데이터 소스 (전부 무료/공개)
| 용도 | 소스 | 파일 |
|---|---|---|
| 온체인 보유/거래 이력 (컬렉션·앨범) | BscScan API | lib/api/bscscan.ts |
| 방명록 저장 | Upstash Redis / Neon (Vercel 마켓플레이스) | (예정) |

- API 키·연결 문자열은 전부 .env.local / Vercel 환경변수 (커밋 금지, .env.example 참고)
- 로그인은 주소/ID 입력만 받는 목 (지갑 연결/서명 없음 — read-only)
- 보류: PSA(실물 등록), 실물 시세 — 방향 전환으로 현재 미사용 (`lib/api/psa.ts`, `prices.ts` 스텁 유지)

## 폴더 규칙
```
app/            # 라우트. page.tsx = 방 씬
components/
  scene/        # 방/핫스팟/줌 엔진 — 카메라 로직은 Scene.tsx 안에서만
                # Scene.tsx, Hotspot.tsx, DetailPanel.tsx, LoginIntro.tsx
  ui/           # 버튼, 칩, 스탯카드 등 공통 컴포넌트 (여기 있는 것 먼저 재사용)
  cards/        # 카드 목록/아이템 등 도메인 컴포넌트
lib/
  spots.ts      # 핫스팟 좌표/줌 배율 설정 (좌표 수정은 여기서만)
  mockCards.ts  # 목데이터 (API 연동 전까지 사용)
  api/          # 외부 API 래퍼. 컴포넌트에서 fetch 직접 호출 금지
public/room3.png  # 방 씬 이미지 (스케치 플레이스홀더 — 최종 아트로 교체 예정)
```

## 코딩 컨벤션
- 컴포넌트: 함수형 + named export, 파일명 PascalCase
- 클라이언트 컴포넌트에만 "use client" (기본은 서버 컴포넌트)
- 색상/폰트 하드코딩 금지 — Tailwind 토큰만 사용 (DESIGN.md)
- UI 텍스트는 영어, 코드/변수명도 영어
- API 응답은 lib/api에서 타입 붙여서 반환. any 금지
- 기능은 좌표가 아니라 **스팟 ID**에 붙인다 (이미지 교체 시 spots.ts 좌표만 재측정)

## 작업 분담 (방향 전환으로 재조정 — 확정 아님)
- A: lib/api/bscscan.ts (온체인 — 컬렉션 보유 + 앨범 거래내역)
- B: 방명록 저장소 (Upstash/Neon + API 라우트)
- C: 컴퓨터 미니게임 (피카츄 배구)
- D: components/scene + ui + 로그인 연출 (이 뼈대의 오너)

## 오브젝트 분업 규칙 (충돌 방지 — 팀 바이브코딩)
오브젝트별로 나눠 작업해도 안 꼬이게, **한 오브젝트 = 한 파일**로 격리한다.
- 각 오브젝트 화면 = `components/scene/screens/<Xxx>Screen.tsx` **한 파일**. 담당자는 그 안에서만 자유롭게 작업 (컴포넌트·상태·데이터 추가 OK).
- 계약(props): 각 화면은 `{ onClose }` 만 받는다 (방으로 돌아가기).
- **뼈대·공유 파일은 담당(D)만 수정**: `Scene.tsx`, `ObjectScreen.tsx`, `lib/spots.ts`, `screens/ScreenShell.tsx`, `screens/Placeholder.tsx`, `screens/registry.tsx`.
- 새 오브젝트 추가 = 새 `*Screen.tsx` 파일 + `screens/registry.tsx`에 **한 줄**(append-only).
- **브랜치 per 오브젝트**: `feat/cabinet` 등 → PR → main. main 직접 push 금지.

## 하지 말 것
- **GitHub 웹 "Add files via upload"(드래그 업로드) 절대 금지** — 파일이 루트에 쏟아지고 tsconfig/package-lock이 깨진다. 파일 추가·수정은 로컬 git으로, 올바른 폴더에서. (git 워크플로우 상세는 AGENTS.md 최상단)
- **main 직접 커밋/푸시 금지** — 브랜치 → PR → 머지. 시작 전 항상 `git pull`.
- 카드 보관함을 그리드/테이블로 "개선"하지 말 것 (방 컨셉이 제품이다)
- 남의 `*Screen.tsx`나 뼈대·공유 파일(Scene/spots/ScreenShell/registry)을 함부로 수정하지 말 것
- 실제 지갑 연결/서명/거래 붙이지 말 것 (로그인은 목)
- localStorage 의존 금지 (배포 환경 이슈 — 방명록은 원격 저장소 사용)
- 스팟 좌표를 여기저기 하드코딩하지 말 것 (전부 lib/spots.ts)
