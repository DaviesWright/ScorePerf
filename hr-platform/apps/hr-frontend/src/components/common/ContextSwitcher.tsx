"use client";

import React, { useEffect, useRef, useState } from "react";
import { colors, radii, shadows, typography } from "../../design-system/tokens";
import { Icons } from "../../design-system/Icons";
import { EXPERIENCE_META, UserContextTuple } from "../../domain/orgCore";

interface ContextSwitcherProps {
  contexts: UserContextTuple[];
  activeContext: UserContextTuple;
  onSelectContext: (contextId: string) => void;
  compact?: boolean;
}

/**
 * §3.3 & §10 ContextSwitcher:
 * - Lists every context the user holds (ESS first, then MSS, then HRMS) with scope sub-labels.
 * - Marks the active context with ●.
 * - Hidden when the user holds only ESS (FR-CTX-005, TC-CTX-01).
 * - Keyboard-navigable (ArrowUp / ArrowDown / Home / End / Escape) with visible focus ring.
 */
export const ContextSwitcher: React.FC<ContextSwitcherProps> = ({
  contexts,
  activeContext,
  onSelectContext,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // FR-CTX-005 & TC-CTX-01: If the user has only ESS, hide the switcher to reduce noise
  if (contexts.length <= 1) {
    return null;
  }

  const activeMeta = EXPERIENCE_META[activeContext.experience];
  const accentColor =
    activeContext.experience === "ESS"
      ? colors.emeraldDark
      : activeContext.experience === "MSS"
      ? colors.indigoAction
      : colors.textPrimary;

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      if (!open) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => itemRefs.current[0]?.focus(), 0);
      }
    }
  };

  const handleItemKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      itemRefs.current[(index + 1) % contexts.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      itemRefs.current[(index - 1 + contexts.length) % contexts.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      itemRefs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      itemRefs.current[contexts.length - 1]?.focus();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Switch experience context (current: ${activeMeta.shortLabel} ${activeContext.experience})`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.45rem",
          padding: compact ? "0.3rem 0.65rem" : "0.32rem 0.75rem",
          borderRadius: radii.md,
          border: `1.5px solid ${accentColor}`,
          backgroundColor: colors.surface,
          color: colors.textPrimary,
          fontSize: typography.sizes.xs,
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            backgroundColor: accentColor,
          }}
        />
        <span>{activeMeta.shortLabel}</span>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: colors.textMuted,
            padding: "0.05rem 0.3rem",
            borderRadius: radii.sm,
            backgroundColor: colors.surfaceSubtle,
          }}
        >
          {activeContext.experience}
        </span>
        <Icons.ChevronDown size={13} color={colors.textMuted} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Available Experience Contexts"
          style={{
            position: "absolute",
            top: "120%",
            right: 0,
            minWidth: "260px",
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.md,
            boxShadow: shadows.md,
            zIndex: 50,
            padding: "0.35rem 0",
          }}
        >
          <div
            style={{
              padding: "0.4rem 0.85rem",
              fontSize: "11px",
              fontWeight: 700,
              color: colors.textMuted,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            Switch Experience Context
          </div>
          {contexts.map((ctx, idx) => {
            const meta = EXPERIENCE_META[ctx.experience];
            const isActive = ctx.contextId === activeContext.contextId;
            return (
              <button
                key={ctx.contextId}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  setOpen(false);
                  if (!isActive) onSelectContext(ctx.contextId);
                }}
                onKeyDown={(e) => handleItemKeyDown(e, idx)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "0.55rem 0.85rem",
                  border: "none",
                  backgroundColor: isActive ? colors.indigoSubtle : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.55rem",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: "14px",
                    fontSize: "12px",
                    lineHeight: "18px",
                    color: isActive ? colors.indigoAction : colors.textMuted,
                    fontWeight: 800,
                  }}
                >
                  {isActive ? "●" : "○"}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      fontSize: typography.sizes.xs,
                      fontWeight: isActive ? 700 : 600,
                      color: colors.textPrimary,
                    }}
                  >
                    <span>{meta.shortLabel}</span>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: colors.textMuted,
                      }}
                    >
                      ({ctx.experience})
                    </span>
                  </span>
                  {ctx.experience !== "ESS" && (
                    <span
                      style={{
                        display: "block",
                        fontSize: "11px",
                        color: colors.textMuted,
                        marginTop: "0.1rem",
                      }}
                    >
                      {ctx.subLabel}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * §10 ContextBadge: Persistent pill badge showing active context + scope (e.g., MSS · Engineering Dept).
 */
export const ContextBadge: React.FC<{ activeContext: UserContextTuple }> = ({ activeContext }) => {
  const bg =
    activeContext.experience === "ESS"
      ? colors.emeraldSubtle
      : activeContext.experience === "MSS"
      ? colors.indigoSubtle
      : colors.surfaceSubtle;
  const fg =
    activeContext.experience === "ESS"
      ? colors.emeraldDark
      : activeContext.experience === "MSS"
      ? colors.indigoPrimary
      : colors.textPrimary;
  const border =
    activeContext.experience === "ESS"
      ? colors.emeraldBorder
      : activeContext.experience === "MSS"
      ? colors.indigoBorder
      : colors.borderStrong;

  return (
    <span
      title={`Active context: ${activeContext.experience} · ${activeContext.scopeLabel}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.15rem 0.5rem",
        borderRadius: radii.full,
        backgroundColor: bg,
        color: fg,
        border: `1px solid ${border}`,
        fontSize: "11px",
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <span>{activeContext.experience}</span>
      {activeContext.experience !== "ESS" && (
        <>
          <span aria-hidden="true">·</span>
          <span>{activeContext.scopeLabel}</span>
        </>
      )}
    </span>
  );
};

/**
 * §10 ContextNotice: Alert/toast banner for context invalidation or 403 deep-link fallback.
 */
export const ContextNotice: React.FC<{ message: string; onDismiss: () => void }> = ({
  message,
  onDismiss,
}) => (
  <div
    role="status"
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "0.75rem",
      padding: "0.65rem 1.25rem",
      backgroundColor: "#fffbeb",
      borderBottom: "1px solid #fde68a",
      color: "#92400e",
      fontSize: typography.sizes.xs,
      fontWeight: 600,
    }}
  >
    <span>{message}</span>
    <button
      type="button"
      onClick={onDismiss}
      aria-label="Dismiss context notice"
      style={{
        border: "none",
        background: "transparent",
        color: "#92400e",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      ✕
    </button>
  </div>
);
