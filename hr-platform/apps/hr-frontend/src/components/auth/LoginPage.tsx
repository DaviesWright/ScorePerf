"use client";

import React, { useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Icons } from "../../design-system/Icons";
import { Button } from "../../design-system/Button";
import { UserPersona } from "../shell/AppSidebar";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  persona: UserPersona;
  avatarText: string;
  department: string;
  location: string;
}

// The first entry is the default demo user, so the HR manager opens first.
export const PRESET_USERS: AuthenticatedUser[] = [
  {
    id: "EMP-003",
    name: "Richard Amoah",
    email: "richard.amoah@bscscoreview.com",
    role: "HR Manager",
    persona: "hr_admin",
    avatarText: "RA",
    department: "People Operations",
    location: "Accra Global Hub",
  },
  {
    id: "EMP-001",
    name: "Paa Kwesi Barnes",
    email: "paa.barnes@bscscoreview.com",
    role: "Managing Principal",
    persona: "hr_director",
    avatarText: "PB",
    department: "Executive Command",
    location: "Accra Global Hub",
  },
  {
    id: "EMP-002",
    name: "Benedicta Agbesi",
    email: "benedicta.agbesi@bscscoreview.com",
    role: "Lead Software Engineer (Demo Admin)",
    persona: "hr_director",
    avatarText: "BA",
    department: "Engineering & Cloud",
    location: "London Hub",
  },
  {
    id: "EMP-005",
    name: "Philip Aryee",
    email: "philip.aryee@bscscoreview.com",
    role: "Cloud Engineer (Demo Admin)",
    persona: "hr_director",
    avatarText: "PA",
    department: "Engineering & Cloud",
    location: "Windhoek Hub",
  },
  {
    id: "EMP-004",
    name: "Belinda Ama Asare",
    email: "belinda.asare@bscscoreview.com",
    role: "HR Analytics Specialist",
    persona: "line_manager",
    avatarText: "AA",
    department: "People Analytics",
    location: "Accra Global Hub",
  },
];

