"use client";

import React, { useEffect, useRef, useState } from "react";
import { colors, typography, radii, shadows } from "../../../design-system/tokens";
import { API_BASE } from "../../../lib/session";
import { LoginBackground } from "../../../components/auth/LoginBackground";

// Landing page for the emailed link: /login/verify#token=...
// The token is in the fragment, so it never reaches a server log or a Referer header. It is read once,
// removed from the address bar, exchanged for an access token, and stored in an httpOnly cookie.
export default function VerifyPage() {
  const [state, setState] = useState<"working" | "failed">("working");
  // React strict mode runs effects twice in development; the link is single use, so guard it.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    history.replaceState(null, "", window.location.pathname);
    if (!token) {
      setState("failed");
      return;
    }

    (async () => {
      try {
        const verify = await fetch(`${API_BASE}/auth/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!verify.ok) throw new Error("verify refused");
        const { accessToken, expiresIn } = (await verify.json()) as { accessToken: string; expiresIn: number };

        const store = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, expiresIn }),
        });
        if (!store.ok) throw new Error("session refused");

        try {
          sessionStorage.setItem("scoreview_show_welcome", "1");
        } catch {}
        window.location.replace("/");
      } catch {
        setState("failed");
      }
    })();
  }, []);

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
        {state === "working" ? (
          <p role="status" style={{ margin: 0, fontSize: typography.sizes.sm, color: colors.textSecondary }}>
            Signing you in…
          </p>
        ) : (
          <div role="alert">
            <h1 style={{ fontSize: typography.sizes.lg, margin: "0 0 0.5rem 0", color: colors.textPrimary }}>This link did not work</h1>
            <p style={{ margin: "0 0 1rem 0", fontSize: typography.sizes.sm, color: colors.textSecondary, lineHeight: 1.5 }}>
              It may have expired or already been used. Each sign-in link works once and lasts 10 minutes.
            </p>
            <a href="/login" style={{ color: colors.indigoAction, fontWeight: 600, fontSize: typography.sizes.sm }}>
              Request a new link
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
