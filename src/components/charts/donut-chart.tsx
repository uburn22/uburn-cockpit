"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { COLORS } from "@/lib/constants";

interface DonutChartProps {
  data: { name: string; value: number; fill?: string }[];
  height?: number;
  colors?: string[];
}

const DEFAULT_COLORS = [COLORS.primary, COLORS.primaryLight, COLORS.muted, COLORS.primaryDark];

export function DonutChart({
  data,
  height = 250,
  colors = DEFAULT_COLORS,
}: DonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={data[i].fill || colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: COLORS.background,
            border: `1px solid ${COLORS.border}`,
            borderRadius: "8px",
            color: COLORS.text,
            fontSize: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
          formatter={(value) => [
            `${(value as number).toLocaleString("fr-FR")}`,
            "",
          ]}
        />
        <Legend
          verticalAlign="bottom"
          formatter={(value) => (
            <span style={{ color: COLORS.muted, fontSize: "12px" }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
