import { NextResponse } from "next/server";
import { createCaseInDb, getPublicCasesFromDb } from "@/lib/cases-db";
import { hasDatabaseEnv } from "@/lib/db";
import { normalizeSlug, seedCases } from "@/lib/data";

export async function GET() {
  try {
    const data = await getPublicCasesFromDb();
    return NextResponse.json({ data, source: "db" });
  } catch (error) {
    console.error("cases_get_failed", error);
    return NextResponse.json({ data: seedCases, source: "seed", error: "db_unavailable" });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.kind || !body?.payload) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const result = await createCaseInDb(body.kind, body.payload);
    return NextResponse.json({ ...result, duplicateCandidates: [] }, { status: 201 });
  } catch (error) {
    console.error("cases_post_failed", error);
    if (hasDatabaseEnv()) {
      return NextResponse.json({ error: "case_save_failed" }, { status: 500 });
    }
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
