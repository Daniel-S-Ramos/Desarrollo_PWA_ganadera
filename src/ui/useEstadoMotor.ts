import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { cargaInicialCompleta } from '../sync/cargaInicial';
import { leerEstadoMotor, suscribirseAlMotor, type EstadoMotor } from '../sync/motor';

/** Estado del motor de sincronización, actualizado cada vez que una sincronización empieza, avanza o termina. */
export function useEstadoMotor(): EstadoMotor {
  const [estado, setEstado] = useState(leerEstadoMotor);
  useEffect(() => suscribirseAlMotor(setEstado), []);
  return estado;
}

/** ¿Hay conexión? Según el navegador, actualizado con los eventos online y offline. */
export function useEnLinea(): boolean {
  const [enLinea, setEnLinea] = useState(() => navigator.onLine);
  useEffect(() => {
    const actualizar = () => setEnLinea(navigator.onLine);
    window.addEventListener('online', actualizar);
    window.addEventListener('offline', actualizar);
    return () => {
      window.removeEventListener('online', actualizar);
      window.removeEventListener('offline', actualizar);
    };
  }, []);
  return enLinea;
}

/** ¿Ya llegó la información del predio? undefined mientras se consulta (documento técnico 17, sección 3). */
export function useCargaInicialCompleta(): boolean | undefined {
  return useLiveQuery(() => cargaInicialCompleta(), []);
}
