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
  employeeName: string;
  allocatedDate: string;
  daysHeld: number;
}

/** Manager view, read only: open assets of direct reports. */
export function TeamPanel({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<TeamRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    call<{ results: TeamRow[] }>("GET", "assets/team").then((r) => {
      if (!cancelled && r.ok) setRows(r.data.results ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <section style={S.panel} aria-label="Your team's assets">
      <h2 style={{ ...S.h2, marginTop: 0 }}>Your team&apos;s assets</h2>
      <p style={S.note}>Read only. Open assignments of your direct reports.</p>
      {rows === null ? null : rows.length === 0 ? (
        <p style={S.note}>None of your direct reports has an asset assigned.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <Caption>Your team&apos;s assets</Caption>
            <thead>
              <tr>{["Code", "Name", "Holder", "Assigned", "Days held"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.assetId}>
                  <td style={S.td}><strong>{r.assetCode}</strong></td>
                  <td style={S.td}>{r.name}</td>
                  <td style={S.td}>{r.employeeName}</td>
                  <td style={S.td}>{r.allocatedDate}</td>
                  <td style={S.td}>{r.daysHeld}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
