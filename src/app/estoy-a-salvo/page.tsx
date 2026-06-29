"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

export default function EstoyASalvoPage() {
  const [step, setStep] = useState<"search" | "confirm" | "success" | "not_found" | "error">("search");
  const [isSearching, setIsSearching] = useState(false);
  const [matchData, setMatchData] = useState<any>(null);
  
  // Search Form Data
  const [cedula, setCedula] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    
    try {
      const res = await fetch("/api/search-duplicate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
          cedula, 
          name: `${firstName} ${lastName}`.trim(),
          zone: "ignorar" // We do a broader search here or api handles it
        })
      });
      const data = await res.json();
      if (data.match) {
        setMatchData(data.person);
        setStep("confirm");
      } else {
        setStep("not_found");
      }
    } catch (e) {
      setStep("error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = async () => {
    setIsSearching(true);
    try {
      const res = await fetch("/api/cases/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caseId: matchData.id,
          status: "located",
          authorName: matchData.nombre_completo, // Self
          authorContact: "Confirmación personal web",
          text: "Confirmó personalmente que se encuentra a salvo mediante el portal web."
        })
      });
      if (res.ok) {
        setStep("success");
      } else {
        setStep("error");
      }
    } catch (e) {
      setStep("error");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <>
      <Header />
      <main style={{ padding: "2rem 1rem", maxWidth: "600px", margin: "0 auto", minHeight: "80vh" }}>
        
        {step === "search" && (
          <form className="report-shell" style={{ position: 'relative', background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid var(--line)' }} onSubmit={handleSearch}>
            <div style={{ marginBottom: "2rem" }}>
              <p className="eyebrow" style={{ color: "var(--green)" }}>Confirmar que estás bien</p>
              <h1 style={{ fontSize: "1.8rem", margin: "0.5rem 0" }}>Estoy a salvo</h1>
              <p style={{ color: "var(--ink-soft)" }}>
                Si alguien pudo haberte reportado como desaparecido, este aviso puede llevar calma a quienes te están buscando. Confirma sólo si eres la persona de la ficha.
              </p>
            </div>

            <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label>
                <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Cédula de identidad</span>
                <input type="number" required placeholder="Ej. 12345678" value={cedula} onChange={e => setCedula(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--line)' }} />
              </label>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label>
                  <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Nombre</span>
                  <input type="text" required placeholder="Tu nombre" value={firstName} onChange={e => setFirstName(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--line)' }} />
                </label>
                <label>
                  <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Apellido</span>
                  <input type="text" required placeholder="Tu apellido" value={lastName} onChange={e => setLastName(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--line)' }} />
                </label>
              </div>
            </div>

            <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
              <button type="submit" disabled={isSearching} style={{ background: "var(--green)", color: "white", padding: "1rem 2rem", borderRadius: "8px", fontWeight: "bold", border: "none", cursor: "pointer", width: "100%" }}>
                {isSearching ? "Buscando..." : "Buscar mi reporte"}
              </button>
            </div>
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <Link href="/" style={{ color: "var(--ink-soft)", textDecoration: "underline" }}>Cancelar y volver al inicio</Link>
            </div>
          </form>
        )}

        {step === "confirm" && matchData && (
          <div className="report-shell" style={{ position: 'relative', background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid var(--green)' }}>
            <h2 style={{ color: "var(--green)", margin: "0 0 1rem 0" }}>Encontramos una ficha posible</h2>
            <p style={{ color: "var(--ink-soft)", marginBottom: "2rem" }}>
              Alguien está buscándote o registró información parecida. Revisa con calma y confirma sólo si esta ficha corresponde a ti.
            </p>
            
            <div style={{ background: "#f0fdf4", padding: "1.5rem", borderRadius: "8px", border: "1px solid #bbf7d0", marginBottom: "2rem" }}>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "#166534" }}>{matchData.nombre_completo}</h3>
              <p style={{ margin: 0, color: "#166534", fontSize: "0.9rem" }}>Reportado en: {matchData.zona_ubicacion}</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <button onClick={handleConfirm} disabled={isSearching} style={{ background: "var(--green)", color: "white", padding: "1rem", borderRadius: "8px", fontWeight: "bold", border: "none", cursor: "pointer" }}>
                {isSearching ? "Confirmando..." : "Sí, soy yo. Estoy a salvo."}
              </button>
              <button onClick={() => setStep("search")} style={{ background: "transparent", color: "var(--ink-soft)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--line)", cursor: "pointer" }}>
                No, es otra persona con mi nombre
              </button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="report-shell" style={{ position: 'relative', background: 'white', padding: '3rem 2rem', borderRadius: '12px', border: '1px solid var(--green)', textAlign: "center" }}>
            <h2 style={{ color: "var(--green)", margin: "0 0 1rem 0" }}>¡Gracias por confirmar!</h2>
            <p style={{ color: "var(--ink-soft)", marginBottom: "2rem", lineHeight: 1.6 }}>
              Marcamos la ficha como localizada. Esta actualización puede ayudar a que familiares, amistades y vecinos dejen de buscar con angustia.
            </p>
            <Link href="/" style={{ display: "inline-block", background: "var(--ink)", color: "white", padding: "1rem 2rem", borderRadius: "8px", fontWeight: "bold", textDecoration: "none" }}>
              Volver al inicio
            </Link>
          </div>
        )}

        {step === "not_found" && (
          <div className="report-shell" style={{ position: 'relative', background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid var(--line)', textAlign: "center" }}>
            <h2 style={{ margin: "0 0 1rem 0" }}>No encontramos reportes a tu nombre</h2>
            <p style={{ color: "var(--ink-soft)", marginBottom: "2rem" }}>
              Hasta el momento no encontramos una ficha con esos datos exactos. Si sabes de alguien que te está buscando, puedes avisarle directamente y volver a intentar con otra variante de tu nombre.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <button onClick={() => setStep("search")} style={{ background: "var(--blue)", color: "white", padding: "1rem", borderRadius: "8px", fontWeight: "bold", border: "none", cursor: "pointer" }}>
                Intentar otra búsqueda
              </button>
              <Link href="/" style={{ color: "var(--ink-soft)", textDecoration: "underline" }}>Volver al inicio</Link>
            </div>
          </div>
        )}

      </main>
    </>
  );
}
