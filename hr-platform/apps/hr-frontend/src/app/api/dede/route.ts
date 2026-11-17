import { NextRequest, NextResponse } from "next/server";

// Dede, the ScoReview assistant. Server-side only: the Anthropic key stays in the environment (ANTHROPIC_API_KEY)
// and is never sent to the browser. Requests must come from this site.

const FALLBACK_MODELS = [
  process.env.ANTHROPIC_MODEL,
  "claude-haiku-5-5",
  "claude-sonnet-5-5",
  "claude-fable-5-2",
  "claude-haiku-4-5-20251001",
].filter(Boolean) as string[];

const MAX_MESSAGES = 20;
const MAX_CHARS = 2000;

const SYSTEM_PROMPT = `Act as Dede, the AI assistant integrated within ScoReview. Your role is to help users by answering their questions and providing assistance related to ScoReview's features and functionality.
When responding:
- Answer questions clearly and concisely, prioritizing accuracy over speculation.
- If you are unsure about a ScoReview-specific detail (e.g., a feature, setting, or workflow), say so rather than guessing, and suggest where the user can find authoritative information.
- Guide users step by step when they ask how to accomplish a task within ScoReview.
- Maintain a friendly, professional tone appropriate for a product assistant.
- Keep responses focused on the user's question; offer additional relevant tips only when they add clear value.
- Respond in the same language the user writes in.
If a request falls outside your scope as ScoReview's assistant, politely explain your limitations and redirect the user to appropriate resources.`;

function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const reqHost = req.headers.get("host");
    return (
      originHost === reqHost ||
      originHost.endsWith("bscscoreview.com") ||
      originHost.endsWith("workers.dev") ||
      originHost.startsWith("localhost")
    );
  } catch {
    return false;
  }
}

type Turn = { role: "user" | "assistant"; content: string };

function parseTurns(body: unknown): Turn[] | null {
  if (!body || typeof body !== "object" || !Array.isArray((body as { messages?: unknown }).messages)) return null;
  const raw = (body as { messages: unknown[] }).messages.slice(-MAX_MESSAGES);
  const turns: Turn[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const text = content.trim();
    if (!text || text.length > MAX_CHARS) return null;
    turns.push({ role, content: text });
  }
  // The conversation must start and end with the user's turn.
  if (turns.length === 0 || turns[0].role !== "user" || turns[turns.length - 1].role !== "user") return null;
  return turns;
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "Dede is not set up yet. Ask your administrator to add the AI key." }, { status: 503 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const turns = parseTurns(body);
  if (!turns) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  let reply = "";
  let lastError = "";
  for (const model of FALLBACK_MODELS) {
    try {
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 600, system: SYSTEM_PROMPT, messages: turns }),
        cache: "no-store",
      });
      if (upstream.ok) {
        const data = (await upstream.json().catch(() => ({}))) as { content?: { type: string; text?: string }[] };
        reply = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
        if (reply) break;
      } else {
        const errText = await upstream.text().catch(() => "");
        lastError = `${model}: HTTP ${upstream.status} - ${errText}`;
        console.warn(`Anthropic error: ${lastError}`);
      }
    } catch (e) {
      lastError = `${model}: fetch error ${e instanceof Error ? e.message : String(e)}`;
      console.warn(`Anthropic fetch exception: ${lastError}`);
    }
  }

  if (!reply) {
    return NextResponse.json(
      { error: "Dede could not answer right now. Try again in a moment." },
      { status: 502 }
    );
  }

  return NextResponse.json(
    { reply },
    { headers: { "Cache-Control": "no-store" } }
  );
}
