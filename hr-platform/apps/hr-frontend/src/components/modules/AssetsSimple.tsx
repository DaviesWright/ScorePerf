"use client";

import React, { useEffect, useMemo, useState } from "react";

// Assets screen. HR registers, assigns, returns and reviews the history of company equipment. Everyone sees the
// assets assigned to them. Live data only; the demo login has no API behind it.

type Status = "available" | "allocated" | "maintenance" | "retired" | "lost";
type Condition = "new" | "good" | "fair" | "poor";

interface Asset {
  id: number;
  asset_code: string;
  name: string;
  serial_number: string | null;
  status: Status;
  asset_condition: Condition;
  category_name: string | null;
  employee_id: number | null;
  first_name: string | null;
  last_name: string | null;
}
interface MyAsset {
  id: number;
  assetCode: string;
  name: string;
  allocatedDate: string;
}
interface HistoryRow {
  id: number;
  employeeName: string | null;
  allocatedDate: string;
  returnDate: string | null;
  conditionOnAllocation: string | null;
  conditionOnReturn: string | null;
  returnNotes: string | null;
}
interface Person {
  id: number;
  name: string;
}

const CONDITIONS: Condition[] = ["new", "good", "fair", "poor"];
const STATUS_STYLE: Record<Status, { bg: string; text: string; edge: string; label: string }> = {
  available: { bg: "#f0fdf4", text: "#166534", edge: "#16a34a", label: "Available" },
  allocated: { bg: "#eff6ff", text: "#1e40af", edge: "#2563eb", label: "Assigned" },
  maintenance: { bg: "#fffbeb", text: "#92400e", edge: "#d97706", label: "Maintenance" },
  retired: { bg: "#f4f4f5", text: "#3f3f46", edge: "#71717a", label: "Retired" },
  lost: { bg: "#fff1f2", text: "#9f1239", edge: "#e11d48", label: "Lost" },
};

const S = {
  page: { padding: "1.5rem", maxWidth: "1100px" } as React.CSSProperties,
  h2: { margin: "1.5rem 0 0.5rem", fontSize: "17px", color: "#4338ca" } as React.CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.75rem" } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse", background: "#ffffff", border: "1px solid #d1d5db" } as React.CSSProperties,
  th: { textAlign: "left", padding: "0.6rem 0.75rem", borderBottom: "1px solid #d1d5db", background: "#eef2ff", color: "#3730a3", fontWeight: 600 } as React.CSSProperties,
  td: { padding: "0.6rem 0.75rem", borderBottom: "1px solid #d1d5db", verticalAlign: "top" } as React.CSSProperties,
  btn: { minHeight: "40px", padding: "0 0.9rem", border: "1px solid #d1d5db", borderRadius: "4px", background: "#ffffff", color: "#1f2937", font: "inherit", cursor: "pointer" } as React.CSSProperties,
  primary: { minHeight: "44px", padding: "0 1.2rem", border: "1px solid #1d4ed8", borderRadius: "4px", background: "#1d4ed8", color: "#ffffff", font: "inherit", cursor: "pointer" } as React.CSSProperties,
  input: { minHeight: "40px", padding: "0.4rem 0.6rem", border: "1px solid #d1d5db", borderRadius: "4px", font: "inherit", background: "#ffffff" } as React.CSSProperties,
  field: { display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "0.75rem" } as React.CSSProperties,
  panel: { border: "1px solid #d1d5db", background: "#ffffff", padding: "1rem", marginTop: "0.75rem" } as React.CSSProperties,
  note: { color: "#4b5563", margin: "0.25rem 0 0" } as React.CSSProperties,
};

const Caption = ({ children }: { children: string }) => <caption style={{ textAlign: "left", position: "absolute", left: "-9999px" }}>{children}</caption>;

