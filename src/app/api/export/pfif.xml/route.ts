import { seedCases } from "@/lib/data";

export async function GET() {
  const personas = seedCases
    .filter((item) => item.kind === "missing" || item.kind === "found")
    .map(
      (item) => `
  <pfif:person>
    <pfif:person_record_id>venezuelajuntos.online/${item.id}</pfif:person_record_id>
    <pfif:nombre_completo>${escapeXml(item.personName ?? item.title)}</pfif:nombre_completo>
    <pfif:entry_date>${item.createdAt}</pfif:entry_date>
    <pfif:expiry_date>${new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()}</pfif:expiry_date>
    <pfif:latest_status>${item.estado_actual}</pfif:latest_status>
    <pfif:last_known_location>${escapeXml(item.publicAddress)}</pfif:last_known_location>
  </pfif:person>`,
    )
    .join("");

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<pfif:pfif xmlns:pfif="http://zesty.ca/pfif/1.4">${personas}
</pfif:pfif>`, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => {
    const map: Record<string, string> = { "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" };
    return map[char];
  });
}
