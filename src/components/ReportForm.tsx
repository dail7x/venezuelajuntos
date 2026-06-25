"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { Field } from "@/lib/forms";

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch("/api/cases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, payload }),
    }).catch(() => null);
    setState(response?.ok ? "saved" : "error");
    if (response?.ok) event.currentTarget.reset();
  }

  return (
    <form className="report-shell" onSubmit={onSubmit}>
      <div className="form-heading">
        <div>
          <p className="eyebrow">Registro de emergencia</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <a href="/" aria-label="Cerrar">x</a>
      </div>

      <section className="upload-box" aria-label="Carga de foto">
        <div className="upload-icon">↑</div>
        <div>
          <strong>Foto o evidencia</strong>
          <span>Opcional. Fotos sensibles quedan sujetas a revision.</span>
        </div>
      </section>

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
        <a className="secondary-button" href="/">Cancelar</a>
        <button disabled={state === "saving"}>{state === "saving" ? "Guardando..." : submitLabel} →</button>
      </footer>
      {state === "saved" ? <p className="success">Reporte recibido. Queda pendiente de verificacion y posible deduplicacion.</p> : null}
      {state === "error" ? <p className="error">No se pudo guardar. Intenta de nuevo o contacta al equipo operativo.</p> : null}
    </form>
  );
}
