import React from "react";

/**
 * OperationLoader — a product-ops loader based on a "sound wave" animation.
 *
 * ✅ Tailwind-only styles (no external CSS)
 * ✅ Accessible (ARIA live region, labels)
 * ✅ Progress (0–100), current step, and log of operations
 * ✅ Highly configurable: size, color, compact mode
 *
 * Usage:
 * <OperationLoader
 *   title="Processing your order"
 *   subtitle="Securely confirming payment and provisioning access"
 *   progress={42}
 *   steps={[
 *     { id: 'a', label: 'Validate cart', status: 'done' },
 *     { id: 'b', label: 'Charge payment', status: 'running' },
 *     { id: 'c', label: 'Provision account', status: 'pending' },
 *   ]}
 * />
 */
export default function OperationLoader({
  title = "Working on it…",
  subtitle,
  progress, // 0..100 (optional)
  steps = [], // [{id, label, status: 'pending'|'running'|'done'|'error'}]
  size = "md", // 'sm' | 'md' | 'lg'
  colorClass = "bg-primary/80", // tailwind class controlling bar color
  compact = false, // hide list, keep only wave + title + progress
  className = "",
}: {
  title?: string;
  subtitle?: string;
  progress?: number;
  steps?: { id: string | number; label: string; status?: "pending" | "running" | "done" | "error" }[];
  size?: "sm" | "md" | "lg";
  colorClass?: string;
  compact?: boolean;
  className?: string;
}) {
  const bars = 12;

  const sizeMap = {
    sm: { height: 40, barW: 4, gap: 4, radius: 9999 },
    md: { height: 64, barW: 6, gap: 6, radius: 9999 },
    lg: { height: 96, barW: 8, gap: 8, radius: 9999 },
  } as const;
  const s = sizeMap[size];

  const safeProgress = typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : undefined;

  const liveText = (() => {
    const running = steps.find((x) => x.status === "running");
    if (typeof safeProgress === "number" && running) return `${running.label} — ${safeProgress}%`;
    if (typeof safeProgress === "number") return `${safeProgress}%`;
    if (running) return running.label;
    return title;
  })();

  return (
    <div className={`w-full max-w-2xl mx-auto rounded-2xl border border-border/60 bg-background/60 backdrop-blur p-4 md:p-6 shadow-sm ${className}`}>
      {/* Inline keyframes for the wave (scoped by class name) */}
      <style>{`
        @keyframes soundWave {
          0%, 100% { transform: scaleY(0.25); opacity: 0.85; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>

      <div className="flex items-center gap-4">
        {/* Sound-wave loader */}
        <div
          className="flex items-end"
          role="img"
          aria-label="Animated activity indicator"
          style={{ height: s.height }}
        >
          {Array.from({ length: bars }).map((_, i) => {
            const delay = i * 0.1; // staggered
            return (
              <div
                key={i}
                className={`${colorClass} rounded-full`}
                style={{
                  width: s.barW,
                  height: s.height * 0.2,
                  marginLeft: i === 0 ? 0 : s.gap,
                  borderRadius: s.radius,
                  animation: `soundWave 1.2s ease-in-out ${delay}s infinite`,
                  transformOrigin: "center bottom",
                }}
              />
            );
          })}
        </div>

        {/* Titles */}
        <div className="min-w-0 flex-1">
          <div className="text-base md:text-lg font-semibold tracking-tight text-foreground truncate">{title}</div>
          {subtitle && (
            <div className="text-sm text-muted-foreground truncate" title={subtitle}>
              {subtitle}
            </div>
          )}

          {/* Progress bar */}
          {typeof safeProgress === "number" && (
            <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${safeProgress}%` }}
                aria-hidden
              />
            </div>
          )}
        </div>
      </div>

      {/* Steps log */}
      {!compact && steps?.length > 0 && (
        <div className="mt-4 space-y-2">
          {steps.map((step, idx) => (
            <div key={step.id ?? idx} className="flex items-center gap-2 text-sm">
              <StatusDot status={step.status ?? "pending"} />
              <div className="flex-1 truncate">{step.label}</div>
              <StatusLabel status={step.status ?? "pending"} />
            </div>
          ))}
        </div>
      )}

      {/* Screen-reader live updates */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">{liveText}</div>
    </div>
  );
}

function StatusDot({ status }: { status: "pending" | "running" | "done" | "error" }) {
  const map: Record<string, string> = {
    pending: "bg-muted",
    running: "bg-blue-500",
    done: "bg-green-500",
    error: "bg-red-500",
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${map[status]}`} />;
}

function StatusLabel({ status }: { status: "pending" | "running" | "done" | "error" }) {
  const label: Record<string, string> = {
    pending: "Pending",
    running: "Running",
    done: "Done",
    error: "Error",
  };
  const tone: Record<string, string> = {
    pending: "text-muted-foreground",
    running: "text-blue-600",
    done: "text-green-600",
    error: "text-red-600",
  };
  return <span className={`text-xs ${tone[status]}`}>{label[status]}</span>;
}