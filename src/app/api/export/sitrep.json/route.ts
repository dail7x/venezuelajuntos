import { NextResponse } from "next/server";
import { getStats, seedCases } from "@/lib/data";

export async function GET() {
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    stats: getStats(),
    topAffectedZones: seedCases.map((item) => ({
      name: item.zone,
      status: item.estado_actual,
      lat: item.lat,
      lng: item.lng,
    })),
  });
}
