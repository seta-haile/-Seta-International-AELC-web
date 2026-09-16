"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Blocks,
  CircleDot,
  GitPullRequest,
  Gem,
  LayoutDashboard,
  ScanSearch,
  Settings,
  Users,
  Zap,
  BarChart3,
} from "lucide-react";
import { cn } from "cn";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/issues", label: "Issues", icon: CircleDot },
  { href: "/ai-runs", label: "AI Runs", icon: Zap },
  { href: "/code-intelligence", label: "Code Intelligence", icon: ScanSearch },
  { href: "/pull-requests", label: "Pull Requests", icon: GitPullRequest },
  { href: "/developers", label: "Developers", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/integrations", label: "Integrations", icon: Blocks },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-background sm:flex">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <Gem className="size-4.5" fill="currentColor" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">AELC</p>
          <p className="truncate text-[11px] leading-tight text-muted-foreground">
            Engineering Intelligence Platform
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border-l-2 border-transparent px-2.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-l-blue-600 bg-blue-50 text-blue-600"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{label}</span>
            </Link>
          );
        })}

        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-lg border-l-2 border-transparent px-2.5 py-2 text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "border-l-blue-600 bg-blue-50 text-blue-600"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Settings className="size-4 shrink-0" />
          <span className="flex-1">Settings</span>
        </Link>
      </nav>
    </aside>
  );
}
