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

function personStatus(status: string): CaseStatus {
  if (status === "located" || status === "alive_located") return "located";
  if (status === "reunified") return "reunified";
  if (status === "duplicate") return "duplicate";
  if (status === "false_alarm") return "false_alarm";
  return "missing";
}

function requestStatus(status: string): CaseStatus {
  if (status === "open") return "reported";
  if (status === "fulfilled") return "resolved";
  if (status === "duplicate") return "duplicate";
  if (status === "assigned") return "assigned";
  if (status === "in_progress") return "in_progress";
  return "reported";
}

function zoneStatus(status: string): CaseStatus {
  if (status === "active_rescue") return "in_progress";
  if (status === "needs_verification") return "needs_verification";
  if (status === "resolved") return "resolved";
  if (status === "false_alarm") return "false_alarm";
  return "reported";
}

function signals() {
  return { confirmed: 0, canHelp: 0, duplicate: 0, falseReport: 0, resolved: 0 };
}

function mapPerson(row: Row): PublicCase {
  const name = text(row.full_name, "Nombre por confirmar");
  const status = personStatus(text(row.status, "missing"));
  const zone = text(row.location_zone, text(row.last_seen_address || row.found_address, "Zona por confirmar"));
  const publicAddress = text(row.location_normalized, text(row.last_seen_address || row.found_address, "Zona por confirmar"));

  return {
    id: text(row.id),
    slug: normalizeSlug(`${name}-${zone}`),
    kind: status === "located" || status === "reunified" ? "found" : "missing",
    title: name,
    personName: name,
    age: typeof row.age_estimated === "number" ? row.age_estimated : undefined,
    status,
    zone,
    publicAddress,
    lat: number(row.last_seen_lat || row.found_lat, 10.4806),
    lng: number(row.last_seen_lng || row.found_lng, -66.9036),
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at),
    lastConfirmedAt: dateIso(row.updated_at),
    description: text(row.physical_desc || row.found_notes || row.clothing_desc, "Reporte pendiente de verificacion."),
    photoUrl: resolvePhotoUrl(text(row.photo_url)),
    reporterPublic: text(row.author_relation, "Reporte ciudadano"),
    signals: signals(),
    sensitiveHidden: true,
    needs: status === "missing" ? ["Informacion verificada", "Cruce con encontrados"] : ["Verificacion familiar"],
  };
}

function mapRequest(row: Row): PublicCase {
  const title = text(row.title, text(row.request_type, "Solicitud de ayuda"));
  const zone = text(row.address, "Zona por confirmar");

  return {
    id: text(row.id),
    slug: normalizeSlug(`${title}-${zone}`),
    kind: "help",
    title,
    status: requestStatus(text(row.status, "open")),
    zone,
    publicAddress: zone,
    lat: number(row.lat, 10.4806),
    lng: number(row.lng, -66.9036),
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at),
    lastConfirmedAt: dateIso(row.updated_at),
    description: text(row.description, "Solicitud pendiente de verificacion."),
    reporterPublic: "Solicitante protegido",
    signals: signals(),
    sensitiveHidden: true,
    needs: [text(row.request_type, "ayuda"), "Coordinacion"],
  };
}

function mapZone(row: Row): PublicCase {
  const title = text(row.title, "Zona de rescate");
  const zone = text(row.address, "Zona por confirmar");

  return {
    id: text(row.id),
    slug: normalizeSlug(`${title}-${zone}`),
    kind: "zone",
    title,
    status: zoneStatus(text(row.status, "reported")),
    zone,
    publicAddress: zone,
    lat: number(row.lat, 10.4806),
    lng: number(row.lng, -66.9036),
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at),
    lastConfirmedAt: dateIso(row.updated_at),
    description: text(row.description, "Zona pendiente de verificacion."),
    reporterPublic: "Reporte ciudadano",
    signals: signals(),
    sensitiveHidden: true,
    needs: ["Verificacion", "Coordinacion de zona"],
  };
}

