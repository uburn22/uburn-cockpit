"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Megaphone,
  Users,
  Truck,
  Zap,
  Bot,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/revenue", label: "Revenue", icon: BarChart3 },
  { href: "/ads", label: "Ads", icon: Megaphone },
  { href: "/audience", label: "Audience", icon: Users },
  { href: "/logistics", label: "Logistics", icon: Truck },
  { href: "/signals", label: "Signals", icon: Zap },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/chat", label: "Chat IA", icon: MessageCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col border-r border-sidebar-border bg-sidebar shadow-sm">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <Link href="/revenue" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">U</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Cockpit
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-6 py-4">
        <p className="text-xs text-muted-foreground">
          Objectif : 100 cmd/jour
        </p>
      </div>
    </aside>
  );
}
