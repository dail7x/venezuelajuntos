import { getDb } from "../src/lib/db";

async function main() {
  console.log("Starting forced full sync...");
  const db = getDb();
  let page = 1;
  let hasMore = true;
  let totalImported = 0;
  
  while (hasMore) {
    console.log(`Fetching page ${page}...`);
    const res = await fetch(`https://api.venezuelajuntos.com/v1/personas?page=${page}&limit=50`);
    if (!res.ok) throw new Error("API error");
    const json = await res.json();
    const items = json.data || [];
    
    if (items.length === 0) break;

    for (const p of items) {
      const source = "api_v1";
      const id = `${source}_${p.id}`;
      const source_url = `https://api.venezuelajuntos.com/person/${p.id}`;
      const creado_en = p.createdAt ? new Date(p.createdAt).getTime() : Date.now();
      const actualizado_en = p.updatedAt ? new Date(p.updatedAt).getTime() : creado_en;
      const nombre_completo = p.nombre || "Desconocido";
      const edad_estimada = p.edad || null;
      let estado_actual = p.estado === "localizado" ? "located" : "missing";
      if (p.estado === "reunificado") estado_actual = "reunified";
      const ultima_direccion_conocida = p.ubicacion || "Desconocida";
      const descripcion_fisica = p.descripcion || null;
      const url_foto = p.foto || null;
      const contacto_reportante = p.contacto || null;

      await db.execute({
        sql: `INSERT INTO personas (
          id, source, source_url, creado_en, actualizado_en, nombre_completo, edad_estimada, estado_actual, ultima_direccion_conocida, descripcion_fisica, url_foto, contacto_reportante
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
          actualizado_en = EXCLUDED.actualizado_en,
          nombre_completo = EXCLUDED.nombre_completo,
          edad_estimada = EXCLUDED.edad_estimada,
          estado_actual = EXCLUDED.status,
          ultima_direccion_conocida = EXCLUDED.ultima_direccion_conocida,
          descripcion_fisica = EXCLUDED.descripcion_fisica,
          url_foto = EXCLUDED.url_foto,
          contacto_reportante = EXCLUDED.contacto_reportante`,
        args: [
          id, source, source_url, creado_en, actualizado_en, nombre_completo, edad_estimada, estado_actual, ultima_direccion_conocida, descripcion_fisica, url_foto, contacto_reportante
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
