import { NextResponse } from "next/server";
import { getDb, hasDatabaseEnv } from "@/lib/db";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.id || !body?.fullName) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const adminPassword = "HACKERS$Ux.";
  if (body.adminPassword !== adminPassword) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!hasDatabaseEnv()) {
    return NextResponse.json({ error: "no_db_configured" }, { status: 500 });
  }

  try {
    const db = getDb();
    const now = Date.now();

    // Fetch existing case to check if status changed
    const existing = await db.execute({
      sql: "SELECT status, full_name FROM persons WHERE id = ?",
      args: [body.id],
    });

    const previousStatus = existing.rows[0]?.status;
    const previousName = existing.rows[0]?.full_name;

    // Update case in DB
    await db.execute({
      sql: `UPDATE persons SET 
        full_name = ?,
        alternate_names = ?,
        age_estimated = ?,
        sex = ?,
        physical_desc = ?,
        clothing_desc = ?,
        last_seen_address = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?`,
      args: [
        body.fullName.trim(),
        body.alternateNames?.trim() || null,
        body.age ? Number(body.age) : null,
        body.sex || null,
        body.physicalDesc?.trim() || null,
        body.clothingDesc?.trim() || null,
        body.lastSeenAddress?.trim() || null,
        body.status || "missing",
        now,
        body.id,
      ],
    });

    // Log the action in person_notes
    const noteId = nanoid(10);
    let noteText = "Ficha editada por el administrador.";
    if (previousStatus && previousStatus !== body.status) {
      noteText = `Estado actualizado de '${previousStatus}' a '${body.status}' por el administrador.`;
    } else if (previousName && previousName !== body.fullName) {
      noteText = `Nombre editado de '${previousName}' a '${body.fullName}' por el administrador.`;
    }

    await db.execute({
      sql: `INSERT INTO person_notes (
        id, person_id, created_at, source, author_name, author_role, note_status, text
      ) VALUES (?, ?, ?, 'web_form', 'Administrador', 'admin', ?, ?)`,
      args: [
        noteId,
        body.id,
        now,
        body.status || "missing",
        noteText,
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update case", error);
    return NextResponse.json({ error: "db_update_failed" }, { status: 500 });
  }
}
