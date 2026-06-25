import { NextResponse } from "next/server";
import { getDb, hasDatabaseEnv } from "@/lib/db";
import { nanoid } from "nanoid";

export const maxDuration = 300; 

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasDatabaseEnv()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const db = getDb();
  let page = 1;
  const pageSize = 100;
  let hasMore = true;
  let totalUpdated = 0;

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  try {
    while (hasMore) {
      if (page > 1) await delay(2000); 

      let res;
      let success = false;
      let retryCount = 0;
      
      while (!success && retryCount < 5) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); 

        try {
          res = await fetch(
            `https://desaparecidos-terremoto-api.theempire.tech/api/personas?pageSize=${pageSize}&page=${page}&estado=localizado`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          
          if (!res.ok) {
            console.error(`Failed to fetch localizados page ${page}: ${res.statusText}`);
            retryCount++;
            await delay(5000); 
            continue;
          }
          success = true;
        } catch (err: any) {
          console.error(`Fetch error on page ${page}:`, err.message);
          retryCount++;
          await delay(5000); 
        }
      }

      if (!success || !res) {
        console.error(`Giving up on page ${page}. Aborting update-status.`);
        break; 
      }
      
      const json = await res.json();
      const items = json.items;

      if (!items || items.length === 0) {
        break;
      }
      
      let pageHasUpdates = false;

      for (const p of items) {
        const id = `ext-${p.id}`;
        
        // Find if we have this person as missing
        const existingRes = await db.execute({
          sql: `SELECT id, status, updated_at FROM persons WHERE id = ?`,
          args: [id]
        });
        
        const existingRow = existingRes.rows[0];
        
        if (!existingRow) {
          // If we don't have it, wait for sync-external to pick it up, or it was deleted.
          continue;
        }
        
        // If it's already located in our DB and updated_at matches, skip.
        // Or if we already processed this localization.
        if (existingRow.status === 'located' && Number(existingRow.updated_at) >= Number(p.updatedAt)) {
          continue; 
        }

        pageHasUpdates = true;

        if (existingRow.status !== 'located' || Number(existingRow.updated_at) < Number(p.updatedAt)) {
          const finderInfo = `Reportado por: ${p.localizadoPor || 'Desconocido'} 
Contacto: ${p.localizadoContacto || 'N/A'}
Relación: ${p.localizadoRelacion || 'N/A'}
Nota original: ${p.localizadoNota || ''}`.trim();

          // Update person status
          await db.execute({
            sql: `UPDATE persons SET 
                  status = 'located', 
                  updated_at = ?,
                  found_at = ?,
                  found_notes = ?
                  WHERE id = ?`,
            args: [
              p.updatedAt || Date.now(), 
              p.updatedAt || Date.now(),
              finderInfo,
              id
            ]
          });

          // Add a community note if they just transitioned from missing to located
          if (existingRow.status === 'missing') {
            await db.execute({
              sql: `INSERT INTO person_notes (id, person_id, created_at, source, author_name, author_contact, note_type, content) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                `pn_${nanoid(10)}`, 
                id, 
                Date.now(), 
                'community_update', 
                p.localizadoPor || 'Sistema', 
                p.localizadoContacto || '', 
                'status_update', 
                `Persona localizada. ${finderInfo}`
              ]
            });
            totalUpdated++;
          }
        }
      }

      if (!pageHasUpdates) {
        console.log(`Page ${page} localizados had no new updates to process. Stopping early.`);
        break; 
      }

      if (page >= json.totalPages) {
        hasMore = false;
      } else {
        page++;
      }
    }
    
    return NextResponse.json({ success: true, updated: totalUpdated });
  } catch (err) {
    console.error("Update status error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
