# DESIGN.md — 카드씬 디자인 시스템

> 확정된 v1 프로토타입(카드씬_v1_확정.html)에서 추출한 토큰. 모든 UI는 이 문서를 따른다.

## 무드
"따뜻한 조명의 개인 전시실". 다크 베이스 + 앰버 골드 포인트. 차가운 SaaS 대시보드 느낌 금지.

## 컬러 토큰 (tailwind.config.ts에 등록됨)
| 토큰 | 값 | 용도 |
|---|---|---|
| bg | #0D0A07 | 페이지 배경 |
| glass | rgba(26,19,13,0.86) | 패널 배경 (backdrop-blur 14px과 함께) |
| glassline | rgba(255,214,166,0.16) | 패널/카드 보더 |
| amber | #E8B05C | 포인트, 액티브 상태, 아이브로우 텍스트 |
| ambersoft | rgba(232,176,92,0.14) | 스탯카드 배경 |
| cream | #F5EDE2 | 본문 텍스트 |
| creamdim | #C9BBA8 | 보조 텍스트 |
| up | #8FD3A0 | 상승 |
| down | #E89A85 | 하락 |

## 타이포그래피
- 본문/UI: **Manrope** (400/600/700/800)
- 제목/디스플레이: **Noto Serif KR** (500/600) — 패널 h2, 인트로 타이틀에만
- 아이브로우(섹션 라벨): 10px, letter-spacing 0.22em, uppercase, amber, 800

## 모션 (반드시 이 값 사용)
| 동작 | 값 |
|---|---|
| 카메라 줌 (가구 확대) | transform 0.85s cubic-bezier(0.32, 0.72, 0.25, 1) |
| 입장 연출 (방 확대) | transform 1.8s cubic-bezier(0.22, 0.8, 0.2, 1), scale 0.72 → 1 |
| 패널 등장 | opacity+translateX 0.45s, 줌 후 0.35s 딜레이 |
| 호버 (카드 아이템) | translateX(3px), background 밝아짐, 0.2s |

## 컴포넌트 규칙
- **GlassPanel**: radius 22px, padding 26px, backdrop-blur. 우측 고정(데스크톱) / 바텀시트(모바일 720px 이하)
- **StatCard**: ambersoft 배경, radius 12px, 라벨 10px + 값 16px/800
- **Chip(정렬 등)**: pill(radius 999px), 액티브 시 amber 배경 + 잉크 텍스트 #241606
- **CardListItem**: 썸네일 38×52 + 이름/등급 + 가격/등락. 등락은 up/down 컬러
- **핫스팟**: 호버 시 rgba(255,222,170) 골드 글로우 링 + 이름표 툴팁

## 금지
- 순수 화이트(#FFF) 배경, 파란 계열 포인트 컬러
- 그림자 남발 (glass + border로 깊이 표현)
- 이모지 아이콘 남발 (가구 태그 정도만 허용)
