"use client";

import React, { useState } from "react";
import { C, Muted, Notice, btn, card, cell, fieldStyle, formatDate, isHr, readFileAsBase64, readJson, useLoad } from "./selfServiceUi";

// Document centre. HR publishes a PDF to every active employee; each employee opens it and acknowledges their copy.

interface MyDocument {
  id: number;
  title: string;
  typeName: string | null;
  status: string;
  publishedAt: string;
  acknowledgedAt: string | null;
}

interface Publication {
  sampleId: number;
  title: string;
  publishedAt: string;
  total: number;
  acknowledged: number;
  outstanding: number;
}

interface DocumentType {
  id: number;
  name: string;
}

const MyDocuments: React.FC = () => {
  const docs = useLoad<{ results: MyDocument[] }>("/api/hr/documents/me");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const acknowledge = async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/hr/documents/${id}/acknowledge`, { method: "POST" });
      const data = await readJson<object>(res);
      if (!res.ok) {
        setError(data.error ?? "The document was not acknowledged.");
        return;
      }
      docs.reload();
    } catch {
      setError("The server could not be reached. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section style={card} aria-labelledby="mine-docs-heading">
      <h2 id="mine-docs-heading" style={{ fontSize: 18, margin: "0 0 0.5rem" }}>
        My documents
      </h2>
      {docs.loading && <p role="status">Loading…</p>}
      <Notice kind="error" text={docs.error || error} />
      {docs.data && docs.data.results.length === 0 && <p style={{ color: C.muted }}>No documents have been published to you.</p>}
      {docs.data && docs.data.results.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={cell}>Document</th>
                <th style={cell}>Type</th>
                <th style={cell}>Published</th>
                <th style={cell}>Status</th>
                <th style={cell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.data.results.map((d) => (
                <tr key={d.id}>
                  <td style={cell}>{d.title}</td>
                  <td style={cell}>{d.typeName ?? "—"}</td>
                  <td style={cell}>{formatDate(d.publishedAt)}</td>
                  <td style={cell}>{d.status === "acknowledged" ? `Acknowledged ${formatDate(d.acknowledgedAt)}` : "Waiting for you"}</td>
                  <td style={cell}>
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                      <a href={`/api/hr/documents/${d.id}/file`} download style={{ color: C.accent }}>
                        Open PDF
                      </a>
                      {d.status !== "acknowledged" && (
                        <button type="button" style={{ ...btn, minHeight: 36, opacity: busyId === d.id ? 0.6 : 1 }} disabled={busyId === d.id} onClick={() => acknowledge(d.id)}>
                          I have read this
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

const HrPublishing: React.FC = () => {
  const types = useLoad<{ results: DocumentType[] }>("/api/hr/document-types");
  const publications = useLoad<{ results: Publication[] }>("/api/hr/documents/publications");
  const [title, setTitle] = useState("");
  const [typeId, setTypeId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [newType, setNewType] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const fileBase64 = await readFileAsBase64(file);
      const res = await fetch("/api/hr/documents/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), documentTypeId: typeId ? Number(typeId) : null, fileBase64 }),
      });
      const data = await readJson<{ published?: number }>(res);
      if (!res.ok) {
        setError(data.error ?? "The document was not published.");
        return;
      }
      setNotice(`Published to ${data.published} employees. Each one must acknowledge it.`);
      setTitle("");
      setFile(null);
      publications.reload();
    } catch {
      setError("The file could not be read or the server could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const addType = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/hr/document-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newType.trim() }) });
    const data = await readJson<object>(res);
    if (!res.ok) {
      setError(data.error ?? "The type was not added.");
      return;
    }
    setNewType("");
    types.reload();
  };

  return (
    <>
      <section style={card} aria-labelledby="publish-heading">
        <h2 id="publish-heading" style={{ fontSize: 18, margin: "0 0 0.5rem" }}>
          Publish a document
        </h2>
        <Muted>Each active employee gets their own copy to acknowledge. The PDF is limited to 5 MB.</Muted>
        <form onSubmit={publish} style={{ display: "grid", gap: "0.75rem", maxWidth: 560 }}>
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} minLength={3} maxLength={200} required style={fieldStyle} />
          </label>
          <label>
            Type (optional)
            <select value={typeId} onChange={(e) => setTypeId(e.target.value)} style={fieldStyle}>
              <option value="">No type</option>
              {types.data?.results.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            PDF file
            <input type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required style={{ display: "block", marginTop: "0.25rem" }} />
          </label>
          <div>
            <button type="submit" style={{ ...btn, opacity: busy || !file ? 0.6 : 1 }} disabled={busy || !file}>
              {busy ? "Publishing…" : "Publish to all employees"}
            </button>
          </div>
        </form>
        <Notice kind="error" text={error} />
        <Notice kind="ok" text={notice} />

        <form onSubmit={addType} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "end", marginTop: "1rem" }}>
          <label style={{ flex: "1 1 200px" }}>
            New document type
            <input value={newType} onChange={(e) => setNewType(e.target.value)} minLength={2} maxLength={100} style={fieldStyle} />
          </label>
          <button type="submit" style={{ ...btn, background: "#fff", color: C.accent }} disabled={newType.trim().length < 2}>
            Add type
          </button>
        </form>
      </section>

      <section style={card} aria-labelledby="pubs-heading">
        <h2 id="pubs-heading" style={{ fontSize: 18, margin: "0 0 0.5rem" }}>
          Acknowledgments
        </h2>
        <Notice kind="error" text={publications.error || null} />
        {publications.data && publications.data.results.length === 0 && <p style={{ color: C.muted }}>Nothing has been published yet.</p>}
        {publications.data && publications.data.results.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={cell}>Document</th>
                  <th style={cell}>Published</th>
                  <th style={cell}>Acknowledged</th>
                  <th style={cell}>Outstanding</th>
                  <th style={cell}>File</th>
                </tr>
              </thead>
              <tbody>
                {publications.data.results.map((p) => (
                  <tr key={p.sampleId}>
                    <td style={cell}>{p.title}</td>
                    <td style={cell}>{formatDate(p.publishedAt)}</td>
                    <td style={cell}>
                      {p.acknowledged} of {p.total}
                    </td>
                    <td style={cell}>{p.outstanding}</td>
                    <td style={cell}>
                      <a href={`/api/hr/documents/${p.sampleId}/file`} download style={{ color: C.accent }}>
                        Open PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
};

export const DocumentCentreScreen: React.FC<{ user: { id: string; persona: string }; realSession: boolean }> = ({ user }) => (
  <div style={{ padding: "1.5rem", maxWidth: 960 }}>
    <h1 style={{ fontSize: 22, margin: "0 0 0.25rem" }}>Document centre</h1>
    <Muted>Policies and notices from HR. Open each one and acknowledge that you have read it.</Muted>
    <MyDocuments />
    {isHr(user.persona) && <HrPublishing />}
  </div>
);
