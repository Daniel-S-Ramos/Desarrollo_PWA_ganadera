# Ganadería JR — Prototipo de aplicación web progresiva

Prototipo desarrollado como trabajo de grado de Ingeniería de Sistemas (Universidad Católica de Colombia) para hacer posible la trazabilidad bovina y el seguimiento productivo de leche y carne en la Ganadería JR, Chipaque (Cundinamarca).

La aplicación registra y consulta la información en campo sin conexión y la sincroniza con el servicio remoto cuando hay señal.

## Tecnologías

React 19 · TypeScript · Vite 8 · Dexie (IndexedDB) · vite-plugin-pwa / Workbox · Supabase

## Comandos

```bash
npm install        # instala las dependencias
npm run dev        # servidor de desarrollo
npm test           # pruebas
npm run build      # versión de producción en dist/
```

## Plan de desarrollo

Ver [PLAN.md](PLAN.md).

## Pruebas

Ver [docs/pruebas](docs/pruebas/README.md): casos de prueba, resultados, evidencias y matriz de trazabilidad.

## Documentación técnica

Ver [docs/tecnica](docs/tecnica/README.md): funcionamiento interno de cada componente.

## Publicación

La aplicación se publica en **Vercel** (plan Hobby), conectado al repositorio de GitHub. La
configuración está en [`vercel.json`](vercel.json):

- Compila con `npm ci` y `npm run build` y publica la carpeta `dist/`, con Node 22.
- Cualquier ruta (`/animales/nuevo`) entrega `index.html`, que resuelve la navegación en el teléfono.
- `sw.js` e `index.html` no se guardan en la caché del navegador, para que el aviso de versión nueva
  aparezca apenas se publica; los archivos de `assets/` llevan su huella en el nombre y se guardan un año.

Cada rama obtiene su propia dirección https: la de `main` es la oficial y la de cada iteración sirve
para probar en el teléfono antes de fusionar. Las variables `VITE_SUPABASE_URL` y
`VITE_SUPABASE_PUBLISHABLE_KEY` se configuran en el panel de Vercel; la clave secreta de Supabase
nunca se usa en la aplicación.

**Por qué https.** El código de desbloqueo (`crypto.subtle`), el Service Worker y la cámara solo
funcionan en un contexto seguro (documento técnico 14, sección 12).

**Plan gratuito.** El plan Hobby es para uso personal y no comercial, lo que cubre el prototipo y su
evaluación. Si después la ganadería lo adoptara como herramienta permanente, corresponde el plan pago
de Vercel o mudarlo a otro alojamiento de archivos estáticos (por ejemplo, Cloudflare Pages).



## Autor

Daniel Santiago Ramos Pintor
