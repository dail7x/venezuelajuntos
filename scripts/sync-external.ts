import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN as string,
});

async function syncExternal() {
  let page = 90;
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
        const creado_en = p.createdAt || Date.now();
        const actualizado_en = p.updatedAt || Date.now();
        const nombre_completo = p.nombre || "Desconocido";
        const edad_estimada = p.edad || null;
        const estado_actual = p.estado === "localizado" ? "located" : "missing";
        const ultima_direccion_conocida = p.ubicacion || "Desconocida";
        const descripcion_fisica = p.descripcion || null;
        const url_foto = p.foto || null;
        const contacto_reportante = p.contacto || null;

        return {
          sql: `INSERT INTO personas (
            id, source, source_url, creado_en, actualizado_en, nombre_completo, edad_estimada, estado_actual, ultima_direccion_conocida, descripcion_fisica, url_foto, contacto_reportante
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            actualizado_en = excluded.actualizado_en,
            nombre_completo = excluded.nombre_completo,
            edad_estimada = excluded.edad_estimada,
            estado_actual = excluded.status,
            ultima_direccion_conocida = excluded.ultima_direccion_conocida,
            descripcion_fisica = excluded.descripcion_fisica,
            url_foto = excluded.url_foto,
            contacto_reportante = excluded.contacto_reportante`,
          args: [
            id, source, source_url, creado_en, actualizado_en, nombre_completo, edad_estimada, estado_actual, ultima_direccion_conocida, descripcion_fisica, url_foto, contacto_reportante
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
