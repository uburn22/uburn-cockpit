"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { COLORS } from "@/lib/constants";

interface LineChartProps {
  data: { date: string; value: number }[];
  formatValue?: (v: number) => string;
  height?: number;
  color?: string;
  referenceLine?: { value: number; label: string };
}

export function LineChart({
  data,
  formatValue = (v) => v.toLocaleString("fr-FR"),
  height = 280,
  color = COLORS.primary,
  referenceLine,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
        <XAxis
          dataKey="date"
          tick={{ fill: COLORS.muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v.slice(5)}
        />
        <YAxis
          tick={{ fill: COLORS.muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatValue}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: COLORS.background,
            border: `1px solid ${COLORS.border}`,
            borderRadius: "8px",
            color: COLORS.text,
            fontSize: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
          formatter={(value) => [formatValue(value as number), ""]}
        />
        {referenceLine && (
          <ReferenceLine
            y={referenceLine.value}
            stroke={COLORS.red}
            strokeDasharray="5 5"
            label={{
              value: referenceLine.label,
              fill: COLORS.red,
              fontSize: 11,
              position: "right",
            }}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: color }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
