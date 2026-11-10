"use client";

import React, { useEffect, useRef, useState } from "react";

// Dede: the ScoReview assistant. A launcher with Dede's avatar opens a chat panel. Answers come from /api/dede.
// Any part of the app can open it by dispatching the window event "dede:open".
const C = { text: "#1c1b19", muted: "#79756c", border: "#e4e1da", surface: "#ffffff", page: "#f7f6f3", accent: "#0f5c4d" };

type Message = { role: "user" | "assistant"; content: string };

const GREETING: Message = {
  role: "assistant",
  content: "Hi, I'm Dede. I can explain leave, objectives, appraisals, assets and reports, and walk you through each one.",
};

export function DedeWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("dede:open", show);
    return () => window.removeEventListener("dede:open", show);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    setError("");
    try {
      // Send only the conversation after the greeting. The route requires it to start and end with the user.
      const turns = next.slice(1);
      const res = await fetch("/api/dede", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: turns }),
      });
      const body = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
      if (!res.ok || !body.reply) throw new Error(body.error ?? "Dede could not answer right now.");
      setMessages((m) => [...m, { role: "assistant", content: body.reply as string }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dede could not answer right now.");
    } finally {
      setBusy(false);
    }
  };

  const avatar = (size: number) => (
    <img
      src="/dede/dede-avatar-light-128.webp"
      width={size}
      height={size}
      alt=""
      style={{ width: size, height: size, borderRadius: "50%", display: "block", flex: "none" }}
    />
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Dede, the ScoReview assistant"
        style={{
          position: "fixed", right: "24px", bottom: "24px", zIndex: 60, display: "flex", alignItems: "center", gap: "10px",
          padding: "6px 16px 6px 6px", border: "1px solid #0b3f35", borderRadius: "999px", background: C.accent, color: "#ffffff",
          font: "600 14px/1 Inter, sans-serif", cursor: "pointer", boxShadow: "0 6px 18px rgba(11, 63, 53, 0.25)",
        }}
      >
        {avatar(32)}
        Ask Dede
      </button>
    );
  }

  const inputEmpty = busy || draft.trim() === "";
  return (
    <section
      aria-label="Dede, ScoReview assistant"
      style={{
        position: "fixed", right: "24px", bottom: "24px", zIndex: 60, width: "min(380px, calc(100vw - 32px))", height: "min(520px, calc(100vh - 48px))",
        display: "flex", flexDirection: "column", background: C.surface, color: C.text, border: `1px solid ${C.border}`,
        borderRadius: "14px", boxShadow: "0 16px 40px rgba(28, 27, 25, 0.16)", overflow: "hidden", font: "400 14px/1.45 Inter, sans-serif",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
        {avatar(40)}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "15px" }}>Dede</div>
          <div style={{ fontSize: "12px", color: C.muted }}>AI assistant. Check important answers with HR.</div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close Dede"
          style={{ border: "none", background: "transparent", color: C.muted, font: "inherit", fontSize: "20px", lineHeight: 1, cursor: "pointer", padding: "4px 6px" }}
        >
          ×
        </button>
      </header>

      <div aria-live="polite" style={{ flex: 1, overflowY: "auto", padding: "14px", background: C.page, display: "grid", gap: "10px", alignContent: "start" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-end", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "assistant" && avatar(24)}
            <div
              style={{
                maxWidth: "85%", padding: "9px 12px", whiteSpace: "pre-wrap", fontSize: "14px",
                borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: m.role === "user" ? C.accent : C.surface, color: m.role === "user" ? "#ffffff" : C.text,
                border: m.role === "user" ? "none" : `1px solid ${C.border}`,
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && <div style={{ fontSize: "12px", color: C.muted }}>Dede is thinking…</div>}
        {error && <div role="alert" style={{ fontSize: "12px", color: "#b91c1c" }}>{error}</div>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        style={{ display: "flex", gap: "8px", padding: "10px", borderTop: `1px solid ${C.border}`, background: C.surface }}
      >
        <label htmlFor="dede-input" style={{ position: "absolute", left: "-9999px" }}>Ask Dede a question</label>
        <textarea
          id="dede-input"
          ref={inputRef}
          value={draft}
          rows={2}
          maxLength={2000}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Ask about leave, objectives, appraisals…"
          style={{ flex: 1, resize: "none", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: "8px", font: "inherit", color: C.text, background: C.surface }}
        />
        <button
          type="submit"
          disabled={inputEmpty}
          style={{
            alignSelf: "flex-end", minHeight: "36px", padding: "0 14px", border: "none", borderRadius: "8px", background: C.accent, color: "#ffffff",
            font: "inherit", fontWeight: 600, cursor: inputEmpty ? "not-allowed" : "pointer", opacity: inputEmpty ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </form>
    </section>
  );
}
