import { nanoid } from "nanoid";
import { getDb, hasDatabaseEnv } from "@/lib/db";
import { normalizeSlug, seedCases, type CaseStatus, type PublicCase, type Urgency } from "@/lib/data";
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
  const zone = text(row.last_seen_address || row.found_address, "Zona por confirmar");

  return {
    id: text(row.id),
    slug: normalizeSlug(`${name}-${zone}`),
    kind: status === "located" || status === "reunified" ? "found" : "missing",
    title: name,
    personName: name,
    age: typeof row.age_estimated === "number" ? row.age_estimated : undefined,
    urgency: status === "missing" ? "high" : "medium",
    status,
    zone,
    publicAddress: zone,
    lat: number(row.last_seen_lat || row.found_lat, 10.4806),
    lng: number(row.last_seen_lng || row.found_lng, -66.9036),
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at),
    lastConfirmedAt: dateIso(row.updated_at),
    description: text(row.physical_desc || row.found_notes || row.clothing_desc, "Reporte pendiente de verificacion."),
    photoUrl: text(row.photo_url),
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
    urgency: text(row.urgency, "high") as Urgency,
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
    urgency: text(row.urgency, "high") as Urgency,
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
    urgency: reportKind === "pet_found" ? "medium" : "high",
    status: reportKind === "pet_found" ? "located" : "reported",
    zone,
    publicAddress: zone,
    lat: 10.4806,
    lng: -66.9036,
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at),
    lastConfirmedAt: dateIso(row.updated_at),
    description: text(row.description, "Reporte de mascota pendiente de verificacion."),
    photoUrl: text(row.photo_url),
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
    urgency: reportKind === "shelter_request" ? "high" : "medium",
    status: "reported",
    zone,
    publicAddress: zone,
    lat: 10.4806,
    lng: -66.9036,
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at),
    lastConfirmedAt: dateIso(row.updated_at),
    description: text(row.description, "Reporte de refugio pendiente de verificacion."),
    reporterPublic: "Contacto protegido",
    signals: signals(),
    sensitiveHidden: true,
    needs: [text(row.needs || row.shelter_type, "coordinacion"), "Match por zona"],
  };
}

export async function getPublicCasesFromDb() {
  if (!hasDatabaseEnv()) return seedCases;

  const db = getDb();
  const [persons, requests, zones, pets, shelters] = await Promise.all([
    db.execute("SELECT * FROM persons WHERE is_deleted = 0 ORDER BY updated_at DESC LIMIT 200"),
    db.execute("SELECT * FROM help_requests WHERE is_deleted = 0 ORDER BY updated_at DESC LIMIT 200"),
    db.execute("SELECT * FROM rescue_zones WHERE is_deleted = 0 ORDER BY updated_at DESC LIMIT 200"),
    db.execute("SELECT * FROM pet_reports WHERE is_deleted = 0 ORDER BY updated_at DESC LIMIT 200"),
    db.execute("SELECT * FROM shelter_reports WHERE is_deleted = 0 ORDER BY updated_at DESC LIMIT 200"),
  ]);

  return [
    ...persons.rows.map((row) => mapPerson(row as Row)),
    ...requests.rows.map((row) => mapRequest(row as Row)),
    ...zones.rows.map((row) => mapZone(row as Row)),
    ...pets.rows.map((row) => mapPet(row as Row)),
    ...shelters.rows.map((row) => mapShelter(row as Row)),
  ].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export async function createCaseInDb(kind: string, payload: Record<string, unknown>) {
  const db = getDb();
  const now = Date.now();
  const id = nanoid(10);

  if (kind === "missing" || kind === "found") {
    const image = await uploadReportImage(payload.photoDataUrl, "persons");
    const isFound = kind === "found";
    const fullName = text(payload.fullName || payload.knownName, isFound ? "Nombre por confirmar" : "Persona sin nombre confirmado");
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
        text(payload.authorContact || payload.reporterContact),
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
        id, created_at, updated_at, source, request_type, urgency, title, description, address,
        requester_name, requester_contact, number_of_people, has_children, has_elderly, has_disabled, status
      ) VALUES (?, ?, ?, 'web_form', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
      args: [
        id,
        now,
        now,
        requestType,
        text(payload.urgency, "high"),
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
