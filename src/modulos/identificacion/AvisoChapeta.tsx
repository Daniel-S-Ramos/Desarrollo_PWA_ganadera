import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { fechaDelPredio, formatearFecha, formatearInstante } from '../../dominio/fechas';
import type { Uuid } from '../../dominio/tipos';
import type { Identidad } from '../../sesion/token';
import { ResolverConflictoColocacion } from '../correcciones/ResolverConflicto';
import { confirmarChapetaPuesta, describirPlazo, errorDeFechaColocacion, estadoDeChapeta } from './chapetaPendiente';

/**
 * La chapeta en la ficha: pendiente, con el botón para confirmarla, o puesta, con su autor (documento
 * técnico 25, sección 7.2). Ambos perfiles.
 */
export function AvisoChapeta({ animalId, numero, nacimiento, identidad }: { animalId: Uuid; numero: string; nacimiento: string | null; identidad: Identidad }) {
  const [hoy] = useState(() => fechaDelPredio());
  const estado = useLiveQuery(() => estadoDeChapeta(animalId, hoy), [animalId, hoy]);
  const [confirmando, setConfirmando] = useState(false);
  const [fecha, setFecha] = useState(hoy);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (!estado || estado.estado === 'no_aplica') return null;
  if (estado.estado === 'puesta') {
    return (
      <>
        <p className="texto-secundario">
          Chapeta puesta el {formatearFecha(estado.colocacion.fecha)} por {estado.autor} · registrado el {formatearInstante(estado.colocacion.creado_en)}
        </p>
        {estado.repetida && (
          <div className="aviso aviso--atencion aviso--en-contenido" role="status">
            <p>
              {estado.repetida.id === estado.colocacion.id
                ? 'Otro teléfono ya registró que este animal tiene la chapeta puesta; su fecha llegará en la próxima sincronización.'
                : `Este teléfono también registró la chapeta puesta, el ${formatearFecha(estado.repetida.fecha)}, pero el servicio ya tenía la de arriba.`}
            </p>
            <ResolverConflictoColocacion colocacion={estado.repetida} identidad={identidad} />
          </div>
        )}
      </>
    );
  }

  async function guardar() {
    const invalida = errorDeFechaColocacion(fecha, nacimiento, hoy);
    if (invalida) return setError(invalida);
    setGuardando(true);
    try {
      const r = await confirmarChapetaPuesta(animalId, fecha, identidad, hoy);
      if (!r.ok) setError(r.error);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="aviso aviso--atencion aviso--en-contenido" role="status">
      <p>
        ⚠ Chapeta pendiente de poner · número {numero}
      </p>
      <p className="aviso__detalle">{describirPlazo(estado)}</p>
      {confirmando ? (
        // No es un <form>: la ficha no lo es, pero así puede usarse dentro de otro sin recargar (PE-25).
        <div className="formulario" role="group" aria-label="Confirmar la chapeta puesta">
          <label className="campo">
            <span>¿Qué día se le puso?</span>
            <input
              type="date"
              max={hoy}
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
                setError(null);
              }}
            />
            {error && <span className="campo__error">{error}</span>}
          </label>
          <div className="aviso__acciones">
            <button type="button" className="boton boton--principal" disabled={guardando} onClick={() => void guardar()}>
              {guardando ? 'Guardando…' : 'Confirmar'}
            </button>
            <button type="button" className="boton boton--secundario" onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="boton boton--principal boton--ancho" onClick={() => setConfirmando(true)}>
          Ya tiene la chapeta puesta
        </button>
      )}
    </div>
  );
}
