"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface MonthlyPaymentData {
  month: string;
  amount: number;
}

interface LineChartProps {
  data?: MonthlyPaymentData[];
}

const fallbackMonthlyData: MonthlyPaymentData[] = [
  { month: "Jan", amount: 400000 },
  { month: "Feb", amount: 1200000 },
  { month: "Mar", amount: 800000 },
  { month: "Apr", amount: 1100000 },
  { month: "Mei", amount: 1800000 },
  { month: "Jun", amount: 950000 },
  { month: "Jul", amount: 1400000 },
  { month: "Agu", amount: 1300000 },
];

export function LineChart({ data }: LineChartProps) {
  const chartData = data && data.length > 1 ? data : fallbackMonthlyData;

  return (
    <div className="w-full h-[250px] sm:h-[270px] pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0C3B2E" stopOpacity={0.85} />
              <stop offset="95%" stopColor="#0C3B2E" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE6DC" />
          <XAxis
            dataKey="month"
            stroke="#9A9A9A"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#9A9A9A"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => (val >= 1000 ? `${val / 1000}k` : val)}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-[#0C3B2E] text-white text-xs px-3 py-1.5 rounded-lg shadow-lg font-semibold">
                    Rp {Number(payload[0].value).toLocaleString("id-ID")}
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#0C3B2E"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorGreen)"
            dot={{ r: 4, fill: "#0C3B2E", stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#0C3B2E", stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}