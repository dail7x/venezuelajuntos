import { NextResponse } from "next/server";
import { publicGeoJson, seedCases } from "@/lib/data";

export async function GET() {
  return NextResponse.json(publicGeoJson(seedCases.filter((item) => item.kind === "zone" || item.kind === "help")));
}
