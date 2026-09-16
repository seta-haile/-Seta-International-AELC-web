import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_ITEMS = [
  { label: "AELC Engine", status: "Operational" },
  { label: "Jira Integration", status: "Connected" },
  { label: "GitHub Integration", status: "Connected" },
  { label: "Harness", status: "Operational" },
  { label: "CodeGraph", status: "Healthy" },
];

export function SystemStatus() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System status</CardTitle>
        <CardAction>
          <a href="#" className="text-sm font-medium text-primary hover:underline">
            View details →
          </a>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {STATUS_ITEMS.map(({ label, status }) => (
          <div key={label} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
            <span className="flex items-center gap-2 text-sm">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {label}
            </span>
            <span className="text-sm text-muted-foreground">{status}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
