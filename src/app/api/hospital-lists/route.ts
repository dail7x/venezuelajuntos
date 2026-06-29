import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { nanoid } from "nanoid";
import { extractNamesFromHospitalList } from "@/lib/cloudflare-ai";
import { uploadReportImage } from "@/lib/storage";
import * as xlsx from "xlsx";

export async function GET(request: Request) {
  try {
    const db = getDb();
    
    // Fetch all lists
    const listsRes = await db.execute({
      sql: `SELECT * FROM listas_hospital ORDER BY creado_en DESC`,
      args: []
    });

    // Fetch all items
    const itemsRes = await db.execute({
      sql: `SELECT * FROM elementos_lista_hospital ORDER BY creado_en DESC`,
      args: []
    });

    const lists = listsRes.rows;
    const items = itemsRes.rows;

    // Group items by list
    const grouped = lists.map((list: any) => ({
      ...list,
      items: items.filter((item: any) => item.lista_id === list.id)
    }));

    return NextResponse.json({ success: true, lists: grouped });
  } catch (error: any) {
    console.error("Error fetching hospital lists:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const incomingSourceType = formData.get("sourceType") as "file" | "link";
    const file = formData.get("file") as File | null;
    const url = formData.get("url") as string | null;
    const manualHospitalName = formData.get("manualHospitalName") as string | null;
    const listDate = formData.get("listDate") as string | null;

    if (!incomingSourceType || (incomingSourceType === "file" && !file) || (incomingSourceType === "link" && !url)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let sourceData = "";
    let savedPhotoUrl = "";
    let actualSourceType: "image" | "excel" | "tweet" | "pdf" = "tweet";

    if (incomingSourceType === "file" && file) {
      const mimeType = file.type;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (mimeType.startsWith("image/")) {
        actualSourceType = "image";
        const base64 = buffer.toString("base64");
        sourceData = base64; // pass raw base64 to AI

        const dataUrl = `data:${mimeType};base64,${base64}`;
        const uploadRes = await uploadReportImage(dataUrl, "hospital_lists");
        if (uploadRes) {
          savedPhotoUrl = uploadRes.url;
        }
      } else if (mimeType === "application/pdf" || file.name.endsWith(".pdf")) {
        actualSourceType = "pdf";
        if (typeof global !== "undefined" && typeof global.DOMMatrix === "undefined") {
          (global as any).DOMMatrix = class DOMMatrix {};
        }
        // Use eval to prevent Turbopack from eagerly evaluating it on route load
        const pdfParse = eval("require('pdf-parse')");
        const pdfData = await pdfParse(buffer);
        sourceData = pdfData.text;
      } else {
        // Assume Excel/CSV
        actualSourceType = "excel";
        const workbook = xlsx.read(arrayBuffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = xlsx.utils.sheet_to_json(worksheet);
        sourceData = JSON.stringify(json);
      }
    } else if (incomingSourceType === "link" && url) {
      actualSourceType = "tweet";
      sourceData = url;
    }

    // Call Cloudflare AI
    const parsedData = await extractNamesFromHospitalList(
      actualSourceType as any, 
      sourceData, 
      { 
        manualHospitalName: manualHospitalName || undefined, 
        listDate: listDate || undefined 
      }
    );

    const db = getDb();
    const listId = `hl_${nanoid(10)}`;
    
    // Priority: manual name > AI extracted name > "Centro no especificado"
    const hospitalName = manualHospitalName || parsedData.hospital_name || "Centro no especificado";

    // 1. Insert the hospital list evidence
    await db.execute({
      sql: `INSERT INTO listas_hospital (id, creado_en, tipo_origen, url_origen, nombre_hospital, fecha_lista, estado) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [listId, Date.now(), actualSourceType, actualSourceType === "image" ? savedPhotoUrl : url, hospitalName, listDate || null, 'procesado']
    });

    const people = parsedData.people || [];

    // 2. Process each person
    for (const person of people) {
      const itemId = `hli_${nanoid(10)}`;
      const fullName = person.full_name || "Desconocido";
      
      // Search for matches in personas table
      const matchRes = await db.execute({
        sql: `SELECT id FROM personas WHERE esta_eliminado = 0 AND nombre_completo LIKE ? LIMIT 1`,
        args: [`%${fullName.split(" ")[0]}%${fullName.split(" ").pop()}%`] // Basic match first and last name
      });

      const matchedPersonId = matchRes.rows[0]?.id as string | undefined;

      // Create item in elementos_lista_hospital
      await db.execute({
        sql: `INSERT INTO elementos_lista_hospital 
              (id, lista_id, creado_en, nombre_completo, cedula_identidad, edad_estimada, estado, estado_coincidencia, persona_id_coincidente) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          itemId, listId, Date.now(), fullName, 
          person.cedula_identidad || null, 
          person.age_estimated || null, 
          person.status || 'localizado', 
          matchedPersonId ? 'posible_coincidencia' : 'nuevo_registro', 
          matchedPersonId || null
        ]
      });

      if (matchedPersonId) {
        // Create an update/note in notas_persona
        await db.execute({
          sql: `INSERT INTO notas_persona 
                (id, persona_id, creado_en, origen, rol_autor, texto, url_foto, direccion_ubicacion) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            `pn_${nanoid(10)}`, 
            matchedPersonId, 
            Date.now(), 
            'lista_hospital', 
            'admin', 
            `Posible coincidencia encontrada en lista de hospital/refugio (${hospitalName}). Estado reportado: ${person.status || 'localizado'}. Revisa la fuente original para verificar.`, 
            actualSourceType === "image" ? savedPhotoUrl : url,
            hospitalName
          ]
        });
        
        // Update person's actualizado_en
        await db.execute({
          sql: `UPDATE personas SET actualizado_en = ? WHERE id = ?`,
          args: [Date.now(), matchedPersonId]
        });
      } else {
        // Create a completely new person record in personas
        const newPersonId = `p_${nanoid(16)}`;
        await db.execute({
          sql: `INSERT INTO personas 
                (id, creado_en, actualizado_en, origen, nombre_completo, cedula_identidad, edad_estimada, estado_actual, direccion_encontrado, url_foto) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            newPersonId, Date.now(), Date.now(), 
            'lista_hospital', fullName, 
            person.cedula_identidad || null, 
            person.age_estimated || null, 
            'encontrado', // Or localizado depending on what their frontend expects, map located/deceased here. I'll just put encontrado
            hospitalName,
            actualSourceType === "image" ? savedPhotoUrl : url
          ]
        });
      }
    }

    return NextResponse.json({ success: true, processed: people.length });
  } catch (error: any) {
    console.error("Error processing hospital list:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
