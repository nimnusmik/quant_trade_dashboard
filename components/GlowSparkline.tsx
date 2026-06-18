// 글로우 영역 스파크라인 — 의존성 없이 SVG로 직접 그려 차트를 강하게 살린다.
// design-lab 합성안(F)의 핵심 비주얼: 그라데이션 채움 + 선택적 네온 글로우.

export function GlowSparkline({
  points,
  color = "#34d399", // emerald-400
  glow = true,
  strokeWidth = 2.5,
  className = "",
}: {
  points: number[];
  color?: string;
  glow?: boolean;
  strokeWidth?: number;
  className?: string;
}) {
  if (points.length < 2) {
    return null;
  }

  const W = 100;
  const H = 32;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - ((v - min) / span) * (H - 4) - 2;
    return [x, y] as const;
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const gid = `glow-spark-${color.replace("#", "")}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label="누적 손익 추세"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={glow ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined}
      />
    </svg>
  );
}
