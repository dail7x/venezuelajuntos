# venezuelajuntos

MVP de emergencia para centralizar reportes ciudadanos de personas desaparecidas, personas encontradas, solicitudes de ayuda, zonas de rescate y voluntarios.

## Stack previsto

- Next.js App Router
- Tailwind/CSS global mobile-first
- Turso/libSQL + Drizzle ORM
- Mapbox/MapLibre en fase de integracion
- Coolify en Hetzner con GitHub Actions

## Rutas principales

- `/`
- `/reportar/desaparecido`
- `/reportar/encontrado`
- `/pedir-ayuda`
- `/ayudar`
- `/mapa`
- `/casos/[id]`
- `/admin`

## Endpoints iniciales

- `GET/POST /api/cases`
- `POST /api/signals`
- `GET /api/stats`
- `GET /api/export/pfif.xml`
- `GET /api/export/rescue-zones.geojson`
- `GET /api/export/requests.json`
- `GET /api/export/sitrep.json`

## Desarrollo

```bash
npm install
npm run dev
```

## Deploy

Configurar en GitHub:

- `COOLIFY_WEBHOOK_URL`

Configurar en Coolify:

- `NEXTAUTH_URL=https://venezuelajuntos.online`
- variables de Turso, Mapbox y Uploadthing cuando esten listas.

El workflow `.github/workflows/deploy.yml` ejecuta typecheck, build y luego dispara el webhook de Coolify.
