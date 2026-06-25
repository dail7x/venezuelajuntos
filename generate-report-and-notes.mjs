import { createClient } from "@libsql/client";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

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

console.log("SCRIPT STARTING");
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

const makeId = () => "note_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

async function run() {
  console.log("Adding internal notes for high confidence matches...");
  
  const now = Date.now();
  let notesAddedCount = 0;
  const reportData = [];

  for (const m of matches) {
    const idPlaceholders = m.ids.map(() => "?").join(",");
    const res = await client.execute({
      sql: `SELECT id, full_name, age_estimated, alternate_names, physical_desc, last_seen_address, author_name, author_contact, author_relation, status 
            FROM persons 
            WHERE id IN (${idPlaceholders})`,
      args: m.ids
    });

    const candidates = [];

    for (const person of res.rows) {
      const noteId = makeId();
      const noteText = `[COINCIDENCIA DE ALTA CONFIANZA - HOSPITAL PÉREZ CARREÑO]
Se ha detectado una coincidencia de alta probabilidad con un paciente ingresado en el Hospital Pérez Carreño.
Fuente: Lista de lesionados reportada por periodistas y ciudadanos en redes sociales (https://x.com/endsequera/status/2070083554281664812).
Detalle del paciente: ${m.pName} (C.I. ${m.ci || "No especificado"}).
Ubicación reportada: Hospital Pérez Carreño, Caracas.
Nota cargada automáticamente por el Asistente de Cruces.`;

      // Check if note already exists to prevent duplicate insertion
      const existingRes = await client.execute({
        sql: `SELECT id FROM person_notes WHERE person_id = ? AND text LIKE '%HOSPITAL PÉREZ CARREÑO%'`,
        args: [person.id]
      });

      if (existingRes.rows.length === 0) {
        await client.execute({
          sql: `INSERT INTO person_notes (
            id, person_id, created_at, source, author_name, author_role, text, location_address, found
          ) VALUES (?, ?, ?, 'agent_matching', 'Asistente de Cruce', 'system', ?, 'Hospital Pérez Carreño, Caracas', 0)`,
          args: [noteId, person.id, now, noteText]
        });
        notesAddedCount++;
        console.log(`  -> Note added for candidate ${person.full_name} (${person.id})`);
      } else {
        console.log(`  -> Note already exists for candidate ${person.full_name} (${person.id}), skipping insertion.`);
      }

      candidates.push({
        id: person.id,
        name: person.full_name,
        age: person.age_estimated,
        alternate_names: person.alternate_names,
        physical_desc: person.physical_desc,
        last_seen_address: person.last_seen_address,
        author_name: person.author_name,
        author_contact: person.author_contact,
        author_relation: person.author_relation,
        status: person.status
      });
    }

    reportData.push({
      patientName: m.pName,
      patientCi: m.ci,
      candidates
    });
  }

  console.log(`Completed database updates. Added ${notesAddedCount} new notes.`);

  // Generate beautiful HTML Report
  console.log("Generating standalone HTML report...");
  const htmlContent = generateHtmlReport(reportData);
  
  const reportPath = "/Users/dailmarin/Documents/VenezuelaJuntos/fotos/reportes_periodistas/reporte_coincidencias.html";
  const artifactPath = "/Users/dailmarin/.gemini/antigravity-cli/brain/0bf3cf6c-379c-4072-acde-c706a14604d4/reporte_coincidencias.html";

  writeFileSync(reportPath, htmlContent, "utf8");
  writeFileSync(artifactPath, htmlContent, "utf8");

  console.log(`HTML Report written to ${reportPath}`);
  console.log(`HTML Report written to ${artifactPath}`);

  process.exit(0);
}

