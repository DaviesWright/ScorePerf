import { NextRequest, NextResponse } from "next/server";
import { API_BASE, SESSION_COOKIE } from "../../../lib/session";

// Same-origin proxy for the dashboard API. Reads the httpOnly session cookie on the server and forwards it as a
// Bearer token. Read-only: GET only.

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/api/v1/dashboard${req.nextUrl.search}`, {
      headers: { Authorization: `Bearer ${token}` },
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
