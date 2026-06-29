import os
import re

column_replacements = {
    'created_at': 'creado_en',
    'updated_at': 'actualizado_en',
    'expires_at': 'expira_en',
    'author_name': 'nombre_reportante',
    'author_contact': 'contacto_reportante',
    'author_relation': 'relacion_reportante',
    'full_name': 'nombre_completo',
    'alternate_names': 'nombres_alternativos',
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
    'verified_by': 'verificado_por',
    'verified_at': 'fecha_verificacion',
    'duplicate_of': 'duplicado_de',
    'potential_duplicate_of': 'posible_duplicado_de',
    'is_deleted': 'esta_eliminado',
    'deleted_by': 'eliminado_por',
    'deleted_at': 'fecha_eliminacion',
    'deletion_reason': 'motivo_eliminacion',
    
    # other fields
    'request_type': 'tipo_solicitud',
    'requester_name': 'nombre_solicitante',
    'requester_contact': 'contacto_solicitante',
    'number_of_people': 'cantidad_personas',
    'has_children': 'tiene_ninos',
    'has_elderly': 'tiene_ancianos',
    'has_disabled': 'tiene_discapacitados',
    
    'report_kind': 'tipo_reporte',
    'pet_name': 'nombre_mascota',
    'pet_type': 'tipo_mascota',
    'contact_name': 'nombre_contacto',
    'contact_phone': 'telefono_contacto',
    'can_foster': 'puede_acoger',
    'shelter_type': 'tipo_refugio',
    
    'volunteer_type': 'tipo_voluntario',
    'has_vehicle': 'tiene_vehiculo',
    'vehicle_type': 'tipo_vehiculo',
}

table_replacements = {
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
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # 1. Replace table names safely inside string literals or SQL
    for eng, spa in table_replacements.items():
        content = re.sub(rf'\b{eng}\b', spa, content)
        
    # 2. Replace column names safely (row.colname OR inside SQL queries)
    for eng, spa in column_replacements.items():
        content = re.sub(rf'\b{eng}\b', spa, content)
        
    # 3. Special handling for "status" and "source"
    # ONLY replace row.status -> row.estado_actual
    content = re.sub(r'row\.status\b', 'row.estado_actual', content)
    content = re.sub(r'row\.source\b', 'row.origen', content)
    
    # Replace in specific SQL contexts
    content = re.sub(r'\bstatus =', 'estado_actual =', content)
    content = re.sub(r'\bstatus\s+IN', 'estado_actual IN', content)
    content = re.sub(r'\bstatus\s+NOT IN', 'estado_actual NOT IN', content)
    content = re.sub(r'SET status', 'SET estado_actual', content)
    content = re.sub(r'SELECT\s+status', 'SELECT estado_actual', content)
    content = re.sub(r',\s*status\b(?!\s*:)', ', estado_actual', content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Refactored: {filepath}")

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            process_file(os.path.join(root, file))
            
for root, _, files in os.walk('scripts'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            process_file(os.path.join(root, file))

