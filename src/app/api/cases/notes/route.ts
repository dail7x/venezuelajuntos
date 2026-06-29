import { NextResponse } from "next/server";
import { getDb, hasDatabaseEnv } from "@/lib/db";
import { nanoid } from "nanoid";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const caseId = url.searchParams.get("caseId");

  if (!caseId) {
    return NextResponse.json({ error: "missing_case_id" }, { status: 400 });
  }

  if (!hasDatabaseEnv()) {
    return NextResponse.json({ data: [] });
  }

  try {
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT * FROM notas_persona WHERE person_id = ? ORDER BY creado_en DESC",
      args: [caseId],
    });

    const notes = result.rows.map((row) => ({
      id: String(row.id),
      personId: String(row.person_id),
      createdAt: Number(row.creado_en),
      source: String(row.origen),
      authorName: String(row.nombre_reportante || "Anónimo"),
      authorContact: String(row.contacto_reportante || ""),
      authorRole: String(row.author_role || "user"),
      noteStatus: String(row.note_status || ""),
      text: String(row.text),
    }));

    return NextResponse.json({ data: notes });
  } catch (error) {
    console.error("Failed to fetch notes", error);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.caseId || !body?.text) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (!hasDatabaseEnv()) {
    return NextResponse.json({ error: "no_db_configured" }, { status: 500 });
  }

  try {
    const db = getDb();
    const id = nanoid(10);
    const now = Date.now();

    await db.execute({
      sql: `INSERT INTO notas_persona (
        id, person_id, creado_en, source, nombre_reportante, contacto_reportante, author_role, note_status, text
      ) VALUES (?, ?, ?, 'web_form', ?, ?, ?, ?, ?)`,
      args: [
        id,
        body.caseId,
        now,
        body.authorName?.trim() || "Anónimo",
        body.authorContact?.trim() || "",
        body.authorRole || "user",
        body.noteStatus || "",
        body.text.trim(),
      ],
    });

    return NextResponse.json({
      ok: true,
      data: {
        id,
        personId: body.caseId,
        createdAt: now,
        source: "web_form",
        authorName: body.authorName || "Anónimo",
        authorContact: body.authorContact || "",
        authorRole: body.authorRole || "user",
        noteStatus: body.noteStatus || "",
        text: body.text,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to save note", error);
    return NextResponse.json({ error: "db_save_failed" }, { status: 500 });
  }
}
