"use client";

import { kindLabels, statusLabels, urgencyLabels, type PublicCase } from "@/lib/data";

export function CaseDetailModal({ item, onClose }: { item: PublicCase; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label={`Ficha de ${item.title}`} aria-modal="true" className="case-modal" role="dialog">
        <button aria-label="Cerrar ficha" className="modal-close" onClick={onClose} type="button">x</button>
        <div className="case-modal-media">
          {item.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={`Foto de ${item.title}`} src={item.photoUrl} />
          ) : (
            <div className="image-placeholder">Sin foto publica</div>
          )}
        </div>
        <div className="case-modal-body">
          <p className="eyebrow">{kindLabels[item.kind]}</p>
          <h2>{item.title}</h2>
          <div className="case-modal-badges">
            <span>{statusLabels[item.status]}</span>
            <span>{urgencyLabels[item.urgency]}</span>
          </div>
          <p>{item.description}</p>
          <dl className="case-modal-facts">
            <div><dt>Zona</dt><dd>{item.zone}</dd></div>
            <div><dt>Ubicacion publica</dt><dd>{item.publicAddress}</dd></div>
            <div><dt>Ultima actualizacion</dt><dd>{new Date(item.updatedAt).toLocaleString("es-VE", { dateStyle: "medium", timeStyle: "short" })}</dd></div>
          </dl>
          <div className="privacy-box modal-privacy">
            <strong>Datos protegidos</strong>
            Telefonos, direccion exacta y datos sensibles no se muestran publicamente.
          </div>
        </div>
      </section>
    </div>
  );
}
