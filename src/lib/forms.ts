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
  { name: "cedulaIdentidad", label: "Cédula", type: "number", placeholder: "Opcional" },
  { name: "firstName", label: "Nombre", required: true, placeholder: "Ej. María" },
  { name: "lastName", label: "Apellido", required: true, placeholder: "Ej. Rangel" },
  { name: "alternateNames", label: "Apodo", placeholder: "Opcional" },
  { name: "age", label: "Edad", type: "number", placeholder: "Años" },
  { name: "sex", label: "Sexo", type: "select", options: [{ label: "No especificar", value: "" }, { label: "Femenino", value: "F" }, { label: "Masculino", value: "M" }, { label: "Otro / desconocido", value: "unknown" }] },
  { name: "lastSeenAddress", label: "Última ubicación", required: true, placeholder: "Ej. Catia La Mar, La Guaira", autocomplete: "venezuela-zones" },
  { name: "physicalDesc", label: "Descripción física", type: "textarea", placeholder: "Estatura, ropa, cicatrices..." },
  { name: "authorName", label: "Tu nombre", required: true },
  { name: "authorRelation", label: "Relación", placeholder: "Familiar, amistad..." },
  { name: "authorContact", label: "Teléfono / WhatsApp", type: "tel", required: true, placeholder: "+58..." },
  { name: "authorInstagram", label: "Tu Instagram", placeholder: "Ej. @usuario" },
  { name: "hasAccompanied", label: "Busco a otra persona en la misma zona", type: "checkbox" },
];

export const petLostFields: Field[] = [
  { name: "petName", label: "Nombre de la mascota", placeholder: "Opcional" },
  { name: "petType", label: "Tipo de mascota", type: "select", required: true, options: [
    { label: "Perro", value: "perro" },
    { label: "Gato", value: "gato" },
    { label: "Ave", value: "ave" },
    { label: "Otra", value: "otra" },
  ] },
  { name: "zone", label: "Zona donde se perdió", required: true, placeholder: "Municipio, barrio o referencia", autocomplete: "venezuela-zones" },
  { name: "status", label: "Estado conocido", placeholder: "Asustada, herida, con collar..." },
  { name: "description", label: "Descripción para reconocerla", type: "textarea", required: true, placeholder: "Color, tamaño, señas, collar, comportamiento..." },
  { name: "contactName", label: "Nombre de contacto", required: true },
  { name: "contactPhone", label: "Teléfono o WhatsApp", type: "tel", required: true },
];

export const petFoundFields: Field[] = [
  { name: "petName", label: "Nombre si se conoce", placeholder: "Opcional" },
  { name: "petType", label: "Tipo de mascota", type: "select", required: true, options: [
    { label: "Perro", value: "perro" },
    { label: "Gato", value: "gato" },
    { label: "Ave", value: "ave" },
    { label: "Otra", value: "otra" },
  ] },
  { name: "zone", label: "Dónde está ahora", required: true, placeholder: "Zona, refugio temporal o punto de encuentro", autocomplete: "venezuela-zones" },
  { name: "status", label: "Estado en que se encuentra", required: true, placeholder: "Bien, herida, desorientada..." },
  { name: "description", label: "Descripción para reconocerla", type: "textarea", required: true },
  { name: "contactName", label: "Nombre de contacto", required: true },
  { name: "contactPhone", label: "Teléfono o WhatsApp", type: "tel", required: true },
  { name: "canFoster", label: "Puedo tenerla en tránsito temporalmente", type: "checkbox" },
];

export const shelterRequestFields: Field[] = [
  { name: "requesterName", label: "Nombre del solicitante", required: true },
  { name: "contactPhone", label: "Teléfono o WhatsApp", type: "tel", required: true },
  { name: "zone", label: "Zona donde se encuentran", required: true, placeholder: "Municipio, barrio o referencia", autocomplete: "venezuela-zones" },
  { name: "groupType", label: "Tipo de solicitante", type: "select", required: true, options: [
    { label: "Individuo", value: "individual" },
    { label: "Grupo familiar", value: "family" },
    { label: "Grupo comunitario", value: "group" },
  ] },
  { name: "groupSize", label: "Cantidad de personas", type: "number", required: true, placeholder: "1" },
  { name: "needs", label: "Necesidades a considerar", type: "textarea", placeholder: "Niños, adultos mayores, discapacidad, mascotas, medicamentos..." },
  { name: "description", label: "Situación", type: "textarea", required: true, placeholder: "Qué pasó y qué tipo de refugio necesitan" },
];

