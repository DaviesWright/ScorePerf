"use client";

import React, { useEffect, useMemo, useState } from "react";
import { formatDate } from "../../utils/date";

// Home-page panels on the Dashboard: announcements (HR admins can post and archive), birthdays in the next 14
// days, and the staff directory. Live data only; the demo login has no API behind it.

interface Announcement {
  id: number;
  title: string;
  body: string;
  publishedOn: string;
  expiresOn: string | null;
}
interface Birthday {
  employeeName: string;
  department: string | null;
  jobTitle: string;
  date: string;
  daysUntil: number;
}
interface Person {
  id: number;
  name: string;
  email: string;
  jobTitle: string;
  department: string | null;
}
interface HomeData {
  today: string;
  canPost: boolean;
  announcements: Announcement[];
  birthdays: Birthday[];
  directory: Person[];
}

const C = { text: "#1f2937", muted: "#4b5563", border: "#d1d5db", surface: "#ffffff", page: "#f9fafb", accent: "#1d4ed8", danger: "#b91c1c" };

const S = {
  h2: { margin: "1.5rem 0 0.5rem", fontSize: "17px", color: "#4338ca" } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse", background: C.surface, border: `1px solid ${C.border}` } as React.CSSProperties,
  th: { textAlign: "left", padding: "0.6rem 0.75rem", borderBottom: `1px solid ${C.border}`, background: "#eef2ff", color: "#3730a3", fontWeight: 600 } as React.CSSProperties,
  td: { padding: "0.6rem 0.75rem", borderBottom: `1px solid ${C.border}`, verticalAlign: "top" } as React.CSSProperties,
  btn: { minHeight: "40px", padding: "0 0.9rem", border: `1px solid ${C.border}`, borderRadius: "4px", background: C.surface, color: C.text, font: "inherit", cursor: "pointer" } as React.CSSProperties,
  primary: { minHeight: "44px", padding: "0 1.2rem", border: `1px solid ${C.accent}`, borderRadius: "4px", background: C.accent, color: "#ffffff", font: "inherit", cursor: "pointer" } as React.CSSProperties,
  input: { minHeight: "40px", padding: "0.4rem 0.6rem", border: `1px solid ${C.border}`, borderRadius: "4px", font: "inherit", background: C.surface } as React.CSSProperties,
  field: { display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "0.75rem" } as React.CSSProperties,
  note: { color: C.muted, margin: "0.25rem 0 0" } as React.CSSProperties,
  panel: { border: `1px solid ${C.border}`, background: C.surface, padding: "1rem", marginBottom: "0.5rem" } as React.CSSProperties,
};

const Caption = ({ children }: { children: string }) => <caption style={{ textAlign: "left", position: "absolute", left: "-9999px" }}>{children}</caption>;
const fmt = (iso: string) => formatDate(iso);
const fmtDay = (iso: string) => formatDate(iso, { format: "dayMonth" });

