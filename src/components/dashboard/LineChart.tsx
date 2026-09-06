"use client";

interface LineChartProps {
  data: { label: string; value: number }[];
  color?: string;
}

export function LineChart({ data, color = "#0f766e" }: LineChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted">
        Belum ada data pemasukan bulanan.
      </div>
    );
  }

  const width = 600;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (data.length > 1 ? (i / (data.length - 1)) * chartWidth : chartWidth / 2);
    const y = padding.top + chartHeight - ((d.value - minValue) / range) * chartHeight;
    return { x, y, value: d.value, label: d.label };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={padding.left} y1={padding.top + chartHeight} x2={width - padding.right} y2={padding.top + chartHeight} stroke="#e5e7eb" strokeWidth="1" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartHeight} stroke="#e5e7eb" strokeWidth="1" />
        {points.map((p, i) => (
          <text
            key={`label-${i}`}
            x={p.x}
            y={padding.top + chartHeight + 18}
            textAnchor="middle"
            className="text-[10px] fill-muted"
          >
            {p.label}
          </text>
        ))}
        <path d={areaD} fill="url(#areaGradient)" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={`dot-${i}`} cx={p.x} cy={p.y} r="4" fill={color} stroke="white" strokeWidth="2" />
        ))}
      </svg>
    </div>
  );
}
