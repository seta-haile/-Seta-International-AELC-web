"use client";

import { useRouter } from "next/navigation";
import { Bell, Calendar, ChevronDown, LogOut, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionUser } from "@/lib/auth";

const ROLE_LABEL: Record<string, string> = {
  admin: "Engineering Manager",
};

export function Topbar({ user }: { user: SessionUser }) {
  const router = useRouter();
  const displayName = user.username.charAt(0).toUpperCase() + user.username.slice(1);
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-6">
      <div className="relative w-full max-w-xl">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search issues, pull requests, repositories..."
          className="h-9 w-full rounded-lg border border-input bg-muted/40 pl-9 pr-14 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <kbd className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          <Calendar className="size-4 text-muted-foreground" />
          Last 30 days
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>

        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <Bell className="size-4.5" />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-red-500 ring-2 ring-background" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg py-1 pr-1 pl-1 hover:bg-muted">
            <Avatar>
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-blue-600 font-semibold text-white">
                {displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-left leading-tight">
              <p className="text-sm font-medium text-foreground">{displayName}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{roleLabel}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
