"use client";

import React, { useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Badge } from "../../design-system/Badge";
import { Button } from "../../design-system/Button";
import { Icons } from "../../design-system/Icons";

export const LifecyclePortalView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"preboarding" | "offboarding">("preboarding");

  // Pre-boarding State
  const [preboardingSteps, setPreboardingSteps] = useState([
    { id: 1, title: "Sign Corporate Consulting Agreement & Non-Disclosure", done: true, tag: "Legal" },
    { id: 2, title: "Select Workstation: ThinkPad P16 Workstation vs MacBook Pro M3 Max", done: true, tag: "Hardware Fleet" },
    { id: 3, title: "Meet Your Practice Buddy: Marcus Chen (Engineering Director)", done: true, tag: "People" },
    { id: 4, title: "Read Senrab ConsulTech High-Performance Culture Playbook", done: false, tag: "Culture" },
  ]);

  // Offboarding Flight Plan State
  const [flightPlan, setFlightPlan] = useState([
    { id: 1, action: "Revoke Cloudflare Zero Trust & Worker Access", executed: true, target: "Instant Token Invalidation" },
    { id: 2, action: "Revoke Google Workspace & Microsoft Entra ID SSO", executed: true, target: "Session Terminated" },
    { id: 3, action: "Dispatch Prepaid Hardware Return Carrier Box (SEN-LAP-044)", executed: false, target: "DPD Express Courier" },
    { id: 4, action: "Calculate Final Prorated Pay + 6 Days Accrued Leave Payout", executed: false, target: "Final Total: GH₵24,650" },
    { id: 5, action: "Schedule Formal Exit Interview with Sarah Jenkins", executed: false, target: "People & Culture" },
  ]);

  const handleToggleFlightPlan = (id: number) => {
    setFlightPlan((prev) =>
      prev.map((item) => (item.id === id ? { ...item, executed: !item.executed } : item))
    );
  };

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.25rem" }}>
        <div>
          <h1
            style={{
              fontSize: typography.sizes.xl,
              fontWeight: typography.weights.bold,
              color: colors.textPrimary,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Lifecycle Portals: Pre-Boarding & Flight Plan
          </h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button
            variant={activeTab === "preboarding" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("preboarding")}
          >
            Candidate Pre-Boarding
          </Button>
          <Button
            variant={activeTab === "offboarding" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("offboarding")}
          >
            Offboarding Flight Plan
          </Button>
        </div>
      </div>

      {/* TAB 1: Pre-Boarding Portal */}
      {activeTab === "preboarding" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
          {/* Welcome Candidate Experience */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: "1.5rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: colors.brandBlue, textTransform: "uppercase" }}>
                  Candidate Onboarding Portal
                </span>
                <h2 style={{ fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.textPrimary, margin: "0.2rem 0" }}>
                  Welcome to Senrab ConsulTech, Kwesi Osei!
                </h2>
                <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
                  Role: Senior Cloud Infrastructure Consultant • Start Date: Monday, May 11, 2026
                </div>
              </div>
              <Badge variant="success" size="sm">Offer Signed ✓</Badge>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: colors.textMuted, marginBottom: "0.35rem" }}>
                <span>Day-One Readiness Checklist</span>
                <span style={{ fontWeight: 600, color: colors.textPrimary }}>3 of 4 Completed (75%)</span>
              </div>
              <div style={{ height: "6px", backgroundColor: colors.surfaceSubtle, borderRadius: radii.full, overflow: "hidden" }}>
                <div style={{ width: "75%", height: "100%", backgroundColor: colors.success }} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {preboardingSteps.map((step) => (
                <div
                  key={step.id}
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: radii.md,
                    backgroundColor: step.done ? colors.surfaceSubtle : colors.surface,
                    border: `1px solid ${step.done ? colors.borderSubtle : colors.borderStrong}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        backgroundColor: step.done ? colors.success : colors.surfaceSubtle,
                        color: step.done ? "#ffffff" : colors.textMuted,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                      }}
                    >
                      {step.done ? "✓" : "○"}
                    </div>
                    <div>
                      <div style={{ fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.textPrimary }}>
                        {step.title}
                      </div>
                      <span style={{ fontSize: "10px", color: colors.textMuted }}>Category: {step.tag}</span>
                    </div>
                  </div>
                  <Badge variant={step.done ? "success" : "neutral"} size="sm">
                    {step.done ? "Completed" : "Action Required"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Practice Buddy & Hardware Status */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Buddy Card */}
            <div
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                padding: "1.25rem",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
                Assigned Practice Buddy
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.75rem" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: colors.brandNavy,
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}
                >
                  MC
                </div>
                <div>
                  <div style={{ fontWeight: typography.weights.bold, color: colors.textPrimary, fontSize: typography.sizes.sm }}>
                    Marcus Chen
                  </div>
                  <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted }}>
                    Engineering Director • marcus.chen@senrab.com
                  </div>
                </div>
              </div>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: "0.75rem", lineHeight: 1.4 }}>
                "Hi Kwesi, thrilled to have you join our Cloud & Edge practice! I've pre-configured your Cloudflare developer seats and scheduled our first intro coffee for Monday at 10:00."
              </p>
            </div>

            {/* Workstation Shipping */}
            <div
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                padding: "1.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
                  Hardware Delivery
                </span>
                <Badge variant="info" size="sm">DPD In Transit</Badge>
              </div>
              <div style={{ fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.textPrimary, marginTop: "0.5rem" }}>
                ThinkPad P16 Gen 2 (SEN-LAP-046)
              </div>
              <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: "0.2rem" }}>
                Tracking: 1Z9999999999999999 • Estimated Delivery: Friday, May 8
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Offboarding Flight Plan */}
      {activeTab === "offboarding" && (
        <div style={{ maxWidth: "900px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.textPrimary, margin: 0 }}>
                Zero-Leak Offboarding Flight Plan
              </h3>
              <p style={{ fontSize: typography.sizes.xs, color: colors.textMuted, margin: "0.2rem 0 0 0" }}>
                Automated security revocations, hardware returns, and final severance/payout calculations.
              </p>
            </div>
            <Badge variant="warning" size="sm">Active Separation Case</Badge>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {flightPlan.map((fp) => (
              <div
                key={fp.id}
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                  padding: "1rem 1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <input
                    type="checkbox"
                    checked={fp.executed}
                    onChange={() => handleToggleFlightPlan(fp.id)}
                    style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: colors.brandBlue }}
                  />
                  <div>
                    <div style={{ fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.textPrimary }}>
                      {fp.action}
                    </div>
                    <div style={{ fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: "0.15rem" }}>
                      Target / Metric: {fp.target}
                    </div>
                  </div>
                </div>

                <Badge variant={fp.executed ? "success" : "neutral"} size="sm" dot={fp.executed}>
                  {fp.executed ? "Executed" : "Pending Action"}
                </Badge>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => alert("All offboarding checklist items verified. Final severance receipt generated and hardware return scheduled.")}
            >
              Sign-Off & Complete Flight Plan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

