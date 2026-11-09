"use client";

import React from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Icons } from "../../design-system/Icons";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { AuthenticatedUser } from "./LoginPage";
import { DepartmentBrief } from "./DepartmentBrief";
import { formatDate } from "../../utils/date";
import { UserAvatar } from "../common/UserAvatar";
import { PhotoUploadButton } from "../common/PhotoUploadButton";
import type { ModuleViewKey } from "../shell/AppSidebar";

interface LoginWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthenticatedUser;
  photoUrl?: string | null;
  onUploadPhoto: (file: File) => Promise<string | null>;
  onNavigate: (view: ModuleViewKey) => void;
  onOpenOmniAgent: () => void;
  onStartFollowPrompt?: () => void;
}

export const LoginWelcomeModal: React.FC<LoginWelcomeModalProps> = ({
  isOpen,
  onClose,
  user,
  photoUrl,
  onUploadPhoto,
  onNavigate,
  onOpenOmniAgent,
  onStartFollowPrompt,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "1rem",
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Welcome, ${user.name}`}
        style={{
          width: "100%",
          maxWidth: "760px",
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.lg,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.75rem",
            background: "linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)",
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
              <UserAvatar name={user.name} initials={user.avatarText} photoUrl={photoUrl} size={64} />
              <PhotoUploadButton
                label={photoUrl ? "Change photo" : "Add photo"}
                onUpload={onUploadPhoto}
                buttonStyle={{ padding: "0.2rem 0.55rem", fontSize: "11px" }}
              />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: colors.indigoAction, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Icons.Sparkles size={14} color={colors.indigoAction} />
                  <span>Daily Briefing • {formatDate(new Date())}</span>
                </span>
                <Badge variant="success" size="sm">Session Authenticated</Badge>
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                Welcome back, {user.name}!
              </h2>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textMuted, margin: "0.25rem 0 0 0" }}>
                {[user.role, user.department, user.location && `(${user.location})`].filter(Boolean).join(" • ")}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: colors.textMuted,
              padding: "0.25rem",
              borderRadius: radii.sm,
            }}
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "1.5rem 1.75rem", maxHeight: "70vh", overflowY: "auto" }}>
          <DepartmentBrief
            user={user}
            hasPhoto={!!photoUrl}
            onNavigate={(view) => {
              onClose();
              onNavigate(view);
            }}
          />
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "1rem 1.75rem",
            backgroundColor: colors.surface,
            borderTop: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => {
              onClose();
              if (onStartFollowPrompt) {
                onStartFollowPrompt();
              } else {
                onOpenOmniAgent();
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              background: "none",
              border: `1px solid ${colors.indigoBorder}`,
              backgroundColor: colors.indigoSubtle,
              color: colors.indigoPrimary,
              padding: "0.5rem 0.85rem",
              borderRadius: radii.md,
              fontSize: typography.sizes.xs,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Icons.Sparkles size={14} color={colors.indigoAction} />
            <span>Open Dede AI &amp; Guided Prompts (⌘J)</span>
          </button>

          <Button
            variant="primary"
            size="md"
            onClick={onClose}
            style={{
              backgroundColor: colors.indigoAccent,
              borderColor: colors.indigoAccent,
              fontWeight: 600,
            }}
          >
            <span>Continue to Command Centre →</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
