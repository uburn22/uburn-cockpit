"use client";

import { COLORS } from "@/lib/constants";

interface GaugeProps {
  value: number;
  max: number;
  label: string;
}

export function Gauge({ value, max, label }: GaugeProps) {
  const percentage = Math.min(value / max, 1);
  const angle = percentage * 180;
  const radius = 80;
  const cx = 100;
  const cy = 95;

  const describeArc = (startAngle: number, endAngle: number) => {
    const startRad = ((180 + startAngle) * Math.PI) / 180;
    const endRad = ((180 + endAngle) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-full max-w-[280px]">
        <path
          d={describeArc(0, 180)}
          fill="none"
          stroke={COLORS.border}
          strokeWidth="16"
          strokeLinecap="round"
        />
        {angle > 0 && (
          <path
            d={describeArc(0, angle)}
            fill="none"
            stroke={COLORS.primary}
            strokeWidth="16"
            strokeLinecap="round"
          />
        )}
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          className="fill-foreground text-3xl font-bold"
          style={{ fontSize: "32px" }}
        >
          {value}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: "12px" }}
        >
          / {max}
        </text>
      </svg>
      <p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
