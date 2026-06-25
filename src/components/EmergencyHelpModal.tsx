"use client";

import Link from "next/link";

export function EmergencyHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label="Aviso antes de pedir ayuda" aria-modal="true" className="emergency-modal" role="dialog">
        <button aria-label="Cerrar aviso" className="modal-close" onClick={onClose} type="button">x</button>
        <p className="eyebrow">Antes de continuar</p>
        <h2>Llama primero a los servicios oficiales si hay riesgo inmediato.</h2>
        <div className="emergency-number">
          <span>Linea unica de emergencia VEN 9-1-1</span>
          <strong>911</strong>
        </div>
        <p>
          Esta solicitud ayuda a centralizar informacion y coordinar voluntarios. No sustituye a los canales oficiales de emergencia ni garantiza atencion inmediata.
        </p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose} type="button">Cancelar</button>
          <Link className="primary-button" href="/pedir-ayuda">Continuar con solicitud</Link>
        </div>
      </section>
    </div>
  );
}
