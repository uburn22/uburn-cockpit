"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { COLORS } from "@/lib/constants";

interface BarChartProps {
  data: { name: string; value: number; fill?: string }[];
  layout?: "horizontal" | "vertical";
  formatValue?: (v: number) => string;
  height?: number;
  barColor?: string;
  showTarget?: number;
}

const tooltipStyle = {
  backgroundColor: COLORS.background,
  border: `1px solid ${COLORS.border}`,
  borderRadius: "8px",
  color: COLORS.text,
  fontSize: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

export function BarChart({
  data,
  layout = "horizontal",
  formatValue = (v) => v.toLocaleString("fr-FR"),
  height = 280,
  barColor = COLORS.primary,
  showTarget,
}: BarChartProps) {
  if (layout === "vertical") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 80, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: COLORS.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatValue}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: COLORS.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={75}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [formatValue(value as number), ""]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.fill ||
                  (showTarget && entry.value >= showTarget
                    ? COLORS.primary
                    : showTarget
                      ? COLORS.red
                      : barColor)
                }
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
        <XAxis
          dataKey="name"
          tick={{ fill: COLORS.muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: COLORS.muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatValue}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [formatValue(value as number), ""]}
        />
        <Bar dataKey="value" fill={barColor} radius={[4, 4, 0, 0]} maxBarSize={32}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill || barColor} />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
