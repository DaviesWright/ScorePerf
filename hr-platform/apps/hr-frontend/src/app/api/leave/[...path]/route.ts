import { NextRequest, NextResponse } from "next/server";
import { API_BASE, SESSION_COOKIE } from "../../../../lib/session";

// Same-origin proxy for the leave API. The browser cannot read the httpOnly session cookie, so this route
// reads it on the server and forwards the call to the API as a Bearer token. Only the leave endpoints are
// reachable, and state-changing calls must come from this site.

const ALLOWED = /^(me|requests|approvals|calendar|team|company|trips|trips\/me|trips\/pending|trips\/\d{1,9}\/(decision|cancel)|plan\/me|plan\/pending|plan\/sweep|plan\/\d{1,9}\/(submit|decision)|plan|requests\/\d{1,9}\/(cancel|decision|evidence)|evidence\/\d{1,9}|balances\/adjust|balances\/adjustments)$/;

// Evidence files are binary: uploads are forwarded as bytes and downloads are returned as bytes.
const EVIDENCE_UPLOAD = /^requests\/\d{1,9}\/evidence$/;
const EVIDENCE_FILE = /^evidence\/\d{1,9}$/;

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

  const hasBody = req.method !== "GET";
  const upload = EVIDENCE_UPLOAD.test(path);
  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/api/v1/leave/${path}${req.nextUrl.search}`, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(hasBody ? { "Content-Type": upload ? req.headers.get("content-type") ?? "application/octet-stream" : "application/json" } : {}),
      },
      body: hasBody ? (upload ? await req.arrayBuffer() : await req.text()) : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "The server could not be reached. Try again." }, { status: 502 });
  }
  if (EVIDENCE_FILE.test(path) && upstream.ok) {
    return new NextResponse(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
        "Content-Disposition": "attachment",
        "Cache-Control": "private, no-store",
      },
    });
  }
  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const GET = forward;
export const POST = forward;
