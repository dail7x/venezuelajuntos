import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const dbLocal = createClient({ url: "file:data.db" });
const dbRemote = createClient({
  url: process.env.DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN as string,
});

async function migrate() {
  console.log("Reading 100 records from local data.db...");
  
  const records = await dbLocal.execute("SELECT * FROM personas LIMIT 100");
  console.log(`Found ${records.rows.length} records. Inserting into LibSQL...`);
  
  const statements = records.rows.map((p: any) => {
    return {
      sql: `INSERT INTO personas (
        id, origen, url_origen, creado_en, actualizado_en, nombre_completo, edad_estimada,
        estado_actual, ultima_direccion_conocida, descripcion_fisica, url_foto, contacto_reportante
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        actualizado_en = excluded.actualizado_en,
        nombre_completo = excluded.nombre_completo,
        edad_estimada = excluded.edad_estimada,
        estado_actual = excluded.estado_actual,
        ultima_direccion_conocida = excluded.ultima_direccion_conocida,
        descripcion_fisica = excluded.descripcion_fisica,
        url_foto = excluded.url_foto,
        contacto_reportante = excluded.contacto_reportante`,
      args: [
        p.id, p.origen, p.url_origen, p.creado_en, p.actualizado_en, p.nombre_completo, p.edad_estimada,
        p.estado_actual, p.ultima_direccion_conocida, p.descripcion_fisica, p.url_foto, p.contacto_reportante
      ]
    };
  });

  try {
    await dbRemote.batch(statements, "write");
    console.log("Successfully imported 100 records into LibSQL!");
    
    // Verify connection by reading back
    const count = await dbRemote.execute("SELECT count(*) as total FROM personas");
    console.log("Total records in LibSQL database now:", count.rows[0].total);
    
  } catch(err) {
    console.error("Migration failed:", err);
  }
}

migrate();
