import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { fechaDelPredio, formatearFecha } from '../../dominio/fechas';
import { formatearKg } from '../../dominio/peso';
import {
  describirSalida,
  formularioSalidaVacio,
  NOMBRE_MOTIVO_SALIDA,
  sinPesajeReciente,
  validarSalida,
  type DatosSalida,
  type FormularioSalida,
} from '../../dominio/salida';
import { MOTIVOS_SALIDA } from '../../dominio/tipos';
import type { Identidad } from '../../sesion/token';
import { cargarParaSalida, registrarSalida, type ContextoSalida } from './salidas';

/**
 * Registrar la salida del animal del predio (CU-13, HU-11), solo el propietario. Especificación:
 * docs/tecnica/29-salida-y-venta.md, secciones 3 a 6. Ruta: /animales/:id/salida.
 */
export function PantallaRegistrarSalida({ identidad }: { identidad: Identidad }) {
  const { id = '' } = useParams();
  const contexto = useLiveQuery(async () => ({ c: await cargarParaSalida(id) }), [id]);
  if (!contexto) return <p className="texto-secundario">Cargando…</p>;
  const c = contexto.c;
  if (!c || c.retirado || c.salidaAnulada) {
    return (
      <div className="formulario">
        <p className="titulo-seccion">Registrar salida</p>
        <p>
          {!c
            ? 'Este animal no está en este teléfono.'
            : c.retirado
              ? 'Este animal ya tiene registrada su salida.'
              : 'La salida de este animal fue anulada y el servicio no admite otra: consulte al desarrollador si debe registrarse.'}
        </p>
        <Link className="boton boton--secundario boton--ancho" to={c ? `/animales/${id}` : '/animales'}>
          {c ? 'Volver a la ficha' : 'Volver al listado'}
        </Link>
      </div>
    );
  }
  return <Formulario contexto={c} identidad={identidad} />;
}

