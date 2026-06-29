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
      if (page > 1) await delay(500); 

      let res;
      let success = false;
      let retryCount = 0;
      
      while (!success && retryCount < 5) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); 

        try {
          res = await fetch(
            `https://desaparecidos-terremoto-api.theempire.tech/api/personas?pageSize=${pageSize}&page=${page}&estado=localizado&sortBy=updatedAt&order=desc`,
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
        if (p.estado && p.estado.toLowerCase() !== 'localizado') {
          continue;
        }

        const id = `ext-${p.id}`;
        
        // Find if we have this person as missing
        const existingRes = await db.execute({
          sql: `SELECT id, estado_actual, actualizado_en FROM personas WHERE id = ?`,
          args: [id]
        });
        
        const existingRow = existingRes.rows[0];
        
        if (!existingRow) {
          // If we don't have it, wait for sync-external to pick it up, or it was deleted.
          continue;
        }
        
        // If it's already located in our DB and actualizado_en matches, skip.
        // Or if we already processed this localization.
        if (existingRow.estado_actual === 'located' && Number(existingRow.actualizado_en) >= Number(p.updatedAt)) {
          continue; 
        }

        pageHasUpdates = true;

        if (existingRow.estado_actual !== 'located' || Number(existingRow.actualizado_en) < Number(p.updatedAt)) {
          const finderInfo = `Reportado por: ${p.localizadoPor || 'Desconocido'} 
Contacto: ${p.localizadoContacto || 'N/A'}
Relación: ${p.localizadoRelacion || 'N/A'}
Nota original: ${p.localizadoNota || ''}`.trim();

          // Update person status
          await db.execute({
            sql: `UPDATE personas SET 
                  estado_actual = 'located', 
                  actualizado_en = ?,
                  encontrado_en = ?,
                  notas_hallazgo = ?
                  WHERE id = ?`,
            args: [
              p.updatedAt || Date.now(), 
              p.updatedAt || Date.now(),
              finderInfo,
              id
            ]
          });

          // Add a community note if they just transitioned from missing to located
          if (existingRow.estado_actual === 'missing') {
            const noteText = p.localizadoNota 
              ? p.localizadoNota 
              : (p.localizadoContacto 
                  ? `Contacto del reporte: ${p.localizadoContacto}` 
                  : 'Reporte confirmado como localizado.');

            await db.execute({
              sql: `INSERT INTO notas_persona (id, person_id, creado_en, source, nombre_reportante, contacto_reportante, text) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
              args: [
                `pn_${nanoid(10)}`, 
                id, 
                Date.now(), 
                'community_update', 
                p.localizadoPor || 'Sistema', 
                p.localizadoContacto || '', 
                noteText
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
