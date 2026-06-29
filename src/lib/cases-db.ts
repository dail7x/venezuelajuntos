import { nanoid } from "nanoid";
import { getDb, hasDatabaseEnv } from "@/lib/db";
import { normalizeSlug, seedCases, getStats, type CaseStatus, type PublicCase } from "@/lib/data";
import { uploadReportImage } from "@/lib/storage";

type Row = Record<string, unknown>;

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function number(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function dateIso(value: unknown) {
  if (typeof value === "number") return new Date(value).toISOString();
  if (typeof value === "string" && value) return new Date(value).toISOString();
  return new Date().toISOString();
}

function resolvePhotoUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("/api/images")) return url;

  const r2Match = url.match(/r2\.cloudflarestorage\.com\/[^/]+\/(reports\/.+)$/);
  if (r2Match) {
    return `/api/images?key=${r2Match[1]}`;
  }

  return url;
}

function personStatus(estado_actual: string): CaseStatus {
  if (estado_actual === "located" || estado_actual === "alive_located") return "located";
  if (estado_actual === "reunified") return "reunified";
  if (estado_actual === "duplicate") return "duplicate";
  if (estado_actual === "false_alarm") return "false_alarm";
  return "missing";
}

function requestStatus(estado_actual: string): CaseStatus {
  if (estado_actual === "open") return "reported";
  if (estado_actual === "fulfilled") return "resolved";
  if (estado_actual === "duplicate") return "duplicate";
  if (estado_actual === "assigned") return "assigned";
  if (estado_actual === "in_progress") return "in_progress";
  return "reported";
}

function zoneStatus(estado_actual: string): CaseStatus {
  if (estado_actual === "active_rescue") return "in_progress";
  if (estado_actual === "needs_verification") return "needs_verification";
  if (estado_actual === "resolved") return "resolved";
  if (estado_actual === "false_alarm") return "false_alarm";
  return "reported";
}

function signals() {
  return { confirmed: 0, canHelp: 0, duplicate: 0, falseReport: 0, resolved: 0 };
}

function mapPerson(row: Row): PublicCase {
  const name = text(row.nombre_completo, "Nombre por confirmar");
  const estado_actual = personStatus(text(row.estado_actual, "missing"));
  const zone = text(row.zona_ubicacion, text(row.ultima_direccion_conocida || row.direccion_encontrado, "Zona por confirmar"));
  const publicAddress = text(row.ubicacion_normalizada, text(row.ultima_direccion_conocida || row.direccion_encontrado, "Zona por confirmar"));

  return {
    id: text(row.id),
    slug: normalizeSlug(`${name}-${zone}`),
    kind: estado_actual === "located" || estado_actual === "reunified" ? "found" : "missing",
    title: name,
    personName: name,
    cedula: typeof row.cedula_identidad === "number" ? row.cedula_identidad : undefined,
    age: typeof row.edad_estimada === "number" ? row.edad_estimada : undefined, estado_actual,
    zone,
    publicAddress,
    lat: number(row.latitud_visto_ultima_vez || row.latitud_encontrado, 10.4806),
    lng: number(row.longitud_visto_ultima_vez || row.longitud_encontrado, -66.9036),
    createdAt: dateIso(row.creado_en),
    updatedAt: dateIso(row.actualizado_en),
    lastConfirmedAt: dateIso(row.actualizado_en),
    description: text(row.descripcion_fisica || row.descripcion_vestimenta, "Información pendiente de revisión."),
    photoUrl: resolvePhotoUrl(text(row.url_foto)),
    foundNotes: text(row.notas_hallazgo) || undefined,
    reporterPublic: text(row.relacion_reportante, "Reporte ciudadano"),
    reporterName: text(row.nombre_reportante) || undefined,
    reporterContact: text(row.contacto_reportante) || undefined,
    signals: signals(),
    sensitiveHidden: true,
    needs: estado_actual === "missing" ? ["Información confirmada", "Cruce con personas localizadas"] : ["Verificación familiar"],
    potentialDuplicateOf: text(row.posible_duplicado_de) || undefined,
    inHospitalList: !!row.in_hospital_list,
  };
}

