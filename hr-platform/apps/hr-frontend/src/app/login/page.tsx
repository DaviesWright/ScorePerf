"use client";

import React, { useState } from "react";
import { colors, typography, radii, shadows } from "../../design-system/tokens";
import { Button } from "../../design-system/Button";
import { API_BASE } from "../../lib/session";

// Sign-in screen. Reviewers give their details, which are recorded in the background, then go straight to the demo
// persona picker. The email sign-in link stays available as a second option.

type Status = "idle" | "sending" | "sent" | "error";

const field = { display: "flex", flexDirection: "column" as const, gap: "0.35rem", fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: "0.9rem" };
const input = { padding: "0.6rem 0.75rem", borderRadius: radii.md, border: `1px solid ${colors.border}`, fontSize: typography.sizes.sm, font: "inherit" };

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  // Records the reviewer, then sends them to the demo persona picker.
  const handleReviewer = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/reviewer-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), fullName: fullName.trim(), company: company.trim(), jobTitle: jobTitle.trim(), phone: phone.trim() }),
      });
      if (res.status === 201) {
        window.location.assign("/?demo=1");
        return;
      }
      setError(res.status === 400 ? "Check your details: a valid email, your name, and your company are required." : "Something went wrong. Try again in a moment.");
      setStatus("error");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setStatus("error");
    }
  };

  // Email sign-in link. The API answers 202 whether or not the address has an account.
  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
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
        backgroundColor: colors.bgApp,
        fontFamily: typography.fontFamily,
      }}
    >
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "440px", backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.lg, boxShadow: shadows.lg, padding: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginBottom: "1.5rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: radii.md, backgroundColor: colors.indigoAccent, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "14px" }}>
            SR
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: typography.weights.semibold, color: colors.textPrimary }}>ScoReview HR</div>
            <div style={{ fontSize: "11px", color: colors.textMuted }}>Performance and workforce intelligence</div>
          </div>
        </div>

        {status === "sent" ? (
          <div role="status">
            <h1 style={{ fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, margin: "0 0 0.5rem 0", color: colors.textPrimary }}>Check your email</h1>
            <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.sm, color: colors.textSecondary, lineHeight: 1.5 }}>
              If <strong>{email.trim()}</strong> belongs to an active account, a sign-in link is on its way. It works once and expires in 10 minutes.
            </p>
            {process.env.NODE_ENV !== "production" && (
              <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>
                Local development: the link is printed in the API worker log, not emailed.
              </p>
            )}
            <button type="button" onClick={() => setStatus("idle")} style={{ background: "none", border: "none", padding: 0, color: colors.indigoAction, fontWeight: 600, fontSize: typography.sizes.sm, cursor: "pointer" }}>
              Use a different address
            </button>
          </div>
        ) : (
          <form onSubmit={handleReviewer}>
            <h1 style={{ fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, margin: "0 0 0.25rem 0", color: colors.textPrimary }}>Review ScoReview HR</h1>
            <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.textMuted, lineHeight: 1.5 }}>
              Tell us who you are, then choose a demo persona to explore.
            </p>
            <label style={field}>
              Full name *
              <input name="fullName" autoComplete="name" required minLength={2} maxLength={120} value={fullName} onChange={(e) => setFullName(e.target.value)} style={input} />
            </label>
            <label style={field}>
              Company *
              <input name="company" autoComplete="organization" required minLength={2} maxLength={160} value={company} onChange={(e) => setCompany(e.target.value)} style={input} />
            </label>
            <label style={field}>
              Work email *
              <input type="email" name="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" style={input} />
            </label>
            <label style={field}>
              Job title
              <input name="jobTitle" autoComplete="organization-title" maxLength={120} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} style={input} />
            </label>
            <label style={{ ...field, marginBottom: "1rem" }}>
              Phone (optional)
              <input type="tel" name="phone" autoComplete="tel" maxLength={40} value={phone} onChange={(e) => setPhone(e.target.value)} style={input} />
            </label>
            {status === "error" && (
              <p id="login-error" role="alert" style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.xs, color: colors.error }}>
                {error}
              </p>
            )}
            <Button variant="primary" size="md" type="submit" disabled={status === "sending"} style={{ width: "100%", backgroundColor: colors.indigoAccent, borderColor: colors.indigoAccent }}>
              {status === "sending" ? "Opening the demo…" : "Continue to the demo"}
            </Button>
          </form>
        )}

        {status !== "sent" && (
          <form onSubmit={handleLink} style={{ marginTop: "1.25rem", borderTop: `1px solid ${colors.border}`, paddingTop: "1rem" }}>
            <p style={{ margin: "0 0 0.5rem 0", fontSize: typography.sizes.xs, color: colors.textMuted }}>Already have access? Use the email you were invited with.</p>
            <Button variant="secondary" size="md" type="submit" disabled={status === "sending" || email.trim() === ""} style={{ width: "100%" }}>
              Email me a sign-in link
            </Button>
          </form>
        )}
        <p style={{ margin: "1.5rem 0 0 0", fontSize: typography.sizes.xs, textAlign: "center" }}>
          <a href="/?demo=1" style={{ color: colors.textMuted, fontWeight: typography.weights.regular, textDecoration: "underline", textUnderlineOffset: "2px" }}>Skip to the demo personas</a>
        </p>
      </div>
    </main>
  );
}
