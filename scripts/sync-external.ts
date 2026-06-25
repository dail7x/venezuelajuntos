import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN as string,
});

async function syncExternal() {
  let page = 1;
  const pageSize = 500;
  let hasMore = true;

  console.log("Starting sync with external API...");

  while (hasMore) {
    try {
      console.log(`Fetching page ${page}...`);
      const res = await fetch(`https://desaparecidos-terremoto-api.theempire.tech/api/personas?pageSize=${pageSize}&page=${page}`);
      
      if (!res.ok) {
        console.error(`Failed to fetch page ${page}: ${res.statusText}`);
        break;
      }
      
      const json = await res.json();
      const items = json.items;

      if (!items || items.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`Processing ${items.length} items from page ${page}...`);
      
      const statements = items.map((p: any) => {
        const id = `ext-${p.id}`;
        const source = 'desaparecidosterremotovenezuela.com';
        const source_url = 'https://desaparecidosterremotovenezuela.com';
        const created_at = p.createdAt || Date.now();
        const updated_at = p.updatedAt || Date.now();
        const full_name = p.nombre || "Desconocido";
        const age_estimated = p.edad || null;
        const status = p.estado === "localizado" ? "located" : "missing";
        const last_seen_address = p.ubicacion || "Desconocida";
        const physical_desc = p.descripcion || null;
        const photo_url = p.foto || null;
        const author_contact = p.contacto || null;

        return {
          sql: `INSERT INTO persons (
            id, source, source_url, created_at, updated_at, full_name, age_estimated,
            status, last_seen_address, physical_desc, photo_url, author_contact
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            updated_at = excluded.updated_at,
            full_name = excluded.full_name,
            age_estimated = excluded.age_estimated,
            status = excluded.status,
            last_seen_address = excluded.last_seen_address,
            physical_desc = excluded.physical_desc,
            photo_url = excluded.photo_url,
            author_contact = excluded.author_contact`,
          args: [
            id, source, source_url, created_at, updated_at, full_name, age_estimated,
            status, last_seen_address, physical_desc, photo_url, author_contact
          ]
        };
      });

      // Execute batch
      await db.batch(statements, "write");
      console.log(`Successfully imported page ${page}`);

      if (page >= json.totalPages) {
        hasMore = false;
      } else {
        page++;
      }
    } catch (err) {
      console.error(`Error on page ${page}:`, err);
      break;
    }
  }
  
  console.log("Sync complete!");
  process.exit(0);
}

syncExternal();
