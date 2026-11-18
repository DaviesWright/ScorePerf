// Client helpers for the assets screens. Every call goes through the same-origin proxy at /api/hr, which holds the session.
// Imported by AssetsSimple.tsx, AssetsWriteOff.tsx and AssetsAdmin.tsx.

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T & { error?: string };
}

export async function call<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  const res = await fetch(`/api/hr/${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { ok: res.ok, status: res.status, data };
}

/** Downloads a CSV export. Returns an error message, or null on success. */
export async function downloadCsv(path: string, fallbackName: string): Promise<string | null> {
  const res = await fetch(`/api/hr/${path}`, { cache: "no-store" });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return data.error ?? "Could not export.";
  }
  const named = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "");
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = named?.[1] ?? fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return null;
}