function mapPet(row: Row): PublicCase {
  const reportKind = text(row.report_kind, "pet_lost");
  const type = text(row.pet_type, "mascota");
  const name = text(row.pet_name, type);
  const zone = text(row.zone, "Zona por confirmar");

  return {
    id: text(row.id),
    slug: normalizeSlug(`${reportKind}-${name}-${zone}`),
    kind: reportKind === "pet_found" ? "pet_found" : "pet_lost",
    title: reportKind === "pet_found" ? `${name} recuperada` : `${name} perdida`,
    status: reportKind === "pet_found" ? "located" : "reported",
    zone,
    publicAddress: zone,
    lat: 10.4806,
    lng: -66.9036,
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at),
    lastConfirmedAt: dateIso(row.updated_at),
    description: text(row.description, "Reporte de mascota pendiente de verificacion."),
    photoUrl: resolvePhotoUrl(text(row.photo_url)),
    reporterPublic: "Contacto protegido",
    signals: signals(),
    sensitiveHidden: true,
    needs: [text(row.status, "verificacion"), row.can_foster ? "Transito disponible" : "Buscar transito"],
  };
}

function mapShelter(row: Row): PublicCase {
  const reportKind = text(row.report_kind, "shelter_request");
  const title = text(row.title, reportKind === "shelter_offer" ? "Refugio disponible" : "Solicitud de refugio");
  const zone = text(row.zone, "Zona por confirmar");

  return {
    id: text(row.id),
    slug: normalizeSlug(`${reportKind}-${title}-${zone}`),
    kind: reportKind === "shelter_offer" ? "shelter_offer" : "shelter_request",
    title,
    status: "reported",
    zone,
    publicAddress: zone,
    lat: 10.4806,
    lng: -66.9036,
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at),
    lastConfirmedAt: dateIso(row.updated_at),
    description: text(row.description, "Reporte de refugio pendiente de verificacion."),
    photoUrl: resolvePhotoUrl(text(row.photo_url)),
    reporterPublic: "Contacto protegido",
    signals: signals(),
    sensitiveHidden: true,
    needs: [text(row.needs || row.shelter_type, "coordinacion"), "Match por zona"],
  };
}

