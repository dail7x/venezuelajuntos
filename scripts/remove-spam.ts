import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@libsql/client";

async function run() {
  const client = createClient({ url: process.env.DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN });
  const res = await client.execute("UPDATE persons SET is_deleted = 1 WHERE full_name LIKE '%infinityhotel%' OR full_name LIKE '%http%' OR last_seen_address LIKE '%infinityhotel%'");
  console.log(`Deleted ${res.rowsAffected} spam records.`);
}
run();
