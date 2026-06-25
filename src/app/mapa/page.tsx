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
          <p className="eyebrow">Mapa de ayuda</p>
          <h1>Casos por zona, urgencia y estado</h1>
        </section>
        <div className="filters" aria-label="Filtros">
          <button>Todos</button>
          <button>Rescate critico</button>
          <button>Medico/traslado</button>
          <button>Desaparecidos</button>
          <button>Encontrados</button>
          <button>Cerca de mi · 5 km</button>
        </div>
        <MapPanel />
        <section className="case-grid">
          {seedCases.map((item) => <CaseCard key={item.id} item={item} />)}
        </section>
      </main>
    </>
  );
}
