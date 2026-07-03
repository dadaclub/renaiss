# AGENTS.md — 카드씬 (CardScene)

> Codex 등 AI 코딩 도구용 진입 문서. **원본 맥락 문서는 `CLAUDE.md`다 — 작업 전에 반드시 먼저 읽을 것.** 디자인 토큰은 `DESIGN.md`. 이 파일은 요약 포인터일 뿐이며, 내용이 어긋나면 CLAUDE.md가 우선한다.

## 꼭 지켜야 할 규칙 (요약)

**분업 — 충돌 방지가 최우선**
- 내 오브젝트 화면은 `components/scene/screens/<Xxx>Screen.tsx` **한 파일** 안에서만 작업한다. props 계약은 `{ onClose }` 하나.
- **뼈대·공유 파일 수정 금지** (담당 D 전용): `Scene.tsx`, `ObjectScreen.tsx`, `lib/spots.ts`, `screens/ScreenShell.tsx`, `screens/Placeholder.tsx`, `screens/registry.tsx`
- 새 오브젝트 추가 = 새 `*Screen.tsx` 파일 + `registry.tsx`에 **한 줄 append**만.
- **브랜치 per 오브젝트** (`feat/cabinet` 등) → PR → main. **main 직접 push 금지.**

**컨셉 — 훼손 금지**
- 이 제품은 대시보드가 아니라 **네온 퍼플 오타쿠 게이머의 "방"**이다. 카드 보관함을 그리드/테이블로 "개선"하지 말 것.
- 기능은 좌표가 아니라 **스팟 ID**(`cabinet`, `phone`, `computer`, `photo`, `album`, `note`)에 붙인다. 좌표는 전부 `lib/spots.ts`에만.

**코드 컨벤션**
- 색상/폰트 하드코딩 금지 — `tailwind.config.ts` 토큰만 사용 (`DESIGN.md` 참고). UI 텍스트는 영어.
- 함수형 컴포넌트 + named export, 파일명 PascalCase. 기본은 서버 컴포넌트, 필요한 곳에만 `"use client"`.
- 외부 API 호출은 `lib/api/` 래퍼를 통해서만 (컴포넌트에서 fetch 직접 호출 금지). `any` 금지.
- 전역 상태 라이브러리 도입 금지 (useState/Context로 충분).

**하지 말 것**
- 실제 지갑 연결/서명/거래 구현 금지 (로그인은 목, read-only). SBT 발급·가챠 실행 등 Renaiss 영역 불침범.
- localStorage 의존 금지 (방명록은 Upstash Redis/Neon 원격 저장소).
- API 키를 커밋하지 말 것 — 전부 `.env.local` (`.env.example` 참고).
