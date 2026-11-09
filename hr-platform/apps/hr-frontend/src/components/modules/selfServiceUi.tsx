"use client";

import React, { useEffect, useState } from "react";
import { formatDate as formatDateOf } from "../../utils/date";

// Shared look and fetch helpers for the self-service screens. The visual language matches PlainShell.

export const C = { text: "#1f2937", muted: "#4b5563", border: "#d1d5db", surface: "#ffffff", page: "#f9fafb", accent: "#1d4ed8", danger: "#b91c1c", ok: "#166534" };

export const card: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "1rem", marginBottom: "1rem" };
export const cell: React.CSSProperties = { border: `1px solid ${C.border}`, padding: "0.4rem 0.6rem", textAlign: "left", verticalAlign: "top" };
export const btn: React.CSSProperties = { minHeight: 40, padding: "0 1rem", border: `1px solid ${C.accent}`, borderRadius: 4, background: C.accent, color: "#fff", font: "inherit", cursor: "pointer" };
export const fieldStyle: React.CSSProperties = { minHeight: 40, padding: "0 0.5rem", border: `1px solid ${C.border}`, borderRadius: 4, font: "inherit", boxSizing: "border-box", width: "100%" };

export const isHr = (persona: string) => persona === "hr_admin" || persona === "hr_director";

export async function readJson<T>(res: Response): Promise<T & { error?: string }> {
  return (await res.json().catch(() => ({}))) as T & { error?: string };
}

/** Loads a GET endpoint. A null url loads nothing. `reload` runs the request again. */
export function useLoad<T>(url: string | null) {
  const [state, setState] = useState<{ data: T | null; error: string; loading: boolean }>({ data: null, error: "", loading: url !== null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (url === null) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: "" }));
    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        const data = await readJson<T>(res);
        if (cancelled) return;
        if (res.ok) setState({ data: data as T, error: "", loading: false });
        else setState({ data: null, error: data.error ?? "Could not load this section.", loading: false });
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, error: "The server could not be reached. Try again.", loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [url, tick]);
  return { ...state, reload: () => setTick((n) => n + 1) };
}

/** Reads a chosen file as base64 (no data: prefix), the form the API expects in JSON. */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const Notice: React.FC<{ kind: "ok" | "error"; text: string | null }> = ({ kind, text }) => {
  if (!text) return null;
  return (
    <p role={kind === "error" ? "alert" : "status"} style={{ color: kind === "error" ? C.danger : C.ok, margin: "0.5rem 0" }}>
      {text}
    </p>
  );
};

export const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => <p style={{ color: C.muted, margin: "0 0 0.75rem" }}>{children}</p>;

export const formatDate = (iso: string | null) => (iso ? formatDateOf(iso) : "");