function mapRequest(row: Row): PublicCase {
  const title = text(row.titulo, text(row.tipo_solicitud, "Solicitud de ayuda"));
  const zone = text(row.direccion, "Zona por confirmar");

  return {
    id: text(row.id),
    slug: normalizeSlug(`${title}-${zone}`),
    kind: "help",
    title,
    estado_actual: requestStatus(text(row.estado_actual, "open")),
    zone,
    publicAddress: zone,
    lat: number(row.lat, 10.4806),
    lng: number(row.lng, -66.9036),
    createdAt: dateIso(row.creado_en),
    updatedAt: dateIso(row.actualizado_en),
    lastConfirmedAt: dateIso(row.actualizado_en),
    description: text(row.descripcion, "Solicitud pendiente de revisión."),
    reporterPublic: "Solicitante protegido",
    reporterName: text(row.nombre_solicitante) || undefined,
    reporterContact: text(row.contacto_solicitante) || undefined,
    signals: signals(),
    sensitiveHidden: true,
    needs: [text(row.tipo_solicitud, "ayuda"), "Coordinar apoyo"],
  };
}

function mapZone(row: Row): PublicCase {
  const title = text(row.titulo, "Zona de rescate");
  const zone = text(row.direccion, "Zona por confirmar");

  return {
    id: text(row.id),
    slug: normalizeSlug(`${title}-${zone}`),
    kind: "zone",
    title,
    estado_actual: zoneStatus(text(row.estado_actual, "reported")),
    zone,
    publicAddress: zone,
    lat: number(row.lat, 10.4806),
    lng: number(row.lng, -66.9036),
    createdAt: dateIso(row.creado_en),
    updatedAt: dateIso(row.actualizado_en),
    lastConfirmedAt: dateIso(row.actualizado_en),
    description: text(row.descripcion, "Zona pendiente de revisión."),
    reporterPublic: "Reporte comunitario",
    reporterName: text(row.reporter_name) || undefined,
    reporterContact: text(row.reporter_contact) || undefined,
    signals: signals(),
    sensitiveHidden: true,
    needs: ["Verificación", "Coordinación de zona"],
  };
}

function mapPet(row: Row): PublicCase {
  const reportKind = text(row.tipo_reporte, "pet_lost");
  const type = text(row.tipo_mascota, "mascota");
  const name = text(row.nombre_mascota, type);
  const zone = text(row.zona, "Zona por confirmar");

  return {
    id: text(row.id),
    slug: normalizeSlug(`${reportKind}-${name}-${zone}`),
    kind: reportKind === "pet_found" ? "pet_found" : "pet_lost",
    title: reportKind === "pet_found" ? `${name} recuperada` : `${name} perdida`,
    estado_actual: reportKind === "pet_found" ? "located" : "reported",
    zone,
    publicAddress: zone,
    lat: 10.4806,
    lng: -66.9036,
    createdAt: dateIso(row.creado_en),
    updatedAt: dateIso(row.actualizado_en),
    lastConfirmedAt: dateIso(row.actualizado_en),
    description: text(row.descripcion, "Reporte de mascota pendiente de revisión."),
    photoUrl: resolvePhotoUrl(text(row.url_foto)),
    reporterPublic: "Contacto protegido",
    reporterName: text(row.nombre_contacto) || undefined,
    reporterContact: text(row.telefono_contacto) || undefined,
    signals: signals(),
    sensitiveHidden: true,
    needs: [text(row.estado_actual, "revisión"), row.puede_acoger ? "Tránsito disponible" : "Buscar tránsito"],
  };
}

function mapShelter(row: Row): PublicCase {
  const reportKind = text(row.tipo_reporte, "shelter_request");
  const title = text(row.titulo, reportKind === "shelter_offer" ? "Refugio disponible" : "Solicitud de refugio");
  const zone = text(row.zona, "Zona por confirmar");

  return {
    id: text(row.id),
    slug: normalizeSlug(`${reportKind}-${title}-${zone}`),
    kind: reportKind === "shelter_offer" ? "shelter_offer" : "shelter_request",
    title,
    estado_actual: "reported",
    zone,
    publicAddress: zone,
    lat: 10.4806,
    lng: -66.9036,
    createdAt: dateIso(row.creado_en),
    updatedAt: dateIso(row.actualizado_en),
    lastConfirmedAt: dateIso(row.actualizado_en),
    description: text(row.descripcion, "Reporte de refugio pendiente de revisión."),
    photoUrl: resolvePhotoUrl(text(row.url_foto)),
    reporterPublic: "Contacto protegido",
    reporterName: text(row.nombre_contacto) || undefined,
    reporterContact: text(row.telefono_contacto) || undefined,
    signals: signals(),
    sensitiveHidden: true,
    needs: [text(row.necesidades || row.tipo_refugio, "coordinar apoyo"), "Cruzar por zona"],
  };
}

