import { NextResponse } from "next/server";
import { getDb, hasDatabaseEnv } from "@/lib/db";
import { normalizeAddressWithAI } from "@/lib/cloudflare-ai";

export const maxDuration = 300; // Allows up to 5 minutes on Vercel, ignored on self-hosted Node (Coolify)

export async function POST(request: Request) {
  // Simple auth to prevent abuse
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
  let totalImported = 0;
  
  // Limiting AI processing per cron run to avoid timeouts/rate limits
  let aiCallsRemaining = 0; // Disabled during sync as per user request to separate concerns
  let aiProcessedCount = 0;

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  try {
    while (hasMore) { 
      // Delay to respect API but maximize speed (500ms)
      if (page > 1) {
        await delay(500); 
      }

      let res;
      let success = false;
      let retryCount = 0;
      
      while (!success && retryCount < 5) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        try {
          res = await fetch(
            `https://desaparecidos-terremoto-api.theempire.tech/api/personas?pageSize=${pageSize}&page=${page}&sortBy=updatedAt&order=desc`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          
          if (!res.ok) {
            console.error(`Failed to fetch external API page ${page}: ${res.statusText}`);
            retryCount++;
            await delay(1000); // 1s retry
            continue;
          }
          
          success = true;
        } catch (err: any) {
          console.error(`Fetch error on page ${page}:`, err.message);
          retryCount++;
          await delay(1000); // Wait 1s before retrying
        }
      }

      if (!success || !res) {
        console.error(`Giving up on page ${page} after 5 retries. Aborting sync to avoid infinite loops.`);
        break; // Better to break than skip to prevent missing data gaps as user requested
      }
      
      const json = await res.json();
      const items = json.items;

      if (!items || items.length === 0) {
        hasMore = false;
        break;
      }
      
      let pageHasUpdates = false;

      for (const p of items) {
        const id = `ext-${p.id}`;
        const source = 'desaparecidosterremotovenezuela.com';
        const source_url = 'https://desaparecidosterremotovenezuela.com';
        const creado_en = p.createdAt || Date.now();
        const actualizado_en = p.updatedAt || Date.now();
        const nombre_completo = p.nombre || "Desconocido";
        const edad_estimada = p.edad || null;
        // Solo guardamos como missing inicialmente en este script rápido. 
        // Si ya viene localizado desde la API externa, podríamos saltarlo o guardarlo, 
        // pero preferiblemente que el update-status se encargue. 
        // Sin embargo, para no perderlos si fueron localizados el mismo día, los guardamos y el status lo maneja update-status.
        const estado_actual = p.estado === "localizado" ? "located" : "missing";
        const ultima_direccion_conocida = p.ubicacion || "Desconocida";
        const descripcion_fisica = p.descripcion || null;
        const url_foto = p.foto || null;
        const contacto_reportante = p.contacto || null;

        // Anti-Spam Filter
        const spamPattern = /infinityhotel\.it|casino|viagra|porn|seo services/i;
        const nameUrlPattern = /http:|https:|www\./i;
        
        if (
          spamPattern.test(nombre_completo) || spamPattern.test(ultima_direccion_conocida) || spamPattern.test(descripcion_fisica || '') ||
          nameUrlPattern.test(nombre_completo)
        ) {
          console.log(`Skipping SPAM record from API: ${id} - ${nombre_completo}`);
          continue; // Skip processing this record entirely
        }

        // Check if case already exists to see if we need AI normalization
        const existingRes = await db.execute({
          sql: `SELECT ubicacion_normalizada, zona_ubicacion, ultima_direccion_conocida, actualizado_en FROM personas WHERE id = ?`,
          args: [id]
        });
        
        let zona_ubicacion = null;
        let ubicacion_normalizada = null;
        
        const existingRow = existingRes.rows[0];
        
        // If it doesn't exist, or address changed, or hasn't been normalized yet, AND we have AI calls remaining
        if (
          (!existingRow || existingRow.ultima_direccion_conocida !== ultima_direccion_conocida || !existingRow.ubicacion_normalizada) 
          && aiCallsRemaining > 0 
          && ultima_direccion_conocida !== "Desconocida"
        ) {
          const aiResult = await normalizeAddressWithAI(ultima_direccion_conocida);
          zona_ubicacion = aiResult.zona_ubicacion;
          ubicacion_normalizada = aiResult.ubicacion_normalizada;
          aiCallsRemaining--;
          aiProcessedCount++;
        } else if (existingRow) {
          // Keep existing normalization if we don't parse it again
          zona_ubicacion = existingRow.zona_ubicacion;
          ubicacion_normalizada = existingRow.ubicacion_normalizada;
        }

        // Skip if already completely up to date
        if (existingRow && Number(existingRow.actualizado_en) === Number(actualizado_en)) {
          if (existingRow.ubicacion_normalizada) {
            continue; // purely up to date
          }
        }
        
        pageHasUpdates = true;

        // Duplicate detection: if this is a new record or hasn't been checked
        let posible_duplicado_de = null;
        if (!existingRow) {
          const dupRes = await db.execute({
            sql: `SELECT id FROM personas WHERE lower(nombre_completo) = lower(?) AND id != ? LIMIT 1`,
            args: [nombre_completo.trim(), id]
          });
          if (dupRes.rows.length > 0) {
            posible_duplicado_de = dupRes.rows[0].id;
          }
        }

        await db.execute({
          sql: `INSERT INTO personas (
            id, source, source_url, creado_en, actualizado_en, nombre_completo, edad_estimada, estado_actual, ultima_direccion_conocida, zona_ubicacion, ubicacion_normalizada, descripcion_fisica, url_foto, contacto_reportante, posible_duplicado_de
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            actualizado_en = excluded.actualizado_en,
            nombre_completo = excluded.nombre_completo,
            edad_estimada = excluded.edad_estimada,
            estado_actual = excluded.estado_actual,
            ultima_direccion_conocida = excluded.ultima_direccion_conocida,
            zona_ubicacion = COALESCE(excluded.zona_ubicacion, personas.zona_ubicacion),
            ubicacion_normalizada = COALESCE(excluded.ubicacion_normalizada, personas.ubicacion_normalizada),
            descripcion_fisica = excluded.descripcion_fisica,
            url_foto = excluded.url_foto,
            contacto_reportante = excluded.contacto_reportante,
            posible_duplicado_de = COALESCE(personas.posible_duplicado_de, excluded.posible_duplicado_de)`,
          args: [
            id, source, source_url, creado_en, actualizado_en, nombre_completo, edad_estimada, estado_actual, ultima_direccion_conocida, zona_ubicacion, ubicacion_normalizada, descripcion_fisica, url_foto, contacto_reportante, posible_duplicado_de
          ]
        });
        
        totalImported++;
      }

      if (!pageHasUpdates) {
        console.log(`Page ${page} had no new updates. Stopping early.`);
        break; // DONT FETCH OLD PAGES IF WE ALREADY HAVE THEM
      }

      if (page >= json.totalPages) {
        hasMore = false;
      } else {
        page++;
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      imported: totalImported,
      aiProcessed: aiProcessedCount 
    });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
