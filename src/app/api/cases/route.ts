import { NextResponse } from "next/server";
import { createCaseInDb, getPublicCasesFromDb } from "@/lib/cases-db";
import { hasDatabaseEnv } from "@/lib/db";
import { normalizeSlug, seedCases } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "99", 10);
  const query = searchParams.get("query") || "";
  const zone = searchParams.get("zone") || "";
  const status = searchParams.get("status") || "";

  try {
    const data = await getPublicCasesFromDb(page, limit, query, zone, status);
    return NextResponse.json({ 
      data: data.items, 
      total: data.total, 
      page, 
      limit, 
      source: "db" 
    });
  } catch (error) {
    console.error("cases_get_failed", error);
    return NextResponse.json({ 
      data: seedCases, 
      total: seedCases.length,
      page: 1,
      limit: 100,
      source: "seed", 
      error: "db_unavailable" 
    });
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
