const fs = require('fs');
const path = require('path');

const replacements = {
  'persons': 'personas',
  'person_notes': 'notas_persona',
  'rescue_zones': 'zonas_rescate',
  'help_requests': 'solicitudes_ayuda',
  'volunteers': 'voluntarios',
  'volunteer_checkins': 'asistencias_voluntario',
  'case_signals': 'señales_caso',
  'moderation_log': 'bitacora_moderacion',
  'pet_reports': 'reportes_mascotas',
  'shelter_reports': 'reportes_refugios',
  'hospital_lists': 'listas_hospital',
  'hospital_list_items': 'elementos_lista_hospital',

  // Database Columns
  'created_at': 'creado_en',
  'updated_at': 'actualizado_en',
  'expires_at': 'expira_en',
  'author_name': 'nombre_reportante',
  'author_contact': 'contacto_reportante',
  'author_relation': 'relacion_reportante',
  'cedula_identidad': 'cedula_identidad',
  'full_name': 'nombre_completo',
  'alternate_names': 'nombres_alternativos',
  'sex': 'sexo',
  'age_estimated': 'edad_estimada',
  'date_of_birth': 'fecha_nacimiento',
  'physical_desc': 'descripcion_fisica',
  'clothing_desc': 'descripcion_vestimenta',
  'photo_url': 'url_foto',
  'last_seen_address': 'ultima_direccion_conocida',
  'location_zone': 'zona_ubicacion',
  'location_normalized': 'ubicacion_normalizada',
  'last_seen_lat': 'latitud_visto_ultima_vez',
  'last_seen_lng': 'longitud_visto_ultima_vez',
  'last_seen_at': 'fecha_visto_ultima_vez',
  'last_seen_context': 'contexto_visto_ultima_vez',
  'found_at': 'encontrado_en',
  'found_address': 'direccion_encontrado',
  'found_lat': 'latitud_encontrado',
  'found_lng': 'longitud_encontrado',
  'found_notes': 'notas_hallazgo',
  'verified': 'verificado',
  'verified_by': 'verificado_por',
  'verified_at': 'fecha_verificacion',
  'spam': 'spam',
  'duplicate_of': 'duplicado_de',
  'potential_duplicate_of': 'posible_duplicado_de',
  'is_deleted': 'esta_eliminado',
  'deleted_by': 'eliminado_por',
  'deleted_at': 'fecha_eliminacion',
  'deletion_reason': 'motivo_eliminacion',
  // status and source are too common, we will handle them with extra care later or skip if too risky
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src').concat(walk('./scripts')).filter(f => !f.includes('refactor_db_names.js'));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [oldName, newName] of Object.entries(replacements)) {
    const regex = new RegExp(`\\b${oldName}\\b`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, newName);
      changed = true;
    }
  }
  
  // Custom manual replacements for status and source only in SQL and specific object contexts
  // e.g. status -> estado_actual
  content = content.replace(/persons\.status/g, 'personas.estado_actual');
  content = content.replace(/p\.status/g, 'p.estado_actual');
  content = content.replace(/SET status/g, 'SET estado_actual');
  content = content.replace(/status =/g, 'estado_actual =');
  content = content.replace(/status IN/g, 'estado_actual IN');
  content = content.replace(/status NOT IN/g, 'estado_actual NOT IN');
  content = content.replace(/row\.status/g, 'row.estado_actual');
  content = content.replace(/status:/g, 'estado_actual:'); // risky, we'll fix { status: 200 } back to normal below
  content = content.replace(/estado_actual: 200/g, 'status: 200');
  content = content.replace(/estado_actual: 400/g, 'status: 400');
  content = content.replace(/estado_actual: 401/g, 'status: 401');
  content = content.replace(/estado_actual: 403/g, 'status: 403');
  content = content.replace(/estado_actual: 404/g, 'status: 404');
  content = content.replace(/estado_actual: 500/g, 'status: 500');
  
  // Also res.status(
  content = content.replace(/res\.estado_actual/g, 'res.status');
  content = content.replace(/response\.estado_actual/g, 'response.status');
  
  if (content !== fs.readFileSync(file, 'utf8')) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Refactored ${file}`);
  }
}
