export type CaseKind = "missing" | "found" | "help" | "zone" | "pet_lost" | "pet_found" | "shelter_request" | "shelter_offer";

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
  cedula?: number;
  age?: number;

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
  foundNotes?: string;
  reporterPublic: string;
  reporterName?: string;
  reporterContact?: string;
  signals: {
    confirmed: number;
    canHelp: number;
    duplicate: number;
    falseReport: number;
    resolved: number;
  };
  sensitiveHidden: boolean;
  needs: string[];
  sourceDomain?: string;
  sourceUrl?: string;
  potentialDuplicateOf?: string;
  duplicates?: PublicCase[];
  inHospitalList?: boolean;
};

export const statusLabels: Record<CaseStatus, string> = {
  reported: "Nuevo",
  needs_verification: "Por verificar",
  verified: "Verificado",
  assigned: "Asignado",
  in_progress: "En curso",
  resolved: "Resuelto",
  closed: "Cerrado",
  duplicate: "Posible repetido",
  false_alarm: "Requiere revisión",
  missing: "En búsqueda",
  possible_match: "Posible coincidencia",
  located: "Localizado",
  reunified: "Reunificado",
};



export const kindLabels: Record<CaseKind, string> = {
  missing: "Persona en búsqueda",
  found: "Persona localizada",
  help: "Solicitud de ayuda",
  zone: "Zona de rescate",
  pet_lost: "Mascota perdida",
  pet_found: "Mascota recuperada",
  shelter_request: "Solicitud de refugio",
  shelter_offer: "Refugio disponible",
};

export const seedCases: PublicCase[] = [];

export function getCase(idOrSlug: string) {
  return seedCases.find((item) => item.id === idOrSlug || item.slug === idOrSlug);
}

export function getStats(cases = seedCases) {
  return {
    open: cases.filter((item) => !["resolved", "closed", "reunified", "duplicate"].includes(item.status)).length,
    resolved: cases.filter((item) => ["resolved", "closed", "reunified", "located"].includes(item.status)).length,
    missing: cases.filter((item) => item.kind === "missing" && item.status === "missing").length,
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