export async function getPublicCasesFromDb(page = 1, limit = 100, query = "", zoneQ = "", status = "") {
  if (!hasDatabaseEnv()) return { items: seedCases, total: seedCases.length };

  const db = getDb();
  const offset = (page - 1) * limit;

  const sqlBase = `
    SELECT * FROM (
      SELECT id, 'person' as type, updated_at,
             full_name as title_or_name,
             COALESCE(location_zone, last_seen_address, found_address) as zone_or_address,
             COALESCE(physical_desc, found_notes, clothing_desc) as search_desc,
             status,
             potential_duplicate_of
      FROM persons WHERE is_deleted = 0
      UNION ALL
      SELECT id, 'request' as type, updated_at,
             COALESCE(title, request_type) as title_or_name,
             address as zone_or_address,
             description as search_desc,
             status,
             NULL as potential_duplicate_of
      FROM help_requests WHERE is_deleted = 0
      UNION ALL
      SELECT id, 'zone' as type, updated_at,
             title as title_or_name,
             address as zone_or_address,
             description as search_desc,
             status,
             NULL as potential_duplicate_of
      FROM rescue_zones WHERE is_deleted = 0
      UNION ALL
      SELECT id, 'pet' as type, updated_at,
             pet_name as title_or_name,
             zone as zone_or_address,
             description as search_desc,
             status,
             NULL as potential_duplicate_of
      FROM pet_reports WHERE is_deleted = 0
      UNION ALL
      SELECT id, 'shelter' as type, updated_at,
             title as title_or_name,
             zone as zone_or_address,
             description as search_desc,
             'reported' as status,
             NULL as potential_duplicate_of
      FROM shelter_reports WHERE is_deleted = 0
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
  
  if (status === "missing") {
    conditions += ` AND status = 'missing'`;
  } else if (status === "resolved") {
    conditions += ` AND status IN ('located', 'reunified', 'resolved', 'closed')`;
  }

  const countSql = `SELECT count(*) as total FROM (${sqlBase} ${conditions}) c`;
  const resultSql = `${sqlBase} ${conditions} ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
  
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

  const [persons, requests, zones, pets, shelters] = await Promise.all([
    personIds.length > 0 ? db.execute({ sql: `SELECT * FROM persons WHERE id IN (${personIds.map(()=>'?').join(',')})`, args: personIds }) : { rows: [] },
    requestIds.length > 0 ? db.execute({ sql: `SELECT * FROM help_requests WHERE id IN (${requestIds.map(()=>'?').join(',')})`, args: requestIds }) : { rows: [] },
    zoneIds.length > 0 ? db.execute({ sql: `SELECT * FROM rescue_zones WHERE id IN (${zoneIds.map(()=>'?').join(',')})`, args: zoneIds }) : { rows: [] },
    petIds.length > 0 ? db.execute({ sql: `SELECT * FROM pet_reports WHERE id IN (${petIds.map(()=>'?').join(',')})`, args: petIds }) : { rows: [] },
    shelterIds.length > 0 ? db.execute({ sql: `SELECT * FROM shelter_reports WHERE id IN (${shelterIds.map(()=>'?').join(',')})`, args: shelterIds }) : { rows: [] },
  ]);

  const publicCases = [
    ...persons.rows.map((row) => mapPerson(row as Row)),
    ...requests.rows.map((row) => mapRequest(row as Row)),
    ...zones.rows.map((row) => mapZone(row as Row)),
    ...pets.rows.map((row) => mapPet(row as Row)),
    ...shelters.rows.map((row) => mapShelter(row as Row)),
  ];
  
  const casesMap = new Map(publicCases.map(c => [c.id, c]));
  const sortedCases = unifiedRes.rows.map(r => casesMap.get(r.id as string)).filter(Boolean) as PublicCase[];

  return { items: sortedCases, total };
}

export async function getGlobalStatsFromDb() {
  if (!hasDatabaseEnv()) return getStats(seedCases);
  const db = getDb();
  
  const sql = `
    SELECT 
      (
        SELECT count(*) FROM persons WHERE is_deleted=0 AND status NOT IN ('located', 'reunified', 'duplicate', 'false_alarm')
      ) + (
        SELECT count(*) FROM help_requests WHERE is_deleted=0 AND status NOT IN ('resolved', 'closed', 'duplicate', 'false_alarm')
      ) + (
        SELECT count(*) FROM rescue_zones WHERE is_deleted=0 AND status NOT IN ('resolved', 'closed', 'duplicate', 'false_alarm')
      ) + (
        SELECT count(*) FROM pet_reports WHERE is_deleted=0 AND status NOT IN ('located', 'reunified', 'duplicate', 'false_alarm')
      ) + (
        SELECT count(*) FROM shelter_reports WHERE is_deleted=0 AND 'reported' NOT IN ('resolved', 'closed', 'duplicate', 'false_alarm')
      ) AS open,
      
      (
        SELECT count(*) FROM persons WHERE is_deleted=0 AND status = 'missing'
      ) AS missing,
      
      (
        SELECT count(*) FROM persons WHERE is_deleted=0 AND status IN ('located', 'reunified')
      ) + (
        SELECT count(*) FROM help_requests WHERE is_deleted=0 AND status IN ('resolved', 'closed')
      ) + (
        SELECT count(*) FROM rescue_zones WHERE is_deleted=0 AND status IN ('resolved', 'closed')
      ) + (
        SELECT count(*) FROM pet_reports WHERE is_deleted=0 AND status IN ('located', 'reunified')
      ) + (
        SELECT count(*) FROM shelter_reports WHERE is_deleted=0 AND 'reported' IN ('resolved', 'closed')
      ) AS resolved,

      (
        SELECT count(*) FROM persons WHERE is_deleted=0 AND potential_duplicate_of IS NOT NULL
      ) AS duplicates
  `;
  
  const res = await db.execute(sql);
  const row = res.rows[0];
  return {
    open: Number(row.open),
    missing: Number(row.missing),
    resolved: Number(row.resolved),
    duplicates: Number(row.duplicates)
  };
}

