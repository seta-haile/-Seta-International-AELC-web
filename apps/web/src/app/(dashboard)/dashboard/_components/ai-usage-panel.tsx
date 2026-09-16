import { BrainCircuit, CircleDollarSign } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const USAGE = [
  { icon: BrainCircuit, color: "bg-blue-50 text-blue-600", value: "1.8M", label: "Tokens used", trend: "22%" },
  { icon: CircleDollarSign, color: "bg-violet-50 text-violet-600", value: "$42.50", label: "Estimated cost", trend: "18%" },
];

export function AiUsagePanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          AI usage <span className="font-normal text-muted-foreground">(Last 30 days)</span>
        </CardTitle>
        <CardAction>
          <a href="#" className="text-sm font-medium text-primary hover:underline">
            View details →
          </a>
        </CardAction>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {USAGE.map(({ icon: Icon, color, value, label, trend }) => (
          <div key={label} className="rounded-lg border border-border p-3">
            <div className={`flex size-8 items-center justify-center rounded-lg ${color}`}>
              <Icon className="size-4" />
            </div>
            <p className="mt-2 text-lg font-semibold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xs font-medium text-emerald-600">↑ {trend}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
