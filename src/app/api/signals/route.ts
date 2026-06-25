import { NextResponse } from "next/server";

const validSignals = new Set(["confirmed", "canHelp", "duplicate", "falseReport", "resolved"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.caseId || !validSignals.has(body.type)) {
    return NextResponse.json({ error: "invalid_signal" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    audit: {
      caseId: body.caseId,
      type: body.type,
      receivedAt: new Date().toISOString(),
    },
  });
}
