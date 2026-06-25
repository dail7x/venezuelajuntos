import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  
  if (!id) return NextResponse.json({ error: "No ID provided" }, { status: 400 });
  
  try {
    const db = getDb();
    const res = await db.execute({
      sql: `SELECT * FROM persons WHERE id = ?`,
      args: [id]
    });
    
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    
    const row = res.rows[0];
    
    // Very simple mapping for the side-by-side view
    return NextResponse.json({
      id: row.id,
      title: row.full_name || "Desconocido",
      zone: row.location_zone || row.last_seen_address || "Desconocida",
      description: row.physical_desc || "",
      photoUrl: row.photo_url || null,
      status: row.status,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
