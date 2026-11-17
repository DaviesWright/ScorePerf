import React, { useState } from "react";
import { colors, typography, radii, shadows, surfaceAccent, SurfaceKind } from "../../design-system/tokens";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";
import { ProfileMenu } from "../common/ProfileMenu";
import { isFeatureEnabled, isViewEnabled } from "../../config/modules";
import type { ModuleViewKey, UserPersona } from "./AppSidebar";
import {
  EXPERIENCE_META,
  ExperienceContext,
  INITIAL_ARCH_AUDIT_LOG,
  resolveApproverFromGraph,
  resolveCycleManagerAsOf,
  resolveScope,
} from "../../domain/orgCore";

interface AppHeaderProps {
  breadcrumb: string;
  apiOnline: boolean;
  persona?: UserPersona;
  onSelectPersona?: (persona: UserPersona) => void;
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
  persona,
  onSelectPersona,
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
  const [showScopeInspector, setShowScopeInspector] = useState(false);
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

  const surfaceKind: SurfaceKind =
    persona === "employee" ? "ess" : persona === "line_manager" ? "manager" : "hr";

  const activeExperience: ExperienceContext =
    persona === "employee" ? "ESS" : persona === "line_manager" ? "MSS" : "HRMS";
  const expMeta = EXPERIENCE_META[activeExperience];
  const liveScope = resolveScope("EMP-PKB-001", "2026-11-17");
  const cycleStartOwner = resolveCycleManagerAsOf("EMP-AO-006", "2026-04-01");
  const currentOwner = resolveCycleManagerAsOf("EMP-AO-006", "2026-11-17");
  const escalationDemo = resolveApproverFromGraph("EMP-AO-006", "2026-11-17");

