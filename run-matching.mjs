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

// Digitized list of patients from "Hospital Pérez Carreño"
const patients = [
  {"name": "Ayari Castillo", "ci": "26327913"},
  {"name": "Nathadia Medina", "ci": "29565365"},
  {"name": "Ibsen Iglesias", "ci": "32359883"},
  {"name": "Fleici Valero", "ci": "13574764"},
  {"name": "Maria Guillen", "ci": "6059288"},
  {"name": "Juver Garcia", "ci": "27877514"},
  {"name": "Crisbel Granado", "ci": "23926261"},
  {"name": "Wuilliams Martinez", "ci": "19367804"},
  {"name": "Mailin Lopez", "ci": "15341666"},
  {"name": "Thais Lopez", "ci": "13641870"},
  {"name": "Angel Fernandez", "ci": "16310014"},
  {"name": "Genesis Bracamonte", "ci": "31428533"},
  {"name": "Samuel Peroza", "ci": "33020891"},
  {"name": "Rosalinda Viera", "ci": "12717087"},
  {"name": "Candelario Vovis", "ci": "9416493"},
  {"name": "Lourdes Oropeza", "ci": "14312752"},
  {"name": "Milagro Palma", "ci": ""},
  {"name": "Rodrigo Fernandez", "ci": ""},
  {"name": "Alvaro Ortiz", "ci": "4163469"},
  {"name": "Barbara Quintero", "ci": "13422890"},
  {"name": "Gonzalo León", "ci": "22916224"},
  {"name": "Celiana Mijares", "ci": "19734177"},
  {"name": "Yonny Ortuño", "ci": "5199652"},
  {"name": "Ana Fernandez", "ci": "25699034"},
  {"name": "Alejandra Sojo", "ci": "6904629"},
  {"name": "Eiban Yegue", "ci": "24038780"},
  {"name": "Marcela Bernal", "ci": "6049995"},
  {"name": "Valeria Azocar", "ci": "28544619"},
  {"name": "Anabela Morillo", "ci": "34588981"},
  {"name": "Lesvia Morales", "ci": "5965096"},
  {"name": "Nendo Bueno", "ci": "17158021"},
  {"name": "Maria Montolla", "ci": "25025734"},
  {"name": "Harleidi Rivero", "ci": "36891784"},
  {"name": "Isabel Torres", "ci": "4718019"},
  {"name": "Dunar Lopez", "ci": "12115323"},
  {"name": "Yaneli Acosta", "ci": "31760907"},
  {"name": "Meri Chavez", "ci": "81462470"},
  {"name": "Elisabeth Chacón", "ci": "27374286"},
  {"name": "Elizabeth Gonzalez", "ci": "17709218"},
  {"name": "Yunior Tirado", "ci": "26372024"},
  {"name": "Emili Mosquera", "ci": "28285779"},
  {"name": "Victor Dias", "ci": "11517536"},
  {"name": "Maria Araque", "ci": "28100561"},
  {"name": "Maryuri Sedeño", "ci": "14194021"},
  {"name": "Barbara Ramirez", "ci": "18461886"},
  {"name": "David Brito", "ci": "30678485"},
  {"name": "Marlene Davila", "ci": "19102824"},
  {"name": "Maria Moreno", "ci": "5613119"},
  {"name": "Fredy Rodriguez", "ci": "14424783"},
  {"name": "Fernanda Figuera", "ci": "81659048"},
  {"name": "Yose Palma", "ci": "6448839"},
  {"name": "Carmen Angarita", "ci": "12060080"},
  {"name": "Yoandri Colina", "ci": "25872328"},
  {"name": "Yermin Baptista", "ci": "31948173"},
  {"name": "Sandra Dias", "ci": "11638321"},
  {"name": "Juana de Santiago", "ci": "11688834"},
  {"name": "Yori Ortuño", "ci": "3199693"},
  {"name": "Ana Olivero", "ci": "4281217"},
  {"name": "Marlin Martinez", "ci": "10576899"},
  {"name": "Juan Garcia", "ci": "17755829"},
  {"name": "Rosa Marcano", "ci": "4493435"},
  {"name": "Adriana Sandoval", "ci": "34518879"},
  {"name": "Victoria Miranda", "ci": "34054588"},
  {"name": "Jose Gutierrez", "ci": "28747519"},
  {"name": "Eduar Orama", "ci": ""},
  {"name": "Mileibis Gonzalez", "ci": "26468240"},
  {"name": "Emira Guerra", "ci": "26019884"},
  {"name": "Keilimar Garcia", "ci": "32543420"},
  {"name": "Gabriel Brizuela", "ci": "32781459"},
  {"name": "Viviana Carrizo", "ci": "33232603"},
  {"name": "Diego Garcia", "ci": "33423811"},
  {"name": "Yenni Marcano", "ci": "10384289"},
  {"name": "Manuela D Anzola", "ci": "296723"},
  {"name": "Petra Sucre", "ci": "2945823"},
  {"name": "Wilian Alvarez", "ci": "16125101"},
  {"name": "Alexandra Cardenas", "ci": "28143770"},
  {"name": "Francis Medina", "ci": "285659"},
  {"name": "Cruz Hernandez", "ci": "4636722"},
  {"name": "Fran Rondon", "ci": "19659867"},
  {"name": "Leonardo Becerra", "ci": "34800366"},
  {"name": "Cruzenaida Paredez", "ci": "6405488"},
  {"name": "Oriana Ramirez", "ci": "27006264"},
  {"name": "Alexandra Cardona", "ci": "28143770"},
  {"name": "Yudi Paredes", "ci": "3883421"},
  {"name": "Adriano Bastido", "ci": "17850045"},
  {"name": "Ana Aguilera", "ci": "20003134"},
  {"name": "Juan Salazar", "ci": "27044236"},
  {"name": "Beronica Bastardo", "ci": "30170626"},
  {"name": "Isabel Gonzales", "ci": "29701695"},
  {"name": "Elianni Hidalgo", "ci": "32976229"},
  {"name": "Franleydi Lopez", "ci": ""},
  {"name": "Amilcar Stabilito", "ci": "23241059"},
  {"name": "Yodalis Navas", "ci": "30072743"},
  {"name": "Gabriel Soncalvez", "ci": "82230906"},
  {"name": "Zoraida Martinez", "ci": "6092167"},
  {"name": "Cesar Pacheco", "ci": "26327366"},
  {"name": "Ana Dias", "ci": "10576803"},
  {"name": "Adriana Vastidos", "ci": "17856045"},
  {"name": "Judid Paredes", "ci": "3883421"},
  {"name": "Yadira Cordero", "ci": "12763837"},
  {"name": "Dayana Rondon", "ci": ""},
  {"name": "Crisdeilis Quintero", "ci": "32865296"},
  {"name": "Eric Godoy", "ci": "18749225"},
  {"name": "Nayibi Molina", "ci": "29768360"},
  {"name": "Maria Zamora", "ci": "27044236"}
];

