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
  const [viewTab, setViewTab] = useState<"personas" | "ayuda">("personas");

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
  }, [page, debouncedNameQuery, debouncedZoneQuery, statusFilter]);

  const refreshCases = useCallback(() => {
    const url = new URL("/api/cases", window.location.href);
    url.searchParams.set("page", page.toString());
    url.searchParams.set("limit", pageSize.toString());
    if (debouncedNameQuery) url.searchParams.set("query", debouncedNameQuery);
    if (debouncedZoneQuery) url.searchParams.set("zone", debouncedZoneQuery);
    if (statusFilter) url.searchParams.set("status", statusFilter);

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
  }, [selectedPerson, page, debouncedNameQuery, debouncedZoneQuery, statusFilter]);

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
            window.location.hash = "";
          }
        }}>
          {activeModal === "desaparecido" && (
            <ReportForm
              kind="missing"
              title="Reportar a una persona desaparecida"
              subtitle="Comparte lo que sepas. Cada dato ayuda a que alguien la reconozca."
              fields={missingFields}
            />
          )}
          {activeModal === "encontrado" && (
            <ReportForm
              kind="found"
              title="Reportar una persona encontrada"
              subtitle="Registra información con cuidado. Las coincidencias las revisa un equipo de verificación."
              fields={foundFields}
            />
          )}
          {activeModal === "mascota-perdida" && (
            <ReportForm
              fields={petLostFields}
              kind="pet_lost"
              submitLabel="Publicar mascota perdida"
              subtitle="Registra zona, descripción y contacto. La foto ayuda mucho a reconocerla."
              title="Reportar mascota perdida"
            />
          )}
          {activeModal === "mascota-encontrada" && (
            <ReportForm
              fields={petFoundFields}
              kind="pet_found"
              submitLabel="Publicar mascota recuperada"
              subtitle="Indica dónde está, su estado y si puedes tenerla temporalmente en tránsito."
              title="Reportar mascota recuperada"
            />
          )}
          {activeModal === "solicitar-refugio" && (
            <ReportForm
              fields={shelterRequestFields}
              kind="shelter_request"
              submitLabel="Solicitar refugio"
              subtitle="Esto ayuda a buscar match con refugios cercanos y a entregar datos agregados."
              title="Solicitar refugio"
            />
          )}
          {activeModal === "ofrecer-refugio" && (
            <ReportForm
              fields={shelterOfferFields}
              kind="shelter_offer"
              submitLabel="Ofrecer refugio"
              subtitle="Registra casas, canchas, iglesias, galpones u otros espacios disponibles."
              title="Ofrecer refugio"
            />
          )}
          {activeModal === "pedir-ayuda" && (
            <ReportForm
              kind="help"
              title="Pedir ayuda urgente"
              subtitle="Indica qué ocurre, dónde y qué recursos hacen falta."
              fields={helpFields}
            />
          )}
        </div>
      )}
      <main className="home">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Emergencia sismica · Venezuela</p>
            <h1>Reportar, buscar y coordinar ayuda en un solo lugar.</h1>
            <p>
              Base operativa publica para personas desaparecidas, encontradas, solicitudes urgentes y voluntarios cerca de zonas afectadas.
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
            <span>Buscar persona desaparecida</span>
          </button>
          <Link className="cta missing" href="/reportar/desaparecido">
            <UserRoundX aria-hidden="true" />
            <span>Reportar persona desaparecida</span>
          </Link>
          <Link className="cta found" href="/reportar/encontrado">
            <UserRoundCheck aria-hidden="true" />
            <span>Reportar persona encontrada</span>
          </Link>
          <button className="cta help" onClick={() => setShowEmergencyHelp(true)} type="button">
            <Siren aria-hidden="true" />
            <span>Pedir Ayuda</span>
          </button>
          <Link className="cta volunteer" href="/ayudar">
            <HandHeart aria-hidden="true" />
            <span>Quiero Ayudar (voluntario)</span>
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
            <span>Solicitar refugio</span>
          </Link>
          <Link className="secondary-cta" href="/refugio/ofrecer">
            <HomeIcon aria-hidden="true" />
            <span>Ofrecer refugio</span>
          </Link>
        </section>

        <EmergencyNotice />

        {dataSource !== "db" ? (
          <div className="data-source-note">
            {dataSource === "loading" ? "Cargando reportes..." : "Mostrando datos de respaldo hasta conectar con la base."}
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
            <strong>{globalStats.open.toLocaleString("es-ES")}</strong><span>Personas reportadas</span>
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
            <strong style={{ color: "var(--ink)" }}>{globalStats.missing.toLocaleString("es-ES")}</strong><span style={{ color: "var(--ink-soft)" }}>Aún buscados</span>
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
              <CheckCircle2 size={16} /> Localizados a salvo
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
              <FileDigit size={16} /> Posibles Duplicados
            </span>
          </button>
        </section>

        <section className="search-band">
          <label>
            Buscar por nombre
            <input
              id="search-input"
              className="search-input"
              value={nameQuery}
              onChange={(event) => {
                setNameQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Nombre, apodo o descripcion"
              type="search"
            />
          </label>
          <label>
            Buscar por zona, edificio, calle, urbanización
            <input
              list="home-venezuela-zones"
              value={zoneQuery}
              onChange={(event) => {
                setZoneQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Municipio, barrio o referencia"
              type="search"
            />
          </label>
          <div className="search-actions">
            <span>{totalItems} resultados en total</span>
            <Link href="/mapa">Ver mapa filtrable</Link>
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
              <p className="eyebrow">{viewTab === "personas" ? "Personas reportadas" : viewTab === "mascotas" ? "Mascotas reportadas" : "Solicitudes urgentes"}</p>
              <h2>{hasSearch ? "Resultados de búsqueda" : viewTab === "personas" ? "Todas las personas reportadas" : viewTab === "mascotas" ? "Mascotas perdidas y encontradas" : "Peticiones de ayuda ciudadana"}</h2>
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
                Personas desaparecidas
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
                Peticiones de ayuda
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
              <span style={{ fontSize: "0.9rem", color: "var(--ink-soft)", fontWeight: 500 }}>Filtros:</span>
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
                Aún buscados
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
              >
                Localizados a salvo
              </button>
              <span style={{ fontSize: "0.85rem", color: "var(--ink-muted)", fontStyle: "italic", marginLeft: "0.5rem" }}>
                (Pronto añadiremos por zona o edificio)
              </span>
            </div>
          )}

          {viewTab === "mascotas" && (
            <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--ink-soft)", fontWeight: 500 }}>Filtros:</span>
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
                Mascotas encontradas
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
            <div className="empty-state">No hay personas que coincidan con esa busqueda.</div>
          )}
        </section>
      </main>
    </>
  );
}