export async function getPublicCasesFromDb(page = 1, limit = 100, query = "", zoneQ = "", estado_actual = "", hasUpdates = false) {
  if (!hasDatabaseEnv()) return { items: seedCases, total: seedCases.length };

  const db = getDb();
  const offset = (page - 1) * limit;

  let statusCond = "";
  if (estado_actual && estado_actual !== "hospital" && estado_actual !== "resolved") {
    statusCond = `AND estado_actual = '${estado_actual}'`;
  } else if (estado_actual === "hospital") {
    statusCond = `AND (EXISTS (SELECT 1 FROM notas_persona WHERE persona_id = personas.id AND origen = 'lista_hospital') OR notas_hallazgo LIKE '%hospital%')`;
  }

  const sqlBase = `
    SELECT * FROM (
      SELECT id, 'person' as type, actualizado_en, creado_en,
             nombre_completo as title_or_name,
             COALESCE(zona_ubicacion, ultima_direccion_conocida, direccion_encontrado) as zone_or_address,
             COALESCE(descripcion_fisica, descripcion_vestimenta) as search_desc, estado_actual,
             posible_duplicado_de,
             (SELECT 1 FROM notas_persona WHERE persona_id = personas.id AND origen = 'lista_hospital' LIMIT 1) as in_hospital_list
      FROM personas WHERE esta_eliminado = 0 ${hasUpdates ? "AND (EXISTS (SELECT 1 FROM notas_persona WHERE persona_id = personas.id) OR EXISTS (SELECT 1 FROM personas p2 WHERE p2.posible_duplicado_de = personas.id) OR notas_hallazgo IS NOT NULL)" : ""} ${statusCond}
      UNION ALL
      SELECT id, 'request' as type, actualizado_en, creado_en,
             COALESCE(titulo, tipo_solicitud) as title_or_name,
             direccion as zone_or_address,
             descripcion as search_desc, estado as estado_actual,
             NULL as posible_duplicado_de,
             NULL as in_hospital_list
      FROM solicitudes_ayuda WHERE esta_eliminado = 0 ${hasUpdates ? "AND 1=0" : ""}
      UNION ALL
      SELECT id, 'zone' as type, actualizado_en, creado_en,
             titulo as title_or_name,
             direccion as zone_or_address,
             descripcion as search_desc, estado as estado_actual,
             NULL as posible_duplicado_de,
             NULL as in_hospital_list
      FROM zonas_rescate WHERE esta_eliminado = 0 ${hasUpdates ? "AND 1=0" : ""}
      UNION ALL
      SELECT id, 'pet' as type, actualizado_en, creado_en,
             nombre_mascota as title_or_name,
             zona as zone_or_address,
             descripcion as search_desc, estado as estado_actual,
             NULL as posible_duplicado_de,
             NULL as in_hospital_list
      FROM reportes_mascotas WHERE esta_eliminado = 0 ${hasUpdates ? "AND 1=0" : ""}
      UNION ALL
      SELECT id, 'shelter' as type, actualizado_en, creado_en,
             titulo as title_or_name,
             zona as zone_or_address,
             descripcion as search_desc,
             'reported' as estado_actual,
             NULL as posible_duplicado_de,
             NULL as in_hospital_list
      FROM reportes_refugios WHERE esta_eliminado = 0 ${hasUpdates ? "AND 1=0" : ""}
    ) unified

    WHERE 1=1
  `;

  let conditions = "";
  const args: any[] = [];

  if (query) {
    conditions += ` AND (title_or_name LIKE ? OR search_desc LIKE ?)`;
    args.push(`%${query}%`, `%${query}%`);
  }
  
  if (zoneQ) {
    conditions += ` AND zone_or_address LIKE ?`;
    args.push(`%${zoneQ}%`);
  }
  
  if (estado_actual === "resolved") {
    conditions += ` AND estado_actual IN ('located', 'reunified', 'resolved', 'closed')`;
  }
  const countSql = `SELECT count(*) as total FROM (${sqlBase} ${conditions}) c`;
  const resultSql = `${sqlBase} ${conditions} ORDER BY CASE WHEN estado_actual IN ('located', 'reunified', 'resolved', 'closed') THEN 1 ELSE 0 END ASC, creado_en DESC LIMIT ? OFFSET ?`;
  
  const countArgs = [...args];
  const resultArgs = [...args, limit, offset];

  const [countRes, unifiedRes] = await Promise.all([
    db.execute({ sql: countSql, args: countArgs }),
    db.execute({ sql: resultSql, args: resultArgs })
  ]);

  const total = Number(countRes.rows[0]?.total || 0);
  
  const personIds = unifiedRes.rows.filter(r => r.type === 'person').map(r => r.id);
  const requestIds = unifiedRes.rows.filter(r => r.type === 'request').map(r => r.id);
  const zoneIds = unifiedRes.rows.filter(r => r.type === 'zone').map(r => r.id);
  const petIds = unifiedRes.rows.filter(r => r.type === 'pet').map(r => r.id);
  const shelterIds = unifiedRes.rows.filter(r => r.type === 'shelter').map(r => r.id);

  const [personas, requests, zones, pets, shelters] = await Promise.all([
    personIds.length > 0 ? db.execute({ sql: `SELECT * FROM personas WHERE id IN (${personIds.map(()=>'?').join(',')})`, args: personIds }) : { rows: [] },
    requestIds.length > 0 ? db.execute({ sql: `SELECT * FROM solicitudes_ayuda WHERE id IN (${requestIds.map(()=>'?').join(',')})`, args: requestIds }) : { rows: [] },
    zoneIds.length > 0 ? db.execute({ sql: `SELECT * FROM zonas_rescate WHERE id IN (${zoneIds.map(()=>'?').join(',')})`, args: zoneIds }) : { rows: [] },
    petIds.length > 0 ? db.execute({ sql: `SELECT * FROM reportes_mascotas WHERE id IN (${petIds.map(()=>'?').join(',')})`, args: petIds }) : { rows: [] },
    shelterIds.length > 0 ? db.execute({ sql: `SELECT * FROM reportes_refugios WHERE id IN (${shelterIds.map(()=>'?').join(',')})`, args: shelterIds }) : { rows: [] },
  ]);

  const publicCases = [
    ...personas.rows.map((row) => mapPerson(row as Row)),
    ...requests.rows.map((row) => mapRequest(row as Row)),
    ...zones.rows.map((row) => mapZone(row as Row)),
    ...pets.rows.map((row) => mapPet(row as Row)),
    ...shelters.rows.map((row) => mapShelter(row as Row)),
  ];
  
  const casesMap = new Map(publicCases.map(c => [c.id, c]));
  
  const groupedCases = new Map<string, PublicCase>();
  
  for (const c of publicCases) {
    if (c.potentialDuplicateOf) {
      const parent = casesMap.get(c.potentialDuplicateOf);
      if (parent) {
         if (!parent.duplicates) parent.duplicates = [];
         parent.duplicates.push(c);
         continue; 
      }
    }
    groupedCases.set(c.id, c);
  }

  const sortedCases = unifiedRes.rows.map(r => groupedCases.get(r.id as string)).filter(Boolean) as PublicCase[];

  return { items: sortedCases, total };
}

