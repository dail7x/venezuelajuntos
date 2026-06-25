"use client";

import Link from "next/link";
import { useState } from "react";
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

  const maxSide = 1200;
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo procesar la imagen");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(image.src);
  return canvas.toDataURL("image/jpeg", 0.78);
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

  const [wasAccompanied, setWasAccompanied] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    setWasAccompanied(false);
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const payload = Object.fromEntries(form.entries());
    if (photoDataUrl) payload.photoDataUrl = photoDataUrl;
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

  async function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoName(file.name);
    setPhotoDataUrl(await compressImage(file));
  }

  return (
    <form className="report-shell" onSubmit={onSubmit}>
      <div className="form-heading">
        <div>
          <p className="eyebrow">Registro de emergencia</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <Link href="/" aria-label="Cerrar">x</Link>
      </div>

      {(kind === "missing" || kind === "found") && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px 16px", borderRadius: "8px", marginBottom: "1.5rem" }}>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#1e3a8a", lineHeight: 1.5 }}>
            <strong>¿Ya buscaste en los registros?</strong> 
            <br/>Antes de agregar a esta persona, te invitamos a buscar rápidamente en la página principal. Quizás alguien más ya la reportó, y así nos ayudas a mantener todo organizado y a agilizar los reencuentros. ❤️
          </p>
        </div>
      )}

      {kind !== "volunteer" && (
        <>
          <label className="upload-box" aria-label="Carga de foto">
            <div className="upload-icon">↑</div>
            <div>
              <strong>Foto o evidencia</strong>
              <span>{photoName ? `Lista: ${photoName}` : "Opcional. Se optimiza antes de guardar."}</span>
            </div>
            <input accept="image/*" className="file-input" onChange={onPhotoChange} type="file" />
          </label>
          {photoDataUrl ? (
            <div className="image-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Vista previa de la foto cargada" src={photoDataUrl} />
            </div>
          ) : null}
        </>
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



      <footer className="form-actions">
        <Link className="secondary-button" href="/">Cancelar</Link>
        <button disabled={state === "saving"}>{state === "saving" ? "Guardando..." : submitLabel} →</button>
      </footer>
      {state === "saved" ? (
        <p className="success">
          {wasAccompanied
            ? "Primer reporte guardado con éxito. Los datos de contacto y ubicación se han mantenido. Puedes ingresar los datos del acompañante en el formulario a continuación."
            : "Reporte recibido. Queda pendiente de verificacion y posible deduplicacion."}
        </p>
      ) : null}
      {state === "error" ? <p className="error">No se pudo guardar. Intenta de nuevo o contacta al equipo operativo.</p> : null}
    </form>
  );
}
