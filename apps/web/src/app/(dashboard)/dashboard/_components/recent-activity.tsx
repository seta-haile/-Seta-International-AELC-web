import { FileText } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "cn";
import { Stepper } from "./stepper";

type Status = "Completed" | "Human Review" | "In Progress" | "To Do";

const STATUS_STYLES: Record<Status, string> = {
  Completed: "bg-emerald-50 text-emerald-700",
  "Human Review": "bg-amber-50 text-amber-700",
  "In Progress": "bg-blue-50 text-blue-700",
  "To Do": "bg-muted text-muted-foreground",
};

interface ActivityRow {
  ticketId: string;
  repo: string;
  summary: string;
  status: Status;
  steps: 0 | 1 | 2 | 3;
  updated: string;
}

const ACTIVITY: ActivityRow[] = [
  { ticketId: "AELC-1024", repo: "payment-service", summary: "Payment timeout issue", status: "Completed", steps: 3, updated: "2 hours ago" },
  { ticketId: "AELC-1025", repo: "auth-service", summary: "Improve login error handling", status: "Human Review", steps: 2, updated: "5 hours ago" },
  { ticketId: "AELC-1026", repo: "api-gateway", summary: "API returns 500 on invalid input", status: "In Progress", steps: 2, updated: "7 hours ago" },
  { ticketId: "AELC-1027", repo: "user-service", summary: "Refactor user profile service", status: "To Do", steps: 1, updated: "1 day ago" },
];

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent AI activity</CardTitle>
        <CardAction>
          <a href="#" className="text-sm font-medium text-primary hover:underline">
            View all →
          </a>
        </CardAction>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-160 border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">Issue</th>
              <th className="pb-2 font-medium">Summary</th>
              <th className="pb-2 font-medium">Workflow status</th>
              <th className="pb-2 text-right font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ACTIVITY.map((row) => (
              <tr key={row.ticketId}>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.ticketId}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.repo}</p>
                    </div>
                  </div>
                </td>
                <td className="max-w-56 truncate py-3 pr-4 text-foreground">{row.summary}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <Stepper completedSteps={row.steps} />
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[row.status])}>
                      {row.status}
                    </span>
                  </div>
                </td>
                <td className="py-3 text-right text-xs whitespace-nowrap text-muted-foreground">{row.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
