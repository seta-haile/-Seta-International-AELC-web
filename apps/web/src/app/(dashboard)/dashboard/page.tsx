import { FileText, ShieldCheck, Users, Zap } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { StatCard } from "./_components/stat-card";
import { RecentActivity } from "./_components/recent-activity";
import { SystemStatus } from "./_components/system-status";
import { TicketTrendChart } from "./_components/ticket-trend-chart";
import { TicketStatusDonut } from "./_components/ticket-status-donut";
import { AiUsagePanel } from "./_components/ai-usage-panel";
import { QuickLinks } from "./_components/quick-links";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const name = user ? user.username.charAt(0).toUpperCase() + user.username.slice(1) : "";
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {greetingForHour(now.getHours())}, {name} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here&apos;s how AI is helping your engineering team build better software.
          </p>
        </div>
        <blockquote className="max-w-xs text-right text-sm text-muted-foreground italic">
          &ldquo;Augment human creativity. Deliver real impact.&rdquo;
          <footer className="mt-1 not-italic">— AELC</footer>
        </blockquote>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} color="blue" label="Tickets processed" value="248" trend="up" trendLabel="32%" />
        <StatCard icon={Zap} color="violet" label="AI assisted" value="186" trend="up" trendLabel="28%" />
        <StatCard icon={Users} color="emerald" label="Human approved" value="164" trend="up" trendLabel="18%" />
        <StatCard icon={ShieldCheck} color="amber" label="Harness passed" value="179" trend="up" trendLabel="24%" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="md:col-span-3">
              <TicketTrendChart />
            </div>
            <div className="md:col-span-2">
              <TicketStatusDonut />
            </div>
          </div>
          <RecentActivity />
        </div>

        <div className="flex flex-col gap-4">
          <AiUsagePanel />
          <SystemStatus />
          <QuickLinks />
        </div>
      </div>
    </div>
  );
}
