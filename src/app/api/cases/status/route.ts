import { NextResponse } from "next/server";
import { getDb, hasDatabaseEnv } from "@/lib/db";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.caseId || !body?.status || !body?.text) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (!hasDatabaseEnv()) {
    return NextResponse.json({ error: "no_db_configured" }, { status: 500 });
  }

  try {
    const db = getDb();
    const now = Date.now();
    const noteId = nanoid(10);

    const transactionSql = `
      BEGIN TRANSACTION;
      UPDATE persons SET status = ?, updated_at = ? WHERE id = ?;
      INSERT INTO person_notes (id, person_id, created_at, source, author_name, author_contact, author_role, note_status, text) 
      VALUES (?, ?, ?, 'web_form', ?, ?, 'user', ?, ?);
      COMMIT;
    `;

    // SQLite/Turso doesn't support multiple statements in a single execute string well,
    // so we execute them sequentially or use a transaction.
    await db.execute({ sql: "BEGIN TRANSACTION", args: [] });

    await db.execute({
      sql: "UPDATE persons SET status = ?, updated_at = ? WHERE id = ?",
      args: [body.status, now, body.caseId],
    });

    await db.execute({
      sql: `INSERT INTO person_notes (
        id, person_id, created_at, source, author_name, author_contact, author_role, note_status, text
      ) VALUES (?, ?, ?, 'web_form', ?, ?, 'user', ?, ?)`,
      args: [
        noteId,
        body.caseId,
        now,
        body.authorName?.trim() || "Anónimo",
        body.authorContact?.trim() || "",
        body.status,
        body.text.trim(),
      ],
    });

    await db.execute({ sql: "COMMIT", args: [] });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update status", error);
    try {
      const db = getDb();
      await db.execute({ sql: "ROLLBACK", args: [] });
    } catch (e) {}
    return NextResponse.json({ error: "db_update_failed" }, { status: 500 });
  }
}
