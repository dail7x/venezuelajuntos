"use client";

import { useEffect, useState, type FormEvent } from "react";
import { kindLabels, statusLabels, urgencyLabels, type PublicCase } from "@/lib/data";
import { SignalButtons } from "@/components/SignalButtons";

type Note = {
  id: string;
  createdAt: number;
  authorName: string;
  authorContact: string;
  authorRole: string;
  noteStatus: string;
  text: string;
};

export function CaseDetailModal({
  item,
  onClose,
  onUpdate,
}: {
  item: PublicCase;
  onClose: () => void;
  onUpdate?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [noteAuthor, setNoteAuthor] = useState("");
  const [noteContact, setNoteContact] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [editError, setEditError] = useState("");
  const [noteError, setNoteError] = useState("");

  const isPerson = item.kind === "missing" || item.kind === "found";

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/cases/notes?caseId=${item.id}`);
      const result = await res.json();
      if (result.data) {
        setNotes(result.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [item.id]);

  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingEdit(true);
    setEditError("");

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/cases/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          fullName: payload.fullName,
          alternateNames: payload.alternateNames,
          age: payload.age ? Number(payload.age) : null,
          sex: payload.sex,
          physicalDesc: payload.physicalDesc,
          clothingDesc: payload.clothingDesc,
          lastSeenAddress: payload.lastSeenAddress,
          status: payload.status,
          adminPassword: payload.adminPassword,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        if (res.status === 401) {
          throw new Error("Contraseña de administrador incorrecta.");
        }
        throw new Error(errorData?.error || "Error al actualizar la ficha.");
      }

      setIsEditing(false);
      if (onUpdate) onUpdate();
      fetchNotes();
    } catch (err: any) {
      setEditError(err.message || "Error de comunicación.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleNoteSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setIsSavingNote(true);
    setNoteError("");

    try {
      const res = await fetch("/api/cases/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: item.id,
          text: noteText,
          authorName: noteAuthor,
          authorContact: noteContact,
          authorRole: "user",
          noteStatus: item.status,
        }),
      });

      if (!res.ok) {
        throw new Error("Error al guardar la actualización.");
      }

      setNoteText("");
      fetchNotes();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setNoteError(err.message || "Error al conectar con el servidor.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleSignalClick = () => {
    setTimeout(() => {
      if (onUpdate) onUpdate();
      fetchNotes();
    }, 400);
  };

  const showStatusPill = item.kind === "missing" || item.kind === "found";

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label={`Ficha de ${item.title}`} aria-modal="true" className="case-modal" role="dialog">
        <button aria-label="Cerrar ficha" className="modal-close" onClick={onClose} type="button">x</button>
        
        <div className="case-modal-media">
          {showStatusPill && (
            <span className={`photo-pill ${item.status === 'located' || item.status === 'reunified' ? 'located' : 'missing'}`}>
              {item.status === 'located' || item.status === 'reunified' ? 'Ya apareció' : 'Desaparecido'}
            </span>
          )}
          {item.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={`Foto de ${item.title}`} src={item.photoUrl} />
          ) : (
            <div className="image-placeholder">Sin foto publica</div>
          )}
        </div>

        <div className="case-modal-body">
          {isEditing ? (
            <form className="edit-form" onSubmit={handleEditSubmit}>
              <h2>Editar Ficha Informativa</h2>
              <p className="muted" style={{ marginBottom: "16px" }}>Modo Administrador</p>
              
              {editError && <div className="error-banner">{editError}</div>}

              <div className="form-row">
                <label>
                  <span>Nombre Completo *</span>
                  <input name="fullName" type="text" required defaultValue={item.title} />
                </label>
              </div>

              <div className="form-row split-2">
                <label>
                  <span>Apodo o Nombre Conocido</span>
                  <input name="alternateNames" type="text" defaultValue="" />
                </label>
                <label>
                  <span>Edad aproximada</span>
                  <input name="age" type="number" defaultValue={item.age} />
                </label>
              </div>

              <div className="form-row split-2">
                <label>
                  <span>Sexo/género</span>
                  <select name="sex" defaultValue="">
                    <option value="">No especificar</option>
                    <option value="F">Femenino</option>
                    <option value="M">Masculino</option>
                  </select>
                </label>
                <label>
                  <span>Ubicación *</span>
                  <input name="lastSeenAddress" type="text" required defaultValue={item.zone} />
                </label>
              </div>

              <div className="form-row">
                <label>
                  <span>Descripción y señas particulares</span>
                  <textarea name="physicalDesc" rows={3} defaultValue={item.description} />
                </label>
              </div>

              <div className="form-row">
                <label>
                  <span>Estado de la persona *</span>
                  <select name="status" defaultValue={item.status}>
                    <option value="missing">Desaparecido / Reportado</option>
                    <option value="located">Localizado / Ya apareció</option>
                    <option value="reunified">Reunificado con familia</option>
                    <option value="duplicate">Duplicado</option>
                  </select>
                </label>
              </div>

              <div className="form-row admin-pw-row">
                <label>
                  <span>Contraseña Administrador *</span>
                  <input name="adminPassword" type="password" required placeholder="Ingresar contraseña" />
                </label>
              </div>

              <div className="form-actions edit-actions">
                <button className="secondary-button" type="button" onClick={() => setIsEditing(false)}>Cancelar</button>
                <button type="submit" disabled={isSavingEdit}>{isSavingEdit ? "Guardando..." : "Guardar Ficha"}</button>
              </div>
            </form>
          ) : (
            <>
              <div className="title-header-row">
                <p className="eyebrow">{kindLabels[item.kind]}</p>
                {isPerson && (
                  <button className="edit-trigger-button" onClick={() => setIsEditing(true)}>
                    ✏️ Editar
                  </button>
                )}
              </div>
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
              
              <div className="case-modal-actions" onClick={handleSignalClick}>
                <h3>Actualizar este caso</h3>
                <SignalButtons caseId={item.id} kind={item.kind} />
              </div>

              {isPerson && (
                <div className="case-updates-section">
                  <hr style={{ margin: "24px 0", borderColor: "var(--line)" }} />
                  <h3>Historial de Actualizaciones</h3>
                  
                  {notes.length === 0 ? (
                    <p className="muted" style={{ fontSize: "0.85rem", margin: "12px 0" }}>
                      No hay actualizaciones registradas para este reporte.
                    </p>
                  ) : (
                    <div className="timeline">
                      {notes.map((note) => (
                        <div key={note.id} className="case-update-card">
                          <div className="update-meta">
                            <strong className={note.authorRole === "admin" ? "admin-badge" : "user-badge"}>
                              {note.authorName} {note.authorRole === "admin" && "(Admin)"}
                            </strong>
                            <span className="update-time">
                              {new Date(note.createdAt).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          </div>
                          <p className="update-text">{note.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <form className="add-note-form" onSubmit={handleNoteSubmit}>
                    <h4>Agregar nueva actualización o pista</h4>
                    {noteError && <p className="error">{noteError}</p>}
                    
                    <textarea
                      placeholder="Escribe aquí cualquier información relevante (ej. 'Visto hoy a las 3pm en la Plaza Bolivar vistiendo franela azul')"
                      rows={2}
                      required
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                    />
                    
                    <div className="note-form-grid">
                      <input
                        placeholder="Tu nombre (opcional)"
                        type="text"
                        value={noteAuthor}
                        onChange={(e) => setNoteAuthor(e.target.value)}
                      />
                      <input
                        placeholder="Teléfono (opcional)"
                        type="text"
                        value={noteContact}
                        onChange={(e) => setNoteContact(e.target.value)}
                      />
                      <button type="submit" disabled={isSavingNote}>
                        {isSavingNote ? "Guardando..." : "Agregar"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
