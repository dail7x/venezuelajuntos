import { getDb } from "../src/lib/db";

async function main() {
  console.log("Starting forced full sync...");
  const db = getDb();
  let page = 1;
  let hasMore = true;
  let totalImported = 0;
  
  while (hasMore) {
    console.log(`Fetching page ${page}...`);
    const res = await fetch(`https://api.venezuelajuntos.com/v1/persons?page=${page}&limit=50`);
    if (!res.ok) throw new Error("API error");
    const json = await res.json();
    const items = json.data || [];
    
    if (items.length === 0) break;

    for (const p of items) {
      const source = "api_v1";
      const id = `${source}_${p.id}`;
      const source_url = `https://api.venezuelajuntos.com/person/${p.id}`;
      const created_at = p.createdAt ? new Date(p.createdAt).getTime() : Date.now();
      const updated_at = p.updatedAt ? new Date(p.updatedAt).getTime() : created_at;
      const full_name = p.nombre || "Desconocido";
      const age_estimated = p.edad || null;
      let status = p.estado === "localizado" ? "located" : "missing";
      if (p.estado === "reunificado") status = "reunified";
      const last_seen_address = p.ubicacion || "Desconocida";
      const physical_desc = p.descripcion || null;
      const photo_url = p.foto || null;
      const author_contact = p.contacto || null;

      await db.execute({
        sql: `INSERT INTO persons (
          id, source, source_url, created_at, updated_at, full_name, age_estimated,
          status, last_seen_address, physical_desc, photo_url, author_contact
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
          updated_at = EXCLUDED.updated_at,
          full_name = EXCLUDED.full_name,
          age_estimated = EXCLUDED.age_estimated,
          status = EXCLUDED.status,
          last_seen_address = EXCLUDED.last_seen_address,
          physical_desc = EXCLUDED.physical_desc,
          photo_url = EXCLUDED.photo_url,
          author_contact = EXCLUDED.author_contact`,
        args: [
          id, source, source_url, created_at, updated_at, full_name, age_estimated,
          status, last_seen_address, physical_desc, photo_url, author_contact
        ]
      });
      totalImported++;
    }
    
    if (page >= json.totalPages) hasMore = false;
    else page++;
  }
  
  console.log(`Finished! Imported ${totalImported} records.`);
}

main().catch(console.error);
