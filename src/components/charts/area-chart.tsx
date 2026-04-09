"use client";

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { COLORS } from "@/lib/constants";

interface AreaChartProps {
  data: { date: string; value: number }[];
  dataKey?: string;
  formatValue?: (v: number) => string;
  height?: number;
}

export function AreaChart({
  data,
  dataKey = "value",
  formatValue = (v) => v.toLocaleString("fr-FR"),
  height = 280,
}: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.2} />
            <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
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
          labelFormatter={(label) => label}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={COLORS.primary}
          strokeWidth={2}
          fill="url(#primaryGradient)"
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
