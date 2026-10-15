import { useState, type FormEvent } from 'react';
import { NOMBRE_DESTINO, validarCambioDestino, type ContextoDestino, type ErroresDestino } from '../../dominio/destino';
import { formatearFecha } from '../../dominio/fechas';
import { DESTINOS, type Destino, type FechaPredio, type Uuid } from '../../dominio/tipos';
import type { Identidad } from '../../sesion/token';
import { asignarDestino } from './destino';

/** Los seis destinos como botones grandes (3.10.1), en dos columnas: «Producción de leche» es largo. */
export function BotonesDestino({ valor, alElegir, error }: { valor: Destino | null; alElegir: (destino: Destino) => void; error?: string | undefined }) {
  return (
    <div className="campo">
      <div className="opciones opciones--dos" role="group" aria-label="Destino productivo">
        {DESTINOS.map((destino) => (
          <button key={destino} type="button" className="opcion" aria-pressed={valor === destino} onClick={() => alElegir(destino)}>
            {NOMBRE_DESTINO[destino]}
          </button>
        ))}
      </div>
      {error && <span className="campo__error">{error}</span>}
    </div>
  );
}

/**
 * Cambiar el destino desde la ficha (CU-12). Especificación: docs/tecnica/19-destino-productivo.md, sección 4.
 * Solo se monta para el propietario.
 */
export function CambiarDestino({
  animalId,
  contexto,
  identidad,
  hoy,
  alTerminar,
}: {
  animalId: Uuid;
  contexto: ContextoDestino;
  identidad: Identidad;
  hoy: FechaPredio;
  alTerminar: () => void;
}) {
  const [destino, setDestino] = useState<Destino | null>(null);
  const [desde, setDesde] = useState<FechaPredio>(hoy);
  const [intentado, setIntentado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [erroresDeGuardado, setErroresDeGuardado] = useState<ErroresDestino>({});

  const validacion = validarCambioDestino({ destino, desde }, contexto, hoy);
  const errores: ErroresDestino = { ...(validacion.ok ? {} : validacion.errores), ...erroresDeGuardado };
  const { vigente } = contexto;

  async function guardar() {
    setGuardando(true);
    try {
      const resultado = await asignarDestino(animalId, { destino, desde }, identidad, hoy);
      if (resultado.ok) alTerminar();
      else {
        setErroresDeGuardado(resultado.errores);
        setConfirmando(false);
      }
    } finally {
      setGuardando(false);
    }
  }

  function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    setIntentado(true);
    if (!validacion.ok) return;
    // CU-12: el primer destino se registra sin confirmación (3a); un cambio la pide (paso 4).
    if (vigente) setConfirmando(true);
    else void guardar();
  }

  function cambiar(cambios: { destino?: Destino; desde?: FechaPredio }) {
    if (cambios.destino !== undefined) setDestino(cambios.destino);
    if (cambios.desde !== undefined) setDesde(cambios.desde);
    setErroresDeGuardado({});
    setConfirmando(false);
  }

  return (
    <form className="tarjeta formulario destino" onSubmit={alEnviar} noValidate>
      <h2>Cambiar destino</h2>
      <p>
        Destino actual:{' '}
        <strong>{vigente ? `${NOMBRE_DESTINO[vigente.destino]}, desde el ${formatearFecha(vigente.desde)}` : 'Sin destino asignado'}</strong>
      </p>
      {errores.animal && (
        <p className="campo__error" role="alert">
          {errores.animal}
        </p>
      )}

      <BotonesDestino valor={destino} alElegir={(d) => cambiar({ destino: d })} error={intentado || destino ? errores.destino : undefined} />

      <label className="campo">
        <span>Desde</span>
        <input type="date" max={hoy} value={desde} aria-invalid={!!errores.desde} onChange={(e) => cambiar({ desde: e.target.value })} />
        {errores.desde && <span className="campo__error">{errores.desde}</span>}
      </label>

      {confirmando && vigente && destino ? (
        <div className="aviso aviso--atencion aviso--en-contenido" role="alertdialog" aria-label="Confirmar el cambio de destino">
          <p>
            El destino <strong>{NOMBRE_DESTINO[vigente.destino]}</strong> (desde el {formatearFecha(vigente.desde)}) será reemplazado por{' '}
            <strong>{NOMBRE_DESTINO[destino]}</strong>.
          </p>
          <div className="aviso__acciones aviso__acciones--columna">
            <button type="button" className="boton boton--principal" disabled={guardando} onClick={() => void guardar()}>
              {guardando ? 'Guardando…' : 'Confirmar'}
            </button>
            {/* CU-12, 5a: cancelar no cambia nada. */}
            <button type="button" className="boton boton--secundario" onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="acciones-formulario">
          <button className="boton boton--principal boton--ancho" type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
          <button className="boton boton--secundario boton--ancho" type="button" onClick={alTerminar}>
            Cancelar
          </button>
        </div>
      )}
    </form>
  );
}
