import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    app: "hr-frontend",
    framework: "Next.js 15",
    timestamp: new Date().toISOString(),
  });
}

