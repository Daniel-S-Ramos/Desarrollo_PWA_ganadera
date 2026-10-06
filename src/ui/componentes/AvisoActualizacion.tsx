import { useRegisterSW } from 'virtual:pwa-register/react';

/** Cada cuánto se pregunta al servidor si hay una versión nueva, mientras haya red. */
const INTERVALO_REVISION_MS = 60 * 60 * 1000;

/**
 * Registra el Service Worker y avisa al usuario en dos momentos:
 *
 * - La primera vez que la aplicación queda guardada en el dispositivo y ya puede abrirse sin red.
 * - Cuando hay una versión nueva. La actualización nunca se aplica sola: el usuario decide cuándo,
 *   de modo que la aplicación no se recargue en medio de un registro (Tabla 19, Workbox).
 */
export function AvisoActualizacion() {
  const {
    offlineReady: [listaSinConexion, setListaSinConexion],
    needRefresh: [hayVersionNueva, setHayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      if (!registro) return;
      setInterval(() => {
        if (navigator.onLine) void registro.update();
      }, INTERVALO_REVISION_MS);
    },
  });

  if (hayVersionNueva) {
    return (
      <div className="aviso aviso--atencion" role="alert">
        <p>Hay una versión nueva de la aplicación.</p>
        <div className="aviso__acciones">
          <button className="boton boton--principal" onClick={() => void updateServiceWorker(true)}>
            Actualizar ahora
          </button>
          <button className="boton boton--secundario" onClick={() => setHayVersionNueva(false)}>
            Más tarde
          </button>
        </div>
      </div>
    );
  }

  if (listaSinConexion) {
    return (
      <div className="aviso aviso--correcto" role="status">
        <p>✓ La aplicación quedó guardada en este dispositivo y ya funciona sin conexión.</p>
        <div className="aviso__acciones">
          <button className="boton boton--secundario" onClick={() => setListaSinConexion(false)}>
            Entendido
          </button>
        </div>
      </div>
    );
  }

  return null;
}
