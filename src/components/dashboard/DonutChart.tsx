"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from "recharts";

interface CompositionData {
  name: string;
  value: number;
}

interface DonutChartProps {
  data?: CompositionData[];
}

const fallbackCompositionData: CompositionData[] = [
  { name: "QRIS", value: 65 },
  { name: "Transfer Bank", value: 25 },
  { name: "Lainnya", value: 10 },
];

const COLORS = ["#0C3B2E", "#C28E38", "#2563EB", "#0D9488"];

export function DonutChart({ data }: DonutChartProps) {
  const chartData = data && data.length > 0 ? data : fallbackCompositionData;

  return (
    <div className="w-full h-[220px] sm:h-[240px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={78}
            paddingAngle={4}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-[#1A1A1A] text-white text-xs px-2.5 py-1 rounded shadow-md">
                    {payload[0].name}: {payload[0].value}%
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => (
              <span className="text-xs font-medium text-[#555]">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}