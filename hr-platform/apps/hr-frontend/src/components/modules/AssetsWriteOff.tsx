"use client";

import React, { useEffect, useState } from "react";
import { call } from "./assetApi";
import { S, Caption } from "./assetStyles";

// Write-off and recovery panels for the assets screen. HR records write-offs and closes recovery tasks. Pending
// write-offs are decided by the holder's manager, or by another HR user when the holder has no manager.
// Importers: AssetsSimple.tsx.

export interface AssetRef {
  id: number;
  asset_code: string;
  status: string;
  first_name: string | null;
  last_name: string | null;
}

export function WriteOffForm({ asset, onDone }: { asset: AssetRef; onDone: (message: string) => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (asset.status === "lost" || asset.status === "retired") return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await call<{ status?: string }>("POST", `assets/${asset.id}/write-off`, { reason });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "Could not write off the asset.");
    setReason("");
    onDone(r.status === 202 ? "Sent to the holder's manager for approval." : "Asset written off.");
  };

  const holderNote =
    asset.status === "allocated"
      ? `${asset.first_name ?? "The holder"}'s manager must approve before the asset is marked written off.`
      : "Written off straight away. The asset stops being available.";

  return (
    <form style={{ maxWidth: "520px", marginBottom: "1rem" }} onSubmit={submit} aria-label="Write off this asset">
      <h4 style={{ margin: "0 0 0.5rem" }}>Write off (lost or not returned)</h4>
      {error && <p role="alert" style={S.error}>{error}</p>}
      <label style={S.field}>
        Reason *
        <input required minLength={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} style={S.input} />
      </label>
      <p style={S.note}>{holderNote}</p>
      <button type="submit" style={S.danger} disabled={busy || reason.trim().length < 3}>{busy ? "Saving…" : "Write off"}</button>
    </form>
  );
}

interface PendingWriteOff {
  id: number;
  assetCode: string;
  name: string;
  reason: string;
  requestedAt: string;
  holderName: string | null;
}

/** Write-offs this person can decide. Shown to HR and to managers; empty for everyone else. */
export function ApprovalsPanel({ refreshKey, onDone }: { refreshKey: number; onDone: (message: string) => void }) {
  const [rows, setRows] = useState<PendingWriteOff[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    call<{ results: PendingWriteOff[] }>("GET", "assets/write-offs/pending").then((r) => {
      if (!cancelled && r.ok) setRows(r.data.results ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const decide = async (id: number, decision: "approve" | "reject") => {
    setBusy(true);
    setError("");
    const r = await call("POST", `assets/write-offs/${id}/decision`, { decision, note });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "Could not record the decision.");
    setNote("");
    onDone(decision === "approve" ? "Write-off approved. The asset is marked written off." : "Write-off rejected. The asset stays with its holder.");
  };

  return (
    <section style={S.panel} aria-label="Write-offs waiting for approval">
      <h2 style={{ ...S.h2, marginTop: 0 }}>Write-offs waiting for approval</h2>
      <p style={S.note}>Only the holder&apos;s manager can decide. Where the holder has no manager, another HR user decides.</p>
      {error && <p role="alert" style={S.error}>{error}</p>}
      {rows.length === 0 ? (
        <p style={S.note}>Nothing waiting for you.</p>
      ) : (
        <>
          <label style={{ ...S.field, maxWidth: "420px" }}>
            Note (optional)
            <input maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} style={S.input} />
          </label>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <Caption>Write-offs waiting for approval</Caption>
              <thead>
                <tr>{["Code", "Name", "Holder", "Reason", "Requested", "Decision"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={S.td}><strong>{r.assetCode}</strong></td>
                    <td style={S.td}>{r.name}</td>
                    <td style={S.td}>{r.holderName ?? "-"}</td>
                    <td style={S.td}>{r.reason}</td>
                    <td style={S.td}>{r.requestedAt.slice(0, 10)}</td>
                    <td style={S.td}>
                      <button type="button" style={{ ...S.primary, marginRight: "0.5rem" }} disabled={busy} onClick={() => decide(r.id, "approve")}>Approve</button>
                      <button type="button" style={S.btn} disabled={busy} onClick={() => decide(r.id, "reject")}>Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

interface RecoveryTask {
  id: number;
  status: string;
  title: string;
  openAssetCount: number;
  openedAt: string;
  closeNote: string;
}

/** HR: "Recover N assets from [name]" tasks. Closing one does not lift the offboarding block. */
export function RecoveryPanel({ refreshKey, onDone }: { refreshKey: number; onDone: (message: string) => void }) {
  const [tasks, setTasks] = useState<RecoveryTask[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    call<{ results: RecoveryTask[] }>("GET", "assets/recovery-tasks").then((r) => {
      if (!cancelled && r.ok) setTasks(r.data.results ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const close = async (t: RecoveryTask) => {
    setBusy(true);
    setError("");
    const r = await call("POST", `assets/recovery-tasks/${t.id}/close`, { note: notes[t.id] ?? "" });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "Could not close the task.");
    onDone("Recovery task closed.");
  };

  return (
    <section style={S.panel} aria-label="Asset recovery tasks">
      <h2 style={{ ...S.h2, marginTop: 0 }}>Asset recovery tasks</h2>
      <p style={S.note}>
        Opened when someone holding assets is offboarded. Offboarding stays blocked until each asset is returned or written off. Closing a
        task does not lift that block. If assets are still open, the close needs a note saying where they are.
      </p>
      {error && <p role="alert" style={S.error}>{error}</p>}
      {tasks.length === 0 ? (
        <p style={S.note}>No recovery tasks.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <Caption>Asset recovery tasks</Caption>
            <thead>
              <tr>{["Task", "Status", "Opened", "Still open", "Close"].map((h) => <th key={h} scope="col" style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td style={S.td}>{t.title}</td>
                  <td style={S.td}>{t.status === "open" ? "Open" : `Closed${t.closeNote ? `: ${t.closeNote}` : ""}`}</td>
                  <td style={S.td}>{t.openedAt.slice(0, 10)}</td>
                  <td style={S.td}>{t.openAssetCount}</td>
                  <td style={S.td}>
                    {t.status === "open" ? (
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <input
                          aria-label={`Note for ${t.title}`}
                          maxLength={1000}
                          placeholder={t.openAssetCount > 0 ? "Where are they? (required)" : "Note (optional)"}
                          value={notes[t.id] ?? ""}
                          onChange={(e) => setNotes({ ...notes, [t.id]: e.target.value })}
                          style={{ ...S.input, minWidth: "200px" }}
                        />
                        <button type="button" style={S.btn} disabled={busy} onClick={() => close(t)}>Close task</button>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
