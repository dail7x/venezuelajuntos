import os
import re

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            
            original = content
            
            if 'CaseDetailModal.tsx' in filepath:
                # specifically fix the Response.status error I caused
                content = content.replace('res.estado_actual === 200', 'res.status === 200')
                content = content.replace('res.estado_actual', 'res.status')
                
            # Replace case.status -> case.estado_actual
            content = re.sub(r'(\w+)\.status\b', lambda m: f"{m.group(1)}.estado_actual" if m.group(1) not in ['res', 'response', 'req', 'request', 'NextResponse'] else m.group(0), content)
            
            if content != original:
                with open(filepath, 'w') as f:
                    f.write(content)
