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
      sql: `SELECT posible_duplicado_de FROM personas WHERE id = ?`,
      args: [caseId]
    });
    
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    
    const duplicateOf = existing.rows[0].posible_duplicado_de;
    
    if (isDuplicate) {
      // Mark as duplicate and hide from main views
      await db.execute({
        sql: `UPDATE personas 
              SET estado_actual = 'duplicate', duplicado_de = ?, posible_duplicado_de = NULL 
              WHERE id = ?`,
        args: [duplicateOf, caseId]
      });
      
      // Also add a note for traceability
      await db.execute({
        sql: `INSERT INTO notas_persona (id, person_id, creado_en, text, nombre_reportante, author_role, note_status)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [`note-${Date.now()}`, caseId, Date.now(), `Marcado como posible registro duplicado, fue unificado por la comunidad con este reporte relacionado: [${duplicateOf}](/person/${duplicateOf})`, "Sistema", "admin", "duplicate"]
      });
    } else {
      // Clear the potential duplicate flag
      await db.execute({
        sql: `UPDATE personas SET posible_duplicado_de = NULL WHERE id = ?`,
        args: [caseId]
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
