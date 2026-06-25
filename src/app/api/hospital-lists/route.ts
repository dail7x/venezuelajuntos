import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { nanoid } from "nanoid";
import { extractNamesFromHospitalList } from "@/lib/cloudflare-ai";
import { uploadReportImage } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const sourceType = formData.get("sourceType") as "image" | "tweet";
    const file = formData.get("file") as File | null;
    const url = formData.get("url") as string | null;

    if (!sourceType || (sourceType === "image" && !file) || (sourceType === "tweet" && !url)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let sourceData = "";
    let savedPhotoUrl = "";

    if (sourceType === "image" && file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");
      const mimeType = file.type || "image/jpeg";
      sourceData = base64; // pass raw base64 to AI

      const dataUrl = `data:${mimeType};base64,${base64}`;
      const uploadRes = await uploadReportImage(dataUrl, "hospital_lists");
      if (uploadRes) {
        savedPhotoUrl = uploadRes.url;
      }
    } else if (sourceType === "tweet" && url) {
      sourceData = url;
    }

    // Call Cloudflare AI
    const parsedData = await extractNamesFromHospitalList(sourceType, sourceData);

    const db = getDb();
    const listId = `hl_${nanoid(10)}`;
    const hospitalName = parsedData.hospital_name || "Hospital no especificado";

    // 1. Insert the hospital list evidence
    await db.execute({
      sql: `INSERT INTO hospital_lists (id, created_at, source_type, source_url, hospital_name, status) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [listId, Date.now(), sourceType, sourceType === "image" ? savedPhotoUrl : url, hospitalName, 'processed']
    });

    const people = parsedData.people || [];

    // 2. Process each person
    for (const person of people) {
      const itemId = `hli_${nanoid(10)}`;
      const fullName = person.full_name || "Desconocido";
      
      // Search for matches
      const matchRes = await db.execute({
        sql: `SELECT id FROM persons WHERE is_deleted = 0 AND full_name LIKE ? LIMIT 1`,
        args: [`%${fullName.split(" ")[0]}%${fullName.split(" ").pop()}%`] // Basic match first and last name
      });

      const matchedPersonId = matchRes.rows[0]?.id as string | undefined;

      // Create item in hospital_list_items
      await db.execute({
        sql: `INSERT INTO hospital_list_items 
              (id, list_id, created_at, full_name, cedula_identidad, age_estimated, status, match_status, matched_person_id) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          itemId, listId, Date.now(), fullName, 
          person.cedula_identidad || null, 
          person.age_estimated || null, 
          person.status || 'located', 
          matchedPersonId ? 'possible_match' : 'created_new', 
          matchedPersonId || null
        ]
      });

      if (matchedPersonId) {
        // Create an update/note
        await db.execute({
          sql: `INSERT INTO person_notes 
                (id, person_id, created_at, source, author_role, text, photo_url, location_address) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            `pn_${nanoid(10)}`, 
            matchedPersonId, 
            Date.now(), 
            'hospital_list', 
            'admin', 
            `Posible coincidencia encontrada en lista de hospital (${hospitalName}). Estado reportado: ${person.status || 'Localizado'}. Revisa la fuente original para verificar.`, 
            sourceType === "image" ? savedPhotoUrl : url,
            hospitalName
          ]
        });
        
        // Update person's updated_at
        await db.execute({
          sql: `UPDATE persons SET updated_at = ? WHERE id = ?`,
          args: [Date.now(), matchedPersonId]
        });
      } else {
        // Create a completely new person record
        const newPersonId = `p_${nanoid(16)}`;
        await db.execute({
          sql: `INSERT INTO persons 
                (id, created_at, updated_at, source, full_name, cedula_identidad, age_estimated, status, found_address, photo_url) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            newPersonId, Date.now(), Date.now(), 
            'hospital_list', fullName, 
            person.cedula_identidad || null, 
            person.age_estimated || null, 
            'located', // User requested to map all (including deceased) to located for now
            hospitalName,
            sourceType === "image" ? savedPhotoUrl : url
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
