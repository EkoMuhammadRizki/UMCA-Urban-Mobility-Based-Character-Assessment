"use client";

import { StatusKehadiran } from "@/lib/types";
import { getStatusLabel, getStatusLabelCompact } from "@/lib/utils/attendance-utils";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: StatusKehadiran;
  compact?: boolean;
  showDot?: boolean;
  className?: string;
}

const statusStyles: Record<StatusKehadiran, { bg: string; text: string; dot: string }> = {
  [StatusKehadiran.TEPAT_WAKTU]: {
    bg: "bg-status-green-bg",
    text: "text-status-green-text",
    dot: "bg-status-green-text",
  },
  [StatusKehadiran.TELAT]: {
    bg: "bg-status-amber-bg",
    text: "text-status-amber-text",
    dot: "bg-status-amber-text",
  },
  [StatusKehadiran.ABSEN]: {
    bg: "bg-status-gray-bg",
    text: "text-status-gray-text",
    dot: "bg-status-gray-text",
  },
};

export function StatusBadge({
  status,
  compact = false,
  showDot = true,
  className,
}: StatusBadgeProps) {
  const styles = statusStyles[status];
  const label = compact ? getStatusLabelCompact(status) : getStatusLabel(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        compact ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        styles.bg,
        styles.text,
        className
      )}
      role="status"
      aria-label={getStatusLabel(status)}
    >
      {showDot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", styles.dot)}
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
}