export async function getCaseById(id: string): Promise<PublicCase | null> {
  if (!hasDatabaseEnv()) {
    return seedCases.find((c) => c.id === id || c.slug === id) || null;
  }

  const db = getDb();
  
  // A quick check across tables
  const queries = [
    { type: 'person', sql: 'SELECT * FROM persons WHERE id = ? OR pfif_person_id = ?' },
    { type: 'request', sql: 'SELECT * FROM help_requests WHERE id = ?' },
    { type: 'zone', sql: 'SELECT * FROM rescue_zones WHERE id = ?' },
    { type: 'pet', sql: 'SELECT * FROM pet_reports WHERE id = ?' },
    { type: 'shelter', sql: 'SELECT * FROM shelter_reports WHERE id = ?' }
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
    const image = await uploadReportImage(payload.photoDataUrl, "persons");
    const isFound = kind === "found";
    const fName = typeof payload.firstName === "string" ? payload.firstName.trim() : "";
    const lName = typeof payload.lastName === "string" ? payload.lastName.trim() : "";
    const combinedName = fName && lName ? `${fName} ${lName}` : fName || lName;

    const fullName = text(payload.fullName || combinedName || payload.knownName, isFound ? "Nombre por confirmar" : "Persona sin nombre confirmado");
    const address = text(payload.lastSeenAddress || payload.currentLocation, "Zona por confirmar");
    const description = text(payload.physicalDesc || payload.description || payload.observations, "Sin descripcion adicional.");

    await db.execute({
      sql: `INSERT INTO persons (
        id, pfif_person_id, source, created_at, updated_at, author_name, author_contact, author_relation,
        full_name, alternate_names, sex, age_estimated, physical_desc, clothing_desc, photo_url,
        last_seen_address, last_seen_at, status, found_address, found_notes
      ) VALUES (?, ?, 'web_form', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ],
    });
  } else if (kind === "pet_lost" || kind === "pet_found") {
    const image = await uploadReportImage(payload.photoDataUrl, "pets");
    await db.execute({
      sql: `INSERT INTO pet_reports (
        id, created_at, updated_at, report_kind, pet_name, pet_type, status, description, zone,
        contact_name, contact_phone, can_foster, photo_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        now,
        now,
        kind,
        text(payload.petName),
        text(payload.petType, "mascota"),
        text(payload.status),
        text(payload.description, "Sin descripcion adicional."),
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
      sql: `INSERT INTO shelter_reports (
        id, created_at, updated_at, report_kind, title, shelter_type, zone, contact_name, contact_phone,
        capacity, group_size, needs, description
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
        text(payload.description, "Sin descripcion adicional."),
      ],
    });
  } else if (kind === "help") {
    const requestType = text(payload.requestType, "other");
    const address = text(payload.address, "Zona por confirmar");
    const description = text(payload.description, "Solicitud sin descripcion.");
    const title = `${requestType.replace(/_/g, " ")} · ${address}`;

    await db.execute({
      sql: `INSERT INTO help_requests (
        id, created_at, updated_at, source, request_type, title, description, address,
        requester_name, requester_contact, number_of_people, has_children, has_elderly, has_disabled, status
      ) VALUES (?, ?, ?, 'web_form', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
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
      sql: `INSERT INTO volunteers (
        id, registered_at, updated_at, name, contact, country, city, volunteer_type,
        skills, has_vehicle, vehicle_type, notes, active, last_seen_at
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
