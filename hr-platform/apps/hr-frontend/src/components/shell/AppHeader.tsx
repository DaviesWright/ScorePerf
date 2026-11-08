import React, { useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { ProfileMenu } from "../common/ProfileMenu";
import { isFeatureEnabled, isViewEnabled } from "../../config/modules";
import type { ModuleViewKey } from "./AppSidebar";

interface AppHeaderProps {
  breadcrumb: string;
  apiOnline: boolean;
  onOpenCommandPalette: () => void;
  onOpenOmniAgent: () => void;
  onQuickAction?: (action: string) => void;
  onOpenPayslip?: () => void;
  isSandbox?: boolean;
  onToggleSandbox?: () => void;
  locale?: "en" | "fr";
  onToggleLocale?: () => void;
  user?: { name: string; email: string; role: string; avatarText: string };
  photoUrl?: string | null;
  onUploadPhoto?: (file: File) => Promise<string | null>;
  onRemovePhoto?: () => void;
  onNavigate?: (view: ModuleViewKey) => void;
  onSignOut?: () => void;
  isFollowPromptActive?: boolean;
  onToggleFollowPrompt?: () => void;
  onOpenFollowPromptDrawer?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  breadcrumb,
  apiOnline,
  onOpenCommandPalette,
  onOpenOmniAgent,
  onQuickAction,
  onOpenPayslip,
  isSandbox = false,
  onToggleSandbox,
  locale = "en",
  onToggleLocale,
  user,
  photoUrl,
  onUploadPhoto,
  onRemovePhoto,
  onNavigate,
  onSignOut,
  isFollowPromptActive = true,
  onToggleFollowPrompt,
  onOpenFollowPromptDrawer,
}) => {
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [internalSandbox, setInternalSandbox] = useState(false);
  const [internalLocale, setInternalLocale] = useState<"en" | "fr">("en");

  const currentSandbox = onToggleSandbox ? isSandbox : internalSandbox;
  const currentLocale = onToggleLocale ? locale : internalLocale;

  const handleSandboxClick = () => {
    if (onToggleSandbox) {
      onToggleSandbox();
    } else {
      setInternalSandbox((prev) => !prev);
    }
  };

  const handleLocaleClick = () => {
    if (onToggleLocale) {
      onToggleLocale();
    } else {
      setInternalLocale((prev) => (prev === "en" ? "fr" : "en"));
    }
  };

  return (
    <header
      style={{
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        padding: "0.65rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Left: Breadcrumbs & Section Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: typography.sizes.sm, color: colors.textMuted, fontWeight: 500 }}>
          Workspace
        </span>
        <span style={{ fontSize: typography.sizes.xs, color: colors.borderStrong }}>/</span>
        <span style={{ fontSize: typography.sizes.sm, color: colors.indigoPrimary, fontWeight: 700 }}>
          {breadcrumb}
        </span>
      </div>

      {/* Middle: Omni-Search Bar (Linear / Notion Speed Trigger) */}
      <div
        onClick={onOpenCommandPalette}
        style={{
          width: "380px",
          display: "flex",
          alignItems: "center",
          gap: "0.65rem",
          backgroundColor: colors.surfaceSubtle,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.md,
          padding: "0.45rem 0.85rem",
          cursor: "pointer",
          transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = colors.indigoBorder)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = colors.border)}
      >
        <Icons.Search size={15} color={colors.indigoAction} />
        <span style={{ flex: 1, fontSize: typography.sizes.xs, color: colors.textMuted }}>
          Search workforce, or type &quot;Payslip&quot;...
        </span>
        <span
          style={{
            fontSize: "11px",
            fontFamily: typography.fontMono,
            color: colors.indigoAccent,
            backgroundColor: "#ffffff",
            border: `1px solid ${colors.indigoBorder}`,
            borderRadius: radii.sm,
            padding: "0.1rem 0.4rem",
            fontWeight: 600,
          }}
        >
          ⌘K
        </span>
      </div>

      {/* Right: Actions, Omni-Agent & Notifications */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {/* Unified Dede AI & Follow the Prompt Floating Sidebar Trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenOmniAgent}
          title="Open Dede AI & Follow the Prompt Guided Sidebar (⌘J)"
          style={{
            borderColor: colors.indigoBorder,
            backgroundColor: colors.indigoSubtle,
            color: colors.indigoPrimary,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Icons.Sparkles size={14} color={colors.indigoAction} />
            <span style={{ fontWeight: 600 }}>Dede AI • Guide</span>
            <span
              style={{
                fontSize: "10px",
                color: colors.indigoPrimary,
                fontFamily: typography.fontMono,
                marginLeft: "2px",
                backgroundColor: "#ffffff",
                padding: "0.1rem 0.35rem",
                borderRadius: radii.sm,
                border: `1px solid ${colors.indigoBorder}`,
              }}
            >
              ⌘J
            </span>
          </span>
        </Button>

        {/* Bilingual EN/FR Language Switcher */}
        <button
          onClick={handleLocaleClick}
          title={currentLocale === "en" ? "Switch to French (Français)" : "Passer à l'anglais (English)"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            backgroundColor: colors.surfaceSubtle,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.md,
            padding: "0.3rem 0.55rem",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
            color: colors.indigoPrimary,
            transition: "background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = colors.indigoBorder)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = colors.border)}
        >
          <Icons.Globe size={13} color={colors.indigoAction} />
          <span>{currentLocale === "en" ? "🇬🇧 EN" : "🇫🇷 FR"}</span>
        </button>

        {/* Sandbox Environment Toggle */}
        <button
          onClick={handleSandboxClick}
          title={currentSandbox ? "Active in Sandbox Mode (Safe testing)" : "Active in Live Production"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            backgroundColor: currentSandbox ? "#fffbeb" : "#f0fdf4",
            border: `1px solid ${currentSandbox ? "#fde68a" : "#bbf7d0"}`,
            borderRadius: radii.md,
            padding: "0.3rem 0.6rem",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
            color: currentSandbox ? "#92400e" : "#166534",
            transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: currentSandbox ? "#d97706" : "#16a34a",
            }}
          />
          <span>{currentSandbox ? "SANDBOX 🟡" : "LIVE PROD 🟢"}</span>
        </button>
        {/* Notifications Icon Button */}
        <button
          title="Notifications"
          style={{
            position: "relative",
            background: "transparent",
            border: `1px solid ${colors.border}`,
            borderRadius: radii.md,
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: colors.textSecondary,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.surfaceSubtle)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Icons.Bell size={15} />
          <span
            style={{
              position: "absolute",
              top: "6px",
              right: "6px",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: colors.peachAction,
            }}
          />
        </button>

        {/* Quick Action Button with dropdown */}
        <div style={{ position: "relative" }}>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowQuickMenu(!showQuickMenu)}
            style={{
              backgroundColor: colors.indigoAccent,
              borderColor: colors.indigoAccent,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Icons.Plus size={14} />
              <span>Create / Jump</span>
            </span>
          </Button>

          {showQuickMenu && (
            <div
              style={{
                position: "absolute",
                top: "120%",
                right: 0,
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                boxShadow: shadows.md,
                width: "220px",
                zIndex: 35,
                padding: "0.35rem 0",
              }}
            >
              {[
                { label: "View Latest Payslip", action: "payslip", icon: Icons.FileText, highlight: true, feature: "payslip" as const },
                { label: "New Employee Record", action: "new_employee", icon: Icons.Users, view: "workforce_directory" as const },
                { label: "New Appraisal Cycle", action: "new_cycle", icon: Icons.Target, view: "performance_pms" as const },
                { label: "Log Leave Request", action: "request_leave", icon: Icons.Calendar, view: "time_and_leave" as const },
                { label: "Report IT Ticket", action: "new_ticket", icon: Icons.LifeBuoy, view: "helpdesk" as const },
              ]
                .filter((item) => {
                  if ("feature" in item && item.feature && !isFeatureEnabled(item.feature)) return false;
                  if ("view" in item && item.view && !isViewEnabled(item.view)) return false;
                  return true;
                })
                .map((item) => {
                const ItemIcon = item.icon;
                return (
                  <button
                    key={item.action}
                    onClick={() => {
                      if (item.action === "payslip") {
                        onOpenPayslip?.();
                      } else {
                        onQuickAction?.(item.action);
                      }
                      setShowQuickMenu(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.85rem",
                      textAlign: "left",
                      backgroundColor: item.highlight ? colors.emeraldSubtle : "transparent",
                      border: "none",
                      fontSize: typography.sizes.xs,
                      color: item.highlight ? colors.emeraldDark : colors.textPrimary,
                      fontWeight: item.highlight ? 600 : 400,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = item.highlight ? colors.emeraldSubtle : colors.surfaceSubtle)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = item.highlight ? colors.emeraldSubtle : "transparent")}
                  >
                    <ItemIcon size={14} color={item.highlight ? colors.emeraldDark : colors.textMuted} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {user && onUploadPhoto && onRemovePhoto && onNavigate && onSignOut && (
          <ProfileMenu
            user={user}
            photoUrl={photoUrl}
            onUploadPhoto={onUploadPhoto}
            onRemovePhoto={onRemovePhoto}
            onNavigate={onNavigate}
            onSignOut={onSignOut}
          />
        )}
      </div>
    </header>
  );
};
