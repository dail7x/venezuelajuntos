export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "datetime-local" | "tel" | "email" | "textarea" | "select" | "checkbox" | "file";
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  autocomplete?: "venezuela-zones";
};

export const missingFields: Field[] = [
  { name: "firstName", label: "Nombre", required: true, placeholder: "Ej. María" },
  { name: "lastName", label: "Apellido", required: true, placeholder: "Ej. Rangel" },
  { name: "alternateNames", label: "Apodo o nombre conocido", placeholder: "Opcional" },
  { name: "age", label: "Edad aproximada", type: "number", placeholder: "Años" },
  { name: "sex", label: "Sexo/género", type: "select", options: [{ label: "No especificar", value: "" }, { label: "Femenino", value: "F" }, { label: "Masculino", value: "M" }, { label: "Otro / desconocido", value: "unknown" }] },
  { name: "lastSeenAddress", label: "Última ubicación vista", required: true, placeholder: "Ej. Catia La Mar, La Guaira", autocomplete: "venezuela-zones" },
  { name: "physicalDesc", label: "Descripción y señas particulares", type: "textarea", placeholder: "Estatura, contextura, cicatrices, lentes, condición médica privada..." },
  { name: "authorName", label: "Nombre del reportante", required: true, placeholder: "Tu nombre" },
  { name: "authorRelation", label: "Relación con la persona", placeholder: "Familiar, amigo, vecino..." },
  { name: "authorContact", label: "Teléfono/WhatsApp del reportante", type: "tel", required: true, placeholder: "+58..." },
  { name: "authorInstagram", label: "Usuario de Instagram (opcional)", placeholder: "Ej. @usuario" },
  { name: "hasAccompanied", label: "¿Estaba acompañada o buscas a otra persona en la misma ubicación? (Permite guardar y registrar otra persona con los mismos datos de contacto y ubicación)", type: "checkbox" },
];

export const petLostFields: Field[] = [
  { name: "petName", label: "Nombre de la mascota", placeholder: "Opcional" },
  { name: "petType", label: "Tipo de mascota", type: "select", required: true, options: [
    { label: "Perro", value: "perro" },
    { label: "Gato", value: "gato" },
    { label: "Ave", value: "ave" },
    { label: "Otra", value: "otra" },
  ] },
  { name: "zone", label: "Zona donde se perdio", required: true, placeholder: "Municipio, barrio o referencia", autocomplete: "venezuela-zones" },
  { name: "status", label: "Estado conocido", placeholder: "Asustada, herida, con collar..." },
  { name: "description", label: "Descripcion", type: "textarea", required: true, placeholder: "Color, tamano, senas, collar, comportamiento..." },
  { name: "contactName", label: "Nombre de contacto", required: true },
  { name: "contactPhone", label: "Telefono/WhatsApp", type: "tel", required: true },
];

export const petFoundFields: Field[] = [
  { name: "petName", label: "Nombre si se conoce", placeholder: "Opcional" },
  { name: "petType", label: "Tipo de mascota", type: "select", required: true, options: [
    { label: "Perro", value: "perro" },
    { label: "Gato", value: "gato" },
    { label: "Ave", value: "ave" },
    { label: "Otra", value: "otra" },
  ] },
  { name: "zone", label: "Ubicacion actual", required: true, placeholder: "Zona, refugio temporal o punto de encuentro", autocomplete: "venezuela-zones" },
  { name: "status", label: "Estado en que se encuentra", required: true, placeholder: "Bien, herida, desorientada..." },
  { name: "description", label: "Descripcion", type: "textarea", required: true },
  { name: "contactName", label: "Nombre de contacto", required: true },
  { name: "contactPhone", label: "Telefono/WhatsApp", type: "tel", required: true },
  { name: "canFoster", label: "Puedo tenerla en transito temporalmente", type: "checkbox" },
];

export const shelterRequestFields: Field[] = [
  { name: "requesterName", label: "Nombre del solicitante", required: true },
  { name: "contactPhone", label: "Telefono/WhatsApp", type: "tel", required: true },
  { name: "zone", label: "Zona donde se encuentran", required: true, placeholder: "Municipio, barrio o referencia", autocomplete: "venezuela-zones" },
  { name: "groupType", label: "Tipo de solicitante", type: "select", required: true, options: [
    { label: "Individuo", value: "individual" },
    { label: "Grupo familiar", value: "family" },
    { label: "Grupo comunitario", value: "group" },
  ] },
  { name: "groupSize", label: "Cantidad de personas", type: "number", required: true, placeholder: "1" },
  { name: "needs", label: "Necesidades especiales", type: "textarea", placeholder: "Niños, adultos mayores, discapacidad, mascotas, medicamentos..." },
  { name: "description", label: "Situacion", type: "textarea", required: true, placeholder: "Que paso y que tipo de refugio necesitan" },
];

