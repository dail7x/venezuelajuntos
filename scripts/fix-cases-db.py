import re

with open('src/lib/cases-db.ts', 'r') as f:
    content = f.read()

# Fix sqlBase
content = content.replace('COALESCE(title, tipo_solicitud) as title_or_name', 'COALESCE(titulo, tipo_solicitud) as title_or_name')
content = content.replace('address as zone_or_address', 'direccion as zone_or_address')
content = content.replace('description as search_desc', 'descripcion as search_desc')
content = content.replace('title as title_or_name', 'titulo as title_or_name')
content = content.replace('zone as zone_or_address', 'zona as zone_or_address')

# Fix map functions
content = content.replace('row.address', 'row.direccion')
content = content.replace('row.description', 'row.descripcion')
content = content.replace('row.title', 'row.titulo')
content = content.replace('row.zone', 'row.zona')
content = content.replace('row.needs', 'row.necesidades')
content = content.replace('row.capacity', 'row.capacidad')
content = content.replace('row.group_size', 'row.tamano_grupo')

# Fix 'source' for notes
content = content.replace("source = 'hospital_list'", "origen = 'lista_hospital'")

with open('src/lib/cases-db.ts', 'w') as f:
    f.write(content)
