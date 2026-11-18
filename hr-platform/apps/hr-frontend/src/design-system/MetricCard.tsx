import React from "react";
import { colors, typography, radii, shadows } from "./tokens";

export type MetricCardVariant = "indigo" | "emerald" | "peach" | "blue" | "purple" | "cyan" | "rose" | "neutral";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: MetricCardVariant;
  onClick?: () => void;
  /** Highlights the card as the active drill-down. */
  selected?: boolean;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
}

const VARIANT_STYLES: Record<MetricCardVariant, {
  accent: string;
  bgGradient: string;
  borderColor: string;
  hoverBorder: string;
  iconBg: string;
  iconColor: string;
}> = {
  indigo: {
    accent: "#4f46e5",
    bgGradient: "linear-gradient(180deg, rgba(99, 102, 241, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)",
    borderColor: "rgba(99, 102, 241, 0.28)",
    hoverBorder: "#4f46e5",
    iconBg: "rgba(99, 102, 241, 0.12)",
    iconColor: "#4338ca",
  },
  emerald: {
    accent: "#10b981",
    bgGradient: "linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)",
    borderColor: "rgba(16, 185, 129, 0.28)",
    hoverBorder: "#059669",
    iconBg: "rgba(16, 185, 129, 0.14)",
    iconColor: "#047857",
  },
  peach: {
    accent: "#f97316",
    bgGradient: "linear-gradient(180deg, rgba(249, 115, 22, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)",
    borderColor: "rgba(249, 115, 22, 0.28)",
    hoverBorder: "#ea580c",
    iconBg: "rgba(249, 115, 22, 0.12)",
    iconColor: "#c2410c",
  },
  blue: {
    accent: "#0284c7",
    bgGradient: "linear-gradient(180deg, rgba(14, 165, 233, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)",
    borderColor: "rgba(14, 165, 233, 0.28)",
    hoverBorder: "#0284c7",
    iconBg: "rgba(14, 165, 233, 0.12)",
    iconColor: "#0369a1",
  },
  purple: {
    accent: "#9333ea",
    bgGradient: "linear-gradient(180deg, rgba(168, 85, 247, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)",
    borderColor: "rgba(168, 85, 247, 0.28)",
    hoverBorder: "#7e22ce",
    iconBg: "rgba(168, 85, 247, 0.12)",
    iconColor: "#6b21a8",
  },
  cyan: {
    accent: "#06b6d4",
    bgGradient: "linear-gradient(180deg, rgba(6, 182, 212, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)",
    borderColor: "rgba(6, 182, 212, 0.28)",
    hoverBorder: "#0891b2",
    iconBg: "rgba(6, 182, 212, 0.12)",
    iconColor: "#0e7490",
  },
  rose: {
    accent: "#f43f5e",
    bgGradient: "linear-gradient(180deg, rgba(244, 63, 94, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)",
    borderColor: "rgba(244, 63, 94, 0.28)",
    hoverBorder: "#e11d48",
    iconBg: "rgba(244, 63, 94, 0.12)",
    iconColor: "#be123c",
  },
  neutral: {
    accent: "#64748b",
    bgGradient: "linear-gradient(180deg, rgba(241, 245, 249, 0.6) 0%, #ffffff 100%)",
    borderColor: colors.border,
    hoverBorder: colors.borderStrong,
    iconBg: "rgba(100, 116, 139, 0.1)",
    iconColor: "#334155",
  },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  badge,
  icon,
  variant = "neutral",
  onClick,
  selected = false,
  trend,
}) => {
  const currentVariant = VARIANT_STYLES[variant] || VARIANT_STYLES.neutral;

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? selected : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={{
        background: currentVariant.bgGradient,
        backgroundColor: colors.surface,
        outline: selected ? `2px solid ${currentVariant.accent}` : "none",
        outlineOffset: "2px",
        border: `1px solid ${currentVariant.borderColor}`,
        borderTop: `3px solid ${currentVariant.accent}`,
        borderRadius: radii.md,
        padding: "1.1rem 1.25rem",
        cursor: onClick ? "pointer" : "default",
        transition: "background-color 180ms cubic-bezier(0.2, 0, 0, 1), border-color 180ms cubic-bezier(0.2, 0, 0, 1), box-shadow 180ms cubic-bezier(0.2, 0, 0, 1), color 180ms cubic-bezier(0.2, 0, 0, 1)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: shadows.xs,
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = currentVariant.hoverBorder;
          e.currentTarget.style.boxShadow = shadows.sm;
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = currentVariant.borderColor;
          e.currentTarget.style.borderTop = `3px solid ${currentVariant.accent}`;
          e.currentTarget.style.boxShadow = shadows.xs;
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.55rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {icon && (
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: radii.sm,
                backgroundColor: currentVariant.iconBg,
                color: currentVariant.iconColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {icon}
            </div>
          )}
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: currentVariant.iconColor,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {label}
          </span>
        </div>
        {badge && <div>{badge}</div>}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.25rem" }}>
        <span
          style={{
            fontSize: "1.75rem", // 28px
            fontWeight: 800,
            color: colors.textPrimary,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          {value}
        </span>
        {trend && (
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: trend.isPositive ? "#059669" : "#dc2626",
            }}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtext && (
        <span
          style={{
            fontSize: typography.sizes.xs,
            color: colors.textSecondary,
            lineHeight: 1.4,
          }}
        >
          {subtext}
        </span>
      )}
    </div>
  );
};
