# Design Memory

대시보드 UI 디자인 결정 기록 (design-lab, 2026-06-18).

## Brand Tone
- **형용사:** bold, data-centric (핀테크 / Robinhood류)
- **피할 것:** 밋밋함·평범함(템플릿 느낌), 위계 불명확, 차트가 묻히는 것

## Layout & Spacing
- **밀도:** Compact (트레이더 지향)
- **반경:** `rounded-2xl`(카드/히어로), `rounded-xl`(내부 블록)
- **위계:** 화면당 빅넘버 1개를 압도적으로 → 보조 KPI → 컨텍스트 스트립

## Typography
- **폰트:** Geist Sans / Geist Mono
- **빅넘버:** `text-5xl font-extrabold` + 수치는 항상 `tabular-nums`
- **라벨:** `text-[10px] uppercase tracking-wide text-slate-500`

## Color
- **Brand/Accent:** emerald-300/400 (#34d399) — 글로우와 함께 사용
- **보조 액센트:** violet(#7c6cff, 비의미 강조에만)
- **의미색:** 상승 emerald, 하락 rose
- **중립:** slate-950 배경 / slate-800 보더 / slate-400~500 보조 텍스트
- **글로우:** `text-shadow`/`drop-shadow`로 brand 색 번짐 (히어로·차트 한정)

## Interaction Patterns
- **차트:** 의존성 없는 SVG 스파크라인(`GlowSparkline`) — 그라데이션 채움 + 네온 글로우
- **표:** 좌측 텍스트 / 우측 숫자, `tabular-nums`, compact 행
- **모션:** compositor 속성만, `transition-colors`, `prefers-reduced-motion` 존중

## Accessibility Rules
- `:focus-visible` 링(2px), 색만으로 상태 표시 금지
- 차트 `role="img"` + `aria-label`, 아이콘 버튼 `aria-label`

## Repo Conventions
- Next.js 16 App Router + Tailwind v4, `cn`(clsx+tailwind-merge) 유틸 사용
- 컴포넌트는 `components/`, 순수 SVG/표현 컴포넌트는 의존성 없이

---
*design-lab 워크플로우로 갱신*
