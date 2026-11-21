"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { ModuleViewKey } from "../shell/AppSidebar";

export interface EssShortcutItem {
  id: string;
  label: string;
  group: "Time & Attendance" | "Pay & Benefits" | "Performance & Growth" | "Work Tools" | "Requests & Support" | "Recognition";
  icon: string;
  view: ModuleViewKey;
}

export const ESS_SHORTCUT_CATALOGUE: EssShortcutItem[] = [
  { id: "apply_leave", label: "Apply for Leave", group: "Time & Attendance", icon: "🗓️", view: "my_leave" },
  { id: "view_payslip", label: "View Payslip", group: "Pay & Benefits", icon: "💳", view: "payslips" },
  { id: "my_goals", label: "My Goals / OKRs", group: "Performance & Growth", icon: "🎯", view: "objectives" },
  { id: "my_assets", label: "My Assets", group: "Work Tools", icon: "💻", view: "assets" },
  { id: "my_appraisal", label: "My Appraisal", group: "Performance & Growth", icon: "📝", view: "my_performance" },
  { id: "my_documents", label: "My Documents", group: "Work Tools", icon: "📄", view: "document_centre" },
  { id: "org_chart", label: "My Team / Org Chart", group: "Work Tools", icon: "🌳", view: "organogram" },
  { id: "raise_ticket", label: "Raise HR Ticket", group: "Requests & Support", icon: "🎫", view: "helpdesk" },
  { id: "update_profile", label: "Update Personal Details", group: "Requests & Support", icon: "👤", view: "my_profile" },
  { id: "celebrations", label: "Celebrations", group: "Recognition", icon: "🎉", view: "celebrations" },
  { id: "skills_board", label: "Skills & Internal Gigs", group: "Performance & Growth", icon: "✨", view: "skills_marketplace" },
  { id: "directory", label: "People Directory", group: "Work Tools", icon: "📇", view: "workforce_directory" },
];

const DEFAULT_PINNED = ["apply_leave", "view_payslip", "my_goals", "my_assets"];

