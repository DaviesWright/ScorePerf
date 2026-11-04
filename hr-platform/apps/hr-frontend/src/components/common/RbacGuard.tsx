"use client";

import React from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Icons } from "../../design-system/Icons";
import { Button } from "../../design-system/Button";
import { UserPersona, ModuleViewKey } from "../shell/AppSidebar";

interface RbacGuardProps {
  currentPersona: UserPersona;
  targetView: ModuleViewKey;
  requiredScope: string;
  onNavigate: (view: ModuleViewKey) => void;
  onSwitchPersona: (persona: UserPersona) => void;
}

export const RbacGuard: React.FC<RbacGuardProps> = ({
  currentPersona,
  targetView,
  requiredScope,
  onNavigate,
  onSwitchPersona,
}) => {
  const getPersonaTitle = () => {
    switch (currentPersona) {
      case "employee":
        return "Employee (Self-Service)";
      case "line_manager":
        return "Line Manager";
      case "hr_admin":
        return "HR Administrator";
      case "hr_director":
        return "HR Director";
    }
  };

  const getReason = () => {
    if (targetView === "admin_nerve_center") {
      return currentPersona === "line_manager"
        ? "Line managers have scope for 'team:read' and 'team:approve'. Company payroll details, equity pools, and executive compensation are strictly restricted under SOC2 CC6.1 and ISO 27001 A.9.4.2."
        : "Employees have scope for personal self-service only ('self:read'). Total rewards wallets and administrative automation builders require 'payroll:read' or 'executive:admin' elevation.";
    }
    if (targetView === "command_centre") {
      return "Executive workforce intelligence and organization KPI feeds are restricted to People Leads and HR Directors.";
    }
    return "This section requires elevated security permissions not granted to your current role.";
  };

  return (
    <div
      style={{
        padding: "4rem 2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "65vh",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          width: "100%",
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          border: `1px solid ${colors.borderStrong}`,
          boxShadow: shadows.modal,
          padding: "2.5rem 2rem",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Lock Shield Icon with High Contrast Deep Indigo / Peach Warning */}
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            backgroundColor: colors.peachSubtle,
            border: `1px solid ${colors.peachBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.25rem",
          }}
        >
          <Icons.ShieldCheck size={28} color={colors.peachAccent} />
        </div>

        {/* Security Badge */}
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            padding: "0.2rem 0.65rem",
            borderRadius: radii.full,
            backgroundColor: colors.indigoSubtle,
            color: colors.indigoPrimary,
            border: `1px solid ${colors.indigoBorder}`,
            marginBottom: "0.85rem",
          }}
        >
          SOC2 CC6.1 · ISO 27001 A.9.4.2 RBAC Policy
        </span>

        <h2
          style={{
            fontSize: typography.sizes.xl,
            fontWeight: 700,
            color: colors.indigoPrimary,
            letterSpacing: "-0.02em",
            margin: "0 0 0.5rem 0",
          }}
        >
          Access Restricted by Role
        </h2>

        <p
          style={{
            fontSize: typography.sizes.sm,
            color: colors.textSecondary,
            lineHeight: 1.6,
            maxWidth: "480px",
            margin: "0 0 1.5rem 0",
          }}
        >
          {getReason()}
        </p>

        {/* Permissions Metadata Card */}
        <div
          style={{
            width: "100%",
            backgroundColor: colors.surfaceSubtle,
            borderRadius: radii.md,
            border: `1px solid ${colors.border}`,
            padding: "1rem",
            marginBottom: "1.75rem",
            textAlign: "left",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
            fontSize: "12px",
          }}
        >
          <div>
            <span style={{ color: colors.textMuted, fontSize: "10px", textTransform: "uppercase", fontWeight: 600 }}>
              Current Persona
            </span>
            <div style={{ fontWeight: 600, color: colors.textPrimary, marginTop: "2px" }}>
              {getPersonaTitle()}
            </div>
          </div>
          <div>
            <span style={{ color: colors.textMuted, fontSize: "10px", textTransform: "uppercase", fontWeight: 600 }}>
              Required Scope
            </span>
            <div style={{ fontWeight: 700, color: colors.indigoAccent, fontFamily: typography.fontMono, marginTop: "2px" }}>
              {requiredScope}
            </div>
          </div>
          <div style={{ gridColumn: "span 2", borderTop: `1px dashed ${colors.border}`, paddingTop: "0.5rem" }}>
            <span style={{ color: colors.textMuted, fontSize: "11px" }}>
              Audit Status: Immutable access attempt logged with SHA-256 audit digest.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          {currentPersona === "employee" ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => onNavigate("self_service")}
              style={{ backgroundColor: colors.indigoAccent, borderColor: colors.indigoAccent }}
            >
              Return to My Self-Service (ESS)
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={() => onNavigate("time_and_leave")}
              style={{ backgroundColor: colors.indigoAccent, borderColor: colors.indigoAccent }}
            >
              Go to Team Approvals
            </Button>
          )}

          <Button
            variant="outline"
            size="md"
            onClick={() => onSwitchPersona("hr_director")}
          >
            Switch to HR Director (Simulate Elevated Access)
          </Button>
        </div>
      </div>
    </div>
  );
};

