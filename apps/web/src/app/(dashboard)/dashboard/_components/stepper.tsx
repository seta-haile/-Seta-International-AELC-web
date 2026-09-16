import { Check } from "lucide-react";
import { cn } from "cn";

const STEP_COLORS = ["bg-emerald-500", "bg-violet-500", "bg-blue-500"];

export function Stepper({ completedSteps }: { completedSteps: 0 | 1 | 2 | 3 }) {
  return (
    <div className="flex items-center">
      {STEP_COLORS.map((color, index) => {
        const done = index < completedSteps;
        return (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <div className={cn("h-px w-3", done ? "bg-border" : "bg-border/60")} />
            )}
            <div
              className={cn(
                "flex size-5 items-center justify-center rounded-full border",
                done ? cn(color, "border-transparent text-white") : "border-border bg-background",
              )}
            >
              {done && <Check className="size-3" strokeWidth={3} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
