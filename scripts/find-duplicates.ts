import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@libsql/client";

async function runSearch() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("Missing TURSO credentials");
    process.exit(1);
  }

  const client = createClient({ url, authToken });

  console.log("Fetching persons...");
  const res = await client.execute("SELECT id, full_name, location_zone FROM persons WHERE is_deleted = 0 AND duplicate_of IS NULL AND potential_duplicate_of IS NULL");
  
  const persons = res.rows.map(r => ({
    id: String(r.id),
    name: String(r.full_name).toLowerCase(),
    zone: String(r.location_zone || "").toLowerCase()
  }));

  console.log(`Analyzing ${persons.length} records for duplicates...`);
  let duplicateCount = 0;

  for (let i = 0; i < persons.length; i++) {
    for (let j = i + 1; j < persons.length; j++) {
      const p1 = persons[i];
      const p2 = persons[j];

      // Same zone, and one name contains the other (or exact match)
      if (p1.zone && p1.zone === p2.zone && p1.zone !== "desconocida") {
        if (p1.name === p2.name || p1.name.includes(p2.name) || p2.name.includes(p1.name)) {
           // We found a potential duplicate
           // We mark the newer one (j) as potential duplicate of the older one (i)
           await client.execute({
             sql: "UPDATE persons SET potential_duplicate_of = ? WHERE id = ?",
             args: [p1.id, p2.id]
           });
           console.log(`Match: ${p1.name} <-> ${p2.name} in ${p1.zone}`);
           duplicateCount++;
           
           // We remove p2 from our array so we don't match it again
           persons.splice(j, 1);
           j--;
        }
      }
    }
  }

  console.log(`Found ${duplicateCount} potential duplicates.`);
}

runSearch().catch(console.error);
