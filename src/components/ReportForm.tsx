"use client";

import Link from "next/link";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Field } from "@/lib/forms";

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    if (photoDataUrl) payload.photoDataUrl = photoDataUrl;
    const response = await fetch("/api/cases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, payload }),
    }).catch(() => null);
    setState(response?.ok ? "saved" : "error");
    if (response?.ok) {
      event.currentTarget.reset();
      setPhotoDataUrl("");
      setPhotoName("");
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
              <input name={field.name} type={field.type ?? "text"} required={field.required} placeholder={field.placeholder} />
            )}
          </label>
        ))}
      </div>

      <div className="privacy-box">
        <strong>Datos protegidos</strong>
        Telefonos, direcciones exactas, condicion medica y fotos sensibles no se muestran en la ficha publica.
      </div>

      <footer className="form-actions">
        <Link className="secondary-button" href="/">Cancelar</Link>
        <button disabled={state === "saving"}>{state === "saving" ? "Guardando..." : submitLabel} →</button>
      </footer>
      {state === "saved" ? <p className="success">Reporte recibido. Queda pendiente de verificacion y posible deduplicacion.</p> : null}
      {state === "error" ? <p className="error">No se pudo guardar. Intenta de nuevo o contacta al equipo operativo.</p> : null}
    </form>
  );
}
