"use client";

import { useState, type MouseEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DATA = [
  { date: "Aug 17", total: 32, ai: 22 },
  { date: "Aug 20", total: 45, ai: 30 },
  { date: "Aug 24", total: 38, ai: 34 },
  { date: "Aug 27", total: 52, ai: 40 },
  { date: "Aug 31", total: 60, ai: 45 },
  { date: "Sep 3", total: 68, ai: 50 },
  { date: "Sep 7", total: 76, ai: 58 },
  { date: "Sep 10", total: 82, ai: 64 },
  { date: "Sep 14", total: 90, ai: 70 },
];

const LABELED_INDEXES = [0, 2, 4, 6, 8];
const WIDTH = 600;
const HEIGHT = 220;
const PAD_LEFT = 30;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 26;
const PLOT_W = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;
const MAX_Y = 100;
const Y_TICKS = [0, 20, 40, 60, 80, 100];

const xAt = (i: number) => PAD_LEFT + (i / (DATA.length - 1)) * PLOT_W;
const yAt = (v: number) => PAD_TOP + PLOT_H - (v / MAX_Y) * PLOT_H;

function linePath(key: "total" | "ai") {
  return DATA.map((d, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(d[key])}`).join(" ");
}

const TOOLTIP_W = 132;
const TOOLTIP_H = 58;

export function TicketTrendChart() {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  function handleMove(event: MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const ratio = (svgX - PAD_LEFT) / PLOT_W;
    const idx = Math.round(ratio * (DATA.length - 1));
    setHoverIndex(Math.min(Math.max(idx, 0), DATA.length - 1));
  }

  const point = hoverIndex !== null ? DATA[hoverIndex] : null;
  const tooltipX = point
    ? Math.min(Math.max(xAt(hoverIndex!) - TOOLTIP_W / 2, PAD_LEFT), WIDTH - PAD_RIGHT - TOOLTIP_W)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket trend</CardTitle>
        <span className="text-sm text-muted-foreground">Last 30 days</span>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {Y_TICKS.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={yAt(tick)}
                y2={yAt(tick)}
                className="stroke-border"
                strokeWidth={1}
              />
              <text x={PAD_LEFT - 8} y={yAt(tick) + 3} textAnchor="end" className="fill-muted-foreground text-[9px]">
                {tick}
              </text>
            </g>
          ))}

          {LABELED_INDEXES.map((i) => (
            <text
              key={i}
              x={xAt(i)}
              y={HEIGHT - 6}
              textAnchor={i === 0 ? "start" : i === DATA.length - 1 ? "end" : "middle"}
              className="fill-muted-foreground text-[9px]"
            >
              {DATA[i].date}
            </text>
          ))}

          <path d={linePath("total")} className="stroke-violet-500" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d={linePath("ai")} className="stroke-blue-500" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {hoverIndex !== null && (
            <>
              <line
                x1={xAt(hoverIndex)}
                x2={xAt(hoverIndex)}
                y1={PAD_TOP}
                y2={PAD_TOP + PLOT_H}
                className="stroke-border"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle cx={xAt(hoverIndex)} cy={yAt(DATA[hoverIndex].total)} r={4} className="fill-violet-500 stroke-background" strokeWidth={2} />
              <circle cx={xAt(hoverIndex)} cy={yAt(DATA[hoverIndex].ai)} r={4} className="fill-blue-500 stroke-background" strokeWidth={2} />

              <g transform={`translate(${tooltipX}, ${PAD_TOP})`}>
                <rect
                  width={TOOLTIP_W}
                  height={TOOLTIP_H}
                  rx={8}
                  className="fill-popover stroke-border"
                  strokeWidth={1}
                />
                <text x={10} y={18} className="fill-foreground text-[10px] font-medium">
                  {point!.date}, 2024
                </text>
                <circle cx={14} cy={31} r={3} className="fill-violet-500" />
                <text x={22} y={34} className="fill-muted-foreground text-[9px]">Total tickets</text>
                <text x={TOOLTIP_W - 10} y={34} textAnchor="end" className="fill-foreground text-[9px] font-medium">
                  {point!.total}
                </text>
                <circle cx={14} cy={45} r={3} className="fill-blue-500" />
                <text x={22} y={48} className="fill-muted-foreground text-[9px]">AI assisted</text>
                <text x={TOOLTIP_W - 10} y={48} textAnchor="end" className="fill-foreground text-[9px] font-medium">
                  {point!.ai}
                </text>
              </g>
            </>
          )}
        </svg>

        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-violet-500" /> Total tickets
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-blue-500" /> AI assisted
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
