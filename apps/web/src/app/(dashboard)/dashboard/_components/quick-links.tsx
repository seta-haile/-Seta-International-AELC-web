import { ArrowRight, CircleDot, GitPullRequest, ScanSearch, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LINKS = [
  { href: "/issues", label: "View Issues", icon: CircleDot },
  { href: "/pull-requests", label: "View Pull Requests", icon: GitPullRequest },
  { href: "/ai-runs", label: "AI Runs", icon: Zap },
  { href: "/code-intelligence", label: "Code Intelligence", icon: ScanSearch },
];

export function QuickLinks() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick links</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <a
            key={href}
            href={href}
            className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm font-medium hover:bg-muted"
          >
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate">{label}</span>
            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
