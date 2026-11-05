import { NextRequest, NextResponse } from "next/server";
import { API_BASE, SESSION_COOKIE } from "../../../../lib/session";

// Same-origin proxy for the objectives API. The browser cannot read the httpOnly session cookie, so this route
// reads it on the server and forwards the call to the API as a Bearer token. Only the objectives endpoints are
// reachable, and state-changing calls must come from this site. "create" maps to POST /api/v1/objectives.

const ALLOWED = /^(me|all|pending|amendments|create|submit|decision|\d{1,9}\/(update|delete|progress|amend))$/;

function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

async function forward(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const path = (await ctx.params).path.join("/");
  if (!ALLOWED.test(path)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (req.method !== "GET" && !isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cycleId = req.nextUrl.searchParams.get("cycleId");
  const query = cycleId && /^\d{1,9}$/.test(cycleId) ? `?cycleId=${cycleId}` : "";
  const upstreamPath = path === "create" ? "" : `/${path}`;
  const hasBody = req.method !== "GET";
  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/api/v1/objectives${upstreamPath}${query}`, {
      method: req.method,
      headers: { Authorization: `Bearer ${token}`, ...(hasBody ? { "Content-Type": "application/json" } : {}) },
      body: hasBody ? await req.text() : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "The server could not be reached. Try again." }, { status: 502 });
  }
  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const GET = forward;
export const POST = forward;
