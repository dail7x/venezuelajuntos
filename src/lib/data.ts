export type CaseKind = "missing" | "found" | "help" | "zone" | "pet_lost" | "pet_found" | "shelter_request" | "shelter_offer";
export type Urgency = "critical" | "high" | "medium" | "low";
export type CaseStatus =
  | "reported"
  | "needs_verification"
  | "verified"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "closed"
  | "duplicate"
  | "false_alarm"
  | "missing"
  | "possible_match"
  | "located"
  | "reunified";

export type PublicCase = {
  id: string;
  slug: string;
  kind: CaseKind;
  title: string;
  personName?: string;
  age?: number;
  urgency: Urgency;
  status: CaseStatus;
  zone: string;
  publicAddress: string;
  lat: number;
  lng: number;
  createdAt: string;
  updatedAt: string;
  lastConfirmedAt?: string;
  description: string;
  photoUrl?: string;
  reporterPublic: string;
  signals: {
    confirmed: number;
    canHelp: number;
    duplicate: number;
    falseReport: number;
    resolved: number;
  };
  sensitiveHidden: boolean;
  needs: string[];
};

export const statusLabels: Record<CaseStatus, string> = {
  reported: "Nuevo",
  needs_verification: "Por verificar",
  verified: "Verificado",
  assigned: "Asignado",
  in_progress: "En curso",
  resolved: "Resuelto",
  closed: "Cerrado",
  duplicate: "Duplicado",
  false_alarm: "Falso/no verificable",
  missing: "Desaparecido",
  possible_match: "Posible coincidencia",
  located: "Localizado",
  reunified: "Reunificado",
};

export const urgencyLabels: Record<Urgency, string> = {
  critical: "Critica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export const kindLabels: Record<CaseKind, string> = {
  missing: "Persona desaparecida",
  found: "Persona encontrada",
  help: "Solicitud de ayuda",
  zone: "Zona de rescate",
  pet_lost: "Mascota perdida",
  pet_found: "Mascota recuperada",
  shelter_request: "Solicitud de refugio",
  shelter_offer: "Refugio disponible",
};

export const seedCases: PublicCase[] = [
  {
    id: "per-8j4k2n",
    slug: "maria-fernanda-rangel-catia-la-mar",
    kind: "missing",
    title: "Maria Fernanda Rangel",
    personName: "Maria Fernanda Rangel",
    age: 34,
    urgency: "high",
    status: "missing",
    zone: "Catia La Mar, La Guaira",
    publicAddress: "Catia La Mar, zona aproximada",
    lat: 10.6045,
    lng: -67.0302,
    createdAt: "2026-06-25T04:40:00.000Z",
    updatedAt: "2026-06-25T05:05:00.000Z",
    lastConfirmedAt: "2026-06-25T05:05:00.000Z",
    description:
      "Vista por ultima vez cerca de la avenida principal. Cabello castano, lentes, franela azul. La informacion de contacto exacta esta protegida.",
    reporterPublic: "Familiar directo",
    signals: { confirmed: 12, canHelp: 3, duplicate: 0, falseReport: 0, resolved: 0 },
    sensitiveHidden: true,
    needs: ["Informacion verificada", "Busqueda en refugios", "Difusion local"],
  },
  {
    id: "req-vargas-01",
    slug: "ayuda-medica-macuto",
    kind: "help",
    title: "Atencion medica y traslado",
    urgency: "critical",
    status: "reported",
    zone: "Macuto, La Guaira",
    publicAddress: "Macuto, referencia protegida",
    lat: 10.603,
    lng: -66.8912,
    createdAt: "2026-06-25T04:25:00.000Z",
    updatedAt: "2026-06-25T05:15:00.000Z",
    lastConfirmedAt: "2026-06-25T05:15:00.000Z",
    description:
      "Grupo familiar solicita traslado para adulto mayor con lesion. Hay acceso por calle lateral, posible interrupcion electrica.",
    reporterPublic: "Vecino",
    signals: { confirmed: 21, canHelp: 8, duplicate: 1, falseReport: 0, resolved: 0 },
    sensitiveHidden: true,
    needs: ["Primeros auxilios", "Vehiculo", "Coordinacion telefonica"],
  },
  {
    id: "zone-ccs-01",
    slug: "edificio-danado-chacao",
    kind: "zone",
    title: "Edificio danado con riesgo estructural",
    urgency: "critical",
    status: "needs_verification",
    zone: "Chacao, Caracas",
    publicAddress: "Chacao, cuadrante aproximado",
    lat: 10.4954,
    lng: -66.8539,
    createdAt: "2026-06-25T04:10:00.000Z",
    updatedAt: "2026-06-25T04:59:00.000Z",
    lastConfirmedAt: "2026-06-25T04:59:00.000Z",
    description:
      "Reporte ciudadano de grietas y personas sin poder salir. Requiere verificacion antes de enviar voluntarios no especializados.",
    reporterPublic: "Reporte ciudadano",
    signals: { confirmed: 9, canHelp: 2, duplicate: 0, falseReport: 0, resolved: 0 },
    sensitiveHidden: true,
    needs: ["Rescate certificado", "Ingenieria estructural", "Control de acceso"],
  },
  {
    id: "found-01",
    slug: "persona-localizada-hospital-vargas",
    kind: "found",
    title: "Persona localizada en punto medico",
    personName: "Nombre por confirmar",
    urgency: "medium",
    status: "located",
    zone: "Hospital Vargas, Caracas",
    publicAddress: "Hospital Vargas, punto de atencion",
    lat: 10.5142,
    lng: -66.9096,
    createdAt: "2026-06-25T03:55:00.000Z",
    updatedAt: "2026-06-25T04:20:00.000Z",
    lastConfirmedAt: "2026-06-25T04:20:00.000Z",
    description:
      "Persona adulta consciente, sin documento visible. Foto retenida para revision por privacidad. Contactar equipo de verificacion.",
    reporterPublic: "Personal de apoyo",
    signals: { confirmed: 6, canHelp: 1, duplicate: 0, falseReport: 0, resolved: 1 },
    sensitiveHidden: true,
    needs: ["Verificacion familiar", "Cruce con desaparecidos"],
  },
];

export function getCase(idOrSlug: string) {
  return seedCases.find((item) => item.id === idOrSlug || item.slug === idOrSlug);
}

export function getStats(cases = seedCases) {
  return {
    open: cases.filter((item) => !["resolved", "closed", "reunified", "duplicate"].includes(item.status)).length,
    resolved: cases.filter((item) => ["resolved", "closed", "reunified", "located"].includes(item.status)).length,
    missing: cases.filter((item) => item.kind === "missing" && item.status === "missing").length,
    urgent: cases.filter((item) => item.urgency === "critical" || item.urgency === "high").length,
  };
}

export function publicGeoJson(cases = seedCases) {
  return {
    type: "FeatureCollection",
    features: cases.map((item) => ({
      type: "Feature",
      properties: {
        id: item.id,
        kind: item.kind,
        title: item.title,
        urgency: item.urgency,
        status: item.status,
        zone: item.zone,
        url: `/casos/${item.slug}`,
      },
      geometry: {
        type: "Point",
        coordinates: [item.lng, item.lat],
      },
    })),
  };
}

export function normalizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
