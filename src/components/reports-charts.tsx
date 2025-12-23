"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ReportsChartsProps {
  data: { month: string; [key: string]: string | number }[];
  dataKey: string;
  color?: string;
  formatValue?: (value: number) => string;
}

export function ReportsCharts({
  data,
  dataKey,
  color = "var(--primary)",
  formatValue = (v) => String(v),
}: ReportsChartsProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="month"
            className="text-xs"
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: "var(--muted-foreground)" }}
            tickFormatter={(value) => formatValue(value)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              direction: "rtl",
            }}
            formatter={(value) => [formatValue(value as number), ""]}
            labelStyle={{ color: "var(--foreground)" }}
          />
          <Bar
            dataKey={dataKey}
            fill={color}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

