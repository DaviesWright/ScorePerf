"use client";

import React, { useCallback, useEffect, useState } from "react";

export interface InboxNotification {
  id: string;
  context: "ESS" | "MSS" | "HRMS";
  title: string;
  body: string;
  deep_link: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  read_at: string | null;
  created_at: string;
}

export function NotificationBell({
  onSwitchContextAndNavigate,
}: {
  onSwitchContextAndNavigate?: (context: "ESS" | "MSS" | "HRMS", deepLink: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [byContext, setByContext] = useState<Record<string, number>>({ ESS: 0, MSS: 0, HRMS: 0 });
  const [activeContextTab, setActiveContextTab] = useState<"ALL" | "ESS" | "MSS" | "HRMS">("ALL");
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [channels, setChannels] = useState<string[]>(["IN_APP", "EMAIL"]);
  const [digestOptIn, setDigestOptIn] = useState(true);
  const [quietEnabled, setQuietEnabled] = useState(false);
  const [quietFrom, setQuietFrom] = useState("22:00");
  const [quietTo, setQuietTo] = useState("07:00");

  const loadCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/hr/notifications/unread-count");
      if (!res.ok) return;
      const json = await res.json();
      setUnreadTotal(Number(json.total ?? 0));
      if (json.byContext) setByContext(json.byContext);
    } catch {
      // ignore
    }
  }, []);

  const loadInbox = useCallback(async () => {
    try {
      const qs = activeContextTab === "ALL" ? "" : `?context=${activeContextTab}`;
      const res = await fetch(`/api/hr/notifications/inbox${qs}`);
      if (!res.ok) return;
      const json = await res.json();
      setItems(json.results ?? []);
    } catch {
      // ignore
    }
  }, [activeContextTab]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    if (open) void loadInbox();
  }, [open, loadInbox]);

  const openPreferences = async () => {
    setPrefsOpen(true);
    const res = await fetch("/api/hr/notifications/preferences");
    if (res.ok) {
      const json = await res.json();
      const first = json.preferences?.[0];
      if (first) {
        if (Array.isArray(first.channels)) setChannels(first.channels);
        setDigestOptIn(Boolean(first.digest_opt_in));
        if (first.quiet_hours) {
          setQuietEnabled(Boolean(first.quiet_hours.enabled));
          if (first.quiet_hours.from) setQuietFrom(first.quiet_hours.from);
          if (first.quiet_hours.to) setQuietTo(first.quiet_hours.to);
        }
      }
    }
  };

  const savePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/hr/notifications/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "*",
        channels: Array.from(new Set(["IN_APP", ...channels])),
        digestOptIn,
        quietHours: { enabled: quietEnabled, from: quietFrom, to: quietTo },
      }),
    });
    if (res.ok) setPrefsOpen(false);
  };

  const markRead = async (id: string) => {
    await fetch(`/api/hr/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });
    await Promise.all([loadCounts(), loadInbox()]);
  };

  const dismiss = async (id: string) => {
    await fetch(`/api/hr/notifications/${encodeURIComponent(id)}/dismiss`, { method: "PATCH" });
    await Promise.all([loadCounts(), loadInbox()]);
  };

  const markAllRead = async () => {
    const qs = activeContextTab === "ALL" ? "" : `?context=${activeContextTab}`;
    await fetch(`/api/hr/notifications/read-all${qs}`, { method: "PATCH" });
    await Promise.all([loadCounts(), loadInbox()]);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open notifications"
        className="relative inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        <span>🔔</span>
        {unreadTotal > 0 && (
          <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {unreadTotal}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-96 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Notifications</span>
            <div className="flex items-center gap-2 text-[11px]">
              <button type="button" onClick={() => void markAllRead()} className="text-indigo-600 hover:underline">
                Mark all read
              </button>
              <button type="button" onClick={() => void openPreferences()} className="text-slate-600 hover:underline">
                Preferences
              </button>
            </div>
          </div>

          <div className="mb-2 flex gap-1 border-b border-slate-100 pb-2 text-[11px]">
            {(["ALL", "ESS", "MSS", "HRMS"] as const).map((ctx) => (
              <button
                key={ctx}
                type="button"
                onClick={() => setActiveContextTab(ctx)}
                className={`rounded px-2 py-0.5 font-medium ${
                  activeContextTab === ctx ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {ctx}
                {ctx !== "ALL" && (byContext[ctx] ?? 0) > 0 ? ` (${byContext[ctx]})` : ""}
              </button>
            ))}
          </div>

          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">You&apos;re all caught up.</div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-lg border p-2.5 text-xs ${
                    n.read_at ? "border-slate-100 bg-white" : "border-indigo-100 bg-indigo-50/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void markRead(n.id);
                        setOpen(false);
                        onSwitchContextAndNavigate?.(n.context, n.deep_link);
                      }}
                      className="text-left font-semibold text-slate-900 hover:text-indigo-700"
                    >
                      {n.title}
                    </button>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      {n.context}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600">{n.body}</p>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                    <button type="button" onClick={() => void dismiss(n.id)} className="text-slate-500 hover:underline">
                      Dismiss
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {prefsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <form onSubmit={savePreferences} className="w-full max-w-sm space-y-3 rounded-xl bg-white p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900">Notification Preferences</h3>
            <div className="space-y-1.5 text-xs">
              <label className="flex items-center gap-2 text-slate-500">
                <input type="checkbox" checked disabled /> In-App (always on)
              </label>
              <label className="flex items-center gap-2 text-slate-800">
                <input
                  type="checkbox"
                  checked={channels.includes("EMAIL")}
                  onChange={(e) =>
                    setChannels((prev) =>
                      e.target.checked ? [...prev, "EMAIL"] : prev.filter((c) => c !== "EMAIL")
                    )
                  }
                />
                Email notifications
              </label>
              <label className="flex items-center gap-2 text-slate-800">
                <input type="checkbox" checked={digestOptIn} onChange={(e) => setDigestOptIn(e.target.checked)} />
                Weekly &amp; daily digest emails
              </label>
            </div>
            <div className="space-y-2 border-t border-slate-100 pt-2 text-xs">
              <label className="flex items-center gap-2 font-medium text-slate-800">
                <input type="checkbox" checked={quietEnabled} onChange={(e) => setQuietEnabled(e.target.checked)} />
                Quiet hours (URGENT bypasses)
              </label>
              {quietEnabled && (
                <div className="flex gap-2">
                  <input type="time" value={quietFrom} onChange={(e) => setQuietFrom(e.target.value)} className="rounded border px-2 py-1" />
                  <input type="time" value={quietTo} onChange={(e) => setQuietTo(e.target.value)} className="rounded border px-2 py-1" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setPrefsOpen(false)} className="rounded-lg border px-3 py-1.5 text-xs">
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
