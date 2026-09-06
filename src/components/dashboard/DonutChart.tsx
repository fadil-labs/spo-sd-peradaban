"use client";

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
}

export function DonutChart({ data }: DonutChartProps) {
  const size = 180;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const segments = data.reduce<{ label: string; value: number; color: string; fraction: number; length: number; offset: number }[]>((acc, item) => {
    const fraction = total === 0 ? 0 : item.value / total;
    const length = fraction * circumference;
    const segment = {
      ...item,
      fraction,
      length,
      offset: acc.length === 0 ? 0 : acc[acc.length - 1].offset + acc[acc.length - 1].length,
    };
    acc.push(segment);
    return acc;
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
        {segments.map((segment, index) => (
          <circle
            key={index}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segment.length} ${circumference - segment.length}`}
            strokeDashoffset={-segment.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="flex flex-wrap justify-center gap-3 text-xs">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="text-muted">{segment.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
