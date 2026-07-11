# 카드씬 (CardScene)

내 TCG 카드 컬렉션을 **네온 감성 오타쿠 게이머의 방**으로 전시하고, 방 안 가구를 눌러 컬렉션·미니게임·방명록 등을 즐기는 인터랙티브 웹앱. 르네시스(Renaiss Protocol) 해커톤 출품작.

**🔗 라이브 데모: https://cardscene.vercel.app**

리스트/그리드 대시보드가 아니라 **방(Scene) 그 자체가 제품**이다. 방 이미지 위에 핫스팟을 얹고, 가구를 누르면 그 기능 화면이 뜬다. (참고: anniescene.com)

## 시작하기

```bash
npm install
cp .env.example .env.local   # 키/연결 문자열 채우기 (커밋 금지)
npm run dev                  # http://localhost:3000
```

## 기술 스택
- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** — 폰트: Fredoka(본문/UI) · Noto Serif KR(제목) · Gochi Hand(손글씨) · Press Start 2P(픽셀). 다크 베이스 + 네온 퍼플 포인트. 토큰은 DESIGN.md
- **Supabase** — 방명록 저장 (Postgres + RLS)
- 상태: React useState/Context (전역 상태 라이브러리 없음)
- 배포: **Vercel**

## 핵심 연출

### 진입 = 로그인
깜깜한 방(`main.png`)에서 **핸드폰만 울린다** — 대각선으로 놓인 폰이 벨 리듬에 맞춰 흔들리고(진동) 화면 불빛이 밝아졌다 잦아든다(글로우). 폰을 누르면 르네시스 지갑 로그인(목) → 방이 밝아지며 가구가 활성화된다. (실제 서명·거래 없음, read-only)

### 시간대별 낮/밤 방 ☀️🌙
로그인/방문 후 방은 **접속한 실제 로컬 시각**을 따른다.
- **낮(06:00–17:59)** → 햇살 든 밝은 방 (`room_bright_v3.png`)
- **밤(18:00–05:59)** → 불 꺼진 어두운 방 (`room_dark_v3.png`)

매 분 갱신되어 6시/18시 경계에서 자동 전환된다. 데모용으로 `?hour=12`(낮) / `?hour=22`(밤)로 시각을 강제할 수 있다.

### 다른 유저의 방 방문 🚪
방명록에서 유저를 누르면 그 사람 방(`?room=<id>`)으로 이동한다. 방마다 컬렉션·SBT·방명록이 다르게 뜨고, 방문 중엔 읽기 전용이다. (방 목록은 `lib/rooms.ts`)

## 가구 = 기능 (스팟 ID 기준 — 이미지가 바뀌어도 ID는 고정)

| 오브젝트 | 스팟 ID | 기능 |
|---|---|---|
| 핸드폰 | `phone` | 로그인 진입 게이트 / (로그인 후) 로그아웃 |
| 카드 보관함 | `cabinet` | 카드 컬렉션 갤러리 |
| 컴퓨터 | `computer` | 미니게임 (피카츄 배구) |
| 액자 | `photo` | 클릭 시 사진 확대 |
| 앨범 | `album` | SBT 컬렉션북 (띠부실 스타일) |
| 노트 | `note` | 방명록 (남기기 + 방 주인 답글) |
| 과자봉지 | `snack` | 호버 사운드 이스터에그 (화면 없음) |
| 책상 피규어 ×5 | `figure*` | 클릭 시 르네시스 공식 채널로 이동 |

## 데이터 소스 (전부 무료/공개, read-only)

| 용도 | 소스 | 파일 |
|---|---|---|
| 프로필·아바타·SBT·쇼케이스 | Renaiss 공개 API (`/v0/users/{uuid}`) | `lib/api/renaiss.ts` |
| 카드 이미지 (원피스 TCG) | apitcg.com | `lib/api/apitcg.ts` |
| 방명록 저장 | Supabase | `lib/supabase.ts` |
| 실물 카드 시세 | PokemonPriceTracker → pokemontcg.io 폴백 | `lib/api/prices.ts` |

> API 키·연결 문자열은 전부 `.env.local` / Vercel 환경변수 (커밋 금지, `.env.example` 참고). 로그인은 목(지갑 연결/서명 없음). SBT는 Renaiss 프로필의 `favoritedSBTs`가 우선이고, 온체인(BSC) 조회는 폴백 경로로만 존재하며 무료 티어 제약으로 실질 비활성이다.

## 구조
```
app/
  page.tsx           # 방 씬 진입
  api/               # profile · sbt · showcase · img · price 등 서버 라우트
components/
  scene/             # 방/핫스팟/화면 전환 뼈대
    Scene.tsx        #   카메라·상태(entered/loggedIn)·낮밤·방문 오케스트레이션
    Hotspot.tsx      #   핫스팟(클릭·호버 pop·폰 울림 연출)
    LoginIntro.tsx   #   로그인 모달(목)
    ObjectScreen.tsx #   스팟 → 화면 디스패처
    RoomContext.tsx  #   현재 방 컨텍스트
    screens/         #   오브젝트별 화면 (한 오브젝트 = 한 파일)
      CabinetScreen · ComputerScreen · PhotoScreen · AlbumScreen · NoteScreen
      registry.tsx   #     스팟 → 화면 매핑 (append-only)
  ui/                # 공통 컴포넌트
  cards/             # 카드 도메인 컴포넌트
lib/
  spots.ts           # 핫스팟 좌표/줌/clip (좌표 수정은 여기서만)
  rooms.ts           # 방문 가능한 방 레지스트리 (홈 + 다른 유저 방)
  supabase.ts        # Supabase 클라이언트
  api/               # 외부 API 래퍼 (컴포넌트에서 fetch 직접 호출 금지)
public/              # main.png(로그인) · room_bright_v3 / room_dark_v3(낮/밤) · brand/ 등
```

## 데모 파라미터
- `?room=<id>` — 특정 유저 방으로 바로 진입 (예: `?room=ari`)
- `?hour=12` / `?hour=22` — 낮/밤 강제 (경계 연출 시연용)
- `?edit` — 핫스팟 좌표/clip 편집기 (개발용, 일반 사용자에겐 안 보임)

## 규칙
- 기능은 좌표가 아니라 **스팟 ID**에 붙인다 (이미지 교체 시 `lib/spots.ts` 좌표만 재측정).
- 한 오브젝트 = 한 파일(`screens/<Xxx>Screen.tsx`), 계약은 `{ onClose }` 뿐. 뼈대·공유 파일은 담당만 수정.
- 색상/폰트 하드코딩 금지 — Tailwind 토큰만 사용.
- 시크릿은 전부 `.env.local` (커밋 금지). 저장은 원격(Supabase), `localStorage` 금지.
- **main 직접 커밋 금지** — 브랜치 → PR → 머지. 자세한 맥락·컨벤션은 **CLAUDE.md**, 디자인 토큰은 **DESIGN.md** 참고.
