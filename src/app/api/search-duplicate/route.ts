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
          sql: `SELECT id, nombre_completo, estado_actual, zona_ubicacion FROM personas WHERE cedula_identidad = ? AND esta_eliminado = 0 LIMIT 1`,
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
        sql: `SELECT id, nombre_completo, estado_actual, zona_ubicacion FROM personas 
              WHERE LOWER(nombre_completo) LIKE ? AND zona_ubicacion = ? AND esta_eliminado = 0 LIMIT 1`,
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
