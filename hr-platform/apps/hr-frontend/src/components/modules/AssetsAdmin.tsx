"use client";

import React, { useEffect, useState } from "react";
import { call, downloadCsv } from "./assetApi";
import { S, Caption } from "./assetStyles";

// Categories, asset details, manager team view and CSV export for the assets screen.
// Importers: AssetsSimple.tsx. Calls: assets/categories, assets/team, assets/:id/update and the CSV exports.

const toNumOrNull = (v: string): number | null => (v.trim() === "" ? null : Number(v));

interface Category {
  id: number;
  name: string;
  overdueDays: number | null;
  depreciationMonths: number | null;
}

/** HR: the overdue threshold per category. Blank uses the default on the overdue screen. */
export function CategoriesPanel({ refreshKey, onDone }: { refreshKey: number; onDone: (message: string) => void }) {
  const [rows, setRows] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [overdue, setOverdue] = useState("");
  const [depreciation, setDepreciation] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    call<{ results: Category[] }>("GET", "assets/categories").then((r) => {
      if (!cancelled && r.ok) setRows(r.data.results ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const r = await call("POST", "assets/categories", { name, overdueDays: toNumOrNull(overdue), depreciationMonths: toNumOrNull(depreciation) });
    if (!r.ok) return setError(r.data.error ?? "Could not add the category.");
    setName("");
    setOverdue("");
    setDepreciation("");
    onDone("Category added.");
  };

  return (
    <section style={S.panel} aria-label="Asset categories">
      <h2 style={{ ...S.h2, marginTop: 0 }}>Asset categories</h2>
      <p style={S.note}>
        Overdue days set how long an asset in that category may stay assigned before it appears on the overdue report. Blank uses the
        report&apos;s own number of days. Depreciation months are for reference only; nothing is calculated from them.
      </p>
      {error && <p role="alert" style={S.error}>{error}</p>}
      {rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <Caption>Asset categories</Caption>
            <thead>
              <tr>{["Category", "Overdue after (days)", "Depreciation (months)", ""].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((c) => <CategoryRow key={c.id} category={c} onSaved={onDone} onError={setError} />)}
            </tbody>
          </table>
        </div>
      )}
      <form style={{ maxWidth: "520px", marginTop: "1rem" }} onSubmit={create}>
        <h4 style={{ margin: "0 0 0.5rem" }}>Add a category</h4>
        <label style={S.field}>Name *<input required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} style={S.input} /></label>
        <label style={S.field}>Overdue after (days)
          <input type="number" min={1} max={3650} value={overdue} onChange={(e) => setOverdue(e.target.value)} style={S.input} />
        </label>
        <label style={S.field}>Depreciation (months, reference)
          <input type="number" min={1} max={600} value={depreciation} onChange={(e) => setDepreciation(e.target.value)} style={S.input} />
        </label>
        <button type="submit" style={S.primary} disabled={name.trim().length < 2}>Add category</button>
      </form>
    </section>
  );
}

function CategoryRow({ category, onSaved, onError }: { category: Category; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const [overdue, setOverdue] = useState(category.overdueDays === null ? "" : String(category.overdueDays));
  const [depreciation, setDepreciation] = useState(category.depreciationMonths === null ? "" : String(category.depreciationMonths));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    onError("");
    const r = await call("POST", `assets/categories/${category.id}/update`, { overdueDays: toNumOrNull(overdue), depreciationMonths: toNumOrNull(depreciation) });
    setBusy(false);
    if (!r.ok) return onError(r.data.error ?? "Could not save the category.");
    onSaved(`${category.name} saved.`);
  };

  return (
    <tr>
      <td style={S.td}>{category.name}</td>
      <td style={S.td}>
        <input type="number" min={1} max={3650} aria-label={`Overdue days for ${category.name}`} value={overdue} onChange={(e) => setOverdue(e.target.value)} style={{ ...S.input, width: "110px" }} />
      </td>
      <td style={S.td}>
        <input type="number" min={1} max={600} aria-label={`Depreciation months for ${category.name}`} value={depreciation} onChange={(e) => setDepreciation(e.target.value)} style={{ ...S.input, width: "110px" }} />
      </td>
      <td style={S.td}><button type="button" style={S.btn} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button></td>
    </tr>
  );
}

interface TeamRow {
  assetId: number;
  assetCode: string;
  name: string;
  employeeId: number;
  employeeName: string;
  allocatedDate: string;
  daysHeld: number;
}

