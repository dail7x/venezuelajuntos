import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  
  if (!id) return NextResponse.json({ error: "No ID provided" }, { status: 400 });
  
  try {
    const db = getDb();
    const res = await db.execute({
      sql: `SELECT * FROM personas WHERE id = ?`,
      args: [id]
    });
    
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    
    const row = res.rows[0];
    
    // Very simple mapping for the side-by-side view
    return NextResponse.json({
      id: row.id,
      title: row.nombre_completo || "Desconocido",
      zone: row.zona_ubicacion || row.ultima_direccion_conocida || "Desconocida",
      description: row.descripcion_fisica || "",
      photoUrl: row.url_foto || null,
      status: row.estado_actual,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
