import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { formatearBytes, type Espacio } from '../../datos/almacenamiento';
import { contarImagenesPendientes, contarPendientes } from '../../datos/repositorio';
import { contarConflictos } from '../../datos/sincronizacionLocal';
import { leerEstadoMotor, suscribirseAlMotor, type EstadoMotor } from '../../sync/motor';
import { describirBarra } from '../estadoSincronizacion';

/**
 * Barra inferior, siempre visible: contador de pendientes, estado de la sincronización, conflictos y
 * espacio ocupado (docs/tecnica/11-indicador-de-sincronizacion.md, sección 3).
 */
export function BarraEstado({ espacio, conSesion }: { espacio: Espacio | null; conSesion: boolean }) {
  // La pantalla observa la base de datos local: el contador cambia solo al guardar o al confirmar.
  const pendientes = useLiveQuery(() => contarPendientes(), [], 0);
  const conflictos = useLiveQuery(() => contarConflictos(), [], 0);
  const imagenes = useLiveQuery(() => contarImagenesPendientes(), [], 0);
  const motor = useEstadoMotor();
  const enLinea = useEnLinea();
  const ahora = useReloj(30_000);

  const lineas = conSesion
    ? describirBarra({ pendientes, imagenes, conflictos, enLinea, sincronizando: motor.sincronizando, ultima: motor.ultima, ultimaEn: motor.ultimaEn, ahora })
    : [];

  return (
    <footer className="barra-inferior" aria-live="polite">
      {lineas.map((linea) => (
        <div key={linea.texto} className={`barra-inferior__linea barra-inferior__linea--${linea.tono}`}>
          <span aria-hidden="true">{linea.icono} </span>
          {linea.texto}
          {linea.detalle && <span className="barra-inferior__detalle">{linea.detalle}</span>}
        </div>
      ))}
      {espacio && (
        <span className="barra-inferior__detalle">
          Espacio usado (estimado): {formatearBytes(espacio.usado)} de {formatearBytes(espacio.cuota)}
        </span>
      )}
    </footer>
  );
}

function useEstadoMotor(): EstadoMotor {
  const [estado, setEstado] = useState(leerEstadoMotor);
  useEffect(() => suscribirseAlMotor(setEstado), []);
  return estado;
}

function useEnLinea(): boolean {
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

/** Hora actual, renovada periódicamente para que «hace 5 min» se mantenga al día. */
function useReloj(cadaMs: number): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), cadaMs);
    return () => clearInterval(intervalo);
  }, [cadaMs]);
  return ahora;
}
