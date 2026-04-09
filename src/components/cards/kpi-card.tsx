"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  delta?: number;
  subtitle?: string;
}

export function KpiCard({ title, value, delta, subtitle }: KpiCardProps) {
  const isPositive = delta !== undefined && delta > 0;
  const isNegative = delta !== undefined && delta < 0;
  const isNeutral = delta === undefined || delta === 0;

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </span>
          {delta !== undefined && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                isPositive && "text-[#22C55E]",
                isNegative && "text-[#EF4444]",
                isNeutral && "text-muted-foreground"
              )}
            >
              {isPositive && <TrendingUp className="h-3 w-3" />}
              {isNegative && <TrendingDown className="h-3 w-3" />}
              {isNeutral && <Minus className="h-3 w-3" />}
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)}%
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
