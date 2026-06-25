import Script from "next/script";

export default function SugerenciasPage() {
  return (
    <main style={{ padding: "2rem 1rem", maxWidth: "800px", margin: "0 auto", minHeight: "80vh" }}>
      <h1 style={{ marginBottom: "1rem", color: "var(--ink)" }}>Coordinar apoyo y compartir mejoras</h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: "2rem" }}>
        Si representas a una ONG, iglesia, grupo de rescate, medio comunitario o equipo de voluntarios, puedes escribirnos para coordinar mejor. También recibimos correcciones y sugerencias para cuidar mejor a las personas afectadas.
      </p>
      
      <iframe 
        data-tally-src="https://tally.so/embed/wL9ZqO?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1" 
        loading="lazy" 
        width="100%" 
        height="500" 
        style={{ border: "none", margin: 0 }} 
        title="Sugerencias"
      ></iframe>

      <Script id="tally-js" src="https://tally.so/widgets/embed.js" strategy="lazyOnload" />
    </main>
  );
}
