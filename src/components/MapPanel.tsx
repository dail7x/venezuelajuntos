import Link from "next/link";
import { kindLabels, seedCases, type PublicCase } from "@/lib/data";

function pointStyle(item: PublicCase) {
  const left = `${Math.max(8, Math.min(88, (item.lng + 67.2) * 180))}%`;
  const top = `${Math.max(12, Math.min(82, (10.66 - item.lat) * 420))}%`;
  return { left, top };
}

export function MapPanel({ cases = seedCases, compact = false }: { cases?: PublicCase[]; compact?: boolean }) {
  return (
    <div className={`map-panel ${compact ? "compact" : ""}`}>
      <div className="map-toolbar">
        <div>
          <strong>Mapa publico aproximado</strong>
          <span>Ubicaciones exactas protegidas</span>
        </div>
        <button type="button">Usar mi ubicacion</button>
      </div>
      <div className="map-canvas" role="img" aria-label="Mapa aproximado de casos reportados">
        <div className="map-grid" />
        {cases.map((item) => (
          <Link
            key={item.id}
            href={`/casos/${item.slug}`}
            className={`map-dot ${item.kind} ${item.urgency}`}
            style={pointStyle(item)}
            title={`${kindLabels[item.kind]}: ${item.title}`}
          >
            <span>{item.signals.confirmed}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
