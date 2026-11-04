import React from "react";
import { colors, typography, radii, transitions, shadows } from "./tokens";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "secondary",
  size = "md",
  icon,
  iconPosition = "left",
  fullWidth = false,
  disabled,
  style,
  ...props
}) => {
  const [hovered, setHovered] = React.useState(false);

  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: hovered ? colors.brandNavyLight : colors.brandNavy,
          color: colors.textInverse,
          border: `1px solid ${colors.brandNavy}`,
          boxShadow: shadows.xs,
        };
      case "secondary":
        return {
          backgroundColor: hovered ? colors.surfaceSubtle : colors.surface,
          color: colors.textPrimary,
          border: `1px solid ${colors.borderStrong}`,
          boxShadow: shadows.xs,
        };
      case "outline":
        return {
          backgroundColor: hovered ? colors.brandBlueSubtle : "transparent",
          color: colors.brandBlue,
          border: `1px solid ${colors.brandBlue}`,
        };
      case "ghost":
        return {
          backgroundColor: hovered ? colors.surfaceSubtle : "transparent",
          color: colors.textSecondary,
          border: "1px solid transparent",
        };
      case "destructive":
        return {
          backgroundColor: hovered ? "#991b1b" : colors.error,
          color: colors.textInverse,
          border: `1px solid ${colors.error}`,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return { padding: "0.3rem 0.65rem", fontSize: typography.sizes.xs };
      case "md":
        return { padding: "0.45rem 0.9rem", fontSize: typography.sizes.base };
      case "lg":
        return { padding: "0.6rem 1.2rem", fontSize: typography.sizes.md };
    }
  };

  const vStyles = getVariantStyles();
  const sStyles = getSizeStyles();

  return (
    <button
      {...props}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.45rem",
        borderRadius: radii.md,
        fontWeight: typography.weights.medium,
        fontFamily: typography.fontFamily,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: transitions.default,
        width: fullWidth ? "100%" : "auto",
        ...vStyles,
        ...sStyles,
        ...style,
      }}
    >
      {icon && iconPosition === "left" && <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>}
      {children}
      {icon && iconPosition === "right" && <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>}
    </button>
  );
};

