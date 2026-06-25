import { NextResponse } from "next/server";
import { seedCases } from "@/lib/data";

export async function GET() {
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    data: seedCases.filter((item) => item.kind === "help"),
    privacy: "Datos de contacto y ubicaciones exactas excluidos de export publico.",
  });
}