  return (
    <header
      data-surface={surfaceKind}
      style={{
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        borderLeft: surfaceAccent[surfaceKind],
        padding: "0.65rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Left: URL Namespace, Experience Badge & Breadcrumb (§3.4, FR-ARCH-001, FR-ARCH-006) */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span
          style={{
            fontSize: "11px",
            fontFamily: typography.fontMono,
            fontWeight: 700,
            padding: "0.15rem 0.45rem",
            borderRadius: radii.sm,
            backgroundColor: colors.indigoSubtle,
            color: colors.indigoPrimary,
            border: `1px solid ${colors.indigoBorder}`,
          }}
          title={expMeta.subtitle}
        >
          {expMeta.namespace}
        </span>
        <span style={{ fontSize: typography.sizes.xs, color: colors.borderStrong }}>/</span>
        <span style={{ fontSize: typography.sizes.sm, color: colors.indigoPrimary, fontWeight: 700 }}>
          {breadcrumb}
        </span>
      </div>

      {/* Middle: Scoped Omni-Search Bar (§4 Shared Services Layer — Scoped Search) */}
      <div
        onClick={onOpenCommandPalette}
        style={{
          width: "360px",
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
          {activeExperience === "ESS"
            ? "Search my own records (Leave, Goals, Skills)..."
            : activeExperience === "MSS"
            ? `Search my team subtree (${liveScope.subtree.length} reports)...`
            : "Search company records, policies, cycles & audit..."}
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

      {/* Right: Experience Switcher (§3.4: My Work [ESS] · My Team [MSS] · HR [HRMS]), Scope Inspector, Dede AI */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", position: "relative" }}>
        <div
          role="group"
          aria-label="Experience Switcher (ESS, MSS, HRMS)"
          style={{
            display: "inline-flex",
            alignItems: "center",
            backgroundColor: colors.surfaceSubtle,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.md,
            padding: "2px",
            gap: "2px",
          }}
          title="Switch experience context: My Work (ESS) · My Team (MSS) · HR (HRMS)"
        >
          <span style={{ fontSize: "10px", fontWeight: 700, color: colors.textMuted, padding: "0 0.4rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Context:
          </span>
          <button
            type="button"
            title="ESS — What I do for myself (/ess)"
            onClick={() => {
              onSelectPersona?.("employee");
              if (typeof window !== "undefined") window.history.replaceState(null, "", "#/ess");
            }}
            style={{
              padding: "0.24rem 0.6rem",
              borderRadius: radii.sm,
              border: "none",
              fontSize: "11px",
              fontWeight: persona === "employee" ? 700 : 500,
              backgroundColor: persona === "employee" ? colors.emeraldDark : "transparent",
              color: persona === "employee" ? "#ffffff" : colors.textSecondary,
              cursor: "pointer",
            }}
          >
            My Work (ESS)
          </button>
          <button
            type="button"
            title="MSS — What I do for my team (/mss)"
            onClick={() => {
              onSelectPersona?.("line_manager");
              if (typeof window !== "undefined") window.history.replaceState(null, "", "#/mss");
            }}
            style={{
              padding: "0.24rem 0.6rem",
              borderRadius: radii.sm,
              border: "none",
              fontSize: "11px",
              fontWeight: persona === "line_manager" ? 700 : 500,
              backgroundColor: persona === "line_manager" ? colors.indigoAction : "transparent",
              color: persona === "line_manager" ? "#ffffff" : colors.textSecondary,
              cursor: "pointer",
            }}
          >
            My Team (MSS)
          </button>
          <button
            type="button"
            title="HRMS — What HR administers & governs (/hrms)"
            onClick={() => {
              onSelectPersona?.("hr_admin");
              if (typeof window !== "undefined") window.history.replaceState(null, "", "#/hrms");
            }}
            style={{
              padding: "0.24rem 0.6rem",
              borderRadius: radii.sm,
              border: "none",
              fontSize: "11px",
              fontWeight: persona === "hr_admin" || persona === "hr_director" ? 700 : 500,
              backgroundColor: persona === "hr_admin" || persona === "hr_director" ? colors.textPrimary : "transparent",
              color: persona === "hr_admin" || persona === "hr_director" ? "#ffffff" : colors.textSecondary,
              cursor: "pointer",
            }}
          >
            HR (HRMS)
          </button>
        </div>

        {/* Org-Graph Scope & Architecture Inspector Trigger */}
        <button
          type="button"
          onClick={() => setShowScopeInspector((v) => !v)}
          title="Inspect resolved org-graph scope, employment edges, workflow routing & audit log"
          style={{
            padding: "0.28rem 0.55rem",
            borderRadius: radii.sm,
            border: `1px solid ${colors.border}`,
            backgroundColor: showScopeInspector ? colors.indigoSubtle : colors.surface,
            color: colors.textSecondary,
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Icons.GitBranch size={13} color={colors.indigoAction} />
          <span>
            Scope:{" "}
            {activeExperience === "ESS"
              ? "SELF"
              : activeExperience === "MSS"
              ? `TEAM (${liveScope.subtree.length})`
              : "COMPANY"}
          </span>
        </button>

        {showScopeInspector && (
          <div
            role="dialog"
            aria-label="Organisational Core & Scope Resolver Inspector"
            style={{
              position: "absolute",
              top: "2.6rem",
              right: 0,
              width: "440px",
              backgroundColor: colors.surface,
              border: `1px solid ${colors.borderStrong}`,
              borderRadius: radii.md,
              boxShadow: shadows.lg,
              padding: "1rem",
              zIndex: 100,
              fontSize: typography.sizes.xs,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <strong style={{ color: colors.textPrimary }}>
                Shared Organisational Core · Scope Resolver (§3.2)
              </strong>
              <button
                type="button"
                onClick={() => setShowScopeInspector(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ padding: "0.5rem", backgroundColor: colors.surfaceSubtle, borderRadius: radii.sm }}>
                <div>
                  <strong>Active Experience:</strong> {expMeta.switcherLabel} (<code>{expMeta.namespace}</code>)
                </div>
                <div>
                  <strong>resolve_scope(&quot;EMP-PKB-001&quot;, &quot;2026-11-17&quot;):</strong> Direct: [{liveScope.direct.join(", ")}] · Subtree: {liveScope.subtree.length} reports ({liveScope.resolvedInMs}ms &lt; 50ms NFR-ARCH-001)
                </div>
              </div>

              <div style={{ padding: "0.5rem", backgroundColor: colors.surfaceSubtle, borderRadius: radii.sm }}>
                <strong>TC-ARCH-08 (Mid-Cycle Transfer Ownership):</strong>
                <div style={{ color: colors.textSecondary, marginTop: "2px" }}>
                  Abena Osei (<code>EMP-AO-006</code>) transferred 2026-05-16. Cycle start (2026-04-01) manager:{" "}
                  <strong>{cycleStartOwner.managerName}</strong> (<code>{cycleStartOwner.edgeId}</code>) vs current:{" "}
                  <strong>{currentOwner.managerName}</strong>. Review ownership preserved!
                </div>
              </div>

              <div style={{ padding: "0.5rem", backgroundColor: colors.surfaceSubtle, borderRadius: radii.sm }}>
                <strong>TC-ARCH-09 (Manager On-Leave Escalation):</strong>
                <div style={{ color: colors.textSecondary, marginTop: "2px" }}>
                  Approver for <code>EMP-AO-006</code>: <strong>{escalationDemo.approverName}</strong> —{" "}
                  {escalationDemo.escalationReason}
                </div>
              </div>

              <div style={{ padding: "0.5rem", backgroundColor: colors.surfaceSubtle, borderRadius: radii.sm }}>
                <strong>TC-ARCH-12 (Scoped Audit Log Latest Entry):</strong>
                <div style={{ color: colors.textSecondary, marginTop: "2px", fontFamily: typography.fontMono }}>
                  {INITIAL_ARCH_AUDIT_LOG[0].id} · ctx={INITIAL_ARCH_AUDIT_LOG[0].context} · scope={INITIAL_ARCH_AUDIT_LOG[0].scopeType} · {INITIAL_ARCH_AUDIT_LOG[0].action}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Unified Dede AI & Assistant Trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.dispatchEvent(new Event("dede:open"))}
          title="Open Dede, the ScoReview AI assistant"
          style={{
            borderColor: colors.indigoBorder,
            backgroundColor: colors.indigoSubtle,
            color: colors.indigoPrimary,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Icons.Sparkles size={14} color={colors.indigoAction} />
            <span style={{ fontWeight: 600 }}>Ask Dede</span>
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
          title={currentSandbox ? "Sandbox mode: safe for testing" : "Live mode"}
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
          <span>{currentSandbox ? "Sandbox" : "Live"}</span>
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
