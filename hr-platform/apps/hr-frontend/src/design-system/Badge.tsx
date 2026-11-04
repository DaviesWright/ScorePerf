import React from "react";
import { colors, typography, radii } from "./tokens";

export type BadgeVariant =
  | "neutral"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "okr"
  | "mbo"
  | "bsc";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
}) => {
  const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string; dotColor: string }> = {
    neutral: { bg: colors.surfaceSubtle, text: colors.textSecondary, border: colors.border, dotColor: colors.textMuted },
    success: { bg: colors.successBg, text: colors.success, border: colors.successBorder, dotColor: colors.success },
    warning: { bg: colors.warningBg, text: colors.warning, border: colors.warningBorder, dotColor: colors.warning },
    error: { bg: colors.errorBg, text: colors.error, border: colors.errorBorder, dotColor: colors.error },
    info: { bg: colors.infoBg, text: colors.info, border: colors.infoBorder, dotColor: colors.info },
    okr: { bg: colors.frameworkOkrBg, text: colors.frameworkOkr, border: colors.frameworkOkrBorder, dotColor: colors.frameworkOkr },
    mbo: { bg: colors.frameworkMboBg, text: colors.frameworkMbo, border: colors.frameworkMboBorder, dotColor: colors.frameworkMbo },
    bsc: { bg: colors.frameworkBscBg, text: colors.frameworkBsc, border: colors.frameworkBscBorder, dotColor: colors.frameworkBsc },
  };

  const style = variantStyles[variant];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        borderRadius: radii.sm,
        padding: size === "sm" ? "0.1rem 0.4rem" : "0.2rem 0.55rem",
        fontSize: size === "sm" ? "0.7rem" : typography.sizes.xs,
        fontWeight: typography.weights.medium,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      {dot && (
        <span
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            backgroundColor: style.dotColor,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
};

