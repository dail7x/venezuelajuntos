import Link from "next/link";

const emergencyNumbers = [
  { label: "VEN 9-1-1", value: "911" },
  { label: "Proteccion Civil Nacional", value: "0800-7248451" },
  { label: "Distrito Capital", value: "0212-5751829" },
  { label: "Miranda", value: "0272-6721030 / 0800-8785455" },
  { label: "La Guaira", value: "0424-2075335" },
  { label: "Aragua", value: "0243-2471778 / 0243-2467204" },
  { label: "Carabobo", value: "0241-8592171" },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-disclaimer">
        <strong>Una herramienta ciudadana para acompanarnos</strong>
        <p>
          Venezuela Juntos reúne reportes cargados por familiares, amistades, vecinos y voluntarios para facilitar búsqueda, verificación y apoyo comunitario. No sustituye notificaciones oficiales ni la atención de los entes del Estado. Ante riesgo inmediato, llama primero a los servicios de emergencia.
        </p>
      </div>
      <div className="footer-numbers" aria-label="Teléfonos de emergencia">
        {emergencyNumbers.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: "2rem", padding: "1rem 0", borderTop: "1px solid var(--line)" }}>
        <Link href="/sugerencias" style={{ color: "var(--blue)", fontWeight: 600, textDecoration: "none" }}>
          ONG, iglesias, rescatistas y equipos comunitarios: compartan sugerencias o formas de coordinar
        </Link>
      </div>
    </footer>
  );
}
