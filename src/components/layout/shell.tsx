"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header, type Period } from "./header";

interface ShellProps {
  title: string;
  children: (period: Period) => React.ReactNode;
}

export function Shell({ title, children }: ShellProps) {
  const [period, setPeriod] = useState<Period>("30d");

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-[220px]">
        <Header title={title} period={period} onPeriodChange={setPeriod} />
        <main className="p-6">{children(period)}</main>
      </div>
    </div>
  );
}