export const shelterOfferFields: Field[] = [
  { name: "shelterName", label: "Nombre del lugar u organizacion", required: true },
  { name: "shelterType", label: "Tipo de refugio", type: "select", required: true, options: [
    { label: "Casa", value: "casa" },
    { label: "Cancha deportiva", value: "cancha" },
    { label: "Iglesia", value: "iglesia" },
    { label: "Galpon", value: "galpon" },
    { label: "Otro", value: "otro" },
  ] },
  { name: "zone", label: "Zona", required: true, autocomplete: "venezuela-zones" },
  { name: "capacity", label: "Capacidad aproximada", type: "number", required: true },
  { name: "contactName", label: "Contacto responsable", required: true },
  { name: "contactPhone", label: "Telefono/WhatsApp", type: "tel", required: true },
  { name: "description", label: "Condiciones y recursos disponibles", type: "textarea", required: true, placeholder: "Baños, agua, cocina, colchonetas, acceso, horarios..." },
];

export const foundFields: Field[] = [
  { name: "knownName", label: "Nombre si se conoce", placeholder: "Puede quedar en blanco" },
  { name: "description", label: "Rasgos o descripcion", type: "textarea", required: true, placeholder: "Descripcion respetuosa, sin exponer datos sensibles" },
  { name: "generalState", label: "Estado general", type: "select", required: true, options: [{ label: "Bien", value: "well" }, { label: "Herido", value: "injured" }, { label: "Inconsciente", value: "unconscious" }, { label: "Necesita atencion medica", value: "medical" }, { label: "Fallecido/no publicar publicamente", value: "deceased_private" }] },
  { name: "currentLocation", label: "Ubicacion actual o punto de atencion", required: true, placeholder: "Hospital, refugio o zona aproximada", autocomplete: "venezuela-zones" },
  { name: "reporterName", label: "Persona o institucion que reporta", required: true },
  { name: "reporterContact", label: "Contacto para verificacion", type: "tel", required: true },
  { name: "observations", label: "Observaciones", type: "textarea" },
];

export const helpFields: Field[] = [
  { name: "requestType", label: "Tipo de ayuda", type: "select", required: true, options: [
    { label: "Rescate por derrumbe", value: "rescue" },
    { label: "Persona atrapada", value: "trapped" },
    { label: "Atencion medica", value: "medical" },
    { label: "Traslado", value: "transport" },
    { label: "Medicamentos", value: "medication" },
    { label: "Agua/alimentos", value: "food_water" },
    { label: "Refugio", value: "shelter" },
    { label: "Otra ayuda", value: "other" },
  ] },
  { name: "numberOfPeople", label: "Cantidad estimada de personas afectadas", type: "number", placeholder: "1" },
  { name: "description", label: "Descripcion corta", type: "textarea", required: true, placeholder: "Que ocurre y que se necesita exactamente" },
  { name: "address", label: "Direccion o referencia", required: true, placeholder: "Zona, barrio, edificio, referencia", autocomplete: "venezuela-zones" },
  { name: "risks", label: "Riesgos visibles", placeholder: "Gas, cables, fuego, estructura inestable..." },
  { name: "requesterName", label: "Contacto solicitante", required: true },
  { name: "requesterContact", label: "WhatsApp o telefono", type: "tel", required: true },
  { name: "hasVulnerable", label: "Hay niños, adultos mayores o personas con discapacidad", type: "checkbox" },
];

export const volunteerFields: Field[] = [
  { name: "name", label: "Nombre", required: true },
  { name: "email", label: "Correo electrónico", type: "email", required: true },
  { name: "contact", label: "Telefono/WhatsApp", type: "tel", required: true },
  { name: "zone", label: "Zona actual", required: true, placeholder: "Ciudad, municipio o barrio", autocomplete: "venezuela-zones" },
  { name: "canMove", label: "Puedo moverme", type: "checkbox" },
  { name: "radiusKm", label: "Radio de accion (km)", type: "number", placeholder: "5" },
  { name: "hasVehicle", label: "Tengo vehiculo", type: "checkbox" },
  { name: "vehicleType", label: "Tipo de vehiculo", placeholder: "Moto, carro, camioneta..." },
  { name: "skills", label: "Habilidades o recursos", type: "textarea", placeholder: "Primeros auxilios, medico, transporte, logistica, mapeo, software..." },
  { name: "availability", label: "Disponibilidad", type: "select", options: [{ label: "Ahora", value: "now" }, { label: "Proximas horas", value: "hours" }, { label: "Manana", value: "tomorrow" }, { label: "Remoto", value: "remote" }] },
];
