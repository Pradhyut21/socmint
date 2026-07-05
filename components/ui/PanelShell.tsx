"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * PanelShell — the canonical "dossier panel" surface for the Warm Terracotta
 * theme. Every intelligence panel (Evidence, Geomap, Network, Posts, Legal,
 * Accounts, Signals, Oracle Chat) wraps its content in this for a consistent
 * editorial-forensic look:
 *   • Surface: warm cream (bg-paper)
 *   • Border: subtle warm-ink hairline (border-forest/10)
 *   • Header: top bar with a mono label + optional icon + right-side actions
 *   • Shadow: warm oxblood dossier elevation (shadow-dossier)
 */

export interface PanelShellProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Mono uppercase label shown in the header bar (e.g. "EVIDENCE LOCKER"). */
  label?: string;
  /** Optional leading icon element for the header. */
  icon?: React.ReactNode;
  /** Optional right-aligned header content (badges, buttons, counts). */
  actions?: React.ReactNode;
  /** Remove inner content padding (for edge-to-edge maps/graphs). */
  flush?: boolean;
  /** Tone accent for the header label + top border. */
  tone?: "default" | "ember" | "rust" | "olive";
  contentClassName?: string;
}

const toneMap: Record<NonNullable<PanelShellProps["tone"]>, { text: string; bar: string }> = {
  default: { text: "text-forest/60", bar: "before:bg-forest/15" },
  ember: { text: "text-emerald", bar: "before:bg-emerald/40" },
  rust: { text: "text-rust", bar: "before:bg-rust/40" },
  olive: { text: "text-success", bar: "before:bg-success/40" },
};

export const PanelShell = React.forwardRef<HTMLDivElement, PanelShellProps>(
  ({ label, icon, actions, flush, tone = "default", className, contentClassName, children, ...props }, ref) => {
    const t = toneMap[tone];
    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-lg border border-forest/10 bg-paper text-forest shadow-dossier",
          // thin colored keyline along the very top edge
          "before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:content-['']",
          t.bar,
          className,
        )}
        {...props}
      >
        {(label || actions) && (
          <div className="flex items-center justify-between gap-3 border-b border-forest/10 bg-white/40 px-4 py-2.5">
            <div className={cn("flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em]", t.text)}>
              {icon && <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>}
              {label}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        <div className={cn(flush ? "" : "p-4", contentClassName)}>{children}</div>
      </div>
    );
  },
);
PanelShell.displayName = "PanelShell";

export default PanelShell;
