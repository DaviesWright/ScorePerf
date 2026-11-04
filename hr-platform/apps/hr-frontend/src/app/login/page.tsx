"use client";

import React, { useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Button } from "../../design-system/Button";
import { API_BASE } from "../../lib/session";
import { LoginBackground } from "../../components/auth/LoginBackground";

type Status = "idle" | "sending" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      // The API answers 202 whether or not the address has an account, so this screen can't tell either.
      if (res.status === 202) {
        setStatus("sent");
      } else if (res.status === 400) {
        setError("Enter a valid email address.");
        setStatus("error");
      } else {
        setError("Something went wrong. Try again in a moment.");
        setStatus("error");
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setStatus("error");
    }
  };

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <LoginBackground />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "420px", backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, boxShadow: shadows.lg, padding: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginBottom: "1.5rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: radii.md, backgroundColor: colors.indigoAccent, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "14px" }}>
            SR
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: colors.textPrimary, letterSpacing: "-0.02em" }}>ScoReview HR</div>
            <div style={{ fontSize: "11px", color: colors.textMuted }}>Performance and workforce intelligence</div>
          </div>
        </div>

        {status === "sent" ? (
          <div role="status">
            <h1 style={{ fontSize: typography.sizes.lg, margin: "0 0 0.5rem 0", color: colors.textPrimary }}>Check your email</h1>
            <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.sm, color: colors.textSecondary, lineHeight: 1.5 }}>
              If <strong>{email.trim()}</strong> belongs to an active account, a sign-in link is on its way. It works once and expires in 10 minutes.
            </p>
            {process.env.NODE_ENV !== "production" && (
              <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                Local development: the link is printed in the API worker log, not emailed.
              </p>
            )}
            <button
              type="button"
              onClick={() => setStatus("idle")}
              style={{ background: "none", border: "none", padding: 0, color: colors.indigoAction, fontWeight: 600, fontSize: typography.sizes.sm, cursor: "pointer" }}
            >
              Use a different address
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1 style={{ fontSize: typography.sizes.lg, margin: "0 0 1rem 0", color: colors.textPrimary }}>Sign in</h1>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: "1rem" }}>
              Work email
              <input
                type="email"
                name="email"
                autoComplete="email"
                autoFocus
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={status === "error"}
                aria-describedby={status === "error" ? "login-error" : undefined}
                placeholder="you@company.com"
                style={{ padding: "0.6rem 0.75rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm }}
              />
            </label>
            {status === "error" && (
              <p id="login-error" role="alert" style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.error }}>
                {error}
              </p>
            )}
            <Button variant="primary" size="md" type="submit" disabled={status === "sending" || email.trim() === ""} style={{ width: "100%", backgroundColor: colors.indigoAccent, borderColor: colors.indigoAccent }}>
              {status === "sending" ? "Sending…" : "Email me a sign-in link"}
            </Button>
            <p style={{ margin: "1rem 0 0 0", fontSize: typography.sizes.xs, color: colors.textMuted, lineHeight: 1.5 }}>
              No password needed. We email you a one-time link.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
