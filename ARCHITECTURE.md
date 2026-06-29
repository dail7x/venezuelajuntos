# Arquitectura e Infraestructura (Venezuela Juntos)

Este documento describe la configuración actual de infraestructura, despliegue y base de datos del proyecto para mantener el contexto en futuras sesiones.

## 1. Servidor Principal
- **Proveedor:** Hetzner VPS
- **IP Pública:** `116.203.118.1`
- **Gestor de Despliegue:** Coolify (administra la aplicación web Next.js en contenedores Docker).

## 2. Base de Datos (libSQL / sqld)
Anteriormente se utilizaba Turso, pero se migró a un servidor **libSQL autohospedado** (la versión open-source de Turso) corriendo directamente en el servidor de Hetzner para reducir latencia y unificar la infraestructura.

### Configuración del Contenedor Docker (libSQL)
- **Nombre del contenedor:** `libsql-server`
- **Imagen:** `ghcr.io/tursodatabase/libsql-server:latest`
- **Red:** `coolify` (permite que las apps desplegadas en Coolify accedan directamente por nombre de host).
- **Puertos Expuestos:** `8081` (Host) -> `8080` (Contenedor).
- **Volumen Persistente:** `sqlite-data` (montado en `/var/lib/sqld`).
- **Autenticación:** Habilitada mediante Token JWT (EdDSA / Ed25519).

### Comando de Despliegue del Contenedor
Si alguna vez se necesita recrear el contenedor de la BD en el servidor, se debe usar este comando (vía SSH a Hetzner):
```bash
docker run -d \
  --name libsql-server \
  --network coolify \
  -p 0.0.0.0:8081:8080 \
  -v sqlite-data:/var/lib/sqld \
  -e SQLD_NODE=primary \
  -e SQLD_AUTH_JWT_KEY_FILE=/var/lib/sqld/auth.pem \
  ghcr.io/tursodatabase/libsql-server:latest
```

## 3. Credenciales y Autenticación (JWT)

Para proteger el puerto `8081` público, `sqld` requiere un token JWT firmado con una llave criptográfica.

### Llave Pública (Instalada en el servidor)
Ubicación en el servidor: `/var/lib/docker/volumes/sqlite-data/_data/auth.pem`
```pem
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEADtxnAoHslEJoYpDSHAcQTJe2o1vMubPJ1mxEilbjVNM=
-----END PUBLIC KEY-----
```

### Token JWT Generado (Válido por 10 años)
Este token debe utilizarse como valor de la variable `TURSO_AUTH_TOKEN`:
```
eyJhbGciOiJFZERTQSJ9.eyJhIjoicnciLCJpYXQiOjE3ODI0OTUwNjIsImV4cCI6MjA5ODA3MTA2Mn0.GNSZDmPEnD2oO0yMxrltej23G664UQb9Vx5BZKBH8WqVARYIJwQl_t0tqnQ_E5NuaSvbii5Sd1K5tIve4RKdDQ
```

## 4. Variables de Entorno (.env)

Dependiendo del entorno, la aplicación se conecta de manera diferente a la base de datos:

### Entorno Local (Mac)
- Se conecta vía internet a la IP pública de Hetzner usando protocolo HTTP plano (el cliente libSQL se encarga de inyectar el token en las cabeceras).
- **Importante:** Usar `http://` en lugar de `libsql://` para evitar que el cliente intente forzar SSL/TLS en el puerto 8081.

```env
DATABASE_URL='http://116.203.118.1:8081'
TURSO_AUTH_TOKEN='eyJhbGciOiJFZERTQSJ9.eyJhIjoicnciLCJpYXQiOjE3ODI0OTUwNjIsImV4cCI6MjA5ODA3MTA2Mn0.GNSZDmPEnD2oO0yMxrltej23G664UQb9Vx5BZKBH8WqVARYIJwQl_t0tqnQ_E5NuaSvbii5Sd1K5tIve4RKdDQ'
```

### Entorno Producción (Coolify)
- La app de Next.js y la Base de Datos están en el mismo servidor (dentro de la red Docker `coolify`).
- Por tanto, Next.js se conecta internamente usando el nombre del contenedor `libsql-server` y su puerto interno `8080`. Esto es mucho más rápido y seguro.

```env
DATABASE_URL='http://libsql-server:8080'
TURSO_AUTH_TOKEN='eyJhbGciOiJFZERTQSJ9.eyJhIjoicnciLCJpYXQiOjE3ODI0OTUwNjIsImV4cCI6MjA5ODA3MTA2Mn0.GNSZDmPEnD2oO0yMxrltej23G664UQb9Vx5BZKBH8WqVARYIJwQl_t0tqnQ_E5NuaSvbii5Sd1K5tIve4RKdDQ'
```

## 5. Esquema de Base de Datos y Datos Recientes

### Migración a Campos en Español
Se refactorizó el esquema en `drizzle/schema.sql` y las consultas en `src/lib/cases-db.ts` para utilizar campos en español y alinear todo a un modelo estructurado (e.g. `personas`, `nombre_completo`, `origen`, `sexo`). Los endpoints de escritura (`createCaseInDb`) fueron ajustados para reflejar estas modificaciones.

### Sincronización y Scraper
- Se construyó un scraper robusto en `scripts/sync-playwright.ts` que obtiene datos desde la API externa para poblar el LibSQL autohospedado en Hetzner.
- El scraper utiliza la sentencia `ON CONFLICT DO UPDATE` a nivel base de datos basándose en `id` para evitar duplicación al sincronizar y reescribir solo con los datos más recientes.
- Posee la capacidad de filtrar registros específicos como "localizados" (`--localizados`) y hacer barridos completos desde el principio para mantener toda la BD actualizada.
- **Orden de la interfaz:** Los casos traídos de la base de datos están estrictamente ordenados de manera cronológica usando `ORDER BY creado_en DESC` (fecha de reporte original), en lugar de la fecha de sincronización del scraper (`actualizado_en`).

### Deduplicación y Conteo Inteligente
- La base de datos posee un campo `posible_duplicado_de` en la tabla `personas`.
- Para efectos de contadores y estadísticas (ej. "Personas únicas aprox"), el sistema consulta los registros restando aquellos que tengan un `posible_duplicado_de IS NOT NULL`.
- **Criterios de Deduplicación:** El pipeline de deduplicación que llenará dinámicamente esta bandera (`posible_duplicado_de`) aún no se ha construido. Debe desarrollarse como un script (`dedupe.ts`) aislado que cruce nombres, cédulas y edad sin modificar ni eliminar la información base (*raw*).

## 6. Script para Generar Nuevos Tokens (Referencia)

Si en el futuro se necesita generar un nuevo par de llaves y un nuevo token JWT, se utilizó este script en Node.js usando la librería `jose`:

```javascript
const crypto = require('crypto');
const jose = require('jose');

async function main() {
  // Generar llaves Ed25519 (EdDSA)
  const { publicKey, privateKey } = await jose.generateKeyPair('EdDSA');
  const pubSpki = await jose.exportSPKI(publicKey);
  
  console.log("NUEVA LLAVE PÚBLICA:");
  console.log(pubSpki); // Esta llave se guarda en el servidor como auth.pem

  // Generar Token JWT firmado (acceso read/write)
  const token = await new jose.SignJWT({ a: "rw" })
    .setProtectedHeader({ alg: 'EdDSA' })
    .setIssuedAt()
    .setExpirationTime('10y')
    .sign(privateKey);

  console.log("\nNUEVO TOKEN:");
  console.log(token); // Este token se pone en el .env
}
main();
```