function Pill({ status }: { status: Status }) {
  const s = STATUS_STYLE[status];
  return <span style={{ display: "inline-block", padding: "0.1rem 0.55rem", borderRadius: "999px", background: s.bg, color: s.text, border: `1px solid ${s.edge}`, fontWeight: 600 }}>{s.label}</span>;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const res = await fetch(`/api/hr/${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { ok: res.ok, status: res.status, data };
}

export const AssetsScreen: React.FC<{ user: { id: string; persona: string }; realSession: boolean }> = ({ user, realSession }) => {
  const isHr = user.persona === "hr_admin" || user.persona === "hr_director";
  const [assets, setAssets] = useState<Asset[]>([]);
  const [mine, setMine] = useState<MyAsset[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(realSession);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [assignTo, setAssignTo] = useState("");
  const [assignCondition, setAssignCondition] = useState<Condition>("good");
  const [returnCondition, setReturnCondition] = useState<Condition>("good");
  const [returnNotes, setReturnNotes] = useState("");
  const [reg, setReg] = useState({ name: "", assetCode: "", serialNumber: "", condition: "good" as Condition });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!realSession) return;
    let cancelled = false;
    setLoading(true);
    const loads: Promise<unknown>[] = [
      call<{ results: MyAsset[] }>("GET", "assets/me").then((r) => !cancelled && r.ok && setMine(r.data.results ?? [])),
    ];
    if (isHr) {
      loads.push(
        call<{ results: Asset[] }>("GET", "assets").then((r) => {
          if (cancelled) return;
          if (!r.ok) return setError(r.data.error ?? "Could not load assets.");
          setAssets(r.data.results ?? []);
        }),
      );
      loads.push(call<{ directory: Person[] }>("GET", "home").then((r) => !cancelled && r.ok && setPeople(r.data.directory ?? [])));
    }
    Promise.all(loads).finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [realSession, isHr, reloadKey]);

  useEffect(() => {
    if (!realSession || !isHr || !selected) return;
    let cancelled = false;
    call<{ results: HistoryRow[] }>("GET", `assets/${selected.id}/history`).then((r) => {
      if (!cancelled && r.ok) setHistory(r.data.results ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [realSession, isHr, selected, reloadKey]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { available: 0, allocated: 0, maintenance: 0, retired: 0, lost: 0 };
    for (const a of assets) c[a.status] += 1;
    return c;
  }, [assets]);

  const act = async (fn: () => Promise<{ ok: boolean; data: { error?: string } }>, done: string) => {
    setBusy(true);
    setFormError("");
    const r = await fn();
    setBusy(false);
    if (!r.ok) return setFormError(r.data.error ?? "Something went wrong.");
    setMessage(done);
    setReloadKey((n) => n + 1);
  };

  if (!realSession) {
    return (
      <div style={S.page}>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "22px" }}>Assets</h1>
        <p style={S.note}>Sign in to see live assets. The demo login has no data behind this screen.</p>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <h1 style={{ margin: "0 0 0.25rem", fontSize: "22px", color: "#4338ca" }}>Assets</h1>
      <p style={S.note}>{isHr ? "Register equipment, assign it to people, record returns." : "Equipment assigned to you."}</p>
      {message && <p role="status" style={{ color: "#166534", fontWeight: 600 }}>{message}</p>}
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
      {loading && <p role="status">Loading…</p>}

      {isHr && (
        <>
          <div style={{ ...S.grid, marginTop: "1rem" }}>
            {(["available", "allocated", "maintenance", "retired"] as Status[]).map((s) => (
              <div key={s} style={{ background: STATUS_STYLE[s].bg, borderTop: `4px solid ${STATUS_STYLE[s].edge}`, padding: "0.9rem 1rem" }}>
                <div style={{ color: STATUS_STYLE[s].text, fontWeight: 600 }}>{STATUS_STYLE[s].label}</div>
                <div style={{ fontSize: "26px", fontWeight: 700, color: STATUS_STYLE[s].edge }}>{counts[s]}</div>
              </div>
            ))}
          </div>

          <h2 style={S.h2}>All assets</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <Caption>All assets</Caption>
              <thead>
                <tr>{["Code", "Name", "Category", "Status", "Condition", "Holder", "Action"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id}>
                    <td style={S.td}><strong>{a.asset_code}</strong></td>
                    <td style={S.td}>{a.name}</td>
                    <td style={S.td}>{a.category_name ?? "-"}</td>
                    <td style={S.td}><Pill status={a.status} /></td>
                    <td style={S.td}>{a.asset_condition}</td>
                    <td style={S.td}>{a.first_name ? `${a.first_name} ${a.last_name}` : "-"}</td>
                    <td style={S.td}>
                      <button type="button" style={S.btn} onClick={() => { setSelected(a); setFormError(""); setMessage(""); setAssignTo(""); }} aria-label={`Open ${a.asset_code}`}>Open</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected && (
            <section style={S.panel} aria-label={`Asset ${selected.asset_code}`}>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "16px" }}>{selected.asset_code}: {selected.name} <Pill status={selected.status} /></h3>
              {formError && <p role="alert" style={{ color: "#b91c1c", fontWeight: 600 }}>{formError}</p>}

              {selected.status === "available" && (
                <form style={{ maxWidth: "420px", marginBottom: "1rem" }} onSubmit={(e) => { e.preventDefault(); act(() => call("POST", `assets/${selected.id}/assign`, { employeeId: Number(assignTo), condition: assignCondition }), "Assigned."); }}>
                  <h4 style={{ margin: "0 0 0.5rem" }}>Assign</h4>
                  <label style={S.field}>Person *
                    <select required value={assignTo} onChange={(e) => setAssignTo(e.target.value)} style={S.input}>
                      <option value="">Choose…</option>
                      {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                  <label style={S.field}>Condition at hand-over
                    <select value={assignCondition} onChange={(e) => setAssignCondition(e.target.value as Condition)} style={S.input}>
                      {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <button type="submit" style={S.primary} disabled={busy || !assignTo}>{busy ? "Saving…" : "Assign asset"}</button>
                </form>
              )}

              {selected.status === "allocated" && (
                <form style={{ maxWidth: "420px", marginBottom: "1rem" }} onSubmit={(e) => { e.preventDefault(); act(() => call("POST", `assets/${selected.id}/return`, { condition: returnCondition, notes: returnNotes }), "Return recorded."); }}>
                  <h4 style={{ margin: "0 0 0.5rem" }}>Record return from {selected.first_name} {selected.last_name}</h4>
                  <label style={S.field}>Condition on return
                    <select value={returnCondition} onChange={(e) => setReturnCondition(e.target.value as Condition)} style={S.input}>
                      {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label style={S.field}>Notes
                    <input maxLength={1000} value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} style={S.input} />
                  </label>
                  <p style={S.note}>New or good returns go back to stock. Fair or poor goes to maintenance.</p>
                  <button type="submit" style={S.primary} disabled={busy}>{busy ? "Saving…" : "Record return"}</button>
                </form>
              )}

              <h4 style={{ margin: "1rem 0 0.5rem" }}>History</h4>
              {history.length === 0 ? (
                <p style={S.note}>No assignments yet.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={S.table}>
                    <Caption>Assignment history</Caption>
                    <thead>
                      <tr>{["Person", "Assigned", "Returned", "Condition out", "Condition back", "Notes"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.id}>
                          <td style={S.td}>{h.employeeName ?? "-"}</td>
                          <td style={S.td}>{h.allocatedDate}</td>
                          <td style={S.td}>{h.returnDate ?? "Still with them"}</td>
                          <td style={S.td}>{h.conditionOnAllocation ?? "-"}</td>
                          <td style={S.td}>{h.conditionOnReturn ?? "-"}</td>
                          <td style={S.td}>{h.returnNotes ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <section style={S.panel} aria-label="Register an asset">
            <h2 style={{ ...S.h2, marginTop: 0 }}>Register an asset</h2>
            <form style={{ maxWidth: "420px" }} onSubmit={(e) => { e.preventDefault(); act(() => call("POST", "assets", { name: reg.name, assetCode: reg.assetCode, serialNumber: reg.serialNumber || null, condition: reg.condition }), "Asset registered."); setReg({ name: "", assetCode: "", serialNumber: "", condition: "good" }); }}>
              <label style={S.field}>Name *<input required minLength={2} maxLength={255} value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} style={S.input} /></label>
              <label style={S.field}>Asset code *<input required minLength={2} maxLength={50} value={reg.assetCode} onChange={(e) => setReg({ ...reg, assetCode: e.target.value })} style={S.input} /></label>
              <label style={S.field}>Serial number<input maxLength={100} value={reg.serialNumber} onChange={(e) => setReg({ ...reg, serialNumber: e.target.value })} style={S.input} /></label>
              <label style={S.field}>Condition
                <select value={reg.condition} onChange={(e) => setReg({ ...reg, condition: e.target.value as Condition })} style={S.input}>
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <button type="submit" style={S.primary} disabled={busy}>Register asset</button>
            </form>
          </section>
        </>
      )}

      <h2 style={S.h2}>{isHr ? "Assigned to me" : "My assets"}</h2>
      {mine.length === 0 ? (
        <p style={S.note}>You have no assets assigned.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <Caption>Assets assigned to me</Caption>
            <thead>
              <tr>{["Code", "Name", "Since"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {mine.map((a) => (
                <tr key={a.id}>
                  <td style={S.td}><strong>{a.assetCode}</strong></td>
                  <td style={S.td}>{a.name}</td>
                  <td style={S.td}>{a.allocatedDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
