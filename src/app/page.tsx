"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HandHeart, Siren, UserRoundCheck, UserRoundX } from "lucide-react";
import { CaseCard } from "@/components/CaseCard";
import { EmergencyNotice } from "@/components/Notice";
import { Header } from "@/components/Header";
import { MapPanel } from "@/components/MapPanel";
import { getStats, seedCases, type PublicCase } from "@/lib/data";

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

export default function Home() {
  const [cases, setCases] = useState<PublicCase[]>(seedCases);
  const [nameQuery, setNameQuery] = useState("");
  const [zoneQuery, setZoneQuery] = useState("");
  const [dataSource, setDataSource] = useState<"seed" | "db" | "loading">("loading");

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
            <span>Reportar desaparecida</span>
          </Link>
          <Link className="cta found" href="/reportar/encontrado">
            <UserRoundCheck aria-hidden="true" />
            <span>Reportar encontrada</span>
          </Link>
          <Link className="cta help" href="/pedir-ayuda">
            <Siren aria-hidden="true" />
            <span>Pedir ayuda urgente</span>
          </Link>
          <Link className="cta volunteer" href="/ayudar">
            <HandHeart aria-hidden="true" />
            <span>Quiero ayudar cerca</span>
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

        <section className="home-map-section">
          <MapPanel cases={filteredCases} compact />
        </section>

        <section className="people-section">
          <div className="section-heading">
            <p className="eyebrow">Personas reportadas</p>
            <h2>{hasSearch ? "Resultados de busqueda" : "Todas las personas reportadas"}</h2>
          </div>
          {peopleCases.length ? (
            <div className="people-grid">
              {peopleCases.map((item) => <CaseCard key={item.id} item={item} />)}
            </div>
          ) : (
            <div className="empty-state">No hay personas que coincidan con esa busqueda.</div>
          )}
        </section>

        <section className="priority-section">
          <div>
            <div className="section-heading">
              <p className="eyebrow">Prioridad ahora</p>
              <h2>Casos urgentes</h2>
            </div>
            <div className="case-list">
              {(urgentCases.length ? urgentCases : filteredCases).slice(0, 3).map((item) => <CaseCard key={item.id} item={item} />)}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
