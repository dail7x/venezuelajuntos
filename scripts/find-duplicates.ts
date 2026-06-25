import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@libsql/client";

function isNameMatch(name1: string, name2: string) {
  const clean1 = name1.toLowerCase().trim().replace(/[^a-zñáéíóú\s]/g, "");
  const clean2 = name2.toLowerCase().trim().replace(/[^a-zñáéíóú\s]/g, "");

  if (clean1 === clean2) return true;

  const parts1 = clean1.split(/\s+/).filter(p => p.length > 2);
  const parts2 = clean2.split(/\s+/).filter(p => p.length > 2);

  let matchCount = 0;
  for (const p1 of parts1) {
    if (parts2.includes(p1)) matchCount++;
  }

  // 3 of 4 names match
  if (matchCount >= 3) return true;

  // 2 out of 2 names match (e.g., "Juan Perez" vs "Juan Carlos Perez")
  if (matchCount >= 2 && (parts1.length <= 2 || parts2.length <= 2)) return true;

  // Full substring match as fallback
  if (clean1.includes(clean2) || clean2.includes(clean1)) {
     if (parts1.length >= 2 && parts2.length >= 2) return true;
  }

  return false;
}

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
    name: String(r.full_name),
    zone: String(r.location_zone || "").toLowerCase()
  }));

  console.log(`Analyzing ${persons.length} records for duplicates...`);
  let duplicateCount = 0;

  for (let i = 0; i < persons.length; i++) {
    for (let j = i + 1; j < persons.length; j++) {
      const p1 = persons[i];
      const p2 = persons[j];

      // Match logic: They must have a name match. 
      // If zone is specified, they should preferably be in the same zone or one unknown.
      const nameMatches = isNameMatch(p1.name, p2.name);
      
      const zoneMatches = (!p1.zone || !p2.zone || p1.zone === 'desconocida' || p2.zone === 'desconocida' || p1.zone === p2.zone);

      if (nameMatches && zoneMatches) {
           // We mark the newer one (j) as potential duplicate of the older one (i)
           await client.execute({
             sql: "UPDATE persons SET potential_duplicate_of = ? WHERE id = ?",
             args: [p1.id, p2.id]
           });
           console.log(`Match: ${p1.name} <-> ${p2.name}`);
           duplicateCount++;
           
           // We remove p2 from our array so we don't match it again against others
           persons.splice(j, 1);
           j--;
      }
    }
  }

  console.log(`Found ${duplicateCount} potential duplicates.`);
}

runSearch().catch(console.error);
