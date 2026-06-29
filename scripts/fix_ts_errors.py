import re

with open('src/lib/data.ts', 'r') as f:
    data_content = f.read()
data_content = re.sub(r'status: CaseStatus;', 'estado_actual: CaseStatus;', data_content)
with open('src/lib/data.ts', 'w') as f:
    f.write(data_content)

with open('src/lib/cases-db.ts', 'r') as f:
    cases_content = f.read()
# fix personStatus parameter name
cases_content = re.sub(r'function personStatus\(status: string\)', 'function personStatus(estado_actual: string)', cases_content)
cases_content = re.sub(r'if \(status ===', 'if (estado_actual ===', cases_content)
cases_content = re.sub(r'function requestStatus\(status: string\)', 'function requestStatus(estado_actual: string)', cases_content)
cases_content = re.sub(r'function zoneStatus\(status: string\)', 'function zoneStatus(estado_actual: string)', cases_content)
cases_content = re.sub(r'const status = personStatus', 'const estado_actual = personStatus', cases_content)
cases_content = re.sub(r'status: requestStatus', 'estado_actual: requestStatus', cases_content)
cases_content = re.sub(r'status: zoneStatus', 'estado_actual: zoneStatus', cases_content)
cases_content = re.sub(r'status: reportKind', 'estado_actual: reportKind', cases_content)
cases_content = re.sub(r"status: 'reported'", "estado_actual: 'reported'", cases_content)

# fix the status: status
cases_content = re.sub(r'\bstatus,', 'estado_actual,', cases_content)

with open('src/lib/cases-db.ts', 'w') as f:
    f.write(cases_content)
