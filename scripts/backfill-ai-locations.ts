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

  console.log("Fetching personas without normalized locations...");
  
  const res = await client.execute({
    sql: `SELECT id, ultima_direccion_conocida FROM personas WHERE ubicacion_normalizada IS NULL AND ultima_direccion_conocida != 'Desconocida' AND esta_eliminado = 0`,
    args: []
  });
  
  console.log(`Found ${res.rows.length} records to process.`);
  
  let successCount = 0;
  
  for (let i = 0; i < res.rows.length; i++) {
    const row = res.rows[i];
    console.log(`Processing ${i + 1}/${res.rows.length}: ${row.ultima_direccion_conocida}`);
    
    try {
      const aiResult = await normalizeAddressWithAI(String(row.ultima_direccion_conocida));
      
      if (aiResult.ubicacion_normalizada) {
        await client.execute({
          sql: `UPDATE personas SET zona_ubicacion = COALESCE(?, zona_ubicacion), ubicacion_normalizada = ? WHERE id = ?`,
          args: [aiResult.zona_ubicacion, aiResult.ubicacion_normalizada, row.id]
        });
        successCount++;
        console.log(`  -> Normalized to: ${aiResult.ubicacion_normalizada}`);
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
