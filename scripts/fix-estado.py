import re

with open('src/lib/cases-db.ts', 'r') as f:
    content = f.read()

# For solicitudes_ayuda, zonas_rescate, reportes_mascotas, replace 'estado_actual,' with 'estado as estado_actual,'
# Actually let's just do a string replace for the specific lines.
content = content.replace("descripcion as search_desc, estado_actual,", "descripcion as search_desc, estado as estado_actual,")

with open('src/lib/cases-db.ts', 'w') as f:
    f.write(content)
