import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  
  if (!body || !body.caseId || typeof body.isDuplicate !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { caseId, isDuplicate } = body;
  const db = getDb();

  try {
    const existing = await db.execute({
      sql: `SELECT potential_duplicate_of FROM persons WHERE id = ?`,
      args: [caseId]
    });
    
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    
    const duplicateOf = existing.rows[0].potential_duplicate_of;
    
    if (isDuplicate) {
      // Mark as duplicate and hide from main views
      await db.execute({
        sql: `UPDATE persons 
              SET status = 'duplicate', duplicate_of = ?, potential_duplicate_of = NULL 
              WHERE id = ?`,
        args: [duplicateOf, caseId]
      });
      
      // Also add a note for traceability
      await db.execute({
        sql: `INSERT INTO person_notes (id, person_id, created_at, text, author_name, author_role, note_status)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [`note-${Date.now()}`, caseId, Date.now(), `Marcado como posible ficha repetida por la comunidad. Ficha relacionada: ${duplicateOf}`, "Sistema", "admin", "duplicate"]
      });
    } else {
      // Clear the potential duplicate flag
      await db.execute({
        sql: `UPDATE persons SET potential_duplicate_of = NULL WHERE id = ?`,
        args: [caseId]
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
