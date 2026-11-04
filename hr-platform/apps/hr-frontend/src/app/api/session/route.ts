import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "../../../lib/session";

// Stores the API access token in an httpOnly cookie after sign-in, and clears it on sign-out.
// The token is verified by the API on every request; this route only keeps it out of page scripts.

const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const MAX_TOKEN_LENGTH = 4096;

// Reject cross-site requests: without this, another site could sign a visitor in as the attacker.
function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { accessToken?: unknown; expiresIn?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { accessToken, expiresIn } = body;
  if (
    typeof accessToken !== "string" ||
    accessToken.length > MAX_TOKEN_LENGTH ||
    !JWT_SHAPE.test(accessToken) ||
    !Number.isInteger(expiresIn) ||
    (expiresIn as number) < 60 ||
    (expiresIn as number) > 3600
  ) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const res = new NextResponse(null, { status: 204 });
  res.cookies.set({
    name: SESSION_COOKIE,
    value: accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: expiresIn as number,
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}
