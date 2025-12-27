"use client";

import { cn } from "@/lib/utils";
import type { TicketStatus, TicketPriority } from "@/types/support";
import {
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_COLORS,
} from "@/types/support";

interface StatusBadgeProps {
  status: TicketStatus;
  size?: "sm" | "md";
}

interface PriorityBadgeProps {
  priority: TicketPriority;
  size?: "sm" | "md";
}

export function TicketStatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const colors = TICKET_STATUS_COLORS[status];
  const label = TICKET_STATUS_LABELS[status];

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border",
        colors.bg,
        colors.text,
        colors.border,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      {label}
    </span>
  );
}

export function TicketPriorityBadge({
  priority,
  size = "md",
}: PriorityBadgeProps) {
  const colors = TICKET_PRIORITY_COLORS[priority];
  const label = TICKET_PRIORITY_LABELS[priority];

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border",
        colors.bg,
        colors.text,
        colors.border,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      {label}
    </span>
  );
}
