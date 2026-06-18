# Design Implementation Plan: 개요 대시보드 (DashboardOverview)

design-lab 탐색(5개 변형 → 합성안 F 확정) 결과. 방향: **핀테크(Robinhood류) · Bold/데이터중심 · Compact**.
해결 타깃: 밋밋함 · 차트가 안 살아남 · 위계 불명확.

## 채택안 — Variant F (E의 표현 × C의 정밀도)
- 드라마(글로우·네온·빅넘버)는 **히어로 + 차트**에
- 정확한 숫자는 **정밀 미니 KPI + KPI 스트립**으로 읽히게

## 이번에 구현됨 (feat/design-lab)
- [x] `components/GlowSparkline.tsx` — 의존성 없는 SVG 글로우 영역 스파크라인
- [x] `app/page.tsx` 히어로 교체:
  - 실현손익 빅넘버(emerald + glow) + 누적 손익 글로우 스파크라인
  - 정밀 미니 KPI(승률·오픈·평균·종료 거래)
  - 감시 범위 KPI 스트립(감시 종목·가동 전략·신호 주기·신호 조합)
  - 기존 MetricCard 2개 그리드 제거(히어로로 대체)

## 남은 적용 단계 (선택, 후속 PR 권장)
1. [ ] 다른 페이지 헤더에도 동일 히어로 언어 확장 (monitor/strategies/league/symbols/risk)
2. [ ] `OverviewSymbolTabs` 활성 탭/칩에 emerald 글로우 액센트 통일 (현재 cyan)
3. [ ] `EquityChart`(recharts) stroke/fill을 emerald 계열로 맞춰 히어로와 일관화
4. [ ] 액센트 토큰화: `globals.css`에 `--accent` 도입해 cyan→emerald 일괄 전환

## 필수 UI 상태
- **Empty:** 종료 거래 0건 → 스파크라인 미표시(컴포넌트가 `points<2`에서 null 반환), 빅넘버는 `$0.00`
- **로딩:** 서버 컴포넌트(`force-dynamic`)라 별도 클라이언트 로딩 없음

## 접근성 체크리스트
- [x] 스파크라인 `role="img"` + `aria-label`
- [x] 빅넘버 `tabular-nums`
- [x] 색 대비: emerald-300 on 다크 배경 (AA 통과)
- [ ] 스크린리더 검증(후속)

## 디자인 토큰
- 액센트(brand): **emerald-300/400** (#34d399), 글로우 `drop-shadow`/`text-shadow`
- 의미색 유지: 상승 emerald · 하락 rose
- 반경 `rounded-2xl`, 보더 `slate-800`, 배경 라디얼 글로우

---
*design-lab (0xdesign/design-plugin) 워크플로우로 생성*
