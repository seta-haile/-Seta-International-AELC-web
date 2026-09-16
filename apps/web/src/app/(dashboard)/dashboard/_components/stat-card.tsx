import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";

const ICON_STYLES = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
} as const;

interface StatCardProps {
  icon: LucideIcon;
  color: keyof typeof ICON_STYLES;
  label: string;
  value: string;
  trend: "up" | "down";
  trendLabel: string;
  positive?: boolean;
}

export function StatCard({
  icon: Icon,
  color,
  label,
  value,
  trend,
  trendLabel,
  positive = true,
}: StatCardProps) {
  const TrendIcon = trend === "up" ? ArrowUp : ArrowDown;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-lg",
            ICON_STYLES[color],
          )}
        >
          <Icon className="size-4.5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span
            className={cn(
              "flex items-center gap-0.5 font-medium",
              positive ? "text-emerald-600" : "text-destructive",
            )}
          >
            <TrendIcon className="size-3" />
            {trendLabel}
          </span>
          <span className="text-muted-foreground">vs last month</span>
        </div>
      </CardContent>
    </Card>
  );
}
