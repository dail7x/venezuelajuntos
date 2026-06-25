import { CaseCard } from "@/components/CaseCard";
import { Header } from "@/components/Header";
import { MapPanel } from "@/components/MapPanel";
import { seedCases } from "@/lib/data";

export default function MapPage() {
  return (
    <>
      <Header />
      <main className="map-page">
        <section className="section-heading">
          <p className="eyebrow">Mapa comunitario</p>
          <h1>Reportes por zona, prioridad y estado</h1>
        </section>
        <div className="filters" aria-label="Filtros">
          <button>Todos</button>
          <button>Rescate crítico</button>
          <button>Médico o traslado</button>
          <button>Personas en búsqueda</button>
          <button>Personas localizadas</button>
          <button>Cerca de mí · 5 km</button>
        </div>
        <MapPanel />
        <section className="case-grid">
          {seedCases.map((item) => <CaseCard key={item.id} item={item} />)}
        </section>
      </main>
    </>
  );
}
