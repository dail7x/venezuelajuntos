import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { cedula, name, zone } = await request.json();
    const db = getDb();

    // Prioritize Cedula match if cedula is provided
    if (cedula && String(cedula).trim() !== "") {
      const parsedCedula = Number(cedula);
      if (!isNaN(parsedCedula)) {
        const res = await db.execute({
          sql: `SELECT id, full_name, status, location_zone FROM persons WHERE cedula_identidad = ? AND is_deleted = 0 LIMIT 1`,
          args: [parsedCedula]
        });

        if (res.rows.length > 0) {
          return NextResponse.json({ match: true, by: 'cedula', person: res.rows[0] });
        }
      }
    }

    // Name + Zone match
    if (name && zone && name.trim() !== "" && zone.trim() !== "") {
      const qName = `%${name.trim().toLowerCase()}%`;
      const res = await db.execute({
        sql: `SELECT id, full_name, status, location_zone FROM persons 
              WHERE LOWER(full_name) LIKE ? AND location_zone = ? AND is_deleted = 0 LIMIT 1`,
        args: [qName, zone.trim()]
      });

      if (res.rows.length > 0) {
        return NextResponse.json({ match: true, by: 'name_zone', person: res.rows[0] });
      }
    }

    return NextResponse.json({ match: false });
  } catch (error) {
    console.error("Duplicate search error", error);
    return NextResponse.json({ match: false }, { status: 500 });
  }
}