interface LoginPageProps {
  onLoginSuccess: (user: AuthenticatedUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [selectedUser, setSelectedUser] = useState<AuthenticatedUser>(PRESET_USERS[0]);
  const [email, setEmail] = useState<string>(PRESET_USERS[0].email);
  const [password, setPassword] = useState<string>("••••••••••••");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [workspaceDomain, setWorkspaceDomain] = useState<string>("senrab.scoreview.com");

  const handleUserSelect = (user: AuthenticatedUser) => {
    setSelectedUser(user);
    setEmail(user.email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess(selectedUser);
    }, 450);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: colors.bgApp,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Top Brand Banner */}
      <header
        style={{
          height: "64px",
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: colors.surface,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: radii.md,
              backgroundColor: colors.indigoPrimary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "15px",
              boxShadow: "0 2px 4px rgba(30, 27, 75, 0.2)",
            }}
          >
            SR
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: colors.textPrimary, letterSpacing: "-0.02em" }}>
              ScoReview HR
            </div>
            <div style={{ fontSize: "11px", color: colors.textMuted }}>Enterprise System of Intelligence</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ fontSize: "11px", color: colors.textMuted }}>
            Domain: <strong style={{ color: colors.textPrimary }}>{workspaceDomain}</strong>
          </div>
        </div>
      </header>

      {/* Main Content Form */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.5rem",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "460px",
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            border: `1px solid ${colors.border}`,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
            padding: "2.25rem 2rem",
          }}
        >
          {/* Card Title & Lock Badge */}
          <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: radii.full,
                backgroundColor: colors.indigoSubtle,
                color: colors.indigoAction,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "0.75rem",
              }}
            >
              <Icons.Lock size={22} color={colors.indigoAction} />
            </div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: colors.textPrimary, margin: "0 0 0.35rem 0" }}>
              Sign in to ScoReview HR
            </h1>
            <p style={{ fontSize: typography.sizes.xs, color: colors.textMuted, margin: 0 }}>
              Single-framework calibrated performance & workforce intelligence
            </p>
          </div>

          {/* Quick Demo Persona Switcher */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: colors.textMuted, marginBottom: "0.45rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Select Active Enterprise Persona (Demo Mode)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {PRESET_USERS.map((user) => {
                const isSelected = selectedUser.id === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleUserSelect(user)}
                    style={{
                      padding: "0.6rem 0.65rem",
                      borderRadius: radii.md,
                      border: `1px solid ${isSelected ? colors.indigoAction : colors.border}`,
                      backgroundColor: isSelected ? colors.indigoSubtle : "#ffffff",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        backgroundColor: isSelected ? colors.indigoAction : colors.surfaceSubtle,
                        color: isSelected ? "#ffffff" : colors.textPrimary,
                        fontSize: "11px",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {user.avatarText}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: colors.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: "10px", color: isSelected ? colors.indigoDark : colors.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {user.role}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: colors.textSecondary, marginBottom: "0.35rem" }}>
                Work Email Address
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    borderRadius: radii.md,
                    border: `1px solid ${colors.borderStrong}`,
                    fontSize: typography.sizes.sm,
                    color: colors.textPrimary,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = colors.borderFocus)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = colors.borderStrong)}
                />
              </div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: colors.textSecondary }}>
                  Password
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Self-service password reset email sent to your enterprise directory inbox.");
                  }}
                  style={{ fontSize: "11px", color: colors.indigoAction, textDecoration: "none", fontWeight: 500 }}
                >
                  Forgot password?
                </a>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.65rem 2.5rem 0.65rem 0.85rem",
                    borderRadius: radii.md,
                    border: `1px solid ${colors.borderStrong}`,
                    fontSize: typography.sizes.sm,
                    color: colors.textPrimary,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = colors.borderFocus)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = colors.borderStrong)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "11px",
                    color: colors.textMuted,
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "12px", color: colors.textSecondary }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: colors.indigoAction }}
                />
                <span>Remember this session</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              style={{
                width: "100%",
                backgroundColor: colors.indigoAccent,
                borderColor: colors.indigoAccent,
                padding: "0.75rem",
                fontWeight: 600,
                fontSize: typography.sizes.sm,
              }}
              disabled={isSubmitting}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <Icons.Lock size={15} />
                <span>{isSubmitting ? "Authenticating via Edge..." : `Sign In as ${selectedUser.name}`}</span>
              </span>
            </Button>
          </form>

          {/* Single Sign On Separator */}
          <div style={{ position: "relative", margin: "1.75rem 0", textAlign: "center" }}>
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", backgroundColor: colors.border }} />
            <span style={{ position: "relative", backgroundColor: colors.surface, padding: "0 0.75rem", fontSize: "11px", color: colors.textMuted, textTransform: "uppercase" }}>
              Or authenticate with SSO
            </span>
          </div>

          {/* SSO Buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
              style={{
                padding: "0.55rem",
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                backgroundColor: "#ffffff",
                fontSize: "11px",
                fontWeight: 600,
                color: colors.textSecondary,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
              }}
            >
              <span>Microsoft 365</span>
            </button>
            <button
              type="button"
              onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
              style={{
                padding: "0.55rem",
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                backgroundColor: "#ffffff",
                fontSize: "11px",
                fontWeight: 600,
                color: colors.textSecondary,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
              }}
            >
              <span>Google Workspace</span>
            </button>
          </div>
        </div>
      </main>

      {/* Security & Statutory Compliance Footer */}
      <footer
        style={{
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.surface,
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "11px",
          color: colors.textMuted,
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span>© 2026 ScoReview HR Inc. All rights reserved.</span>
          <span>•</span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <Icons.ShieldCheck size={13} color={colors.emeraldDark} />
            <span>SOC2 Type II &amp; ISO 27001 Certified</span>
          </span>
          <span>•</span>
          <span>256-Bit TLS Edge Encryption</span>
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <span>Hubs: Accra (GH) • London (UK)</span>
          <span>•</span>
          <span>Single-Framework Calibration Active</span>
        </div>
      </footer>
    </div>
  );
};

