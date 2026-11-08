import { NextRequest, NextResponse } from "next/server";
import { API_BASE, SESSION_COOKIE } from "../../../../lib/session";

// Same-origin proxy for home-page content (announcements, birthdays, directory). Reads the httpOnly session cookie
// on the server and forwards it as a Bearer token. Only the listed paths are reachable; state-changing calls must
// come from this site.

const ALLOWED = /^(home|me|notifications|notifications\/read-all|notifications\/\d{1,9}\/read|reporting-lines|reporting-lines\/me|reporting-lines\/import|strategy|strategy\/import|performance\/settings|performance\/settings\/update|holidays|holidays\/\d{1,9}\/delete|leave\/types|leave\/types\/\d{1,9}\/update|announcements|announcements\/\d{1,9}\/archive|assets|assets\/me|assets\/overdue|assets\/overdue\.csv|assets\/export\.csv|assets\/team|assets\/categories|assets\/categories\/\d{1,9}\/update|assets\/write-offs\/pending|assets\/write-offs\/\d{1,9}\/decision|assets\/recovery-tasks|assets\/recovery-tasks\/\d{1,9}\/close|assets\/\d{1,9}\/(assign|return|history|write-off|update)|employees\/\d{1,9}\/offboard|org-chart|employees\/\d{1,9}\/role|employees\/\d{1,9}\/update|profile\/details|profile\/changes|profile\/changes\/pending|profile\/changes\/\d{1,9}\/decision|payslips|payslips\/\d{1,9}\/file|document-types|documents\/me|documents\/publish|documents\/publications|documents\/\d{1,9}\/(acknowledge|file)|performance\/me|leave\/me|approvals\/settings|approvals\/settings\/update|offices|offices\/\d{1,9}\/update|departments\/\d{1,9}\/office|integrations|integrations\/(business_central|seamless_hr|clay_hr|coursera)\/(update|test))$/;

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
  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/api/v1/${path}${req.nextUrl.search}`, {
      method: req.method,
      headers: { Authorization: `Bearer ${token}`, ...(hasBody ? { "Content-Type": "application/json" } : {}) },
      body: hasBody ? await req.text() : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "The server could not be reached. Try again." }, { status: 502 });
  }
  // PDFs (payslips and documents) pass through as bytes. Everything else is JSON, read as text.
  if ((upstream.headers.get("Content-Type") ?? "").startsWith("application/pdf")) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": upstream.headers.get("Content-Disposition") ?? "attachment",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  // CSV exports pass through with their download name. Only HR-only export routes return text/csv.
  if ((upstream.headers.get("Content-Type") ?? "").startsWith("text/csv")) {
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": upstream.headers.get("Content-Disposition") ?? "attachment",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
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