function generateHtmlReport(data) {
  const cardsHtml = data.map(item => {
    const candidatesHtml = item.candidates.map(cand => `
      <div class="candidate-card">
        <div class="candidate-header">
          <h4 class="candidate-name">${cand.name}</h4>
          <span class="status-badge ${cand.status}">${cand.status}</span>
        </div>
        <div class="candidate-info">
          <p><strong>ID Ficha:</strong> <a href="https://venezuelajuntos.online/case/${cand.id}" target="_blank">${cand.id}</a></p>
          <p><strong>C.I. / Nombres alternos:</strong> ${cand.alternate_names || '<span class="empty">No especificado</span>'}</p>
          <p><strong>Edad estimada:</strong> ${cand.age !== null ? `${cand.age} años` : '<span class="empty">No especificada</span>'}</p>
          <p><strong>Última ubicación vista:</strong> ${cand.last_seen_address || '<span class="empty">No especificada</span>'}</p>
          <p><strong>Descripción física:</strong> ${cand.physical_desc || '<span class="empty">No especificada</span>'}</p>
        </div>
        
        <div class="contact-box">
          <div class="contact-header">
            <span>Contacto de Familia</span>
            <button class="btn-copy" onclick="copyText(this, '${cand.author_contact || ''}')">Copiar</button>
          </div>
          <div class="contact-body">
            <p class="contact-name">${cand.author_name || 'Ciudadano'}</p>
            <p class="contact-value">${cand.author_contact || 'No especificado'}</p>
            <p class="contact-relation">${cand.author_relation || 'Relación no especificada'}</p>
          </div>
        </div>
      </div>
    `).join("");

    return `
      <div class="patient-section">
        <div class="patient-banner">
          <div class="patient-title-group">
            <h3 class="patient-name">${item.patientName}</h3>
            <span class="patient-ci">C.I. ${item.patientCi || "Sin C.I."}</span>
          </div>
          <div class="badge-match">Posibilidad Alta</div>
        </div>
        <div class="candidates-grid">
          ${candidatesHtml}
        </div>
      </div>
    `;
  }).join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cruce de Coincidencias - Hospital Pérez Carreño</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #0b0f19;
      --card-bg: #151d30;
      --card-border: rgba(255, 255, 255, 0.05);
      --accent-gradient: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      --text-main: #f8fafc;
      --text-sub: #94a3b8;
      --btn-bg: rgba(59, 130, 246, 0.15);
      --btn-hover: rgba(59, 130, 246, 0.3);
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Outfit', sans-serif;
      background-color: var(--bg-dark);
      color: var(--text-main);
      padding: 2.5rem 1.5rem;
      line-height: 1.5;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    header {
      text-align: center;
      margin-bottom: 3.5rem;
      position: relative;
    }

    header::after {
      content: '';
      position: absolute;
      bottom: -1.5rem;
      left: 50%;
      transform: translateX(-50%);
      width: 120px;
      height: 4px;
      background: var(--accent-gradient);
      border-radius: 2px;
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      margin-bottom: 0.5rem;
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .subtitle {
      color: var(--text-sub);
      font-size: 1.1rem;
      font-weight: 400;
    }

    .stats-container {
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      margin-bottom: 3rem;
      flex-wrap: wrap;
    }

    .stat-badge {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid var(--card-border);
      padding: 0.75rem 1.5rem;
      border-radius: 50px;
      font-size: 0.95rem;
      font-weight: 500;
      color: var(--text-sub);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      backdrop-filter: blur(10px);
    }

    .stat-badge strong {
      color: var(--text-main);
    }

    .patient-section {
      background: rgba(21, 29, 48, 0.4);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      margin-bottom: 3rem;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    }

    .patient-banner {
      background: rgba(30, 41, 59, 0.8);
      padding: 1.25rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--card-border);
      flex-wrap: wrap;
      gap: 1rem;
    }

    .patient-title-group {
      display: flex;
      align-items: baseline;
      gap: 1rem;
    }

    .patient-name {
      font-size: 1.4rem;
      font-weight: 600;
      color: var(--text-main);
    }

    .patient-ci {
      font-size: 0.95rem;
      color: var(--text-sub);
      background: rgba(255, 255, 255, 0.05);
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
    }

    .badge-match {
      background: var(--accent-gradient);
      padding: 0.4rem 1rem;
      border-radius: 50px;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }

    .candidates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
      padding: 2rem;
    }

    .candidate-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.25s ease, border-color 0.25s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
    }

    .candidate-card:hover {
      transform: translateY(-4px);
      border-color: rgba(59, 130, 246, 0.4);
    }

    .candidate-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .candidate-name {
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--text-main);
    }

    .status-badge {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
    }

    .status-badge.missing {
      background-color: rgba(239, 68, 68, 0.15);
      color: var(--danger);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .status-badge.located {
      background-color: rgba(16, 185, 129, 0.15);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .candidate-info {
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
      color: var(--text-sub);
    }

    .candidate-info p {
      margin-bottom: 0.5rem;
      display: flex;
      flex-direction: column;
    }

    .candidate-info p strong {
      color: var(--text-main);
      margin-bottom: 0.15rem;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .candidate-info a {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 500;
    }

    .candidate-info a:hover {
      text-decoration: underline;
    }

    .empty {
      font-style: italic;
      color: rgba(255, 255, 255, 0.25);
    }

    .contact-box {
      background: rgba(11, 15, 25, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      padding: 1rem;
      margin-top: auto;
    }

    .contact-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 600;
      color: var(--text-sub);
      letter-spacing: 0.05em;
    }

    .btn-copy {
      background: var(--btn-bg);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #60a5fa;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-copy:hover {
      background: var(--btn-hover);
    }

    .contact-body {
      font-size: 0.95rem;
    }

    .contact-name {
      font-weight: 600;
      color: var(--text-main);
    }

    .contact-value {
      color: #60a5fa;
      font-family: monospace;
      font-size: 1rem;
      margin: 0.25rem 0;
    }

    .contact-relation {
      font-size: 0.8rem;
      color: var(--text-sub);
      font-style: italic;
    }

    footer {
      text-align: center;
      margin-top: 5rem;
      color: var(--text-sub);
      font-size: 0.85rem;
    }

    /* Toast Notification */
    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 1rem 2rem;
      border-radius: 8px;
      color: var(--text-main);
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      transform: translateY(150%);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 1000;
      font-weight: 500;
    }

    .toast.show {
      transform: translateY(0);
    }

    @media (max-width: 768px) {
      .candidates-grid {
        grid-template-columns: 1fr;
        padding: 1rem;
      }
      .patient-banner {
        padding: 1rem;
      }
    }
  </style>
</head>
<body>

  <div class="container">
    <header>
      <h1>Cruce de Coincidencias</h1>
      <p class="subtitle">Análisis del Hospital Pérez Carreño · Terremoto de Venezuela 2026</p>
    </header>

    <div class="stats-container">
      <div class="stat-badge">
        Origen de datos: <strong>X / WhatsApp</strong>
      </div>
      <div class="stat-badge">
        Pacientes Analizados: <strong>105</strong>
      </div>
      <div class="stat-badge">
        Coincidencias de Alta Confianza: <strong>11</strong>
      </div>
    </div>

    ${cardsHtml}

    <footer>
      <p>© 2026 VenezuelaJuntos · Desarrollado para coordinación y asistencia de rescate en emergencias.</p>
    </footer>
  </div>

  <div id="toast" class="toast">¡Copiado al portapapeles!</div>

  <script>
    function copyText(button, text) {
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        const originalText = button.innerText;
        button.innerText = 'Copiado';
        button.style.background = 'rgba(16, 185, 129, 0.2)';
        button.style.color = '#34d399';
        button.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        
        const toast = document.getElementById('toast');
        toast.classList.add('show');

        setTimeout(() => {
          button.innerText = originalText;
          button.style.background = '';
          button.style.color = '';
          button.style.borderColor = '';
          toast.classList.remove('show');
        }, 2000);
      });
    }
  </script>
</body>
</html>
  `;
}

run().catch(err => {
  console.error("Execution failed:", err);
  process.exit(1);
});

