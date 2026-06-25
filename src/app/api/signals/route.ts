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

    // Check persons table
    const personRes = await db.execute({
      sql: "SELECT id, status, full_name FROM persons WHERE id = ?",
      args: [caseId],
    });

    if (personRes.rows.length > 0) {
      if (type === "resolved") {
        await db.execute({
          sql: "UPDATE persons SET status = 'located', updated_at = ? WHERE id = ?",
          args: [now, caseId],
        });

        // Insert a log note
        await db.execute({
          sql: `INSERT INTO person_notes (
            id, person_id, created_at, source, author_name, author_role, note_status, text
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
          sql: "UPDATE persons SET updated_at = ? WHERE id = ?",
          args: [now, caseId],
        });

        // Insert a log note
        await db.execute({
          sql: `INSERT INTO person_notes (
            id, person_id, created_at, source, author_name, author_role, note_status, text
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
      // Check pet_reports table
      const petRes = await db.execute({
        sql: "SELECT id, status FROM pet_reports WHERE id = ?",
        args: [caseId],
      });

      if (petRes.rows.length > 0) {
        if (type === "resolved") {
          await db.execute({
            sql: "UPDATE pet_reports SET status = 'located', updated_at = ? WHERE id = ?",
            args: [now, caseId],
          });
        }
      } else {
        // Check help_requests table
        const helpRes = await db.execute({
          sql: "SELECT id, status FROM help_requests WHERE id = ?",
          args: [caseId],
        });

        if (helpRes.rows.length > 0) {
          if (type === "resolved") {
            await db.execute({
              sql: "UPDATE help_requests SET status = 'fulfilled', updated_at = ? WHERE id = ?",
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