export async function getGlobalStatsFromDb() {
  if (!hasDatabaseEnv()) return getStats(seedCases);
  const db = getDb();
  
  const sql = `
    SELECT 
      (
        SELECT count(*) FROM personas WHERE esta_eliminado=0 AND estado_actual NOT IN ('duplicate', 'false_alarm')
      ) AS open,
      
      (
        SELECT count(*) FROM personas WHERE esta_eliminado=0 AND estado_actual NOT IN ('located', 'reunified', 'duplicate', 'false_alarm')
      ) AS missing,
      
      (
        SELECT count(*) FROM personas WHERE esta_eliminado=0 AND estado_actual IN ('located', 'reunified')
      ) AS resolved,

      (
        SELECT count(*) FROM personas WHERE esta_eliminado=0 AND posible_duplicado_de IS NOT NULL
      ) AS duplicates,

      (
        SELECT count(*) FROM personas WHERE esta_eliminado=0 AND posible_duplicado_de IS NULL
      ) AS unique_people
  `;
  
  const res = await db.execute(sql);
  const row = res.rows[0];
  return {
    open: Number(row.open),
    missing: Number(row.missing),
    resolved: Number(row.resolved),
    duplicates: Number(row.duplicates),
    unique_people: Number(row.unique_people)
  };
}

