import { createClient } from "@libsql/client";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Load Environment variables
function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  try {
    const contents = readFileSync(envPath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*['"]?(.+?)['"]?\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch (err) {
    console.error("Error loading env:", err);
  }
}

loadLocalEnv();

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("DATABASE_URL and TURSO_AUTH_TOKEN are required");
  process.exit(1);
}

const client = createClient({ url, authToken });

const matches = [
  { pName: "Ibsen Iglesias", ci: "32359883", ids: ["ext-pe81c2fbaa946", "ext-pc38222bcf59f", "ext-p246ef52da828", "ext-p06b159d2db41", "ext-pc6c7cd1f0510", "ext-pffb5f4fb0620", "ext-p19b196cf6cda"] },
  { pName: "Lourdes Oropeza", ci: "14312752", ids: ["ext-pa1a505b77d18", "ext-p78540cd75b9c"] },
  { pName: "Alvaro Ortiz", ci: "4163469", ids: ["ext-p6ff7a15ad31a"] },
  { pName: "Barbara Ramirez", ci: "18461886", ids: ["ext-p021c3a8efd1c", "ext-pba1a5f1e88f4", "ext-p4b15d9f41b92", "ext-pf9c08d13972a"] },
  { pName: "Maria Moreno", ci: "5613119", ids: ["ext-pd3d4196b5e74", "ext-p73387cad9d89", "ext-pece5c4c84f7c", "ext-p51b138588741", "ext-pa9700097173a"] },
  { pName: "Juan Garcia", ci: "17755829", ids: ["ext-p78f61f7f7cbb", "ext-p941b73a59aab", "ext-pb8906dde547f"] },
  { pName: "Jose Gutierrez", ci: "28747519", ids: ["ext-p32b76dfdb0fc", "ext-p58733ad6b318", "ext-pc90b44742d5a", "ext-p2f8bf6473a35"] },
  { pName: "Diego Garcia", ci: "33423811", ids: ["ext-p5bcd8f10b817", "ext-p6ad73260b4d3"] },
  { pName: "Juan Salazar", ci: "27044236", ids: ["ext-p3e0556545205", "ext-p4dd4adb7ebff", "ext-pe1e17e492e98"] },
  { pName: "Isabel Gonzales", ci: "29701695", ids: ["ext-p138990882fed"] },
  { pName: "Maria Zamora", ci: "27044236", ids: ["ext-p2c08e21e1bb0"] }
];

async function run() {
  let md = `# Coincidencias de Alta Confianza - Hospital Pérez Carreño\n\n`;
  md += `**Fecha:** ${new Date().toLocaleString()}\n`;
  md += `Este reporte contiene la información de contacto y detalles de las fichas de personas reportadas como desaparecidas en **VenezuelaJuntos** que tienen una alta probabilidad de coincidir (nombre y apellido coinciden plenamente) con los pacientes hospitalizados.\n\n`;

  for (const m of matches) {
    md += `## Paciente Hospitalizado: ${m.pName} (C.I. ${m.ci || "Sin C.I."})\n\n`;
    
    // Fetch from database
    const idPlaceholders = m.ids.map(() => "?").join(",");
    const res = await client.execute({
      sql: `SELECT id, full_name, age_estimated, alternate_names, physical_desc, last_seen_address, author_name, author_contact, author_relation, status 
            FROM persons 
            WHERE id IN (${idPlaceholders})`,
      args: m.ids
    });

    if (res.rows.length === 0) {
      md += `*No se encontraron detalles específicos en la base de datos para los candidatos asociados.*\n\n`;
      continue;
    }

    for (const row of res.rows) {
      md += `### Candidato: ${row.full_name} (Ficha ID: [${row.id}](https://venezuelajuntos.online/case/${row.id}))\n`;
      md += `* **Nombres Alternativos / C.I.:** ${row.alternate_names || "No especificado"}\n`;
      md += `* **Edad Estimada:** ${row.age_estimated !== null ? `${row.age_estimated} años` : "No especificada"}\n`;
      md += `* **Última Dirección Vista:** ${row.last_seen_address || "No especificada"}\n`;
      md += `* **Descripción Física:** ${row.physical_desc || "No especificada"}\n`;
      md += `* **Nombre del Reportante:** ${row.author_name || "Ciudadano / Externo"}\n`;
      md += `* **Contacto del Reportante (IMPORTANTE):** \`${row.author_contact || "No especificado"}\` (${row.author_relation || "Relación no especificada"})\n`;
      md += `* **Estado actual del registro:** \`${row.status}\`\n\n`;
    }
    md += `---\n\n`;
  }

  const outPath = "/Users/dailmarin/.gemini/antigravity-cli/brain/0bf3cf6c-379c-4072-acde-c706a14604d4/high_confidence_matches_perez_carreno.md";
  writeFileSync(outPath, md, "utf8");
  console.log(`Detailed report written to ${outPath}`);
  process.exit(0);
}

run().catch(err => {
  console.error("Extraction failed:", err);
  process.exit(1);
});
