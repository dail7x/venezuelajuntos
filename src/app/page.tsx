import Link from "next/link";
import { CaseCard } from "@/components/CaseCard";
import { EmergencyNotice } from "@/components/Notice";
import { Header } from "@/components/Header";
import { MapPanel } from "@/components/MapPanel";
import { getStats, seedCases } from "@/lib/data";

export default function Home() {
  const stats = getStats();
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
            <EmergencyNotice />
          </div>
          <div className="quick-stats" aria-label="Contadores">
            <div><strong>{stats.open}</strong><span>abiertos</span></div>
            <div><strong>{stats.missing}</strong><span>desaparecidos</span></div>
            <div><strong>{stats.urgent}</strong><span>urgentes</span></div>
            <div><strong>{stats.resolved}</strong><span>resueltos/localizados</span></div>
          </div>
        </section>

        <section className="cta-grid" aria-label="Acciones principales">
          <Link className="cta missing" href="/reportar/desaparecido">Reportar persona desaparecida</Link>
          <Link className="cta found" href="/reportar/encontrado">Reportar persona encontrada</Link>
          <Link className="cta help" href="/pedir-ayuda">Pedir ayuda urgente</Link>
          <Link className="cta volunteer" href="/ayudar">Quiero ayudar cerca de mi</Link>
        </section>

        <section className="search-band">
          <label>
            Buscar por nombre
            <input placeholder="Nombre, apodo o descripcion" />
          </label>
          <label>
            Buscar por zona
            <input placeholder="Municipio, barrio o referencia" />
          </label>
          <Link href="/mapa">Ver mapa filtrable</Link>
        </section>

        <section className="split">
          <MapPanel compact />
          <div>
            <div className="section-heading">
              <p className="eyebrow">Prioridad ahora</p>
              <h2>Casos urgentes</h2>
            </div>
            <div className="case-list">
              {seedCases.slice(0, 3).map((item) => <CaseCard key={item.id} item={item} />)}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
