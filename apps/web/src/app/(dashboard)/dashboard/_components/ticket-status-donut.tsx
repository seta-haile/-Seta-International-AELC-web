import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SEGMENTS = [
  { label: "Done", count: 98, colorClass: "stroke-emerald-500", dotClass: "bg-emerald-500" },
  { label: "In Progress", count: 64, colorClass: "stroke-blue-500", dotClass: "bg-blue-500" },
  { label: "In Review", count: 52, colorClass: "stroke-violet-500", dotClass: "bg-violet-500" },
  { label: "To Do", count: 34, colorClass: "stroke-amber-500", dotClass: "bg-amber-500" },
];

const TOTAL = SEGMENTS.reduce((sum, s) => sum + s.count, 0);
const SIZE = 160;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const ARCS = SEGMENTS.reduce<{ segment: (typeof SEGMENTS)[number]; length: number; offset: number }[]>(
  (arcs, segment) => {
    const length = (segment.count / TOTAL) * CIRCUMFERENCE;
    const offset = arcs.length > 0 ? arcs[arcs.length - 1].offset + arcs[arcs.length - 1].length : 0;
    return [...arcs, { segment, length, offset }];
  },
  [],
);

export function TicketStatusDonut() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket status</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 sm:flex-row">
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} className="stroke-muted" strokeWidth={STROKE} fill="none" />
            {ARCS.map(({ segment, length, offset }) => (
              <circle
                key={segment.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                strokeWidth={STROKE}
                className={segment.colorClass}
                strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                strokeDashoffset={-offset}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-semibold tracking-tight">{TOTAL}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-3 pr-1">
          {SEGMENTS.map((segment) => (
            <div key={segment.label} className="min-w-0 text-sm">
              <div className="flex items-center gap-2">
                <span className={`size-2 shrink-0 rounded-full ${segment.dotClass}`} />
                <span className="font-medium whitespace-nowrap">{segment.label}</span>
              </div>
              <p className="mt-0.5 pl-4 text-xs whitespace-nowrap text-muted-foreground">
                {segment.count} ({Math.round((segment.count / TOTAL) * 100)}%)
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
