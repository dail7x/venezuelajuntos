import { NextResponse } from "next/server";
import { getGlobalStatsFromDb } from "@/lib/cases-db";

export async function GET() {
  const stats = await getGlobalStatsFromDb();
  return NextResponse.json(stats);
}
