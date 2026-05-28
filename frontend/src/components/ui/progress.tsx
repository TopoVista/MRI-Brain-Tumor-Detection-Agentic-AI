"use client";

import { cn } from "@/lib/utils";

function ProgressBar({
  className,
  value,
}: {
  className?: string;
  value?: number;
}) {
  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-sm bg-white/10", className)}>
      <div
        className="h-full w-full flex-1 rounded-sm bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </div>
  );
}

export { ProgressBar as Progress };