function Formulario({ contexto, identidad }: { contexto: ContextoSalida; identidad: Identidad }) {
  const navegar = useNavigate();
  const { animal } = contexto;
  const [hoy] = useState(() => fechaDelPredio());
  const [f, setF] = useState<FormularioSalida>(() => formularioSalidaVacio(hoy));
  const [intentado, setIntentado] = useState(false);
  const [revision, setRevision] = useState<DatosSalida | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState<string | null>(null);

  const validacion = validarSalida(f, hoy, contexto.llegada);
  const errores = intentado && !validacion.ok ? validacion.errores : {};
  const cambiar = (cambios: Partial<FormularioSalida>) => setF((actual) => ({ ...actual, ...cambios }));
  const avisoPesaje = f.motivo === 'venta' && sinPesajeReciente(contexto.ultimoPesaje, f.fecha || hoy, contexto.diasSinPesaje);
  const hembra = animal.sexo === 'hembra';

  function revisar(e: FormEvent) {
    e.preventDefault();
    setIntentado(true);
    if (validacion.ok) setRevision(validacion.datos);
  }

  async function confirmar() {
    setGuardando(true);
    setErrorRegistro(null);
    try {
      const r = await registrarSalida(animal.id, f, identidad, hoy);
      if (r.ok) void navegar(`/animales/${animal.id}`);
      else {
        setRevision(null);
        setErrorRegistro(r.errores.registro ?? 'Revise los datos señalados.');
      }
    } finally {
      setGuardando(false);
    }
  }

  if (revision) {
    // Sección 6 (CU-13, paso 6): el resumen antes de guardar.
    return (
      <div className="formulario">
        <p className="titulo-seccion">Confirmar la salida</p>
        <div className="tarjeta">
          <p>
            <strong className="registrado__chapeta">{animal.codigo_chapeta}</strong> sale del predio por{' '}
            <strong>{NOMBRE_MOTIVO_SALIDA[revision.motivo].toLowerCase()}</strong>.
          </p>
          <p>{describirSalida({ ...revision, observacion: revision.observacion ?? null }, hembra)}</p>
          <p className="texto-secundario">Dejará de figurar en el inventario activo; su historial seguirá disponible.</p>
        </div>
        <div className="acciones-formulario">
          <button type="button" className="boton boton--principal boton--ancho" disabled={guardando} onClick={() => void confirmar()}>
            {guardando ? 'Guardando…' : 'Confirmar la salida'}
          </button>
          <button type="button" className="boton boton--secundario boton--ancho" onClick={() => setRevision(null)}>
            Volver
          </button>
        </div>
      </div>
    );
  }

  const peso = contexto.ultimoPeso;
  return (
    <form className="formulario" onSubmit={revisar} noValidate>
      <Link className="enlace" to={`/animales/${animal.id}`}>
        ← Volver a la ficha
      </Link>
      <p className="titulo-seccion">Registrar salida</p>
      <p className="evento__animal">
        Animal <strong className="registrado__chapeta">{animal.codigo_chapeta}</strong> · {hembra ? 'Hembra' : 'Macho'}
      </p>

      {/* Sección 5 (CU-13, paso 2): el último peso como referencia; el de venta no se precarga. */}
      <p className="texto-secundario">
        {peso
          ? `Último peso: ${formatearKg(peso.kg)} kg${peso.tipo === 'pesaje' ? '' : ` · ${peso.tipo}`}${peso.fecha ? ` · ${formatearFecha(peso.fecha)}` : ''}`
          : 'Sin peso registrado'}
      </p>

      {errorRegistro && (
        <p className="campo__error" role="alert">
          {errorRegistro}
        </p>
      )}

      <div className="campo">
        <fieldset className="opciones opciones--tres">
          <legend>Motivo de la salida</legend>
          {MOTIVOS_SALIDA.map((m) => (
            <button key={m} type="button" className="opcion" aria-pressed={f.motivo === m} onClick={() => cambiar({ motivo: m })}>
              {NOMBRE_MOTIVO_SALIDA[m]}
            </button>
          ))}
        </fieldset>
        {errores.motivo && <span className="campo__error">{errores.motivo}</span>}
      </div>

      <label className="campo">
        <span>Fecha de salida</span>
        <input type="date" max={hoy} min={contexto.llegada ?? undefined} value={f.fecha} aria-invalid={!!errores.fecha} onChange={(e) => cambiar({ fecha: e.target.value })} />
        {errores.fecha && <span className="campo__error">{errores.fecha}</span>}
      </label>

      {f.motivo === 'venta' && (
        <>
          {avisoPesaje && (
            // CU-13, 2a: se advierte y se sugiere pesar antes; no bloquea.
            <div className="aviso aviso--atencion aviso--en-contenido" role="status">
              <p>
                ⚠ {contexto.ultimoPesaje ? `No tiene un pesaje en los últimos ${contexto.diasSinPesaje} días` : 'Nunca se ha pesado'}. Conviene pesarlo antes de
                venderlo.
              </p>
              <div className="aviso__acciones">
                <Link className="boton boton--secundario" to={`/animales/${animal.id}/pesaje`}>
                  Registrar pesaje
                </Link>
              </div>
            </div>
          )}
          <label className="campo">
            <span>Peso de venta en kg</span>
            <input type="text" inputMode="decimal" value={f.peso} aria-invalid={!!errores.peso} onChange={(e) => cambiar({ peso: e.target.value })} />
            {errores.peso && <span className="campo__error">{errores.peso}</span>}
          </label>
          <label className="campo">
            <span>Valor recibido, en pesos</span>
            <input type="text" inputMode="numeric" value={f.valor} aria-invalid={!!errores.valor} onChange={(e) => cambiar({ valor: e.target.value })} />
            {errores.valor && <span className="campo__error">{errores.valor}</span>}
          </label>
          <label className="campo">
            <span>
              Comprador <span className="campo__ayuda">(opcional)</span>
            </span>
            <input type="text" value={f.comprador} aria-invalid={!!errores.comprador} onChange={(e) => cambiar({ comprador: e.target.value })} />
            {errores.comprador && <span className="campo__error">{errores.comprador}</span>}
          </label>
        </>
      )}

      {f.motivo === 'muerte' && (
        <label className="campo">
          <span>Causa de la muerte</span>
          <textarea rows={2} value={f.causa} aria-invalid={!!errores.causa} onChange={(e) => cambiar({ causa: e.target.value })} />
          {errores.causa && <span className="campo__error">{errores.causa}</span>}
        </label>
      )}

      {f.motivo === 'perdida_robo' && (
        <label className="campo">
          <span>
            Observación <span className="campo__ayuda">(opcional)</span>
          </span>
          <textarea rows={2} value={f.observacion} aria-invalid={!!errores.observacion} onChange={(e) => cambiar({ observacion: e.target.value })} />
          {errores.observacion && <span className="campo__error">{errores.observacion}</span>}
        </label>
      )}

      {intentado && !validacion.ok && (
        <p className="campo__error" role="alert">
          Revise los datos señalados.
        </p>
      )}

      <div className="acciones-formulario">
        <button className="boton boton--principal boton--ancho" type="submit">
          Revisar
        </button>
        <Link className="boton boton--secundario boton--ancho" to={`/animales/${animal.id}`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