/** Manager view: direct reports' open assets + Assign / Return / Transfer within solid-line reporting. */
export function TeamPanel({ refreshKey, onDone }: { refreshKey: number; onDone?: (message: string) => void }) {
  const [rows, setRows] = useState<TeamRow[] | null>(null);
  const [available, setAvailable] = useState<any[]>([]);
  const [reports, setReports] = useState<{ id: number; name: string; role: string }[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [assetId, setAssetId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [notes, setNotes] = useState("");
  const [transferAssetId, setTransferAssetId] = useState<number | null>(null);
  const [transferToId, setTransferToId] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      call<{ results: TeamRow[] }>("GET", "assets/team"),
      call<{ results: any[] }>("GET", "assets/available"),
      call<{ results: { id: number; name: string; role: string }[] }>("GET", "assets/direct-reports"),
      call<{ results: any[] }>("GET", "assets/audit"),
    ]).then(([t, a, r, aud]) => {
      if (cancelled) return;
      if (t.ok) setRows(t.data.results ?? []);
      if (a.ok) setAvailable(a.data.results ?? []);
      if (r.ok) setReports(r.data.results ?? []);
      if (aud.ok) setAudit(aud.data.results ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId || !assigneeId) return;
    setBusy(true);
    setErr("");
    const res = await call("POST", `assets/${assetId}/assign`, {
      employeeId: Number(assigneeId),
      condition: "good",
      assignedDate,
      expectedReturnDate: expectedReturnDate || null,
      notes,
      source: "UI",
    });
    setBusy(false);
    if (!res.ok) return setErr(res.data.error ?? "Could not assign asset.");
    setAssetId("");
    setAssigneeId("");
    setExpectedReturnDate("");
    setNotes("");
    onDone?.("Asset assigned to direct report.");
  };

  const handleReturn = async (id: number) => {
    setBusy(true);
    setErr("");
    const res = await call("POST", `assets/${id}/return`, { condition: "good", notes: "Returned by manager", source: "UI" });
    setBusy(false);
    if (!res.ok) return setErr(res.data.error ?? "Could not return asset.");
    onDone?.("Asset returned to available inventory.");
  };

  const handleTransfer = async (id: number) => {
    if (!transferToId) return;
    setBusy(true);
    setErr("");
    const res = await call("POST", `assets/${id}/transfer`, {
      newEmployeeId: Number(transferToId),
      condition: "good",
      notes: "Manager reporting-line transfer",
      source: "UI",
    });
    setBusy(false);
    if (!res.ok) return setErr(res.data.error ?? "Could not transfer asset.");
    setTransferAssetId(null);
    setTransferToId("");
    onDone?.("Asset transferred within reporting line.");
  };

  return (
    <section style={S.panel} aria-label="Your team's assets">
      <h2 style={{ ...S.h2, marginTop: 0 }}>Your team&apos;s assets (Solid-Line Direct Reports)</h2>
      <p style={S.note}>View, assign available inventory, return, or transfer assets within your solid-line reporting line.</p>
      {err && <p role="alert" style={S.error}>{err}</p>}

      {reports.length > 0 && (
        <form onSubmit={handleAssign} style={{ display: "grid", gap: "0.5rem", maxWidth: "680px", marginBottom: "1rem", padding: "0.75rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <h4 style={{ margin: 0 }}>Assign asset to direct report</h4>
          <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <label style={S.field}>Available Asset *
              <select required value={assetId} onChange={(e) => setAssetId(e.target.value)} style={S.input}>
                <option value="">Choose available asset…</option>
                {available.map((a) => (
                  <option key={a.id} value={a.id}>{a.asset_code} — {a.name} ({a.category_name ?? "General"})</option>
                ))}
              </select>
            </label>
            <label style={S.field}>Direct Report *
              <select required value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} style={S.input}>
                <option value="">Choose direct report…</option>
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
            <label style={S.field}>Assigned Date *
              <input type="date" required max={new Date().toISOString().slice(0, 10)} value={assignedDate} onChange={(e) => setAssignedDate(e.target.value)} style={S.input} />
            </label>
            <label style={S.field}>Expected Return Date
              <input type="date" min={assignedDate} value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} style={S.input} />
            </label>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input type="text" placeholder="Notes (audited)" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...S.input, flex: 1 }} />
            <button type="submit" style={S.primary} disabled={busy || !assetId || !assigneeId}>{busy ? "Assigning…" : "Assign asset"}</button>
          </div>
        </form>
      )}

      {rows === null ? null : rows.length === 0 ? (
        <p style={S.note}>None of your direct reports has an asset assigned.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <Caption>Your team&apos;s assets</Caption>
            <thead>
              <tr>{["Code", "Name", "Holder", "Assigned", "Days held", "Actions"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.assetId}>
                  <td style={S.td}><strong>{r.assetCode}</strong></td>
                  <td style={S.td}>{r.name}</td>
                  <td style={S.td}>{r.employeeName}</td>
                  <td style={S.td}>{r.allocatedDate}</td>
                  <td style={S.td}>{r.daysHeld}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                      <button type="button" style={S.btn} disabled={busy} onClick={() => void handleReturn(r.assetId)}>Return</button>
                      <button type="button" style={S.btn} disabled={busy} onClick={() => { setTransferAssetId(r.assetId); setTransferToId(""); }}>Transfer</button>
                    </div>
                    {transferAssetId === r.assetId && (
                      <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.35rem" }}>
                        <select value={transferToId} onChange={(e) => setTransferToId(e.target.value)} style={S.input}>
                          <option value="">Select report…</option>
                          {reports.filter((rep) => rep.id !== r.employeeId).map((rep) => (
                            <option key={rep.id} value={rep.id}>{rep.name}</option>
                          ))}
                        </select>
                        <button type="button" style={S.primary} disabled={busy || !transferToId} onClick={() => void handleTransfer(r.assetId)}>Confirm</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {audit.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <h4 style={{ margin: "0 0 0.35rem" }}>Team Asset Audit Trail</h4>
          <div style={{ maxHeight: "140px", overflowY: "auto", fontSize: "12px", color: "#475569" }}>
            {audit.slice(0, 10).map((ev) => (
              <div key={ev.id}>
                [{ev.action}] {ev.asset_code ?? `Asset #${ev.asset_id}`} · {ev.effective_date} · {ev.reason || "—"}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export interface AssetDetails {
  id: number;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_price: string | null;
  warranty_expiry: string | null;
  notes: string | null;
}

/** HR: serial number, purchase and warranty fields, and notes for one asset. */
export function DetailsForm({ asset, onDone }: { asset: AssetDetails; onDone: (message: string) => void }) {
  const [serial, setSerial] = useState(asset.serial_number ?? "");
  const [purchaseDate, setPurchaseDate] = useState(asset.purchase_date ?? "");
  const [price, setPrice] = useState(asset.purchase_price ?? "");
  const [warranty, setWarranty] = useState(asset.warranty_expiry ?? "");
  const [notes, setNotes] = useState(asset.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSerial(asset.serial_number ?? "");
    setPurchaseDate(asset.purchase_date ?? "");
    setPrice(asset.purchase_price ?? "");
    setWarranty(asset.warranty_expiry ?? "");
    setNotes(asset.notes ?? "");
    setError("");
  }, [asset.id, asset.serial_number, asset.purchase_date, asset.purchase_price, asset.warranty_expiry, asset.notes]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await call("POST", `assets/${asset.id}/update`, {
      serialNumber: serial.trim() === "" ? null : serial.trim(),
      purchaseDate: purchaseDate || null,
      purchasePrice: price.trim() === "" ? null : Number(price),
      warrantyExpiry: warranty || null,
      notes: notes.trim() === "" ? null : notes,
    });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "Could not save the details.");
    onDone("Asset details saved.");
  };

  return (
    <form style={{ maxWidth: "520px", marginBottom: "1rem" }} onSubmit={submit} aria-label="Asset details">
      <h4 style={{ margin: "0 0 0.5rem" }}>Details</h4>
      {error && <p role="alert" style={S.error}>{error}</p>}
      <label style={S.field}>Serial number<input maxLength={100} value={serial} onChange={(e) => setSerial(e.target.value)} style={S.input} /></label>
      <label style={S.field}>Purchase date<input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} style={S.input} /></label>
      <label style={S.field}>Purchase price<input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} style={S.input} /></label>
      <label style={S.field}>Warranty expiry<input type="date" value={warranty} onChange={(e) => setWarranty(e.target.value)} style={S.input} /></label>
      <label style={S.field}>Notes
        <textarea maxLength={2000} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...S.input, minHeight: "80px" }} />
      </label>
      <button type="submit" style={S.primary} disabled={busy}>{busy ? "Saving…" : "Save details"}</button>
    </form>
  );
}

/** A CSV download button. The file comes from the API, so the rules stay on the server. */
export function ExportButton({ path, filename, label, onError }: { path: string; filename: string; label: string; onError: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      style={S.btn}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const err = await downloadCsv(path, filename);
        setBusy(false);
        if (err) onError(err);
      }}
    >
      {busy ? "Preparing…" : label}
    </button>
  );
}
