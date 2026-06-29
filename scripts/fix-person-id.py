import re

with open('src/lib/cases-db.ts', 'r') as f:
    content = f.read()

content = content.replace("person_id =", "persona_id =")

with open('src/lib/cases-db.ts', 'w') as f:
    f.write(content)