export async function getCaseById(id: string): Promise<PublicCase | null> {
  if (!hasDatabaseEnv()) {
    return seedCases.find((c) => c.id === id || c.slug === id) || null;
  }

  const db = getDb();
  
  // A quick check across tables
  const queries = [
    { type: 'person', sql: 'SELECT * FROM personas WHERE id = ? OR pfif_persona_id = ?' },
    { type: 'request', sql: 'SELECT * FROM solicitudes_ayuda WHERE id = ?' },
    { type: 'zone', sql: 'SELECT * FROM zonas_rescate WHERE id = ?' },
    { type: 'pet', sql: 'SELECT * FROM reportes_mascotas WHERE id = ?' },
    { type: 'shelter', sql: 'SELECT * FROM reportes_refugios WHERE id = ?' }
  ];

  for (const q of queries) {
    const args = q.type === 'person' ? [id, id] : [id];
    const res = await db.execute({ sql: q.sql, args });
    if (res.rows.length > 0) {
      if (q.type === 'person') return mapPerson(res.rows[0] as Row);
      if (q.type === 'request') return mapRequest(res.rows[0] as Row);
      if (q.type === 'zone') return mapZone(res.rows[0] as Row);
      if (q.type === 'pet') return mapPet(res.rows[0] as Row);
      if (q.type === 'shelter') return mapShelter(res.rows[0] as Row);
    }
  }

  return null;
}

