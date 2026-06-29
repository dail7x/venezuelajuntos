import { createClient } from "@libsql/client";

async function run() {
  const tursoUrl = 'libsql://venezuelajuntos-dail7x.aws-us-east-2.turso.io';
  const tursoAuth = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODIzNjc1ODQsImlkIjoiMDE5ZWZkNjItZTEwMS03Y2E3LWE5NmUtOWE3N2QwZmZiZGMzIiwicmlkIjoiYjQ4NDZmYjUtNDEwYS00MzI1LTkwODEtZTQ0ZWIxMGNlNGEwIn0.6ksJDCYQ4iN5NLl6_pgg3vY3QIpxmbBcWgIludA5iALZyDQ69DdfvivBIus0M92MMBH2SnTZBOCUPeypgsvlBg';
  
  const hetznerUrl = 'http://116.203.118.1:8081';
  const hetznerAuth = 'eyJhbGciOiJFZERTQSJ9.eyJhIjoicnciLCJpYXQiOjE3ODI0OTUwNjIsImV4cCI6MjA5ODA3MTA2Mn0.GNSZDmPEnD2oO0yMxrltej23G664UQb9Vx5BZKBH8WqVARYIJwQl_t0tqnQ_E5NuaSvbii5Sd1K5tIve4RKdDQ';

  const remoteDb = createClient({ url: tursoUrl, authToken: tursoAuth });
  const hetznerDb = createClient({ url: hetznerUrl, authToken: hetznerAuth });

  console.log("Migrating from Turso to Hetzner 'personas' table in batches...");

  let offset = 0;
  const batchSize = 1000;
  let totalMigrated = 0;

  while (true) {
    console.log(`Fetching ${batchSize} records at offset ${offset}...`);
    const res = await remoteDb.execute({
      sql: `SELECT * FROM persons LIMIT ? OFFSET ?`,
      args: [batchSize, offset]
    });

    if (res.rows.length === 0) {
      break;
    }

    const statements = res.rows.map(row => {
      return {
        sql: `INSERT OR REPLACE INTO personas (
          id, pfif_person_id, origen, url_origen, creado_en, actualizado_en, expira_en,
          nombre_reportante, contacto_reportante, relacion_reportante,
          cedula_identidad, nombre_completo, nombres_alternativos, sexo, edad_estimada, fecha_nacimiento,
          descripcion_fisica, descripcion_vestimenta, url_foto,
          ultima_direccion_conocida, zona_ubicacion, ubicacion_normalizada,
          latitud_visto_ultima_vez, longitud_visto_ultima_vez, fecha_visto_ultima_vez, contexto_visto_ultima_vez,
          estado_actual, encontrado_en, direccion_encontrado, latitud_encontrado, longitud_encontrado, notas_hallazgo,
          verificado, verificado_por, fecha_verificacion, spam, duplicado_de, posible_duplicado_de,
          esta_eliminado, eliminado_por, fecha_eliminacion, motivo_eliminacion,
          localizado_por, localizado_contacto, localizado_relacion, localizado_nota
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?
        )`,
        args: [
          row.id, row.pfif_person_id, row.source, row.source_url, row.created_at, row.updated_at, row.expires_at,
          row.author_name, row.author_contact, row.author_relation,
          row.cedula_identidad, row.full_name, row.alternate_names, row.sex, row.age_estimated, row.date_of_birth,
          row.physical_desc, row.clothing_desc, row.photo_url,
          row.last_seen_address, row.location_zone, row.location_normalized,
          row.last_seen_lat, row.last_seen_lng, row.last_seen_at, row.last_seen_context,
          row.status, row.found_at, row.found_address, row.found_lat, row.found_lng, row.found_notes,
          row.verified, row.verified_by, row.verified_at, row.spam, row.duplicate_of, row.potential_duplicate_of,
          row.is_deleted, row.deleted_by, row.deleted_at, row.deletion_reason,
          row.localizado_por ?? null, row.localizado_contacto ?? null, row.localizado_relacion ?? null, row.localizado_nota ?? null
        ]
      };
    });

    await hetznerDb.batch(statements, "write");
    totalMigrated += res.rows.length;
    console.log(`Migrated ${totalMigrated} records so far...`);
    offset += batchSize;
  }

  console.log("Migration finished successfully!");
}

run().catch(console.error);
