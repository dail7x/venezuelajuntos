import { useEffect, useState, type FormEvent } from "react";
import { kindLabels, statusLabels, type PublicCase } from "@/lib/data";

type Note = {
  id: string;
  createdAt: number;
  authorName: string;
  authorContact: string;
  authorRole: string;
  noteStatus: string;
  text: string;
};

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

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const [showLocatedForm, setShowLocatedForm] = useState(false);
  const [showRevertForm, setShowRevertForm] = useState(false);
  const [statusFormName, setStatusFormName] = useState("");
  const [statusFormContact, setStatusFormContact] = useState("");
  const [statusFormText, setStatusFormText] = useState("");
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  const [duplicateCase, setDuplicateCase] = useState<any>(null);
  const [isVotingDuplicate, setIsVotingDuplicate] = useState(false);

  const [editPhotoName, setEditPhotoName] = useState("");
  const [editPhotoDataUrl, setEditPhotoDataUrl] = useState("");

  const handleShare = async () => {
    const url = `https://venezuelajuntos.online/casos/${item.id}`;
    const text = `#VenezuelaJuntos Se busca ${item.title} en ${item.zone}. Ayúdanos a localizarlo.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Venezuela Juntos",
          text: text,
          url: url,
        });
      } catch (err) {
        console.error("Error al compartir:", err);
      }
    } else {
      navigator.clipboard.writeText(`${text} ${url}`).then(() => {
        alert("Enlace y texto copiados al portapapeles para compartir.");
      });
    }
  };

  const handleDownloadStory = () => {
    const link = document.createElement("a");
    link.href = `/api/og?id=${item.id}&type=story`;
    link.download = `story-${item.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
    if (item.potentialDuplicateOf) {
      fetch(`/api/cases/single?id=${item.potentialDuplicateOf}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) setDuplicateCase(data);
        })
        .catch(console.error);
    } else {
      setDuplicateCase(null);
    }
  }, [item.id, item.potentialDuplicateOf]);

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
          status: payload.estado_actual,
          adminPassword: payload.adminPassword,
          photoDataUrl: editPhotoDataUrl,
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
      setEditPhotoDataUrl("");
      setEditPhotoName("");
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
          noteStatus: item.estado_actual,
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

  const handleStatusChangeSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingStatus(true);
    setNoteError("");

    try {
      const res = await fetch("/api/cases/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: item.id,
          status: "located", // Using "located" / "resolved" equivalent
          authorName: statusFormName,
          authorContact: statusFormContact,
          text: item.kind === "help" ? `Marcó como atendida. ${statusFormText}` : `Reportó que ya apareció. ${statusFormText}`,
        }),
      });

      if (!res.ok) throw new Error("Error al reportar");
      setShowLocatedForm(false);
      setStatusFormText("");
      setStatusFormName("");
      setStatusFormContact("");
      fetchNotes();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setNoteError(err.message || "Error al conectar con el servidor.");
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleRevertStatusSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!window.confirm("Confirma sólo si tienes información suficiente para volver a dejar esta ficha en búsqueda.")) return;
    setIsSavingStatus(true);
    setNoteError("");

    try {
      const res = await fetch("/api/cases/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: item.id,
          status: "missing", // Using "missing" / "reported" equivalent
          authorName: statusFormName,
          authorContact: statusFormContact,
          text: item.kind === "help" ? `Volvió a marcar como pendiente. Razón: ${statusFormText}` : `Volvió a marcar como en búsqueda. Razón: ${statusFormText}`,
        }),
      });

      if (!res.ok) throw new Error("Error al reportar");
      setShowRevertForm(false);
      setStatusFormText("");
      setStatusFormName("");
      setStatusFormContact("");
      fetchNotes();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setNoteError(err.message || "Error al conectar con el servidor.");
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleDuplicateVote = async (isDuplicate: boolean) => {
    setIsVotingDuplicate(true);
    try {
      const res = await fetch("/api/cases/duplicate-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: item.id,
          isDuplicate
        })
      });
      if (res.ok) {
        if (onClose) onClose();
        if (onUpdate) onUpdate();
      } else {
        alert("Ocurrió un error al procesar el voto.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de red");
    } finally {
      setIsVotingDuplicate(false);
    }
  };

  const showStatusPill = item.kind === "missing" || item.kind === "found";

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section aria-label={`Ficha de ${item.title}`} aria-modal="true" className="case-modal" role="dialog" onClick={(e) => e.stopPropagation()}>
        <button aria-label="Cerrar ficha" className="modal-close" onClick={onClose} type="button">x</button>
        
        <div className="case-modal-media">
          {(showStatusPill || item.kind === "help") && (
          <span className={`photo-pill ${item.estado_actual === 'located' || item.estado_actual === 'reunified' || item.estado_actual === 'resolved' ? 'located' : 'missing'}`}>
              {item.kind === "help" 
                ? (item.estado_actual === 'located' || item.estado_actual === 'reunified' || item.estado_actual === 'resolved' ? 'Atendida' : 'Pendiente')
                : (item.estado_actual === 'located' || item.estado_actual === 'reunified' ? 'Localizada' : 'En búsqueda')}
            </span>
          )}
          {(() => {
            const uniquePhotos = new Set<string>();
            if (item.photoUrl) item.photoUrl.split(',').filter(Boolean).forEach(p => uniquePhotos.add(p));
            if (item.duplicates) {
              item.duplicates.forEach(d => {
                if (d.photoUrl) d.photoUrl.split(',').filter(Boolean).forEach(p => uniquePhotos.add(p));
              });
            }
            const allPhotos = Array.from(uniquePhotos);
            
            if (allPhotos.length > 0) {
              const activePhoto = allPhotos[selectedPhotoIndex] || allPhotos[0];
              return (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={`Foto principal de ${item.title}`} src={activePhoto} style={{ width: '100%', objectFit: 'cover' }} />
                  {allPhotos.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px', padding: '8px', overflowX: 'auto', background: 'rgba(0,0,0,0.7)', scrollbarWidth: 'none' }}>
                      {allPhotos.map((url, idx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          key={idx} 
                          src={url} 
                          alt={`Miniatura ${idx+1}`} 
                          onClick={() => setSelectedPhotoIndex(idx)}
                          style={{ 
                            width: '60px', 
                            height: '60px', 
                            objectFit: 'cover', 
                            borderRadius: '4px', 
                            border: selectedPhotoIndex === idx ? '2px solid white' : '2px solid transparent',
                            cursor: 'pointer',
                            opacity: selectedPhotoIndex === idx ? 1 : 0.6
                          }} 
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return <div className="image-placeholder">Sin foto pública</div>;
          })()}
        </div>

        <div className="case-modal-body">
          {isEditing ? (
            <form className="edit-form" onSubmit={handleEditSubmit}>
              <h2>Editar ficha informativa</h2>
              <p className="muted" style={{ marginBottom: "16px" }}>Modo administrador</p>
              
              {editError && <div className="error-banner">{editError}</div>}

              <div className="form-row">
                <label>
                  <span>Nombre completo *</span>
                  <input name="fullName" type="text" required defaultValue={item.title} />
                </label>
              </div>

              <div className="form-row split-2">
                <label>
                  <span>Apodo o nombre conocido</span>
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
                  <select name="status" defaultValue={item.estado_actual}>
                    <option value="missing">En búsqueda</option>
                    <option value="located">Localizado</option>
                    <option value="reunified">Reunificado con familia</option>
                    <option value="duplicate">Posible ficha repetida</option>
                  </select>
                </label>
              </div>

              <div className="form-row split-2">
                <label>
                  <span>Contraseña de administrador *</span>
                  <input name="adminPassword" type="password" required placeholder="Ingresar contraseña" />
                </label>
                <label>
                  <span>Actualizar foto (Opcional)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setEditPhotoName(file.name);
                      setEditPhotoDataUrl(await compressImage(file));
                    }} 
                  />
                  {editPhotoName && <span style={{fontSize: "0.8rem", color: "var(--brand)"}}>Cargada: {editPhotoName}</span>}
                </label>
              </div>

              <div className="form-actions edit-actions">
                <button className="secondary-button" type="button" onClick={() => setIsEditing(false)}>Cancelar</button>
                <button type="submit" disabled={isSavingEdit}>{isSavingEdit ? "Guardando..." : "Guardar ficha"}</button>
              </div>
            </form>
          ) : (
            <>
              {duplicateCase && item.potentialDuplicateOf ? (
                <div style={{ background: "#fff7ed", padding: "16px", borderRadius: "8px", border: "1px solid #fed7aa", marginBottom: "20px" }}>
                  <h3 style={{ color: "#c2410c", marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Posible ficha repetida
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: "#9a3412", marginBottom: "16px" }}>
                    Ayúdanos a unir información. ¿Esta ficha habla de la misma persona que el registro anterior?
                  </p>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div style={{ padding: "12px", background: "white", borderRadius: "6px", border: "1px solid #fed7aa" }}>
                      <span className="eyebrow" style={{ color: "#c2410c" }}>Registro Original</span>
                      <div style={{ fontWeight: "bold", marginBottom: "4px", fontSize: "1.1rem" }}>{duplicateCase.title}</div>
                      <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "8px" }}>{duplicateCase.zone}</div>
                      {duplicateCase.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={duplicateCase.photoUrl} alt="Foto original" style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "4px" }} />
                      )}
                    </div>
                    
                    <div style={{ padding: "12px", background: "white", borderRadius: "6px", border: "1px solid #fed7aa" }}>
                      <span className="eyebrow" style={{ color: "#c2410c" }}>Este Registro (Nuevo)</span>
                      <div style={{ fontWeight: "bold", marginBottom: "4px", fontSize: "1.1rem" }}>{item.title}</div>
                      <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "8px" }}>{item.zone}</div>
                      {item.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.photoUrl} alt="Foto nueva" style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "4px" }} />
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button 
                      className="primary-button" 
                      style={{ background: "#c2410c", flex: 1 }} 
                      disabled={isVotingDuplicate}
                      onClick={() => handleDuplicateVote(true)}
                    >
                      Si, parece la misma persona
                    </button>
                    <button 
                      className="secondary-button" 
                      style={{ flex: 1 }}
                      disabled={isVotingDuplicate}
                      onClick={() => handleDuplicateVote(false)}
                    >
                      No, son personas distintas
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="title-header-row">
                <p className="eyebrow">{kindLabels[item.kind]}</p>
                {isPerson && (
                  <button className="edit-trigger-button" onClick={() => setIsEditing(true)}>
                    Editar
                  </button>
                )}
              </div>
              <h2>{item.title}</h2>
              <div className="case-modal-badges">
                <span>{statusLabels[item.estado_actual]}</span>
              </div>
              <p>{item.description}</p>
              
              <div style={{ display: "flex", gap: "12px", marginTop: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleShare}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "8px 16px", borderRadius: "8px",
                    border: "1px solid var(--blue)", background: "white", color: "var(--blue)",
                    fontWeight: 600, cursor: "pointer"
                  }}
                >
                  Compartir
                </button>
                <button
                  type="button"
                  onClick={handleDownloadStory}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "8px 16px", borderRadius: "8px",
                    border: "none", background: "var(--blue)", color: "white",
                    fontWeight: 600, cursor: "pointer"
                  }}
                >
                  Descargar historia
                </button>
              </div>

              {(item.reporterName || item.reporterContact) && (
                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                  <h4 style={{ margin: "0 0 8px 0", color: "#334155", fontSize: "0.95rem" }}>Datos de quien reporta</h4>
                  {item.reporterName && <p style={{ margin: "0 0 4px 0", fontSize: "0.9rem" }}><strong>Nombre:</strong> {item.reporterName}</p>}
                  {item.reporterContact && <p style={{ margin: 0, fontSize: "0.9rem" }}><strong>Contacto:</strong> {item.reporterContact}</p>}
                </div>
              )}

              <dl className="case-modal-facts">
                <div><dt>Zona</dt><dd>{item.zone}</dd></div>
                <div><dt>Ubicación pública</dt><dd>{item.publicAddress}</dd></div>
                <div><dt>Última actualización</dt><dd>{new Date(item.updatedAt).toLocaleString("es-VE", { dateStyle: "medium", timeStyle: "short" })}</dd></div>
              </dl>
              
              {(isPerson || item.kind === "help") && (item.estado_actual === 'missing' || item.estado_actual === 'reported') && (
                <div className="report-action-card">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <h3 style={{ margin: "0 0 4px 0", color: "#166534" }}>{item.kind === "help" ? "¿Ya recibieron ayuda?" : "¿Ya fue localizada?"}</h3>
                      <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink-soft)" }}>
                        {item.kind === "help" ? "Si la situación ya fue atendida, avísanos para que otras personas puedan priorizar casos pendientes." : "Si tienes información confirmada de que esta persona fue localizada, avísanos para actualizar la ficha con cuidado."}
                      </p>
                    </div>
                    {!showLocatedForm && (
                      <button className="primary-button" style={{ background: "#16a34a", color: "white", padding: "8px 16px", flexShrink: 0, whiteSpace: 'nowrap' }} onClick={() => setShowLocatedForm(true)}>
                        {item.kind === "help" ? "Marcar como atendida" : "Marcar Localizado a salvo"}
                      </button>
                    )}
                  </div>
                  
                  {showLocatedForm && (
                    <form className="add-note-form" onSubmit={handleStatusChangeSubmit} style={{ marginTop: "1rem" }}>
                      <h4>Datos de quien confirma</h4>
                      <div className="note-form-grid" style={{ marginBottom: "1rem" }}>
                        <input
                          type="text"
                          placeholder="Tu nombre"
                          required
                          value={statusFormName}
                          onChange={(e) => setStatusFormName(e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Teléfono para verificación"
                          required
                          value={statusFormContact}
                          onChange={(e) => setStatusFormContact(e.target.value)}
                        />
                      </div>
                      <textarea
                        placeholder="Comparte dónde y cómo fue localizada, sólo con información confirmada"
                        rows={3}
                        required
                        value={statusFormText}
                        onChange={(e) => setStatusFormText(e.target.value)}
                      />
                      <div className="form-actions" style={{ flexDirection: 'row', gap: '8px', display: 'flex' }}>
                        <button className="secondary-button" type="button" onClick={() => setShowLocatedForm(false)}>Cancelar</button>
                        <button type="submit" disabled={isSavingStatus}>
                          {isSavingStatus ? "Guardando..." : "Confirmar información"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {(isPerson || item.kind === "help") && (item.estado_actual === 'located' || item.estado_actual === 'reunified' || item.estado_actual === 'resolved') && (
                <div className="report-action-card" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: "0 0 4px 0", color: "#991b1b" }}>{item.kind === "help" ? "¿La ayuda sigue pendiente?" : "¿La persona sigue desaparecida?"}</h3>
                      <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink-soft)" }}>
                        {item.kind === "help" ? "Si se marcó como atendida por error, puedes volver a dejarla como pendiente." : "Si se marcó como localizada por error, puedes volver a dejar la ficha en búsqueda."}
                      </p>
                    </div>
                    {!showRevertForm && (
                      <button className="primary-button" style={{ background: "#ef4444", color: "white", padding: "8px 16px", flexShrink: 0 }} onClick={() => setShowRevertForm(true)}>
                        {item.kind === "help" ? "Marcar como pendiente" : "Volver a búsqueda"}
                      </button>
                    )}
                  </div>
                  
                  {showRevertForm && (
                    <form className="add-note-form" onSubmit={handleRevertStatusSubmit} style={{ marginTop: "1rem" }}>
                      <h4>Motivo del cambio</h4>
                      <input
                        type="text"
                        placeholder="Tu nombre"
                        required
                        value={statusFormName}
                        onChange={(e) => setStatusFormName(e.target.value)}
                        style={{ marginBottom: "0.5rem" }}
                      />
                      <textarea
                        placeholder="Explica por que debemos corregir el estado"
                        rows={3}
                        required
                        value={statusFormText}
                        onChange={(e) => setStatusFormText(e.target.value)}
                      />
                      <div className="form-actions" style={{ flexDirection: 'row', gap: '8px', display: 'flex', marginTop: "0.5rem" }}>
                        <button className="secondary-button" type="button" onClick={() => setShowRevertForm(false)}>Cancelar</button>
                        <button type="submit" disabled={isSavingStatus} style={{ background: "#ef4444" }}>
                          {isSavingStatus ? "Guardando..." : "Confirmar cambio"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {(isPerson || item.kind === "help") && (
                <div className="case-updates-section">
                  <hr style={{ margin: "24px 0", borderColor: "var(--line)" }} />
                  <h3>Actualizaciones de la comunidad</h3>
                  
                  {notes.length === 0 ? (
                    <p className="muted" style={{ fontSize: "0.85rem", margin: "12px 0" }}>
                      Aun no hay actualizaciones registradas para este reporte.
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
                          <p className="update-text" dangerouslySetInnerHTML={{ __html: note.text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: #2563a8; text-decoration: underline;">$1</a>').replace(/\n/g, '<br/>') }} />
                        </div>
                      ))}
                    </div>
                  )}

                  <form className="add-note-form" onSubmit={handleNoteSubmit}>
                    <h4>Agregar información o una pista</h4>
                    {noteError && <p className="error">{noteError}</p>}
                    
                    <textarea
                      placeholder="Comparte información concreta: lugar, hora, ropa o con quién estaba. Evita publicar datos sensibles innecesarios."
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
