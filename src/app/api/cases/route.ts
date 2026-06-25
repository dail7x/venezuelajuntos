import { NextResponse } from "next/server";
import { normalizeSlug, seedCases } from "@/lib/data";

export async function GET() {
  return NextResponse.json({ data: seedCases });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.kind || !body?.payload) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const title =
    body.payload.fullName ||
    body.payload.knownName ||
    body.payload.description?.slice(0, 80) ||
    body.payload.requestType ||
    "Reporte ciudadano";

  return NextResponse.json(
    {
      id: `tmp-${Date.now()}`,
      slug: normalizeSlug(title),
      status: "needs_verification",
      duplicateCandidates: seedCases
        .filter((item) => JSON.stringify(body.payload).toLowerCase().includes(item.zone.split(",")[0].toLowerCase()))
        .slice(0, 3)
        .map((item) => ({ id: item.id, title: item.title, zone: item.zone })),
    },
    { status: 201 },
  );
}
