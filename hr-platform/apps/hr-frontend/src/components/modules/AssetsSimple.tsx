"use client";

import React, { useEffect, useMemo, useState } from "react";
import { call } from "./assetApi";
import { S, Caption } from "./assetStyles";
import { WriteOffForm, ApprovalsPanel, RecoveryPanel } from "./AssetsWriteOff";
import { CategoriesPanel, DetailsForm, ExportButton, TeamPanel } from "./AssetsAdmin";

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
  purchase_date: string | null;
  purchase_price: string | null;
  warranty_expiry: string | null;
  notes: string | null;
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
  lost: { bg: "#fff1f2", text: "#9f1239", edge: "#e11d48", label: "Written off" },
};

function Pill({ status }: { status: Status }) {
  const s = STATUS_STYLE[status];
  return <span style={{ display: "inline-block", padding: "0.1rem 0.55rem", borderRadius: "999px", background: s.bg, color: s.text, border: `1px solid ${s.edge}`, fontWeight: 600 }}>{s.label}</span>;
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
  const emptyReg = { name: "", assetCode: "", serialNumber: "", condition: "good" as Condition, purchaseDate: "", purchasePrice: "", warrantyExpiry: "", notes: "" };
  const [reg, setReg] = useState(emptyReg);
  const [overdueDays, setOverdueDays] = useState(365);
  const [overdue, setOverdue] = useState<{ assetCode: string; name: string; employeeName: string; daysHeld: number; thresholdDays: number }[]>([]);
  const [leaver, setLeaver] = useState("");
  const [leaverBlock, setLeaverBlock] = useState<{ assetCode: string; name: string }[]>([]);
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
    if (!realSession || !isHr) return;
    let cancelled = false;
    call<{ results: { assetCode: string; name: string; employeeName: string; daysHeld: number; thresholdDays: number }[] }>("GET", `assets/overdue?days=${overdueDays}`).then((r) => {
      if (!cancelled && r.ok) setOverdue(r.data.results ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [realSession, isHr, overdueDays, reloadKey]);

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

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <h2 style={S.h2}>All assets</h2>
            <ExportButton path="assets/export.csv" filename="assets-register.csv" label="Export register (CSV)" onError={setError} />
          </div>
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

              <WriteOffForm asset={selected} onDone={(m) => { setMessage(m); setSelected(null); setReloadKey((n) => n + 1); }} />
              <DetailsForm asset={selected} onDone={(m) => { setMessage(m); setReloadKey((n) => n + 1); }} />
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

          <section style={S.panel} aria-label="Overdue assignments">
            <h2 style={{ ...S.h2, marginTop: 0 }}>Overdue assignments</h2>
            <label style={{ ...S.field, maxWidth: "260px" }}>
              Held for at least (days)
              <input type="number" min={0} max={3650} value={overdueDays} onChange={(e) => setOverdueDays(Math.max(0, Math.min(3650, Number(e.target.value) || 0)))} style={S.input} />
            </label>
            <p style={S.note}>A category may set its own number of days. Categories without one use the number above.</p>
            <div style={{ margin: "0.5rem 0" }}>
              <ExportButton path={`assets/overdue.csv?days=${overdueDays}`} filename="assets-overdue.csv" label="Export overdue (CSV)" onError={setError} />
            </div>
            {overdue.length === 0 ? (
              <p style={S.note}>Nothing held that long.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={S.table}>
                  <Caption>Overdue assignments</Caption>
                  <thead>
                    <tr>{["Code", "Name", "Holder", "Days held", "Threshold (days)"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {overdue.map((o) => (
                      <tr key={o.assetCode}>
                        <td style={S.td}><strong>{o.assetCode}</strong></td>
                        <td style={S.td}>{o.name}</td>
                        <td style={S.td}>{o.employeeName}</td>
                        <td style={S.td}>{o.daysHeld}</td>
                        <td style={S.td}>{o.thresholdDays}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section style={S.panel} aria-label="Offboard an employee">
            <h2 style={{ ...S.h2, marginTop: 0 }}>Offboard an employee</h2>
            <p style={S.note}>Offboarding is refused while the person still holds assets. Return them or write them off first. A recovery task is opened for HR.</p>
            <form style={{ maxWidth: "420px" }} onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setLeaverBlock([]);
              const r = await call<{ error?: string; recoveryTask?: string; openAssets?: { assetCode: string; name: string }[] }>("POST", `employees/${leaver}/offboard`, {});
              setBusy(false);
              if (r.ok) {
                setMessage("Employee offboarded.");
                setLeaver("");
                setReloadKey((n) => n + 1);
              } else {
                setFormError([r.data.error ?? "Could not offboard.", r.data.recoveryTask ? `Recovery task opened: ${r.data.recoveryTask}.` : ""].filter(Boolean).join(" "));
                setLeaverBlock(r.data.openAssets ?? []);
              }
            }}>
              <label style={S.field}>Employee *
                <select required value={leaver} onChange={(e) => setLeaver(e.target.value)} style={S.input}>
                  <option value="">Choose…</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              {leaverBlock.length > 0 && (
                <ul style={{ color: "#9f1239", margin: "0 0 0.75rem", paddingLeft: "1.25rem" }}>
                  {leaverBlock.map((a) => <li key={a.assetCode}>{a.assetCode}: {a.name}</li>)}
                </ul>
              )}
              <button type="submit" style={S.primary} disabled={busy || !leaver}>{busy ? "Checking…" : "Offboard"}</button>
            </form>
          </section>

          <RecoveryPanel refreshKey={reloadKey} onDone={(m) => { setMessage(m); setReloadKey((n) => n + 1); }} />
          <CategoriesPanel refreshKey={reloadKey} onDone={(m) => { setMessage(m); setReloadKey((n) => n + 1); }} />

          <section style={S.panel} aria-label="Register an asset">
            <h2 style={{ ...S.h2, marginTop: 0 }}>Register an asset</h2>
            <form style={{ maxWidth: "420px" }} onSubmit={(e) => { e.preventDefault(); act(() => call("POST", "assets", { name: reg.name, assetCode: reg.assetCode, serialNumber: reg.serialNumber || null, condition: reg.condition, purchaseDate: reg.purchaseDate || null, purchasePrice: reg.purchasePrice === "" ? null : Number(reg.purchasePrice), warrantyExpiry: reg.warrantyExpiry || null, notes: reg.notes || null }), "Asset registered."); setReg(emptyReg); }}>
              <label style={S.field}>Name *<input required minLength={2} maxLength={255} value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} style={S.input} /></label>
              <label style={S.field}>Asset code *<input required minLength={2} maxLength={50} value={reg.assetCode} onChange={(e) => setReg({ ...reg, assetCode: e.target.value })} style={S.input} /></label>
              <label style={S.field}>Serial number<input maxLength={100} value={reg.serialNumber} onChange={(e) => setReg({ ...reg, serialNumber: e.target.value })} style={S.input} /></label>
              <label style={S.field}>Condition
                <select value={reg.condition} onChange={(e) => setReg({ ...reg, condition: e.target.value as Condition })} style={S.input}>
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label style={S.field}>Purchase date<input type="date" value={reg.purchaseDate} onChange={(e) => setReg({ ...reg, purchaseDate: e.target.value })} style={S.input} /></label>
              <label style={S.field}>Purchase price<input type="number" min={0} step="0.01" value={reg.purchasePrice} onChange={(e) => setReg({ ...reg, purchasePrice: e.target.value })} style={S.input} /></label>
              <label style={S.field}>Warranty expiry<input type="date" value={reg.warrantyExpiry} onChange={(e) => setReg({ ...reg, warrantyExpiry: e.target.value })} style={S.input} /></label>
              <label style={S.field}>Notes
                <textarea maxLength={2000} rows={2} value={reg.notes} onChange={(e) => setReg({ ...reg, notes: e.target.value })} style={{ ...S.input, minHeight: "70px" }} />
              </label>
              <button type="submit" style={S.primary} disabled={busy}>Register asset</button>
            </form>
          </section>
        </>
      )}

      <ApprovalsPanel refreshKey={reloadKey} onDone={(m) => { setMessage(m); setReloadKey((n) => n + 1); }} />
      {!isHr && <TeamPanel refreshKey={reloadKey} />}

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
