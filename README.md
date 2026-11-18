# Lacre · Web

Frontend de **Lacre**, plataforma de invitaciones digitales con QR para bodas, XV años y más.

La API vive en [lacre-api](https://github.com/josuehmtz/lacre-api).

## Stack

- React 19 + TypeScript + Vite · React Router · TanStack Query
- Konva (plano del salón) · dnd-kit (asignar invitados) · qrcode / qr-scanner
- Tema elegante claro y oscuro (sigue al sistema, con selector manual)
- Netlify (proxy `/api/*` → API en Cloud Run, definido en `netlify.toml`)

```
src/
├── api/          Cliente HTTP por funcionalidad
├── components/   Piezas del panel (invitaciones, pagos, hostess, mesas)
├── pages/        Inicio, login, panel, invitación pública (/i/:token), escáner (/staff)
├── templates/    Plantillas de invitación (Clásica, Jardín, Moderna)
└── theme/        Marca y tema claro/oscuro
```

## Desarrollo

```powershell
npm install
npm run dev     # http://localhost:5173 — Vite reenvía /api a http://localhost:5080
npm run build
npm run lint
```

Necesitas la API corriendo localmente (ver lacre-api).

## Despliegue

Netlify construye `main` automáticamente con la configuración de `netlify.toml`. Las páginas pesadas (diseñador,
plano de mesas y escáner) se cargan bajo demanda para que la invitación pública sea ligera.
