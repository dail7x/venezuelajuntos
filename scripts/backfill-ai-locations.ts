import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@libsql/client";
import { normalizeAddressWithAI } from "../src/lib/cloudflare-ai";

async function runBackfill() {
  if (!process.env.DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error("Missing TURSO credentials in env");
    process.exit(1);
  }

  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Fetching persons without normalized locations...");
  
  const res = await client.execute({
    sql: `SELECT id, last_seen_address FROM persons WHERE location_normalized IS NULL AND last_seen_address != 'Desconocida' AND is_deleted = 0`,
    args: []
  });
  
  console.log(`Found ${res.rows.length} records to process.`);
  
  let successCount = 0;
  
  for (let i = 0; i < res.rows.length; i++) {
    const row = res.rows[i];
    console.log(`Processing ${i + 1}/${res.rows.length}: ${row.last_seen_address}`);
    
    try {
      const aiResult = await normalizeAddressWithAI(String(row.last_seen_address));
      
      if (aiResult.location_normalized) {
        await client.execute({
          sql: `UPDATE persons SET location_zone = COALESCE(?, location_zone), location_normalized = ? WHERE id = ?`,
          args: [aiResult.location_zone, aiResult.location_normalized, row.id]
        });
        successCount++;
        console.log(`  -> Normalized to: ${aiResult.location_normalized}`);
      } else {
        console.log(`  -> AI failed to normalize.`);
      }
    } catch (err) {
      console.error(`  -> Error processing row ${row.id}:`, err);
    }
    
    // Slight delay to avoid hammering the AI API too hard
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`Backfill complete. Successfully updated ${successCount} records.`);
}

runBackfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