export function EssQuickActionsStrip({ onNavigate }: { onNavigate: (v: ModuleViewKey) => void }) {
  const [pinnedIds, setPinnedIds] = useState<string[]>(DEFAULT_PINNED);
  const [showMore, setShowMore] = useState(false);
  const [editing, setEditing] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/hr/ess/shortcuts")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json && Array.isArray(json.pinnedIds) && json.pinnedIds.length > 0) {
          setPinnedIds(json.pinnedIds.slice(0, 4));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const primaryShortcuts = useMemo(
    () =>
      pinnedIds
        .map((id) => ESS_SHORTCUT_CATALOGUE.find((s) => s.id === id))
        .filter((s): s is EssShortcutItem => Boolean(s))
        .slice(0, 4),
    [pinnedIds]
  );

  const secondaryShortcuts = useMemo(
    () => ESS_SHORTCUT_CATALOGUE.filter((s) => !pinnedIds.includes(s.id)).slice(0, 8),
    [pinnedIds]
  );

  const persistPins = async (next: string[]) => {
    setPinnedIds(next);
    await fetch("/api/hr/ess/shortcuts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinnedIds: next }),
    }).catch(() => undefined);
  };

  const togglePin = (id: string) => {
    if (pinnedIds.includes(id)) {
      if (pinnedIds.length <= 1) return;
      void persistPins(pinnedIds.filter((p) => p !== id));
    } else if (pinnedIds.length < 4) {
      void persistPins([...pinnedIds, id]);
    } else {
      void persistPins([...pinnedIds.slice(1), id]);
    }
  };

  const filteredCatalogue = ESS_SHORTCUT_CATALOGUE.filter(
    (s) =>
      s.label.toLowerCase().includes(query.toLowerCase()) ||
      s.group.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Quick actions</h2>
          <p className="text-[11px] text-slate-500">Your personalised ESS front door (max 4 pinned)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Search shortcuts (⌘K)
          </button>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {editing ? "Done" : "Edit"}
          </button>
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
          >
            {showMore ? "Hide more" : `More shortcuts (${secondaryShortcuts.length})`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {primaryShortcuts.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => (editing ? togglePin(s.id) : onNavigate(s.view))}
            className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-left text-xs font-semibold text-slate-800 transition hover:border-indigo-300 hover:bg-indigo-50/50"
          >
            <span className="text-base">{s.icon}</span>
            <span className="flex-1 truncate">{s.label}</span>
            {editing && <span className="text-[10px] text-slate-400">Pinned</span>}
          </button>
        ))}
      </div>

      {(showMore || editing) && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>{editing ? "Click any shortcut below to pin (replaces oldest if 4 pinned)" : "More shortcuts"}</span>
            {editing && (
              <button
                type="button"
                onClick={() => void persistPins(DEFAULT_PINNED)}
                className="font-medium text-indigo-600 hover:underline"
              >
                Reset to default
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {secondaryShortcuts.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => (editing ? togglePin(s.id) : onNavigate(s.view))}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
              >
                <span>{s.icon}</span>
                <span className="flex-1 truncate">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {paletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 pt-24">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="mb-2 flex items-center gap-2">
              <input
                autoFocus
                type="text"
                placeholder="Jump to leave, payslip, goals, assets, org chart..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={() => setPaletteOpen(false)}
                className="rounded border border-slate-200 px-2.5 py-2 text-xs text-slate-600"
              >
                Esc
              </button>
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {filteredCatalogue.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setPaletteOpen(false);
                    onNavigate(s.view);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-indigo-50"
                >
                  <span className="flex items-center gap-2 font-medium text-slate-800">
                    <span>{s.icon}</span>
                    {s.label}
                  </span>
                  <span className="text-[10px] text-slate-400">{s.group}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function CelebrationsWeekStrip({ onViewAll }: { onViewAll: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [noteTarget, setNoteTarget] = useState<any | null>(null);
  const [noteText, setNoteText] = useState("");
  const [sentMsg, setSentMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch("/api/hr/ess/celebrations"),
        fetch("/api/hr/ess/celebrations/personal"),
      ]);
      const base = cRes.ok ? (await cRes.json()).this_week ?? [] : [];
      const personal = pRes.ok
        ? ((await pRes.json()).results ?? []).map((p: any) => ({
            id: p.id,
            employee_id: p.employee_id,
            employee_name: p.title,
            label: "Personal celebration",
            event_date: p.event_date,
            celebration_type: "PERSONAL",
          }))
        : [];
      setItems([...base, ...personal].slice(0, 3));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTarget || !noteText.trim()) return;
    const res = await fetch(`/api/hr/ess/celebrations/${encodeURIComponent(noteTarget.id)}/note`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toEmployeeId: Number(noteTarget.employee_id), message: noteText.trim() }),
    });
    if (res.ok) {
      setSentMsg(`Celebration note sent to ${noteTarget.employee_name}.`);
      setNoteTarget(null);
      setNoteText("");
    }
  };

  return (
    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2 text-left text-sm font-semibold text-slate-900"
        >
          <span>🎉 Celebrations this week</span>
          <span className="text-[11px] font-normal text-slate-400">{collapsed ? "(Show)" : "(Hide)"}</span>
        </button>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-medium text-indigo-600 hover:underline"
        >
          View all
        </button>
      </div>

      {sentMsg && (
        <div className="mt-2 rounded bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">{sentMsg}</div>
      )}

      {!collapsed && (
        <div className="mt-3 space-y-2">
          {items.length === 0 ? (
            <p className="text-xs text-slate-500">No upcoming team celebrations this week.</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span>{item.celebration_type === "BIRTHDAY" ? "🎂" : "🎉"}</span>
                  <span className="font-semibold text-slate-900">{item.employee_name}</span>
                  <span className="text-slate-600">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">{item.event_date}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNoteTarget(item);
                      setNoteText(`Congratulations, ${item.employee_name}!`);
                    }}
                    className="rounded border border-indigo-200 bg-white px-2 py-0.5 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50"
                  >
                    Send a note
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {noteTarget && (
        <form onSubmit={sendNote} className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={`Write a note to ${noteTarget.employee_name}...`}
            className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          />
          <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">
            Send
          </button>
          <button
            type="button"
            onClick={() => setNoteTarget(null)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600"
          >
            Cancel
          </button>
        </form>
      )}
    </section>
  );
}