export async function createCaseInDb(kind: string, payload: Record<string, unknown>) {
  const db = getDb();
  const now = Date.now();
  const id = nanoid(10);

  if (kind === "missing" || kind === "found") {
    const image = await uploadReportImage(payload.photoDataUrl, "personas");
    const isFound = kind === "found";
    const fName = typeof payload.firstName === "string" ? payload.firstName.trim() : "";
    const lName = typeof payload.lastName === "string" ? payload.lastName.trim() : "";
    const combinedName = fName && lName ? `${fName} ${lName}` : fName || lName;

    const fullName = text(payload.fullName || combinedName || payload.knownName, isFound ? "Nombre por confirmar" : "Persona sin nombre confirmado");
    const address = text(payload.lastSeenAddress || payload.currentLocation, "Zona por confirmar");
    const description = text(payload.physicalDesc || payload.description || payload.observations, "Sin información adicional.");

    await db.execute({
      sql: `INSERT INTO personas (
        id, pfif_person_id, origen, creado_en, actualizado_en, nombre_reportante, contacto_reportante, relacion_reportante,
        nombre_completo, nombres_alternativos, sexo, edad_estimada, descripcion_fisica, descripcion_vestimenta, url_foto,
        ultima_direccion_conocida, fecha_visto_ultima_vez, estado_actual, direccion_encontrado, notas_hallazgo, cedula_identidad
      ) VALUES (?, ?, 'web_form', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        `venezuelajuntos.online/person/${id}`,
        now,
        now,
        text(payload.authorName || payload.reporterName),
        text(
          payload.authorInstagram
            ? `${payload.authorContact || payload.reporterContact} (IG: ${payload.authorInstagram})`
            : (payload.authorContact || payload.reporterContact)
        ),
        text(payload.authorRelation || payload.reporterName),
        fullName,
        text(payload.alternateNames),
        text(payload.sex),
        payload.age ? Number(payload.age) : null,
        description,
        text(payload.clothingDesc),
        image?.url ?? "",
        address,
        payload.lastSeenAt ? Date.parse(String(payload.lastSeenAt)) : null,
        isFound ? "located" : "missing",
        isFound ? address : null,
        isFound ? text(payload.observations) : null,
        payload.cedulaIdentidad ? Number(payload.cedulaIdentidad) : null,
      ],
    });
  } else if (kind === "pet_lost" || kind === "pet_found") {
    const image = await uploadReportImage(payload.photoDataUrl, "pets");
    await db.execute({
      sql: `INSERT INTO reportes_mascotas (
        id, creado_en, actualizado_en, tipo_reporte, nombre_mascota, tipo_mascota, estado, descripcion, zona,
        nombre_contacto, telefono_contacto, puede_acoger, url_foto
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        now,
        now,
        kind,
        text(payload.petName),
        text(payload.petType, "mascota"),
        text(payload.estado_actual),
        text(payload.description, "Sin información adicional."),
        text(payload.zone, "Zona por confirmar"),
        text(payload.contactName),
        text(payload.contactPhone),
        payload.canFoster ? 1 : 0,
        image?.url ?? "",
      ],
    });
  } else if (kind === "shelter_request" || kind === "shelter_offer") {
    const isOffer = kind === "shelter_offer";
    const title = isOffer ? text(payload.shelterName, "Refugio disponible") : `${text(payload.groupType, "Grupo")} solicita refugio`;
    await db.execute({
      sql: `INSERT INTO reportes_refugios (
        id, creado_en, actualizado_en, tipo_reporte, titulo, tipo_refugio, zona, nombre_contacto, telefono_contacto,
        capacidad, tamano_grupo, necesidades, descripcion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        now,
        now,
        kind,
        title,
        text(payload.shelterType),
        text(payload.zone, "Zona por confirmar"),
        text(payload.contactName || payload.requesterName),
        text(payload.contactPhone),
        payload.capacity ? Number(payload.capacity) : null,
        payload.groupSize ? Number(payload.groupSize) : null,
        text(payload.needs),
        text(payload.description, "Sin información adicional."),
      ],
    });
  } else if (kind === "help") {
    const requestType = text(payload.requestType, "other");
    const address = text(payload.address, "Zona por confirmar");
    const description = text(payload.description, "Solicitud sin información adicional.");
    const title = `${requestType.replace(/_/g, " ")} · ${address}`;

    await db.execute({
      sql: `INSERT INTO solicitudes_ayuda (
        id, creado_en, actualizado_en, origen, tipo_solicitud, titulo, descripcion, direccion,
        nombre_solicitante, contacto_solicitante, cantidad_personas, tiene_ninos, tiene_ancianos, tiene_discapacitados, estado
      ) VALUES (?, ?, ?, 'web_form', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'abierta')`,
      args: [
        id,
        now,
        now,
        requestType,
        title,
        description,
        address,
        text(payload.requesterName),
        text(payload.requesterContact),
        payload.numberOfPeople ? Number(payload.numberOfPeople) : 1,
        payload.hasVulnerable ? 1 : 0,
        payload.hasVulnerable ? 1 : 0,
        payload.hasVulnerable ? 1 : 0,
      ],
    });
  } else if (kind === "volunteer") {
    await db.execute({
      sql: `INSERT INTO voluntarios (
        id, registered_at, actualizado_en, name, contact, country, city, tipo_voluntario,
        skills, tiene_vehiculo, tipo_vehiculo, notes, active, fecha_visto_ultima_vez
      ) VALUES (?, ?, ?, ?, ?, 'VE', ?, ?, ?, ?, ?, ?, 1, ?)`,
      args: [
        id,
        now,
        now,
        text(payload.name, "Voluntario"),
        text(payload.contact),
        text(payload.zone),
        text(payload.availability) === "remote" ? "remote" : "citizen",
        text(payload.skills),
        payload.hasVehicle ? 1 : 0,
        text(payload.vehicleType),
        `Radio: ${text(payload.radiusKm)}km. Puede moverse: ${payload.canMove ? "si" : "no"}`,
        now,
      ],
    });
  }

  return { id, slug: normalizeSlug(`${kind}-${id}`), status: "needs_verification" };
}

export async function getZoneStats() {
  const db = getDb();
  
  const zonesRes = await db.execute({
    sql: `SELECT zona_ubicacion, COUNT(*) as total
          FROM personas 
          WHERE zona_ubicacion IS NOT NULL AND esta_eliminado = 0 AND estado_actual IN ('missing', 'reported')
          GROUP BY zona_ubicacion
          ORDER BY total DESC`,
    args: []
  });

  const hotspotsRes = await db.execute({
    sql: `SELECT zona_ubicacion, ubicacion_normalizada, COUNT(*) as total
          FROM personas
          WHERE ubicacion_normalizada IS NOT NULL AND esta_eliminado = 0 AND estado_actual IN ('missing', 'reported')
          GROUP BY zona_ubicacion, ubicacion_normalizada
          HAVING total >= 2
          ORDER BY zona_ubicacion ASC, total DESC`,
    args: []
  });

  const zones = zonesRes.rows.map((r: Row) => ({
    zone: text(r.zona_ubicacion),
    total: number(r.total, 0),
    hotspots: [] as { address: string, count: number }[]
  }));

  for (const hotspot of hotspotsRes.rows) {
    const zoneName = text(hotspot.zona_ubicacion);
    const address = text(hotspot.ubicacion_normalizada);
    const count = number(hotspot.total, 0);

    const zoneObj = zones.find((z) => z.zone === zoneName);
    // Ignore hotspots that are exactly just the zone name (not specific enough)
    if (zoneObj && address && address.toLowerCase() !== zoneName.toLowerCase() && address.length > 5) {
      zoneObj.hotspots.push({ address, count });
    }
  }

  return zones;
}
