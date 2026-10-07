import { useEffect, useState } from 'react';
import { asegurarPersistencia, consultarEspacio, type Espacio, type EstadoPersistencia } from '../datos/almacenamiento';

export interface EstadoAlmacenamiento {
  /** null mientras se consulta al navegador. */
  persistencia: EstadoPersistencia | null;
  espacio: Espacio | null;
}

/**
 * Hook de React (por convención su nombre empieza por «use»). Al montar la aplicación solicita el almacenamiento persistente y consulta el espacio
 * (sección 4.1 de docs/tecnica/04-almacenamiento-persistente.md).
 */
export function useAlmacenamiento(): EstadoAlmacenamiento {
  const [estado, setEstado] = useState<EstadoAlmacenamiento>({ persistencia: null, espacio: null });

  useEffect(() => {
    let vigente = true;
    void (async () => {
      const persistencia = await asegurarPersistencia();
      const espacio = await consultarEspacio();
      if (vigente) setEstado({ persistencia, espacio });
    })();
    return () => {
      vigente = false;
    };
  }, []);

  return estado;
}
