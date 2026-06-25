"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Field } from "@/lib/forms";
import { venezuelaZones } from "@/lib/venezuela-zones";

async function compressImage(file: File) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });

  const maxSide = 800;
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo procesar la imagen");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(image.src);
  return canvas.toDataURL("image/jpeg", 0.6);
}

export function ReportForm({
  title,
  subtitle,
  kind,
  fields,
  submitLabel = "Publicar reporte",
}: {
  title: string;
  subtitle: string;
  kind: string;
  fields: Field[];
  submitLabel?: string;
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [photoName, setPhotoName] = useState("");
  const zoneListId = `${kind}-venezuela-zones`;
  
  const [gpsLocation, setGpsLocation] = useState<{lat: number; lng: number} | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const [wasAccompanied, setWasAccompanied] = useState(false);

  // Smart Search Logic
  const [duplicateWarning, setDuplicateWarning] = useState<{ match: boolean; by: string; person: any } | null>(null);
  const [liveCedula, setLiveCedula] = useState("");
  const [liveName, setLiveName] = useState("");
  const [liveLastName, setLiveLastName] = useState("");
  const [liveZone, setLiveZone] = useState("");

  useEffect(() => {
    if (kind !== "missing" && kind !== "found") return;

    const timeoutId = setTimeout(async () => {
      const combinedName = `${liveName} ${liveLastName}`.trim();
      
      if ((liveCedula && liveCedula.length > 5) || (combinedName.length > 4 && liveZone.length > 3)) {
        try {
          const res = await fetch("/api/search-duplicate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ cedula: liveCedula, name: combinedName, zone: liveZone })
          });
          const data = await res.json();
          if (data.match) {
            setDuplicateWarning(data);
          } else {
            setDuplicateWarning(null);
          }
        } catch (e) {
          // ignore
        }
      } else {
        setDuplicateWarning(null);
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [liveCedula, liveName, liveLastName, liveZone, kind]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    setWasAccompanied(false);
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const payload = Object.fromEntries(form.entries());
    if (photoDataUrl) payload.photoDataUrl = photoDataUrl;
    if (gpsLocation) {
      payload.lat = gpsLocation.lat.toString();
      payload.lng = gpsLocation.lng.toString();
    }
    const response = await fetch("/api/cases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, payload }),
    }).catch(() => null);
    
    if (response?.ok) {
      setState("saved");
      const hasAccompanied = formEl.elements.namedItem("hasAccompanied") as HTMLInputElement | null;
      const isAccompaniedChecked = hasAccompanied?.checked;
      
      if (isAccompaniedChecked) {
        setWasAccompanied(true);
        // Clear only personal fields
        const personalFields = [
          "firstName",
          "lastName",
          "alternateNames",
          "age",
          "sex",
          "physicalDesc",
          "hasAccompanied"
        ];
        for (const name of personalFields) {
          const el = formEl.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
          if (el) {
            if (el.type === "checkbox") {
              (el as HTMLInputElement).checked = false;
            } else {
              el.value = "";
            }
          }
        }
        setPhotoDataUrl("");
        setPhotoName("");
      } else {
        formEl.reset();
        setPhotoDataUrl("");
        setPhotoName("");
      }
    } else {
      setState("error");
    }
  }

  function closePopup() {
    if (wasAccompanied) {
      setState("idle");
    } else {
      window.location.href = "/";
    }
  }

  async function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoName(file.name);
    setPhotoDataUrl(await compressImage(file));
  }

  function requestGPS() {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setGpsStatus("success");
      },
      () => setGpsStatus("error")
    );
  }

  return (
    <form className="report-shell" onSubmit={onSubmit}>
      <div className="form-heading">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <Link href="/" aria-label="Cerrar">x</Link>
      </div>

      {(kind === "missing" || kind === "found") && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px 16px", borderRadius: "8px", marginBottom: "1.5rem" }}>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#1e3a8a", lineHeight: 1.5 }}>
            <strong>Antes de crear una ficha, intenta buscarla.</strong>
            <br />Puede que otra persona ya haya reportado algo. Si existe una coincidencia, eso ayuda a reunir información y evita que una familia tenga que revisar datos repetidos.
          </p>
        </div>
      )}

      {kind !== "volunteer" && (
        <>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "0 clamp(16px, 3vw, 24px) 16px" }}>
          {photoDataUrl && (
            <div style={{ width: "60px", height: "60px", borderRadius: "8px", overflow: "hidden", flexShrink: 0, border: "1px solid #e3e8f2" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Vista previa" src={photoDataUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          <label className="upload-box" aria-label="Carga de foto" style={{ margin: 0, flexGrow: 1, padding: "12px", gap: "12px", minHeight: "auto", display: "flex", flexDirection: "row", alignItems: "center" }}>
            <div className="upload-icon" style={{ width: "32px", height: "32px", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center" }}>↑</div>
            <div style={{ textAlign: "left" }}>
              <strong style={{ fontSize: "0.9rem" }}>Foto o evidencia</strong>
              <span style={{ fontSize: "0.8rem", display: "block" }}>{photoName ? `Cargada: ${photoName}` : "Opcional. Pulsa aquí."}</span>
            </div>
            <input accept="image/*" className="file-input" onChange={onPhotoChange} type="file" />
          </label>
        </div>
        </>
      )}

      {kind === "help" && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "12px 16px", borderRadius: "8px", marginBottom: "1.5rem" }}>
          <p style={{ margin: "0 0 10px 0", fontSize: "0.9rem", color: "#991b1b", lineHeight: 1.5 }}>
            <strong>La ubicación ayuda a priorizar.</strong>
            <br />Si puedes compartir tu ubicación actual, será más fácil orientar a voluntarios o equipos cercanos. Si no puedes, describe referencias claras de la zona.
          </p>
          <button 
            type="button" 
            onClick={requestGPS}
            disabled={gpsStatus === "loading" || gpsStatus === "success"}
            style={{ 
              background: gpsStatus === "success" ? "#dcfce7" : "#ef4444", 
              color: gpsStatus === "success" ? "#166534" : "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            {gpsStatus === "idle" && "Usar mi ubicación actual"}
            {gpsStatus === "loading" && "Obteniendo ubicación..."}
            {gpsStatus === "success" && "Ubicación agregada"}
            {gpsStatus === "error" && "No se pudo obtener. Intenta de nuevo"}
          </button>
        </div>
      )}

      <div className="form-grid">
        {fields.map((field) => (
          <label key={field.name} className={field.type === "textarea" || field.type === "checkbox" ? "span-2" : ""}>
            <span>
              {field.label} {field.required ? <b>*</b> : null}
            </span>
            {field.type === "textarea" ? (
              <textarea name={field.name} required={field.required} placeholder={field.placeholder} rows={4} />
            ) : field.type === "select" ? (
              <select name={field.name} required={field.required}>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === "checkbox" ? (
              <input name={field.name} type="checkbox" value="true" />
            ) : (
              <input
                list={field.autocomplete === "venezuela-zones" ? zoneListId : undefined}
                name={field.name}
                type={field.type ?? "text"}
                required={field.required}
                placeholder={field.placeholder}
                onChange={(e) => {
                  if (field.name === "cedulaIdentidad") setLiveCedula(e.target.value);
                  if (field.name === "firstName" || field.name === "knownName") setLiveName(e.target.value);
                  if (field.name === "lastName") setLiveLastName(e.target.value);
                  if (field.autocomplete === "venezuela-zones") setLiveZone(e.target.value);
                }}
              />
            )}
          </label>
        ))}
      </div>
      <datalist id={zoneListId}>
        {venezuelaZones.map((zone) => (
          <option key={zone} value={zone} />
        ))}
      </datalist>

      {duplicateWarning && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "12px 16px", borderRadius: "8px", marginBottom: "1.5rem" }}>
          <p style={{ margin: "0 0 10px 0", fontSize: "0.9rem", color: "#92400e", lineHeight: 1.5 }}>
            <strong>Puede que esta persona ya tenga una ficha.</strong>
            <br />{duplicateWarning.by === 'cedula' ? 'Esta cedula ya aparece en los registros.' : 'Hay un reporte con nombre y zona similares.'}
            <br /><br />
            Si es otra persona, puedes continuar. Si parece ser la misma, revisa la <Link style={{textDecoration:"underline", fontWeight:"bold"}} href={`/person/${duplicateWarning.person.id}`} target="_blank">ficha existente</Link> y agrega nueva información allí.
          </p>
        </div>
      )}

      <footer className="form-actions">
        <Link className="secondary-button" href="/">Cancelar</Link>
        <button disabled={state === "saving"}>{state === "saving" ? "Guardando..." : submitLabel} →</button>
      </footer>
      {state === "error" ? <p className="error">No pudimos guardar el reporte. Revisa tu conexión e intenta de nuevo; si es urgente, llama primero a los servicios oficiales.</p> : null}

      {state === "saved" && (
        <div 
          onClick={closePopup}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center", zIndex: 100, borderRadius: "20px", cursor: "pointer" }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ cursor: "default", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <button 
              type="button" 
              onClick={closePopup} 
              style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--ink-soft)" }}
              aria-label="Cerrar"
            >
              x
            </button>
            <div style={{ background: "#dcfce7", color: "#166534", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", marginBottom: "1.5rem" }}>✓</div>
            <h2 style={{ fontSize: "1.5rem", color: "#166534", marginBottom: "0.5rem" }}>Reporte recibido</h2>
            <p style={{ fontSize: "1rem", color: "#1e293b", marginBottom: "1.5rem", maxWidth: "400px", lineHeight: 1.5 }}>
              <strong>Queda pendiente de verificación y posible deduplicación.</strong><br/><br/>
              Agradecemos de todo corazón tu reporte. Cada dato cuenta y mantiene viva la esperanza. Oramos para que esta persona aparezca pronto, sana y salva.
            </p>
            <button type="button" onClick={closePopup} style={{ background: "var(--brand)", color: "white", padding: "12px 24px", borderRadius: "8px", fontWeight: "bold", border: "none", cursor: "pointer", fontSize: "1rem" }}>
              {wasAccompanied ? "Continuar con el acompañante" : "Volver al inicio"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
