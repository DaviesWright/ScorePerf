import { NextRequest, NextResponse } from "next/server";
import {
  availableContexts,
  switchContext,
  type ArchitecturalRoleCode,
} from "../../../../domain/orgCore";
import {
  SEEDED_EMPLOYEES,
  SEEDED_EMPLOYMENT_EDGES,
} from "../../../../data/enterpriseSeedData";

const CONTEXT_COOKIE = "scoreview_context_token";

function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // allow SSR / direct same-origin fetches
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    contextId?: unknown;
    employeeId?: unknown;
    userId?: unknown;
    fromContext?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const contextId = typeof body.contextId === "string" ? body.contextId : "";
  const rawEmpId = typeof body.employeeId === "string" ? body.employeeId : "1";
  const userId = typeof body.userId === "string" ? body.userId : rawEmpId;
  const fromContext =
    body.fromContext === "ESS" || body.fromContext === "MSS" || body.fromContext === "HRMS"
      ? body.fromContext
      : null;

  if (!contextId) {
    return NextResponse.json(
      { error: "Missing contextId", code: "VAL-CTX-001" },
      { status: 400 },
    );
  }

  // Re-resolve held roles & org-graph scope server-side (never trust client-claimed experience/scope)
  const matchedSeed = SEEDED_EMPLOYEES.find(
    (e) => String(e.id) === rawEmpId || e.staffId === rawEmpId || e.email === rawEmpId,
  );

  const roles: ArchitecturalRoleCode[] = matchedSeed
    ? matchedSeed.architecturalRoles ?? [matchedSeed.architecturalRole]
    : ["SUPER_ADMIN", "HR_MANAGER"];

  const available = availableContexts({
    employeeId: matchedSeed ? String(matchedSeed.id) : rawEmpId,
    roles,
    departmentName: matchedSeed?.departmentName ?? "Executive Leadership",
    assignedHrUnits: matchedSeed?.assignedHrUnits,
    edges: matchedSeed ? SEEDED_EMPLOYMENT_EDGES : undefined,
  });

  const result = switchContext({
    available,
    requestedContextId: contextId,
    userId,
    employeeId: matchedSeed ? String(matchedSeed.id) : rawEmpId,
    fromContext,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.reason,
        code: result.code,
        available,
      },
      { status: 403 },
    );
  }

  const res = NextResponse.json(
    {
      context: result.context,
      token: result.token,
      audit: result.audit,
      available,
    },
    { status: 200 },
  );

  res.cookies.set({
    name: CONTEXT_COOKIE,
    value: JSON.stringify({
      contextId: result.token.contextId,
      context: result.token.context,
      role: result.token.role,
      scopeType: result.token.scopeType,
      scopeId: result.token.scopeId,
      expiresAt: result.token.expiresAt,
    }),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 1800,
  });

  return res;
}

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(CONTEXT_COOKIE)?.value;
  if (!cookie) {
    return NextResponse.json({ active: null }, { status: 200 });
  }
  try {
    const parsed = JSON.parse(cookie);
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ active: null, expired: true }, { status: 200 });
    }
    return NextResponse.json({ active: parsed }, { status: 200 });
  } catch {
    return NextResponse.json({ active: null }, { status: 200 });
  }
}
