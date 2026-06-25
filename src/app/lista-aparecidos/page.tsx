"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { ImagePlus, Link as LinkIcon, Upload } from "lucide-react";

export default function ListaAparecidosPage() {
  const [sourceType, setSourceType] = useState<"image" | "tweet">("image");
  const [tweetUrl, setTweetUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("sourceType", sourceType);
      
      if (sourceType === "image" && file) {
        formData.append("file", file);
      } else if (sourceType === "tweet" && tweetUrl) {
        formData.append("url", tweetUrl);
      } else {
        throw new Error("Por favor ingresa la información requerida.");
      }

      const res = await fetch("/api/hospital-lists", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar la lista");

      setMessage("¡Lista enviada correctamente! Pasará por moderación y luego la Inteligencia Artificial cruzará los datos.");
      setFile(null);
      setTweetUrl("");
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="content-page" style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem", color: "var(--ink)" }}>Listas de Aparecidos en Hospitales</h1>
        <p style={{ color: "var(--ink-soft)", marginBottom: "2rem", lineHeight: "1.6" }}>
          Ayúdanos a centralizar la información. Si eres administrador, colaborador, periodista o activista y tienes fotos de las listas físicas de los hospitales, o enlaces a publicaciones oficiales en X (Twitter), súbelas aquí. 
          <br /><br />
          <strong>Nuestro sistema de Inteligencia Artificial leerá los nombres</strong> y los cruzará automáticamente con nuestra base de datos de personas desaparecidas para actualizar su estatus.
        </p>

        <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "1rem", border: "1px solid var(--border)", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
            <button
              type="button"
              onClick={() => setSourceType("image")}
              style={{
                flex: 1,
                padding: "1rem",
                borderRadius: "0.5rem",
                border: sourceType === "image" ? "2px solid #3b82f6" : "1px solid var(--border)",
                backgroundColor: sourceType === "image" ? "#eff6ff" : "transparent",
                color: sourceType === "image" ? "#1d4ed8" : "var(--ink)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              <ImagePlus size={24} />
              Subir Foto de Lista
            </button>
            <button
              type="button"
              onClick={() => setSourceType("tweet")}
              style={{
                flex: 1,
                padding: "1rem",
                borderRadius: "0.5rem",
                border: sourceType === "tweet" ? "2px solid #3b82f6" : "1px solid var(--border)",
                backgroundColor: sourceType === "tweet" ? "#eff6ff" : "transparent",
                color: sourceType === "tweet" ? "#1d4ed8" : "var(--ink)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              <LinkIcon size={24} />
              Pegar Enlace (Tweet/Post)
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {sourceType === "image" ? (
              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: "bold" }}>
                Selecciona la foto de la lista
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  style={{ padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "0.5rem" }}
                />
              </label>
            ) : (
              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: "bold" }}>
                Enlace de la publicación
                <input 
                  type="url" 
                  placeholder="https://x.com/..." 
                  value={tweetUrl}
                  onChange={(e) => setTweetUrl(e.target.value)}
                  style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.5rem" }}
                />
              </label>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{
                backgroundColor: "#3b82f6",
                color: "white",
                padding: "1rem",
                borderRadius: "0.5rem",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              <Upload size={20} />
              {isSubmitting ? "Procesando..." : "Enviar Lista para Procesamiento"}
            </button>
            
            {message && (
              <div style={{ 
                padding: "1rem", 
                backgroundColor: message.includes("Error") ? "#fee2e2" : "#dcfce7", 
                color: message.includes("Error") ? "#991b1b" : "#166534", 
                borderRadius: "0.5rem",
                textAlign: "center"
              }}>
                {message}
              </div>
            )}
          </form>
        </div>
      </main>
    </>
  );
}
