// Shared by server code (page.tsx, the session route). The API token lives in an httpOnly cookie so page
// scripts never see it; server components read it and send it to the API as a Bearer token.
export const SESSION_COOKIE = "scoreview_token";
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

/** Demo mode keeps the old persona picker (no real sign-in). Off unless NEXT_PUBLIC_DEMO_LOGIN=1. */
export const DEMO_LOGIN = process.env.NEXT_PUBLIC_DEMO_LOGIN === "1";