// Helper functions for matching
function normalize(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, "") // remove special characters
    .trim();
}

function getTokens(str) {
  const norm = normalize(str);
  return norm.split(/\s+/).filter(t => t.length > 2); // only tokens > 2 chars
}

async function run() {
  console.log("Fetching missing persons from database...");
  const dbRes = await client.execute({
    sql: `SELECT id, full_name, alternate_names, physical_desc, clothing_desc, last_seen_address, status, photo_url 
          FROM persons 
          WHERE status = 'missing' AND is_deleted = 0`,
    args: []
  });

  const missingPersons = dbRes.rows;
  console.log(`Loaded ${missingPersons.length} missing persons.`);

  const matchesFound = [];

  for (const patient of patients) {
    const pNameTokens = getTokens(patient.name);
    const pCiClean = patient.ci.replace(/\D/g, "");

    const candidates = [];

    for (const person of missingPersons) {
      let score = 0;
      let reasons = [];

      const dbName = String(person.full_name || "");
      const dbAlt = String(person.alternate_names || "");
      const dbDesc = String(person.physical_desc || "") + " " + String(person.clothing_desc || "");

      // 1. C.I. matching (if available)
      if (pCiClean && pCiClean.length >= 6) {
        const cleanDbName = dbName.replace(/\D/g, "");
        const cleanDbAlt = dbAlt.replace(/\D/g, "");
        const cleanDbDesc = dbDesc.replace(/\D/g, "");

        if (cleanDbName.includes(pCiClean) || cleanDbAlt.includes(pCiClean) || cleanDbDesc.includes(pCiClean)) {
          score += 100;
          reasons.push(`Coincidencia de C.I. (${patient.ci}) en campos del registro`);
        }
      }

      // 2. Token / Name matching
      const dbNameTokens = getTokens(dbName);
      const dbAltTokens = getTokens(dbAlt);
      
      let matchedTokens = 0;
      const matchedWords = [];
      for (const t of pNameTokens) {
        if (dbNameTokens.includes(t) || dbAltTokens.includes(t)) {
          matchedTokens++;
          matchedWords.push(t);
        }
      }

      if (matchedTokens > 0) {
        // Calculate similarity percentage relative to patient name tokens
        const nameSimilarity = matchedTokens / pNameTokens.length;
        if (nameSimilarity >= 0.5) {
          const nameScore = Math.round(nameSimilarity * 80);
          score += nameScore;
          reasons.push(`Coincidencia de nombre (${Math.round(nameSimilarity * 100)}%): [${matchedWords.join(", ")}]`);
        }
      }

      if (score >= 40) {
        candidates.push({
          id: person.id,
          name: person.full_name,
          status: person.status,
          alternate_names: person.alternate_names,
          photo_url: person.photo_url,
          score,
          reasons
        });
      }
    }

    if (candidates.length > 0) {
      // Sort candidates by score descending
      candidates.sort((a, b) => b.score - a.score);
      matchesFound.push({
        patient,
        candidates
      });
    }
  }

  console.log(`Completed matching. Found matches for ${matchesFound.length} patients.`);

  // Write markdown report
  let md = `# Reporte de Coincidencias - Hospital Pérez Carreño\n\n`;
  md += `**Fecha de análisis:** ${new Date().toLocaleString()}\n`;
  md += `**Total de pacientes analizados:** ${patients.length}\n`;
  md += `**Pacientes con posibles coincidencias:** ${matchesFound.length}\n\n`;
  md += `Este reporte cruza la lista de personas ingresadas en el **Hospital Pérez Carreño** con la base de datos de personas desaparecidas en **VenezuelaJuntos**.\n\n`;

  for (const m of matchesFound) {
    md += `### Paciente: ${m.patient.name} ${m.patient.ci ? `(C.I. ${m.patient.ci})` : "(Sin C.I.)"}\n`;
    md += `| Candidato Desaparecido | Porcentaje de Coincidencia | Razones / Coincidencias | Enlace | Ficha |\n`;
    md += `| :--- | :---: | :--- | :---: | :---: |\n`;
    
    for (const cand of m.candidates) {
      const dbUrl = `https://venezuelajuntos.online/case/${cand.id}`;
      md += `| **${cand.name}** | ${cand.score}% | ${cand.reasons.join("; ")} | [Ver Web](${dbUrl}) | [Ficha Interna](file:///Users/dailmarin/Documents/VenezuelaJuntos/src/lib/cases-db.ts) |\n`;
    }
    md += `\n`;
  }

  const outPath = "/Users/dailmarin/.gemini/antigravity-cli/brain/0bf3cf6c-379c-4072-acde-c706a14604d4/match_results_perez_carreno.md";
  writeFileSync(outPath, md, "utf8");
  console.log(`Report written to ${outPath}`);
  process.exit(0);
}

run().catch(err => {
  console.error("Match execution failed:", err);
  process.exit(1);
});
