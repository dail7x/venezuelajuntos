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
        const created_at = p.createdAt || Date.now();
        const updated_at = p.updatedAt || Date.now();
        const full_name = p.nombre || "Desconocido";
        const age_estimated = p.edad || null;
        // Solo guardamos como missing inicialmente en este script rápido. 
        // Si ya viene localizado desde la API externa, podríamos saltarlo o guardarlo, 
        // pero preferiblemente que el update-status se encargue. 
        // Sin embargo, para no perderlos si fueron localizados el mismo día, los guardamos y el status lo maneja update-status.
        const status = p.estado === "localizado" ? "located" : "missing";
        const last_seen_address = p.ubicacion || "Desconocida";
        const physical_desc = p.descripcion || null;
        const photo_url = p.foto || null;
        const author_contact = p.contacto || null;

        // Anti-Spam Filter
        const spamPattern = /infinityhotel\.it|casino|viagra|porn|seo services/i;
        const nameUrlPattern = /http:|https:|www\./i;
        
        if (
          spamPattern.test(full_name) || spamPattern.test(last_seen_address) || spamPattern.test(physical_desc || '') ||
          nameUrlPattern.test(full_name)
        ) {
          console.log(`Skipping SPAM record from API: ${id} - ${full_name}`);
          continue; // Skip processing this record entirely
        }

        // Check if case already exists to see if we need AI normalization
        const existingRes = await db.execute({
          sql: `SELECT location_normalized, location_zone, last_seen_address, updated_at FROM persons WHERE id = ?`,
          args: [id]
        });
        
        let location_zone = null;
        let location_normalized = null;
        
        const existingRow = existingRes.rows[0];
        
        // If it doesn't exist, or address changed, or hasn't been normalized yet, AND we have AI calls remaining
        if (
          (!existingRow || existingRow.last_seen_address !== last_seen_address || !existingRow.location_normalized) 
          && aiCallsRemaining > 0 
          && last_seen_address !== "Desconocida"
        ) {
          const aiResult = await normalizeAddressWithAI(last_seen_address);
          location_zone = aiResult.location_zone;
          location_normalized = aiResult.location_normalized;
          aiCallsRemaining--;
          aiProcessedCount++;
        } else if (existingRow) {
          // Keep existing normalization if we don't parse it again
          location_zone = existingRow.location_zone;
          location_normalized = existingRow.location_normalized;
        }

        // Skip if already completely up to date
        if (existingRow && Number(existingRow.updated_at) === Number(updated_at)) {
          if (existingRow.location_normalized) {
            continue; // purely up to date
          }
        }
        
        pageHasUpdates = true;

        // Duplicate detection: if this is a new record or hasn't been checked
        let potential_duplicate_of = null;
        if (!existingRow) {
          const dupRes = await db.execute({
            sql: `SELECT id FROM persons WHERE lower(full_name) = lower(?) AND id != ? LIMIT 1`,
            args: [full_name.trim(), id]
          });
          if (dupRes.rows.length > 0) {
            potential_duplicate_of = dupRes.rows[0].id;
          }
        }

        await db.execute({
          sql: `INSERT INTO persons (
            id, source, source_url, created_at, updated_at, full_name, age_estimated,
            status, last_seen_address, location_zone, location_normalized, physical_desc, photo_url, author_contact, potential_duplicate_of
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            updated_at = excluded.updated_at,
            full_name = excluded.full_name,
            age_estimated = excluded.age_estimated,
            status = excluded.status,
            last_seen_address = excluded.last_seen_address,
            location_zone = COALESCE(excluded.location_zone, persons.location_zone),
            location_normalized = COALESCE(excluded.location_normalized, persons.location_normalized),
            physical_desc = excluded.physical_desc,
            photo_url = excluded.photo_url,
            author_contact = excluded.author_contact,
            potential_duplicate_of = COALESCE(persons.potential_duplicate_of, excluded.potential_duplicate_of)`,
          args: [
            id, source, source_url, created_at, updated_at, full_name, age_estimated,
            status, last_seen_address, location_zone, location_normalized, physical_desc, photo_url, author_contact, potential_duplicate_of
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
