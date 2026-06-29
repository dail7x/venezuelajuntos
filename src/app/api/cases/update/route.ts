import { NextResponse } from "next/server";
import { getDb, hasDatabaseEnv } from "@/lib/db";
import { nanoid } from "nanoid";
import { uploadReportImage } from "@/lib/storage";

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
      sql: "SELECT estado_actual, nombre_completo FROM personas WHERE id = ?",
      args: [body.id],
    });

    const previousStatus = existing.rows[0]?.status;
    const previousName = existing.rows[0]?.nombre_completo;

    // Update case in DB
    await db.execute({
      sql: `UPDATE personas SET 
        nombre_completo = ?,
        nombres_alternativos = ?,
        edad_estimada = ?,
        sex = ?,
        descripcion_fisica = ?,
        descripcion_vestimenta = ?,
        ultima_direccion_conocida = ?,
        estado_actual = ?,
        actualizado_en = ?
      WHERE id = ?`,
      args: [
        body.fullName.trim(),
        body.alternateNames?.trim() || null,
        body.age ? Number(body.age) : null,
        body.sex || null,
        body.physicalDesc?.trim() || null,
        body.clothingDesc?.trim() || null,
        body.lastSeenAddress?.trim() || null,
        body.estado_actual || "missing",
        now,
        body.id,
      ],
    });

    let newPhotoUrl = null;
    if (body.photoDataUrl) {
      newPhotoUrl = await uploadReportImage(body.photoDataUrl, "personas");
      if (newPhotoUrl) {
        await db.execute({
          sql: "UPDATE personas SET url_foto = ? WHERE id = ?",
          args: [newPhotoUrl.url, body.id],
        });
      }
    }

    // Log the action in notas_persona
    const noteId = nanoid(10);
    let noteText = "Ficha editada por el administrador.";
    if (previousStatus && previousStatus !== body.estado_actual) {
      noteText = `Estado actualizado de '${previousStatus}' a '${body.estado_actual}' por el administrador.`;
    } else if (previousName && previousName !== body.fullName) {
      noteText = `Nombre editado de '${previousName}' a '${body.fullName}' por el administrador.`;
    }

    await db.execute({
      sql: `INSERT INTO notas_persona (
        id, person_id, creado_en, source, nombre_reportante, author_role, note_status, text
      ) VALUES (?, ?, ?, 'web_form', 'Administrador', 'admin', ?, ?)`,
      args: [
        noteId,
        body.id,
        now,
        body.estado_actual || "missing",
        noteText,
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update case", error);
    return NextResponse.json({ error: "db_update_failed" }, { status: 500 });
  }
}
