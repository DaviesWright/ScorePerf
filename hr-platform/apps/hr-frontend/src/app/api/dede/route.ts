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

function getLocalDedeAnswer(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("leave") || q.includes("holiday") || q.includes("vacation") || q.includes("time off") || q.includes("roster")) {
    return "To manage your leave in ScoReview:\n\n1. Navigate to **Leave & Roster** in the navigation bar.\n2. Click **Apply for Leave** to select your leave type (Annual, Sick, Study, or Compassionate).\n3. Choose your date range—your squad coverage and team clash risk will be automatically evaluated in real-time.\n4. Submit your request for Line Manager and HR endorsement.";
  }
  if (q.includes("objective") || q.includes("goal") || q.includes("kr") || q.includes("bsc") || q.includes("okr") || q.includes("strategy")) {
    return "In ScoReview, objectives are governed under your cycle's active framework (Balanced Scorecard or OKR):\n\n• For **Balanced Scorecard (BSC)**, objectives are distributed across four perspectives: Financial, Customer, Internal Business Processes, and Learning & Growth.\n• Each objective has a target metric and weight. Ensure your weights total exactly 100% before submitting to your manager for approval.\n• Approved objectives are locked against mid-cycle tampering to maintain audit integrity.";
  }
  if (q.includes("scale") || q.includes("rating") || q.includes("score") || q.includes("calibrate") || q.includes("appraisal") || q.includes("review")) {
    return "ScoReview utilizes an executive 5-point calibrated rating scale:\n\n• **5.0 - Exceptional Performance**: Consistently exceeds all expectations.\n• **4.0 - Exceeds Target Expectations**: High achiever across major objectives.\n• **3.0 - Meets Target Expectations**: Fully meets agreed core responsibilities.\n• **2.0 - Needs Development**: Requires performance improvement plan.\n• **1.0 - Unsatisfactory**: Substantially below performance thresholds.\n\nAppraisals progress through Self-Assessment, Line Manager Review, and Calibration Board approval.";
  }
  if (q.includes("organogram") || q.includes("hierarchy") || q.includes("reporting") || q.includes("manager") || q.includes("solid") || q.includes("dotted")) {
    return "You can view the interactive organization structure under **Organogram** in the navigation bar:\n\n• **Solid Lines** represent direct administrative line managers who approve leave and performance appraisals.\n• **Dotted Lines** represent functional or project/matrix alignment (e.g. Squad Leads or Practice Directors).\n• Use the toggle filters at the top of the Organogram to switch between solid and dotted reporting relationships.";
  }
  if (q.includes("document") || q.includes("certificate") || q.includes("policy") || q.includes("contract") || q.includes("id")) {
    return "To manage your documents in ScoReview:\n\n1. Open **Document Centre** from the navigation bar.\n2. You can view company governance documents (Code of Conduct, Whistleblowing, Policies & Handbooks) and submit required employee documents (National ID, Academic Certificates, Signed Contract).\n3. HR Admin verifies all uploaded credentials for compliance.";
  }
  return "I'm Dede, your ScoReview AI assistant. You can ask me how to apply for leave, submit performance objectives, check the 5-point appraisal rating scale, navigate the company organogram, or upload compliance documents. How can I assist you today?";
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const turns = parseTurns(body);
  if (!turns) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const lastUserTurn = turns[turns.length - 1];

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ reply: getLocalDedeAnswer(lastUserTurn.content) });
  }

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
    reply = getLocalDedeAnswer(lastUserTurn.content);
  }

  return NextResponse.json(
    { reply },
    { headers: { "Cache-Control": "no-store" } }
  );
}