export const HomePanels: React.FC<{ realSession: boolean }> = ({ realSession }) => {
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(realSession);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ title: "", body: "", expiresOn: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (!realSession) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/hr/home", { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error ?? `Could not load the home page (${r.status}).`);
        return body as HomeData;
      })
      .then((d) => !cancelled && (setData(d), setError("")))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Could not load the home page."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [realSession, reloadKey]);

  const people = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = data?.directory ?? [];
    return q ? list.filter((p) => `${p.name} ${p.jobTitle} ${p.department ?? ""} ${p.email}`.toLowerCase().includes(q)) : list;
  }, [data, query]);

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const res = await fetch("/api/hr/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.title, body: form.body, expiresOn: form.expiresOn || null }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setFormError(body.error ?? "Could not post the announcement.");
    setForm({ title: "", body: "", expiresOn: "" });
    setReloadKey((n) => n + 1);
  };

  const archive = async (id: number) => {
    setBusyId(id);
    const res = await fetch(`/api/hr/announcements/${id}/archive`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return setError(body.error ?? "Could not end the announcement.");
    }
    setReloadKey((n) => n + 1);
  };

  if (!realSession) return null;

  return (
    <>
      <LoadingLine loading={loading && !data} error={error} />
      {data && (
        <>
          <h2 style={{ ...S.h2, marginTop: "1rem" }}>Announcements</h2>
          {data.announcements.length === 0 ? (
            <p style={S.note}>No announcements.</p>
          ) : (
            data.announcements.map((a) => (
              <article key={a.id} style={{ ...S.panel, background: "#fafaff", borderLeft: "5px solid #7c3aed" }} aria-label={a.title}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <strong>{a.title}</strong>
                  <span style={{ color: C.muted }}>
                    Posted {fmt(a.publishedOn)}
                    {a.expiresOn ? ` · until ${fmt(a.expiresOn)}` : ""}
                  </span>
                </div>
                {a.body && <p style={{ margin: "0.5rem 0 0", whiteSpace: "pre-wrap" }}>{a.body}</p>}
                {data.canPost && (
                  <button type="button" style={{ ...S.btn, marginTop: "0.5rem" }} disabled={busyId === a.id} onClick={() => archive(a.id)} aria-label={`End announcement ${a.title}`}>
                    {busyId === a.id ? "Ending…" : "End today"}
                  </button>
                )}
              </article>
            ))
          )}

          {data.canPost && (
            <form onSubmit={post} style={{ ...S.panel, maxWidth: "620px", marginTop: "0.75rem" }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "16px" }}>Post an announcement</h3>
              <label style={S.field}>
                Title *
                <input required minLength={3} maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={S.input} />
              </label>
              <label style={S.field}>
                Message
                <textarea maxLength={5000} rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} style={{ ...S.input, minHeight: "80px" }} />
              </label>
              <label style={S.field}>
                Show until (optional)
                <input type="date" min={data.today} value={form.expiresOn} onChange={(e) => setForm({ ...form, expiresOn: e.target.value })} style={S.input} />
              </label>
              {formError && <p role="alert" style={{ color: C.danger, fontWeight: 600 }}>{formError}</p>}
              <button type="submit" style={S.primary} disabled={saving}>{saving ? "Posting…" : "Post announcement"}</button>
            </form>
          )}

          <h2 style={S.h2}>Birthdays in the next 7 days</h2>
          {data.birthdays.length === 0 ? (
            <p style={S.note}>No birthdays in the next 7 days.</p>
          ) : (
            <table style={S.table}>
              <Caption>Birthdays in the next 7 days</Caption>
              <thead>
                <tr>{["Employee", "Job title", "Department", "Date"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.birthdays.map((b) => (
                  <tr key={`${b.employeeName}-${b.date}`}>
                    <td style={S.td}><strong style={{ color: "#be185d" }}>{b.employeeName}</strong> 🎂</td>
                    <td style={S.td}>{b.jobTitle}</td>
                    <td style={S.td}>{b.department ?? "-"}</td>
                    <td style={S.td}>{b.daysUntil === 0 ? "Today" : fmtDay(b.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2 style={S.h2}>Staff directory</h2>
          <label style={{ ...S.field, maxWidth: "360px" }}>
            Search by name, job title, department or email
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} style={S.input} />
          </label>
          <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <Caption>Staff directory</Caption>
            <thead>
              <tr>{["Name", "Job title", "Department", "Email"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td style={S.td}><strong style={{ color: "#0f766e" }}>{p.name}</strong></td>
                  <td style={S.td}>{p.jobTitle}</td>
                  <td style={S.td}>{p.department ?? "-"}</td>
                  <td style={S.td}><a href={`mailto:${p.email}`} style={{ color: C.accent }}>{p.email}</a></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {people.length === 0 && <p style={S.note}>No one matches that search.</p>}
        </>
      )}
    </>
  );
};

// Your notifications: leave and trip events for you to act on or be aware of. Marking one read or all read.
interface Notice {
  id: number;
  kind: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export const NotificationsPanel: React.FC<{ realSession: boolean }> = ({ realSession }) => {
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!realSession) return;
    let cancelled = false;
    fetch("/api/hr/notifications", { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error ?? "Could not load notifications.");
        if (!cancelled) {
          setItems(body.results ?? []);
          setUnread(body.unread ?? 0);
        }
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Could not load notifications."));
    return () => {
      cancelled = true;
    };
  }, [realSession, tick]);

  const markAll = async () => {
    await fetch("/api/hr/notifications/read-all", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setTick((n) => n + 1);
  };

  const markOne = async (id: number) => {
    await fetch(`/api/hr/notifications/${id}/read`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setTick((n) => n + 1);
  };

  if (!realSession) return null;

  return (
    <section aria-label="Notifications" style={{ marginTop: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <h2 style={{ ...S.h2, marginTop: 0 }}>
          Notifications{" "}
          {unread > 0 && (
            <span style={{ background: "#e11d48", color: "#ffffff", borderRadius: "999px", padding: "0.1rem 0.55rem", fontSize: "13px", marginLeft: "0.35rem" }}>{unread} new</span>
          )}
        </h2>
        {unread > 0 && <button type="button" style={S.btn} onClick={markAll}>Mark all read</button>}
      </div>
      {error && <p role="alert" style={{ color: C.danger }}>{error}</p>}
      {items.length === 0 ? (
        <p style={S.note}>Nothing to see. Leave and trip requests and decisions show here for managers and HR.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {items.map((n) => (
            <li
              key={n.id}
              style={{
                background: n.read ? "#ffffff" : "#eef2ff",
                border: "1px solid #d1d5db",
                borderLeft: `4px solid ${n.read ? "#cbd5e1" : "#4f46e5"}`,
                padding: "0.6rem 0.8rem",
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <span style={{ color: n.read ? C.muted : C.text, fontWeight: n.read ? 400 : 600 }}>{n.message}</span>
              {!n.read && (
                <button type="button" style={S.btn} onClick={() => markOne(n.id)} aria-label={`Mark read: ${n.message}`}>Mark read</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

function LoadingLine({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <p role="status">Loading home page…</p>;
  if (error) return <p role="alert" style={{ color: C.danger }}>{error}</p>;
  return null;
}
