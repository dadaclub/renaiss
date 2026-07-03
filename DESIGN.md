# DESIGN.md — 카드씬 디자인 시스템

> **네온 퍼플 게이머 방 테마 (v2)**. 모든 UI는 이 문서를 따른다. 토큰 값은 `tailwind.config.ts`에 등록된 실제 값과 항상 일치시킬 것 (어긋나면 이 문서를 코드에 맞춰 갱신).

## 무드
**"네온 불빛이 새어 나오는 오타쿠 게이머의 방"**. 다크 베이스 + 네온 퍼플 포인트. 주 타깃은 남성 TCG/게이머 유저.
아기자기·파스텔 무드 금지, 차가운 SaaS 대시보드 느낌도 금지. 어두운 방에 모니터·네온사인 불빛이 배어나는 느낌.

## 컬러 토큰 (tailwind.config.ts에 등록됨)
> ⚠️ `amber` 계열 토큰명은 웜톤 시절의 **역사적 이름**이다. 실제 값은 네온 퍼플. 토큰명을 바꾸면 전 컴포넌트가 깨지므로 이름은 유지하고 값만 관리한다.

| 토큰 | 값 | 용도 |
|---|---|---|
| bg | #07070F | 페이지 배경 |
| glass | rgba(22,20,40,0.86) | 패널 배경 (backdrop-blur와 함께) |
| glassline | rgba(167,150,255,0.18) | 패널/카드 보더 |
| amber | #B78CFF | **메인 액센트(네온 퍼플)** — 포인트, 액티브 상태, 아이브로우 |
| ambersoft | rgba(183,140,255,0.14) | 스탯카드 배경, 은은한 강조 배경 |
| cream | #EFEAFF | 본문 텍스트 |
| creamdim | #A49ECB | 보조 텍스트 |
| up | #6FE8C8 | 상승 (네온 민트) |
| down | #FF8BA8 | 하락 (네온 핑크) |
| inkdark | #17102E | 액센트 배경 위 잉크 텍스트 (Chip 액티브 등) |

## 타이포그래피
- 본문/UI: **Fredoka** (400/500/600/700) — `font-sans` (기본)
- 제목/디스플레이: **Noto Serif KR** (500/600) — `font-serif`, 패널 h2·인트로 타이틀에만
- 손글씨 포인트: **Gochi Hand** — `font-hand`, 방명록 등 아날로그 감성이 필요한 곳에만
- 아이브로우(섹션 라벨): 10px, letter-spacing 0.22em, uppercase, amber, 800 → `<Eyebrow>` 컴포넌트 사용

## 모션 (반드시 이 값 사용)
| 동작 | 값 |
|---|---|
| 카메라 줌 (폰 로그인 연출) | transform 0.85s `ease-camera` = cubic-bezier(0.32, 0.72, 0.25, 1) |
| 입장 연출 (방 확대) | transform 1.8s `ease-entrance` = cubic-bezier(0.22, 0.8, 0.2, 1), scale 0.72 → 1 |
| 패널 등장/퇴장 | opacity + translate 0.45s |
| 핫스팟 호버 팝 | 클립 복제 scale 1 → 1.05 + opacity, 0.2s |
| 핫스팟 글로우 | opacity 0.3s (hover 시) |
| 울리는 핸드폰 | `animate-ring` (ring-shake 0.85s infinite, globals.css) |
| 입장 온보딩 (핫스팟 순차 반짝) | `animate-glow-once` 0.9s + 스팟당 0.18s 스태거, 방 밝아진 0.9s 뒤 시작 |
| 호버 (카드 아이템) | translateX(3px) + 배경 밝아짐, Tailwind 기본 0.15s |

## 컴포넌트 규칙 (components/ui 먼저 재사용)
- **GlassPanel**: radius 22px(`rounded-panel`), padding 24px, backdrop-blur. 데스크톱 = 우측 고정 380px / 모바일(md 미만) = 바텀시트(max-h 62vh)
- **StatCard**: ambersoft 배경, radius 12px, 라벨 10px creamdim + 값 16px/800
- **Chip(정렬 등)**: pill(radius 999px), 액티브 시 amber 배경 + inkdark 텍스트
- **Eyebrow**: 섹션 라벨. 위 아이브로우 규칙 그대로
- **CardListItem**: 썸네일 38×52 + 이름/등급 + 가격/등락(up/down 컬러). 호버 시 translateX(3px) + amber/10 배경
- **핫스팟**: 호버/포커스 시 해당 영역 클립 복제가 **5% 확대**(가구 팝) + cream 라디얼 글로우(mix-blend-screen, 어두운 아트에서만 효과). 로그인 전 핸드폰은 폰 불빛처럼 **작고 부드러운**(blur + 60%에서 소멸) pulse 발광

## 금지
- 순수 화이트(#FFF) 배경
- 웜톤(앰버 골드/브라운) 포인트로 회귀 금지 — v1 테마는 폐기됨
- 파스텔·아기자기 무드 (게이머 방 컨셉 훼손)
- 그림자 남발 (glass + border로 깊이 표현)
- 이모지 아이콘 남발 (가구 태그·카드 썸네일 플레이스홀더 정도만 허용)
- 색상/폰트 하드코딩 — 반드시 위 토큰만 사용
