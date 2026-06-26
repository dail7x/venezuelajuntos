"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useDebounce } from "use-debounce";
import { CheckCircle2, UserRoundX, UserRoundCheck, HandHeart, PawPrint, Home as HomeIcon, Siren, FileDigit, Search } from "lucide-react";
import { CaseCard } from "@/components/CaseCard";
import { CaseDetailModal } from "@/components/CaseDetailModal";
import { EmergencyHelpModal } from "@/components/EmergencyHelpModal";
import { EmergencyNotice } from "@/components/Notice";
import { Header } from "@/components/Header";
import { MapPanel } from "@/components/MapPanel";
import { seedCases, type PublicCase } from "@/lib/data";
import { venezuelaZones } from "@/lib/venezuela-zones";

import { ReportForm } from "@/components/ReportForm";
import {
  missingFields,
  foundFields,
  petLostFields,
  petFoundFields,
  shelterRequestFields,
  shelterOfferFields,
  helpFields,
} from "@/lib/forms";



export default function Home({ defaultModal = null }: { defaultModal?: string | null }) {
  const [cases, setCases] = useState<PublicCase[]>(seedCases);
  const [nameQuery, setNameQuery] = useState("");
  const [zoneQuery, setZoneQuery] = useState("");
  const [debouncedNameQuery] = useDebounce(nameQuery, 500);
  const [debouncedZoneQuery] = useDebounce(zoneQuery, 500);
  
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 99;
  
  const [dataSource, setDataSource] = useState<"seed" | "db" | "loading">("loading");
  const [selectedPerson, setSelectedPerson] = useState<PublicCase | null>(null);
  const [showEmergencyHelp, setShowEmergencyHelp] = useState(false);
  const [activeModal] = useState<string | null>(defaultModal);
  const [globalStats, setGlobalStats] = useState({ open: 0, missing: 0, resolved: 0, duplicates: 0 });
  const [statusFilter, setStatusFilter] = useState("");
  const [hasUpdatesFilter, setHasUpdatesFilter] = useState(false);
  const [viewTab, setViewTab] = useState<"personas" | "ayuda" | "mascotas">("personas");

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => setGlobalStats(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const url = new URL("/api/cases", window.location.href);
    url.searchParams.set("page", page.toString());
    url.searchParams.set("limit", pageSize.toString());
    if (debouncedNameQuery) url.searchParams.set("query", debouncedNameQuery);
    if (debouncedZoneQuery) url.searchParams.set("zone", debouncedZoneQuery);
    if (statusFilter) url.searchParams.set("status", statusFilter);
    if (hasUpdatesFilter) url.searchParams.set("hasUpdates", "true");

    fetch(url.toString())
      .then((response) => response.json())
      .then((result: { data?: PublicCase[]; total?: number; source?: "seed" | "db" }) => {
        if (cancelled) return;
        if (Array.isArray(result.data)) {
          setCases(result.data);
          setTotalItems(result.total ?? result.data.length);
        }
        setDataSource(result.source ?? "seed");
      })
      .catch(() => {
        if (!cancelled) setDataSource("seed");
      });

    return () => {
      cancelled = true;
    };
  }, [page, debouncedNameQuery, debouncedZoneQuery, statusFilter, hasUpdatesFilter]);

  const refreshCases = useCallback(() => {
    const url = new URL("/api/cases", window.location.href);
    url.searchParams.set("page", page.toString());
    url.searchParams.set("limit", pageSize.toString());
    if (debouncedNameQuery) url.searchParams.set("query", debouncedNameQuery);
    if (debouncedZoneQuery) url.searchParams.set("zone", debouncedZoneQuery);
    if (statusFilter) url.searchParams.set("status", statusFilter);
    if (hasUpdatesFilter) url.searchParams.set("hasUpdates", "true");

    fetch(url.toString())
      .then((response) => response.json())
      .then((result: { data?: PublicCase[]; total?: number; source?: "seed" | "db" }) => {
        if (Array.isArray(result.data)) {
          setCases(result.data);
          setTotalItems(result.total ?? result.data.length);
          setDataSource(result.source ?? "seed");
          if (selectedPerson) {
            const updated = result.data.find((c) => c.id === selectedPerson.id);
            if (updated) {
              setSelectedPerson(updated);
            }
          }
        }
      })
      .catch(() => {});
  }, [selectedPerson, page, debouncedNameQuery, debouncedZoneQuery, statusFilter, hasUpdatesFilter]);

  const displayCases = cases.filter((item) => 
    viewTab === "personas" ? (item.kind === "missing" || item.kind === "found") : 
    viewTab === "mascotas" ? (item.kind === "pet_lost" || item.kind === "pet_found") : 
    item.kind === "help"
  );
  const hasSearch = Boolean(nameQuery.trim() || zoneQuery.trim() || statusFilter);
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  return (
    <>
      <Header />
      {selectedPerson ? <CaseDetailModal item={selectedPerson} onClose={() => setSelectedPerson(null)} onUpdate={refreshCases} /> : null}
      {showEmergencyHelp ? <EmergencyHelpModal onClose={() => setShowEmergencyHelp(false)} /> : null}

      {activeModal && (
        <div className="modal-backdrop" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedPerson(null);
            setShowEmergencyHelp(false);
            window.location.href = "/";
          }
        }}>
          {activeModal === "desaparecido" && (
            <ReportForm
              kind="missing"
              title="Reportar a una persona desaparecida"
              subtitle="Comparte con calma lo que sepas. Una foto, una zona o una seña pueden ayudar a que alguien la reconozca."
              fields={missingFields}
            />
          )}
          {activeModal === "encontrado" && (
            <ReportForm
              kind="found"
              title="Reportar una persona encontrada"
              subtitle="Registra la información con respeto. El equipo revisará posibles coincidencias antes de contactar a una familia."
              fields={foundFields}
            />
          )}
          {activeModal === "mascota-perdida" && (
            <ReportForm
              fields={petLostFields}
              kind="pet_lost"
              submitLabel="Publicar mascota perdida"
              subtitle="Sabemos que también son familia. Agrega zona, descripción y una forma segura de contacto."
              title="Reportar mascota perdida"
            />
          )}
          {activeModal === "mascota-encontrada" && (
            <ReportForm
              fields={petFoundFields}
              kind="pet_found"
              submitLabel="Publicar mascota recuperada"
              subtitle="Indica donde esta, como se encuentra y si puedes cuidarla temporalmente mientras aparece su familia."
              title="Reportar mascota recuperada"
            />
          )}
          {activeModal === "solicitar-refugio" && (
            <ReportForm
              fields={shelterRequestFields}
              kind="shelter_request"
              submitLabel="Solicitar refugio"
              subtitle="Cuéntanos dónde están y qué necesitan para cruzarlo con espacios cercanos disponibles."
              title="Solicitar refugio"
            />
          )}
          {activeModal === "ofrecer-refugio" && (
            <ReportForm
              fields={shelterOfferFields}
              kind="shelter_offer"
              submitLabel="Ofrecer refugio"
              subtitle="Si tienes un espacio seguro, registrarlo puede ayudar a familias que necesitan pasar la noche bajo techo."
              title="Ofrecer refugio"
            />
          )}
          {activeModal === "pedir-ayuda" && (
            <ReportForm
              kind="help"
              title="Pedir ayuda ahora"
              subtitle="Describe qué ocurre, dónde están y qué tipo de ayuda necesitan. Esta solicitud no reemplaza los servicios oficiales."
              fields={helpFields}
            />
          )}
        </div>
      )}
      <main className="home">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Venezuela se busca y se acompaña</p>
            <h1>Cada dato puede acercar a una familia a una respuesta.</h1>
            <p>
              Un espacio ciudadano para buscar personas, avisar que alguien apareció, pedir ayuda y organizar apoyo con respeto, cuidado y verificación.
            </p>
          </div>
        </section>

        <section className="cta-grid" aria-label="Acciones principales">
          <button 
            className="cta search-cta" 
            style={{ backgroundColor: "#3b82f6" }} 
            onClick={() => {
              const el = document.getElementById("search-input");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.focus();
              }
            }} 
            type="button"
          >
            <Search aria-hidden="true" />
            <span>Buscar a alguien</span>
          </button>
          <Link className="cta missing" href="/reportar/desaparecido">
            <UserRoundX aria-hidden="true" />
            <span>Reportar persona desaparecida</span>
          </Link>
          <Link className="cta found" href="/reportar/encontrado">
            <UserRoundCheck aria-hidden="true" />
            <span>Avisar que alguien aparecio</span>
          </Link>
          <button className="cta help" onClick={() => setShowEmergencyHelp(true)} type="button">
            <Siren aria-hidden="true" />
            <span>Pedir ayuda ahora</span>
          </button>
          <Link className="cta volunteer" href="/ayudar">
            <HandHeart aria-hidden="true" />
            <span>Ofrecer ayuda</span>
          </Link>
          <Link className="cta" style={{ backgroundColor: "#16a34a", color: "white" }} href="/estoy-a-salvo">
            <UserRoundCheck aria-hidden="true" />
            <span>Soy yo, estoy a salvo</span>
          </Link>
        </section>

        <section className="secondary-cta-grid" aria-label="Mascotas y refugios">
          <Link className="secondary-cta" href="/reportar/mascota-perdida">
            <PawPrint aria-hidden="true" />
            <span>Reportar mascota perdida</span>
          </Link>
          <Link className="secondary-cta" href="/reportar/mascota-encontrada">
            <PawPrint aria-hidden="true" />
            <span>Reportar mascota recuperada</span>
          </Link>
          <Link className="secondary-cta" href="/refugio/solicitar">
            <HomeIcon aria-hidden="true" />
            <span>Necesito refugio</span>
          </Link>
          <Link className="secondary-cta" href="/refugio/ofrecer">
            <HomeIcon aria-hidden="true" />
            <span>Tengo refugio disponible</span>
          </Link>
        </section>

        <EmergencyNotice />

        {dataSource !== "db" ? (
          <div className="data-source-note">
            {dataSource === "loading" ? "Cargando reportes..." : "Mostrando datos de respaldo mientras se reconecta la base."}
          </div>
        ) : null}

        <section className="quick-stats" aria-label="Contadores">
          <button 
            type="button"
            className="stat-box"
            onClick={() => { setStatusFilter(""); setPage(1); }} 
            style={{ 
              border: statusFilter === "" ? "2px solid var(--ink)" : undefined,
              background: "#f1f5f9",
            }}
          >
            <strong>{globalStats.open.toLocaleString("es-ES")}</strong><span>Reportes recibidos</span>
          </button>
          <button 
            type="button"
            className="stat-box"
            onClick={() => { setStatusFilter("missing"); setPage(1); }} 
            style={{ 
              border: statusFilter === "missing" ? "2px solid #ea580c" : undefined,
              background: "#ffedd5",
            }}
          >
            <strong style={{ color: "var(--ink)" }}>{globalStats.missing.toLocaleString("es-ES")}</strong><span style={{ color: "var(--ink-soft)" }}>Aún en búsqueda</span>
          </button>
          <button 
            type="button"
            className="stat-box"
            onClick={() => { setStatusFilter("resolved"); setPage(1); }} 
            style={{ 
              border: statusFilter === "resolved" ? "2px solid #16a34a" : undefined,
              background: "#dcfce7",
              color: "#16a34a",
            }}
          >
            <strong>{globalStats.resolved.toLocaleString("es-ES")}</strong>
            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#16a34a" }}>
              <CheckCircle2 size={16} /> Reencuentros reportados
            </span>
          </button>
          
          <button 
            type="button"
            className="stat-box"
            onClick={() => { setStatusFilter("potential_duplicate"); setPage(1); }} 
            style={{ 
              border: statusFilter === "potential_duplicate" ? "2px solid #ea580c" : undefined,
              background: "#ffedd5",
              color: "#ea580c",
            }}
          >
            <strong>{globalStats.duplicates.toLocaleString("es-ES")}</strong>
            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#ea580c" }}>
              <FileDigit size={16} /> Posibles registros duplicados
            </span>
          </button>
        </section>

        <section className="search-band">
          <label>
            Buscar por nombre o apodo
            <input
              id="search-input"
              className="search-input"
              value={nameQuery}
              onChange={(event) => {
                setNameQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Ej. Maria, Jose, apodo o seña"
              type="search"
            />
          </label>
          <label>
            Buscar por zona, edificio, calle o urbanizacion
            <input
              list="home-venezuela-zones"
              value={zoneQuery}
              onChange={(event) => {
                setZoneQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Municipio, barrio, refugio o referencia"
              type="search"
            />
          </label>
          <div className="search-actions" style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <span>{totalItems} reportes encontrados</span>
            
            <button 
              onClick={() => { setHasUpdatesFilter(!hasUpdatesFilter); setPage(1); }}
              type="button"
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "2px solid #22c55e",
                backgroundColor: hasUpdatesFilter ? "#22c55e" : "#f0fdf4",
                color: hasUpdatesFilter ? "white" : "#16a34a",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <span className={hasUpdatesFilter ? "" : "animate-pulse"}>🔔</span>
              {hasUpdatesFilter ? "Mostrando actualizaciones" : "Ver casos con actualizaciones"}
            </button>
            <Link href="/mapa">Ver en el mapa</Link>
          </div>
        </section>
        <datalist id="home-venezuela-zones">
          {venezuelaZones.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>

        {/* <section className="home-map-section">
          <MapPanel cases={filteredCases} compact />
        </section> */}

        <section className="people-section">
          <div className="section-heading" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <p className="eyebrow">{viewTab === "personas" ? "Personas y familias" : viewTab === "mascotas" ? "Mascotas reportadas" : "Ayuda solicitada"}</p>
              <h2>{hasSearch ? "Resultados de búsqueda" : viewTab === "personas" ? "Personas reportadas por la comunidad" : viewTab === "mascotas" ? "Mascotas perdidas y encontradas" : "Solicitudes de ayuda"}</h2>
            </div>
            
            <div style={{ display: "flex", gap: "0.5rem", background: "#f1f5f9", padding: "4px", borderRadius: "8px", alignSelf: "flex-start" }}>
              <button
                onClick={() => { setViewTab("personas"); setPage(1); }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  background: viewTab === "personas" ? "white" : "transparent",
                  color: viewTab === "personas" ? "var(--ink)" : "var(--ink-soft)",
                  boxShadow: viewTab === "personas" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                Personas
              </button>
              <button
                onClick={() => { setViewTab("ayuda"); setPage(1); }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  background: viewTab === "ayuda" ? "white" : "transparent",
                  color: viewTab === "ayuda" ? "var(--ink)" : "var(--ink-soft)",
                  boxShadow: viewTab === "ayuda" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                Ayuda
              </button>
              <button
                onClick={() => { setViewTab("mascotas"); setPage(1); }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  background: viewTab === "mascotas" ? "white" : "transparent",
                  color: viewTab === "mascotas" ? "var(--ink)" : "var(--ink-soft)",
                  boxShadow: viewTab === "mascotas" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                Mascotas
              </button>
            </div>
          </div>
          
          {viewTab === "personas" && (
            <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--ink-soft)", fontWeight: 500 }}>Ver:</span>
              <button
                onClick={() => { setStatusFilter(statusFilter === "missing" ? "" : "missing"); setPage(1); }}
                style={{
                  padding: "4px 12px",
                  borderRadius: "999px",
                  border: `1px solid ${statusFilter === "missing" ? "#ea580c" : "#fed7aa"}`,
                  background: statusFilter === "missing" ? "#ffedd5" : "white",
                  color: statusFilter === "missing" ? "#9a3412" : "#ea580c",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem"
                }}
              >
                Aún en búsqueda
              </button>
              <button
                onClick={() => { setStatusFilter(statusFilter === "resolved" ? "" : "resolved"); setPage(1); }}
                style={{
                  padding: "4px 12px",
                  borderRadius: "999px",
                  border: `1px solid ${statusFilter === "resolved" ? "#16a34a" : "#bbf7d0"}`,
                  background: statusFilter === "resolved" ? "#dcfce7" : "white",
                  color: statusFilter === "resolved" ? "#166534" : "#16a34a",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem"
                }}
                Reencuentros reportados
              </button>
              <button
                onClick={() => { setStatusFilter(statusFilter === "hospital" ? "" : "hospital"); setPage(1); }}
                style={{
                  padding: "4px 12px",
                  borderRadius: "999px",
                  border: `1px solid ${statusFilter === "hospital" ? "#0284c7" : "#bae6fd"}`,
                  background: statusFilter === "hospital" ? "#e0f2fe" : "white",
                  color: statusFilter === "hospital" ? "#0369a1" : "#0284c7",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem"
                }}
              >
                Encontrado en lista de hospital
              </button>
              <span style={{ fontSize: "0.85rem", color: "var(--ink-muted)", fontStyle: "italic", marginLeft: "0.5rem" }}>
                Puedes combinar estos filtros con nombre o zona.
              </span>
            </div>
          )}

          {viewTab === "mascotas" && (
            <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--ink-soft)", fontWeight: 500 }}>Ver:</span>
              <button
                onClick={() => { setStatusFilter(statusFilter === "reported" ? "" : "reported"); setPage(1); }}
                style={{
                  padding: "4px 12px",
                  borderRadius: "999px",
                  border: `1px solid ${statusFilter === "reported" ? "#ea580c" : "#fed7aa"}`,
                  background: statusFilter === "reported" ? "#ffedd5" : "white",
                  color: statusFilter === "reported" ? "#9a3412" : "#ea580c",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem"
                }}
              >
                Mascotas perdidas
              </button>
              <button
                onClick={() => { setStatusFilter(statusFilter === "located" ? "" : "located"); setPage(1); }}
                style={{
                  padding: "4px 12px",
                  borderRadius: "999px",
                  border: `1px solid ${statusFilter === "located" ? "#16a34a" : "#bbf7d0"}`,
                  background: statusFilter === "located" ? "#dcfce7" : "white",
                  color: statusFilter === "located" ? "#166534" : "#16a34a",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem"
                }}
              >
                Mascotas recuperadas
              </button>
            </div>
          )}

          {displayCases.length ? (
            <>
              <div className="people-grid">
                {displayCases.map((item) => <CaseCard key={item.id} item={item} onOpen={setSelectedPerson} />)}
              </div>
              
              <div className="pagination-controls" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center', marginTop: '2rem' }}>
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="header-button"
                  style={{ opacity: page === 1 ? 0.5 : 1 }}
                >
                  Anterior
                </button>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Página {page} de {totalPages}</span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="header-button"
                  style={{ opacity: page === totalPages ? 0.5 : 1 }}
                >
                  Siguiente
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">No encontramos reportes con esos datos. Prueba otro nombre, apodo o zona; a veces los reportes llegan con información incompleta.</div>
          )}
        </section>
      </main>
    </>
  );
}
