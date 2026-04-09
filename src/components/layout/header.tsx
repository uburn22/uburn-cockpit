"use client";

import { cn } from "@/lib/utils";

export type Period = "7d" | "30d" | "90d";

const PERIODS: { value: Period; label: string }[] = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
];

interface HeaderProps {
  title: string;
  period: Period;
  onPeriodChange: (period: Period) => void;
}

export function Header({ title, period, onPeriodChange }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-6">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriodChange(p.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              period === p.value
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    </header>
  );
}
