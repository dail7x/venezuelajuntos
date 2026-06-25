"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useDebounce } from "use-debounce";
import { HandHeart, Home as HomeIcon, PawPrint, Siren, UserRoundCheck, UserRoundX, CheckCircle2 } from "lucide-react";
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
  const pageSize = 100;
  
  const [dataSource, setDataSource] = useState<"seed" | "db" | "loading">("loading");
  const [selectedPerson, setSelectedPerson] = useState<PublicCase | null>(null);
  const [showEmergencyHelp, setShowEmergencyHelp] = useState(false);
  const [activeModal] = useState<string | null>(defaultModal);
  const [globalStats, setGlobalStats] = useState({ open: 0, missing: 0, resolved: 0 });
  const [statusFilter, setStatusFilter] = useState("");

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

  const peopleCases = cases.filter((item) => item.kind === "missing" || item.kind === "found");
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
            window.location.href = "/";
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
            <span>Pedir ayuda urgente</span>
          </button>
          <Link className="cta volunteer" href="/ayudar">
            <HandHeart aria-hidden="true" />
            <span>Quiero ayudar cerca</span>
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
            onClick={() => { setStatusFilter(""); setPage(1); }} 
            style={{ 
              cursor: "pointer", 
              border: statusFilter === "" ? "2px solid currentColor" : undefined,
              background: "none",
              padding: "1rem",
              borderRadius: "8px",
              textAlign: "left"
            }}
          >
            <strong>{globalStats.open}</strong><span>Personas reportadas</span>
          </button>
          <button 
            type="button"
            onClick={() => { setStatusFilter("missing"); setPage(1); }} 
            style={{ 
              cursor: "pointer", 
              border: statusFilter === "missing" ? "2px solid currentColor" : undefined,
              background: "none",
              padding: "1rem",
              borderRadius: "8px",
              textAlign: "left"
            }}
          >
            <strong>{globalStats.missing}</strong><span>Aún buscados</span>
          </button>
          <button 
            type="button"
            onClick={() => { setStatusFilter("resolved"); setPage(1); }} 
            style={{ 
              cursor: "pointer", 
              border: statusFilter === "resolved" ? "2px solid currentColor" : undefined,
              background: "none",
              color: "#16a34a",
              padding: "1rem",
              borderRadius: "8px",
              textAlign: "left"
            }}
          >
            <strong>{globalStats.resolved}</strong>
            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#16a34a" }}>
              <CheckCircle2 size={16} /> Localizados a salvo
            </span>
          </button>
        </section>

        <section className="search-band">
          <label>
            Buscar por nombre
            <input
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
            Buscar por zona
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
          <div className="section-heading">
            <p className="eyebrow">Personas reportadas</p>
            <h2>{hasSearch ? "Resultados de busqueda" : "Todas las personas reportadas"}</h2>
          </div>
          {peopleCases.length ? (
            <>
              <div className="people-grid">
                {peopleCases.map((item) => <CaseCard key={item.id} item={item} onOpen={setSelectedPerson} />)}
              </div>
              
              <div className="pagination-controls" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="cta"
                  style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}
                >
                  Anterior
                </button>
                <span style={{ display: 'flex', alignItems: 'center' }}>Página {page} de {totalPages}</span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="cta"
                  style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}
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
