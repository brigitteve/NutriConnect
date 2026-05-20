import { ORDER_STAGES, type OrderStatus } from "@/lib/constants";
import { Check } from "lucide-react";

export function PipelineBar({ status }: { status: OrderStatus }) {
  const activeIdx = ORDER_STAGES.findIndex((s) => s.id === status);
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <ol className="flex flex-wrap items-center gap-2">
        {ORDER_STAGES.map((s, i) => {
          const done = activeIdx > i;
          const current = activeIdx === i;
          return (
            <li key={s.id} className="flex items-center gap-2">
              <div
                className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition ${
                  done
                    ? "bg-success text-success-foreground"
                    : current
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/15"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : <span className="font-mono">{i + 1}</span>}
                {s.label}
              </div>
              {i < ORDER_STAGES.length - 1 && (
                <div
                  className={`h-px w-4 ${done ? "bg-success" : "bg-border"}`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
