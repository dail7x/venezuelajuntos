import os
import re

replacements = {
    r'\bpersons\b': 'personas',
    r'\bperson_notes\b': 'notas_persona',
    r'\brescue_zones\b': 'zonas_rescate',
    r'\bhelp_requests\b': 'solicitudes_ayuda',
    r'\bvolunteers\b': 'voluntarios',
    r'\bvolunteer_checkins\b': 'asistencias_voluntario',
    r'\bcase_signals\b': 'señales_caso',
    r'\bmoderation_log\b': 'bitacora_moderacion',
    r'\bpet_reports\b': 'reportes_mascotas',
    r'\bshelter_reports\b': 'reportes_refugios',
    r'\bhospital_lists\b': 'listas_hospital',
    r'\bhospital_list_items\b': 'elementos_lista_hospital',

    r'\bsource\b': 'origen',
    r'\bsource_url\b': 'url_origen',
    r'\bcreated_at\b': 'creado_en',
    r'\bupdated_at\b': 'actualizado_en',
    r'\bexpires_at\b': 'expira_en',
    r'\bauthor_name\b': 'nombre_reportante',
    r'\bauthor_contact\b': 'contacto_reportante',
    r'\bauthor_relation\b': 'relacion_reportante',
    r'\bcedula_identidad\b': 'cedula_identidad',
    r'\bfull_name\b': 'nombre_completo',
    r'\balternate_names\b': 'nombres_alternativos',
    r'\bsex\b': 'sexo',
    r'\bage_estimated\b': 'edad_estimada',
    r'\bdate_of_birth\b': 'fecha_nacimiento',
    r'\bphysical_desc\b': 'descripcion_fisica',
    r'\bclothing_desc\b': 'descripcion_vestimenta',
    r'\bphoto_url\b': 'url_foto',
    r'\blast_seen_address\b': 'ultima_direccion_conocida',
    r'\blocation_zone\b': 'zona_ubicacion',
    r'\blocation_normalized\b': 'ubicacion_normalizada',
    r'\blast_seen_lat\b': 'latitud_visto_ultima_vez',
    r'\blast_seen_lng\b': 'longitud_visto_ultima_vez',
    r'\blast_seen_at\b': 'fecha_visto_ultima_vez',
    r'\blast_seen_context\b': 'contexto_visto_ultima_vez',
    r'\bfound_at\b': 'encontrado_en',
    r'\bfound_address\b': 'direccion_encontrado',
    r'\bfound_lat\b': 'latitud_encontrado',
    r'\bfound_lng\b': 'longitud_encontrado',
    r'\bfound_notes\b': 'notas_hallazgo',
    r'\bverified\b': 'verificado',
    r'\bverified_by\b': 'verificado_por',
    r'\bverified_at\b': 'fecha_verificacion',
    r'\bspam\b': 'spam',
    r'\bduplicate_of\b': 'duplicado_de',
    r'\bpotential_duplicate_of\b': 'posible_duplicado_de',
    r'\bis_deleted\b': 'esta_eliminado',
    r'\bdeleted_by\b': 'eliminado_por',
    r'\bdeleted_at\b': 'fecha_eliminacion',
    r'\bdeletion_reason\b': 'motivo_eliminacion',
}

def is_safe_to_replace(content):
    # This function processes the whole file, but we only apply generic replacements
    # to files that we KNOW interact with the DB and we explicitly prevent `{ status: 200 }` overrides.
    pass

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Temporarily protect "status: XXX" or "status:" objects
            protected = {}
            def prot(m):
                k = f"__PROT_{len(protected)}__"
                protected[k] = m.group(0)
                return k
            content = re.sub(r'status:\s*\d+', prot, content)
            content = re.sub(r'status\s*=\s*\d+', prot, content)
            content = re.sub(r'res\.status', prot, content)
            content = re.sub(r'response\.status', prot, content)
            content = re.sub(r'status:\s*\"[^\"]+\"', prot, content) # like status: "success"
            
            # ALSO protect `case.status`, `item.status`, etc if we want frontend to stay working
            content = re.sub(r'item\.status', prot, content)
            content = re.sub(r'\.status\b', prot, content) # actually protect ALL `.status` EXCEPT `row.status`
            
            # Wait, we DO want `row.status` to be replaced because `row` comes from SQL!
            # Let's un-protect `row.status` manually afterwards
            
            for old, new in replacements.items():
                content = re.sub(old, new, content)
                
            # Specifically replace SQL status and source:
            content = re.sub(r'\bstatus\b(?!\s*[:=])', 'estado_actual', content)
            
            # But wait, what if it matches `export type CaseStatus`?
            # It's better to just do manual regex.
            
            pass

