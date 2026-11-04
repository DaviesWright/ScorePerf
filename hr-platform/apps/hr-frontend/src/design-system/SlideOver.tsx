import React from "react";
import { colors, typography, radii, shadows, transitions } from "./tokens";
import { Button } from "./Button";

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
}

export const SlideOver: React.FC<SlideOverProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footerActions,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "flex-end",
        backgroundColor: "rgba(15, 23, 42, 0.4)",
        backdropFilter: "blur(2px)",
        transition: transitions.default,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          height: "100vh",
          backgroundColor: colors.surface,
          boxShadow: shadows.drawer,
          display: "flex",
          flexDirection: "column",
          cursor: "default",
          animation: "slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.textPrimary }}>
              {title}
            </h3>
            {subtitle && (
              <p style={{ margin: "0.2rem 0 0 0", fontSize: typography.sizes.sm, color: colors.textMuted }}>
                {subtitle}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} style={{ padding: "0.3rem 0.5rem" }}>
            ✕
          </Button>
        </div>

        {/* Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.5rem",
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footerActions && (
          <div
            style={{
              padding: "1rem 1.5rem",
              borderTop: `1px solid ${colors.border}`,
              backgroundColor: colors.surfaceSubtle,
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
            }}
          >
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
};