export const shelterOfferFields: Field[] = [
  { name: "shelterName", label: "Nombre del lugar u organización", required: true },
  { name: "shelterType", label: "Tipo de refugio", type: "select", required: true, options: [
    { label: "Casa", value: "casa" },
    { label: "Cancha deportiva", value: "cancha" },
    { label: "Iglesia", value: "iglesia" },
    { label: "Galpón", value: "galpon" },
    { label: "Otro", value: "otro" },
  ] },
  { name: "zone", label: "Zona", required: true, autocomplete: "venezuela-zones" },
  { name: "capacity", label: "Capacidad aproximada", type: "number", required: true },
  { name: "contactName", label: "Contacto responsable", required: true },
  { name: "contactPhone", label: "Teléfono o WhatsApp", type: "tel", required: true },
  { name: "description", label: "Condiciones y recursos disponibles", type: "textarea", required: true, placeholder: "Baños, agua, cocina, colchonetas, acceso, horarios..." },
];

export const foundFields: Field[] = [
  { name: "cedulaIdentidad", label: "Cédula de identidad", type: "number", placeholder: "Si se conoce, sólo números" },
  { name: "knownName", label: "Nombre si se conoce", placeholder: "Puede quedar en blanco" },
  { name: "description", label: "Rasgos o descripción respetuosa", type: "textarea", required: true, placeholder: "Describe sin exponer datos sensibles innecesarios" },
  { name: "generalState", label: "Estado general", type: "select", required: true, options: [{ label: "Bien", value: "well" }, { label: "Herido", value: "injured" }, { label: "Inconsciente", value: "unconscious" }, { label: "Necesita atención médica", value: "medical" }, { label: "Fallecido / revisar antes de publicar", value: "deceased_private" }] },
  { name: "currentLocation", label: "Ubicación actual o punto de atención", required: true, placeholder: "Hospital, refugio o zona aproximada", autocomplete: "venezuela-zones" },
  { name: "reporterName", label: "Persona o institución que reporta", required: true },
  { name: "reporterContact", label: "Contacto para verificación", type: "tel", required: true },
  { name: "observations", label: "Observaciones", type: "textarea" },
];

export const helpFields: Field[] = [
  { name: "requestType", label: "Tipo de ayuda", type: "select", required: true, options: [
    { label: "Rescate por derrumbe", value: "rescue" },
    { label: "Persona atrapada", value: "trapped" },
    { label: "Atención médica", value: "medical" },
    { label: "Traslado", value: "transport" },
    { label: "Medicamentos", value: "medication" },
    { label: "Agua/alimentos", value: "food_water" },
    { label: "Refugio", value: "shelter" },
    { label: "Otra ayuda", value: "other" },
  ] },
  { name: "numberOfPeople", label: "Cantidad estimada de personas afectadas", type: "number", placeholder: "1" },
  { name: "description", label: "Qué ocurre y qué ayuda hace falta", type: "textarea", required: true, placeholder: "Describe la situación con datos concretos" },
  { name: "address", label: "Zona, dirección o referencia", required: true, placeholder: "Barrio, edificio, punto cercano o referencia", autocomplete: "venezuela-zones" },
  { name: "risks", label: "Riesgos visibles", placeholder: "Gas, cables, fuego, estructura inestable..." },
  { name: "requesterName", label: "Nombre de contacto", required: true },
  { name: "requesterContact", label: "Teléfono o WhatsApp", type: "tel", required: true },
  { name: "hasVulnerable", label: "Hay niños, adultos mayores o personas con discapacidad", type: "checkbox" },
];

export const volunteerFields: Field[] = [
  { name: "name", label: "Nombre", required: true },
  { name: "email", label: "Correo electrónico", type: "email", required: true },
  { name: "contact", label: "Teléfono o WhatsApp", type: "tel", required: true },
  { name: "zone", label: "Zona actual", required: true, placeholder: "Ciudad, municipio o barrio", autocomplete: "venezuela-zones" },
  { name: "canMove", label: "Puedo moverme", type: "checkbox" },
  { name: "radiusKm", label: "Radio de acción (km)", type: "number", placeholder: "5" },
  { name: "hasVehicle", label: "Tengo vehículo", type: "checkbox" },
  { name: "vehicleType", label: "Tipo de vehículo", placeholder: "Moto, carro, camioneta..." },
  { name: "skills", label: "Habilidades o recursos", type: "textarea", placeholder: "Primeros auxilios, médico, transporte, logística, mapeo, software..." },
  { name: "availability", label: "Disponibilidad", type: "select", options: [{ label: "Ahora", value: "now" }, { label: "Próximas horas", value: "hours" }, { label: "Mañana", value: "tomorrow" }, { label: "Remoto", value: "remote" }] },
];
