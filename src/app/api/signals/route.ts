import { NextResponse } from "next/server";
import { getDb, hasDatabaseEnv } from "@/lib/db";
import { nanoid } from "nanoid";

const validSignals = new Set(["confirmed", "canHelp", "duplicate", "falseReport", "resolved"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.caseId || !validSignals.has(body.type)) {
    return NextResponse.json({ error: "invalid_signal" }, { status: 400 });
  }

  if (!hasDatabaseEnv()) {
    return NextResponse.json({ ok: true });
  }

  try {
    const db = getDb();
    const now = Date.now();
    const caseId = body.caseId;
    const type = body.type;

    // Check personas table
    const personRes = await db.execute({
      sql: "SELECT id, estado_actual, nombre_completo FROM personas WHERE id = ?",
      args: [caseId],
    });

    if (personRes.rows.length > 0) {
      if (type === "resolved") {
        await db.execute({
          sql: "UPDATE personas SET estado_actual = 'located', actualizado_en = ? WHERE id = ?",
          args: [now, caseId],
        });

        // Insert a log note
        await db.execute({
          sql: `INSERT INTO notas_persona (
            id, person_id, creado_en, source, nombre_reportante, author_role, note_status, text
          ) VALUES (?, ?, ?, 'signal', 'Señal ciudadana', 'system', 'located', ?)`,
          args: [
            nanoid(10),
            caseId,
            now,
            "El caso fue marcado como 'Ya apareció' mediante reporte ciudadano.",
          ],
        });
      } else if (type === "confirmed") {
        await db.execute({
          sql: "UPDATE personas SET actualizado_en = ? WHERE id = ?",
          args: [now, caseId],
        });

        // Insert a log note
        await db.execute({
          sql: `INSERT INTO notas_persona (
            id, person_id, creado_en, source, nombre_reportante, author_role, note_status, text
          ) VALUES (?, ?, ?, 'signal', 'Señal ciudadana', 'system', 'missing', ?)`,
          args: [
            nanoid(10),
            caseId,
            now,
            "Se recibió confirmación ciudadana de que el caso sigue activo.",
          ],
        });
      }
    } else {
      // Check reportes_mascotas table
      const petRes = await db.execute({
        sql: "SELECT id, estado_actual FROM reportes_mascotas WHERE id = ?",
        args: [caseId],
      });

      if (petRes.rows.length > 0) {
        if (type === "resolved") {
          await db.execute({
            sql: "UPDATE reportes_mascotas SET estado_actual = 'located', actualizado_en = ? WHERE id = ?",
            args: [now, caseId],
          });
        }
      } else {
        // Check solicitudes_ayuda table
        const helpRes = await db.execute({
          sql: "SELECT id, estado_actual FROM solicitudes_ayuda WHERE id = ?",
          args: [caseId],
        });

        if (helpRes.rows.length > 0) {
          if (type === "resolved") {
            await db.execute({
              sql: "UPDATE solicitudes_ayuda SET estado_actual = 'fulfilled', actualizado_en = ? WHERE id = ?",
              args: [now, caseId],
            });
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      audit: {
        caseId: body.caseId,
        type: body.type,
        receivedAt: new Date(now).toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to process signal", error);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
