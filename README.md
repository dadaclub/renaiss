# 카드씬 (CardScene)

내 TCG 카드 컬렉션을 **네온 감성 오타쿠 게이머의 방**으로 전시하고, 방 안 가구들을 눌러 컬렉션·미니게임·방명록 등을 즐기는 인터랙티브 웹앱. 르네시스(Renaiss Protocol) 해커톤 출품작.

## 시작하기

```bash
npm install
cp .env.example .env.local   # 키/연결 문자열 채우기 (커밋 금지)
npm run dev                  # http://localhost:3000
```

## 기술 스택
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS — 폰트: Fredoka(본문/UI) · Noto Serif KR(제목) · Gochi Hand(손글씨 포인트). 토큰은 DESIGN.md 참고
- 상태: React useState/Context (전역 상태 라이브러리 없음)
- 배포: Vercel

## 동작 개요
- **진입 = 로그인**: 깜깜한 방에서 핸드폰만 빛남 → 클릭·줌인 → 르네시스 지갑 로그인(목) → 방이 밝아짐.
- **가구 클릭 → 새 화면**: 카드 보관함·컴퓨터·액자·앨범 등을 누르면 해당 콘텐츠 화면으로 전환.
- **핸드폰(로그인 후)**: 로그아웃.

## 구조
```
app/                 # 라우트. page.tsx = 방 씬
components/
  scene/             # 방/핫스팟/화면 전환 — Scene.tsx, Hotspot.tsx, LoginIntro.tsx, ObjectScreen.tsx
  ui/                # 공통 컴포넌트
  cards/             # 카드 도메인 컴포넌트
lib/
  spots.ts           # 핫스팟 좌표/줌 (좌표 수정은 여기서만)
  mockCards.ts       # 목데이터
  api/               # 외부 API 래퍼 (TODO 구현)
public/              # room3.png(방 이미지), brand/(로고) 등 정적 에셋
```

## 규칙
- 기능은 좌표가 아니라 **스팟 ID**에 붙인다 (이미지 교체 시 `lib/spots.ts` 좌표만 재측정).
- 색상/폰트 하드코딩 금지 — Tailwind 토큰만 사용.
- 시크릿은 전부 `.env.local` (커밋 금지). 방명록 등 저장은 원격 저장소(Upstash/Neon), `localStorage` 금지.
- 자세한 맥락·컨벤션은 **CLAUDE.md**, 디자인 토큰은 **DESIGN.md** 참고.

> 방 이미지는 현재 스케치 플레이스홀더(`public/room3.png`, 정사각). 최종 아트가 나오면 이미지 교체 + `lib/spots.ts` 좌표만 재측정하면 된다.
