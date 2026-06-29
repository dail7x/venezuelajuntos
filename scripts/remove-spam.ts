import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@libsql/client";

async function run() {
  const client = createClient({ url: process.env.DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN });
  const res = await client.execute("UPDATE personas SET esta_eliminado = 1 WHERE nombre_completo LIKE '%infinityhotel%' OR nombre_completo LIKE '%http%' OR ultima_direccion_conocida LIKE '%infinityhotel%'");
  console.log(`Deleted ${res.rowsAffected} spam records.`);
}
run();
