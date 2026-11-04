import type { KeyboardEvent } from "react";

/**
 * Props that make a stat tile (a plain div) behave like a button: focusable, announced as a button, and
 * activated by click, Enter or Space. Spread it on the tile and add `cursor: "pointer"` to its style.
 */
export const drillProps = (onClick: () => void, label: string) => ({
  role: "button" as const,
  tabIndex: 0,
  "aria-label": label,
  onClick,
  onKeyDown: (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  },
});
