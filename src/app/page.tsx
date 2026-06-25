"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { HandHeart, Home as HomeIcon, PawPrint, Siren, UserRoundCheck, UserRoundX } from "lucide-react";
import { CaseCard } from "@/components/CaseCard";
import { CaseDetailModal } from "@/components/CaseDetailModal";
import { EmergencyHelpModal } from "@/components/EmergencyHelpModal";
import { EmergencyNotice } from "@/components/Notice";
import { Header } from "@/components/Header";
import { MapPanel } from "@/components/MapPanel";
import { getStats, seedCases, type PublicCase } from "@/lib/data";
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

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function caseMatches(item: PublicCase, nameQuery: string, zoneQuery: string) {
  const nameNeedle = normalize(nameQuery);
  const zoneNeedle = normalize(zoneQuery);
  const nameHaystack = normalize(`${item.title} ${item.personName ?? ""} ${item.description}`);
  const zoneHaystack = normalize(`${item.zone} ${item.publicAddress}`);

  return (!nameNeedle || nameHaystack.includes(nameNeedle)) && (!zoneNeedle || zoneHaystack.includes(zoneNeedle));
}

export default function Home({ defaultModal = null }: { defaultModal?: string | null }) {
  const [cases, setCases] = useState<PublicCase[]>(seedCases);
  const [nameQuery, setNameQuery] = useState("");
  const [zoneQuery, setZoneQuery] = useState("");
  const [dataSource, setDataSource] = useState<"seed" | "db" | "loading">("loading");
  const [selectedPerson, setSelectedPerson] = useState<PublicCase | null>(null);
  const [showEmergencyHelp, setShowEmergencyHelp] = useState(false);
  const [activeModal] = useState<string | null>(defaultModal);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/cases")
      .then((response) => response.json())
      .then((result: { data?: PublicCase[]; source?: "seed" | "db" }) => {
        if (cancelled) return;
        if (Array.isArray(result.data)) setCases(result.data);
        setDataSource(result.source ?? "seed");
      })
      .catch(() => {
        if (!cancelled) setDataSource("seed");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshCases = useCallback(() => {
    fetch("/api/cases")
      .then((response) => response.json())
      .then((result: { data?: PublicCase[]; source?: "seed" | "db" }) => {
        if (Array.isArray(result.data)) {
          setCases(result.data);
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
  }, [selectedPerson]);

  const stats = getStats(cases);
  const filteredCases = useMemo(
    () => cases.filter((item) => caseMatches(item, nameQuery, zoneQuery)),
    [cases, nameQuery, zoneQuery],
  );
  const peopleCases = filteredCases.filter((item) => item.kind === "missing" || item.kind === "found");
  const urgentCases = filteredCases.filter((item) => item.urgency === "critical" || item.urgency === "high");
  const hasSearch = Boolean(nameQuery.trim() || zoneQuery.trim());

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
          <div><strong>{stats.open}</strong><span>abiertos</span></div>
          <div><strong>{stats.missing}</strong><span>desaparecidos</span></div>
          <div><strong>{stats.urgent}</strong><span>urgentes</span></div>
          <div><strong>{stats.resolved}</strong><span>resueltos/localizados</span></div>
        </section>

        <section className="search-band">
          <label>
            Buscar por nombre
            <input
              value={nameQuery}
              onChange={(event) => setNameQuery(event.target.value)}
              placeholder="Nombre, apodo o descripcion"
              type="search"
            />
          </label>
          <label>
            Buscar por zona
            <input
              list="home-venezuela-zones"
              value={zoneQuery}
              onChange={(event) => setZoneQuery(event.target.value)}
              placeholder="Municipio, barrio o referencia"
              type="search"
            />
          </label>
          <div className="search-actions">
            <span>{filteredCases.length} resultados</span>
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
            <div className="people-grid">
              {peopleCases.map((item) => <CaseCard key={item.id} item={item} onOpen={setSelectedPerson} />)}
            </div>
          ) : (
            <div className="empty-state">No hay personas que coincidan con esa busqueda.</div>
          )}
        </section>
      </main>
    </>
  );
}
