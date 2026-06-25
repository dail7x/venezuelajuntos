"use client";

import dynamic from "next/dynamic";
import { seedCases, type PublicCase } from "@/lib/data";

const LeafletCaseMap = dynamic(() => import("@/components/LeafletCaseMap"), {
  ssr: false,
  loading: () => <div className="map-loading">Cargando mapa...</div>,
});

export function MapPanel({ cases = seedCases, compact = false }: { cases?: PublicCase[]; compact?: boolean }) {
  return (
    <div className={`map-panel ${compact ? "compact" : ""}`}>
      <div className="map-toolbar">
        <div>
          <strong>Mapa publico aproximado</strong>
          <span>Ubicaciones exactas protegidas</span>
        </div>
        <button type="button">Usar mi ubicación</button>
      </div>
      <div className="map-canvas" aria-label="Mapa aproximado de casos reportados">
        <LeafletCaseMap cases={cases} compact={compact} />
        {!cases.length ? <div className="map-empty">No hay casos para mostrar con esos filtros.</div> : null}
      </div>
    </div>
  );
}
