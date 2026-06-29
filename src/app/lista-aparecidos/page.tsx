"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Link as LinkIcon, Upload, Search, Clock, CheckCircle, AlertTriangle, FileUp } from "lucide-react";

type HospitalListItem = {
  id: string;
  nombre_completo: string;
  cedula_identidad: number | null;
  edad_estimada: number | null;
  estado: string;
  estado_coincidencia: string;
  persona_id_coincidente: string | null;
};

type HospitalList = {
  id: string;
  creado_en: number;
  tipo_origen: string;
  nombre_hospital: string;
  fecha_lista: string | null;
  estado: string;
  items: HospitalListItem[];
};

export default function ListaAparecidosPage() {
  const [activeTab, setActiveTab] = useState<"upload" | "view">("upload");
  const [sourceType, setSourceType] = useState<"file" | "link">("file");
  const [tweetUrl, setTweetUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [manualHospitalName, setManualHospitalName] = useState("");
  const [listDate, setListDate] = useState("");
  const [fileKey, setFileKey] = useState(Date.now());
  const [isDragging, setIsDragging] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isErrorMsg, setIsErrorMsg] = useState(false);

  const [lists, setLists] = useState<HospitalList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (activeTab === "view") {
      fetchLists();
    }
  }, [activeTab]);

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDragging(false);
      
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const droppedFile = e.dataTransfer.files[0];
        setFile(droppedFile);
        setSourceType("file");
        setActiveTab("upload");
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  const fetchLists = async () => {
    setIsLoadingLists(true);
    try {
      const res = await fetch("/api/hospital-lists");
      const data = await res.json();
      if (res.ok) {
        setLists(data.lists || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingLists(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setIsErrorMsg(false);

    try {
      const formData = new FormData();
      formData.append("sourceType", sourceType);
      if (manualHospitalName) formData.append("manualHospitalName", manualHospitalName);
      if (listDate) formData.append("listDate", listDate);
      
      if (sourceType === "file" && file) {
        formData.append("file", file);
      } else if (sourceType === "link" && tweetUrl) {
        formData.append("url", tweetUrl);
      } else {
        throw new Error("Por favor ingresa la información requerida (archivo o URL).");
      }

      const res = await fetch("/api/hospital-lists", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar la lista");

      setMessage(`¡Lista enviada correctamente! Se procesaron ${data.processed} registros.`);
      setFile(null);
      setTweetUrl("");
      setManualHospitalName("");
      setListDate("");
      setFileKey(Date.now());
    } catch (err: any) {
      setMessage(err.message);
      setIsErrorMsg(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLists = lists.filter(list => {
    const term = searchTerm.toLowerCase();
    const matchHospital = list.nombre_hospital.toLowerCase().includes(term);
    const matchItem = list.items.some(item => item.nombre_completo.toLowerCase().includes(term));
    return matchHospital || matchItem;
  });

  return (
    <>
      <Header />
      <div style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
        {isDragging && (
          <div style={{
            position: "absolute", 
            inset: 0, 
            backgroundColor: "rgba(59, 130, 246, 0.15)", 
            zIndex: 50, 
            border: "4px dashed #3b82f6", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            pointerEvents: "none"
          }}>
            <div style={{ backgroundColor: "white", padding: "2rem 3rem", borderRadius: "1rem", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", textAlign: "center" }}>
              <FileUp size={48} color="#3b82f6" style={{ margin: "0 auto 1rem" }} />
              <h2 style={{ color: "#1d4ed8", fontSize: "1.5rem", margin: 0 }}>Suelta el archivo aquí</h2>
              <p style={{ color: "var(--ink-soft)", marginTop: "0.5rem", margin: 0 }}>Lo seleccionaremos automáticamente para procesar</p>
            </div>
          </div>
        )}

        <main className="content-page" style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem" }}>
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem", color: "var(--ink)" }}>Listas de Hospitales y Refugios</h1>
          <p style={{ color: "var(--ink-soft)", marginBottom: "2rem", lineHeight: "1.6" }}>
            Centralizamos la información de pacientes en hospitales y refugios. Sube fotos, enlaces, PDF o archivos de Excel de listas (también puedes arrastrarlos a esta pantalla). Nuestro sistema de Inteligencia Artificial procesará los datos automáticamente.
          </p>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
            <button
              onClick={() => setActiveTab("upload")}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "2rem",
                fontWeight: "bold",
                backgroundColor: activeTab === "upload" ? "var(--ink)" : "transparent",
                color: activeTab === "upload" ? "white" : "var(--ink-soft)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Subir Nueva Lista
            </button>
            <button
              onClick={() => setActiveTab("view")}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "2rem",
                fontWeight: "bold",
                backgroundColor: activeTab === "view" ? "var(--ink)" : "transparent",
                color: activeTab === "view" ? "white" : "var(--ink-soft)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Ver Listados
            </button>
          </div>

          {activeTab === "upload" && (
            <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "1rem", border: "1px solid var(--border)", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
                <button
                  type="button"
                  onClick={() => setSourceType("file")}
                  style={{
                    flex: 1,
                    padding: "1rem",
                    borderRadius: "0.5rem",
                    border: sourceType === "file" ? "2px solid #3b82f6" : "1px solid var(--border)",
                    backgroundColor: sourceType === "file" ? "#eff6ff" : "transparent",
                    color: sourceType === "file" ? "#1d4ed8" : "var(--ink)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    fontWeight: "bold"
                  }}
                >
                  <FileUp size={24} />
                  Subir Archivo (Foto, PDF, Excel)
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType("link")}
                  style={{
                    flex: 1,
                    padding: "1rem",
                    borderRadius: "0.5rem",
                    border: sourceType === "link" ? "2px solid #3b82f6" : "1px solid var(--border)",
                    backgroundColor: sourceType === "link" ? "#eff6ff" : "transparent",
                    color: sourceType === "link" ? "#1d4ed8" : "var(--ink)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    fontWeight: "bold"
                  }}
                >
                  <LinkIcon size={24} />
                  Pegar Enlace (Tweet)
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: "bold" }}>
                    Nombre del Hospital o Refugio (Opcional)
                    <input 
                      type="text" 
                      placeholder="Ej. Hospital Clínico Universitario o Refugio San Juan"
                      value={manualHospitalName}
                      onChange={(e) => setManualHospitalName(e.target.value)}
                      style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.5rem", fontWeight: "normal" }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: "bold" }}>
                    Fecha de la Lista (Opcional)
                    <input 
                      type="date" 
                      value={listDate}
                      onChange={(e) => setListDate(e.target.value)}
                      style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.5rem", fontWeight: "normal" }}
                    />
                  </label>
                </div>

                {sourceType === "file" ? (
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: "bold" }}>
                    Selecciona o arrastra el archivo
                    {file && (
                      <div style={{ 
                        padding: "0.75rem", 
                        backgroundColor: "#eff6ff", 
                        border: "1px dashed #3b82f6", 
                        borderRadius: "0.5rem",
                        color: "#1d4ed8",
                        marginBottom: "0.5rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem"
                      }}>
                        <FileUp size={20} />
                        <strong>Archivo listo:</strong> {file.name}
                      </div>
                    )}
                    <input 
                      key={fileKey}
                      type="file" 
                      accept="image/*, .xlsx, .xls, .csv, application/pdf" 
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      style={{ padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "0.5rem", fontWeight: "normal" }}
                    />
                    <small style={{ color: "var(--ink-soft)", fontWeight: "normal" }}>Formatos soportados: Imágenes (JPG, PNG), PDF y Excel (XLSX, CSV).</small>
                  </label>
                ) : (
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontWeight: "bold" }}>
                    Enlace de la publicación
                    <input 
                      type="url" 
                      placeholder="https://x.com/..." 
                      value={tweetUrl}
                      onChange={(e) => setTweetUrl(e.target.value)}
                      style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.5rem", fontWeight: "normal" }}
                    />
                  </label>
                )}

                <button 
                  type="submit" 
                  disabled={isSubmitting || (sourceType === "file" && !file) || (sourceType === "link" && !tweetUrl)}
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
                    cursor: (isSubmitting || (sourceType === "file" && !file) || (sourceType === "link" && !tweetUrl)) ? "not-allowed" : "pointer",
                    opacity: (isSubmitting || (sourceType === "file" && !file) || (sourceType === "link" && !tweetUrl)) ? 0.7 : 1,
                    marginTop: "1rem"
                  }}
                >
                  <Upload size={20} />
                  {isSubmitting ? "Procesando con IA..." : "Enviar Lista para Procesamiento"}
                </button>
                
                {message && (
                  <div style={{ 
                    padding: "1rem", 
                    backgroundColor: isErrorMsg ? "#fee2e2" : "#dcfce7", 
                    color: isErrorMsg ? "#991b1b" : "#166534", 
                    borderRadius: "0.5rem",
                    textAlign: "center",
                    fontWeight: "bold"
                  }}>
                    {message}
                  </div>
                )}
              </form>
            </div>
          )}

          {activeTab === "view" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ position: "relative" }}>
                <Search style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)" }} size={20} />
                <input
                  type="text"
                  placeholder="Buscar por hospital, refugio o nombre de paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "1rem 1rem 1rem 3rem",
                    borderRadius: "0.75rem",
                    border: "1px solid var(--border)",
                    fontSize: "1rem"
                  }}
                />
              </div>

              {isLoadingLists ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--ink-soft)" }}>Cargando listados...</div>
              ) : filteredLists.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--ink-soft)", backgroundColor: "white", borderRadius: "1rem" }}>
                  No se encontraron listados.
                </div>
              ) : (
                filteredLists.map(list => {
                  const possibleMatches = list.items.filter(i => i.estado_coincidencia === 'posible_coincidencia');
                  const newRecords = list.items.filter(i => i.estado_coincidencia === 'nuevo_registro');
                  
                  return (
                    <div key={list.id} style={{ backgroundColor: "white", borderRadius: "1rem", border: "1px solid var(--border)", overflow: "hidden" }}>
                      <div style={{ backgroundColor: "#f8fafc", padding: "1.5rem", borderBottom: "1px solid var(--border)" }}>
                        <h2 style={{ fontSize: "1.25rem", color: "var(--ink)", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                          {list.nombre_hospital}
                        </h2>
                        <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", color: "var(--ink-soft)", fontSize: "0.9rem" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <Clock size={16} /> Procesado el {new Date(list.creado_en).toLocaleDateString()}
                          </span>
                          {list.fecha_lista && (
                            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              • Fecha de lista: {new Date(list.fecha_lista).toLocaleDateString()}
                            </span>
                          )}
                          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", textTransform: "capitalize" }}>
                            • Fuente: {list.tipo_origen}
                          </span>
                        </div>
                      </div>

                      <div style={{ padding: "1.5rem" }}>
                        {possibleMatches.length > 0 && (
                          <div style={{ marginBottom: "2rem" }}>
                            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#d97706", marginBottom: "1rem" }}>
                              <AlertTriangle size={20} /> Posibles Coincidencias ({possibleMatches.length})
                            </h3>
                            <p style={{ fontSize: "0.9rem", color: "var(--ink-soft)", marginBottom: "1rem" }}>Estas personas ya estaban reportadas en el sistema.</p>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem" }}>
                              {possibleMatches.map(item => (
                                <div key={item.id} style={{ padding: "1rem", border: "1px solid #fde68a", backgroundColor: "#fffbeb", borderRadius: "0.5rem" }}>
                                  <p style={{ fontWeight: "bold", margin: 0, color: "#92400e" }}>{item.nombre_completo}</p>
                                  {item.cedula_identidad && <p style={{ fontSize: "0.85rem", margin: "0.25rem 0 0", color: "#b45309" }}>C.I: {item.cedula_identidad}</p>}
                                  <p style={{ fontSize: "0.85rem", margin: "0.25rem 0 0", color: "#b45309" }}>Estado: {item.estado}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {newRecords.length > 0 && (
                          <div>
                            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#16a34a", marginBottom: "1rem" }}>
                              <CheckCircle size={20} /> Nuevos Registros ({newRecords.length})
                            </h3>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem" }}>
                              {newRecords.map(item => (
                                <div key={item.id} style={{ padding: "1rem", border: "1px solid var(--border)", backgroundColor: "#f8fafc", borderRadius: "0.5rem" }}>
                                  <p style={{ fontWeight: "bold", margin: 0 }}>{item.nombre_completo}</p>
                                  {item.cedula_identidad && <p style={{ fontSize: "0.85rem", margin: "0.25rem 0 0", color: "var(--ink-soft)" }}>C.I: {item.cedula_identidad}</p>}
                                  <p style={{ fontSize: "0.85rem", margin: "0.25rem 0 0", color: "var(--ink-soft)" }}>Estado: {item.estado}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {list.items.length === 0 && (
                          <p style={{ color: "var(--ink-soft)", margin: 0 }}>No se extrajeron personas de esta lista.</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
