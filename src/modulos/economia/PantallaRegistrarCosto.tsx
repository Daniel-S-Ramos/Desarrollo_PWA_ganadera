import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { NOMBRE_CONCEPTO, validarCosto, type FormularioCosto } from '../../dominio/economia';
import { fechaDelPredio } from '../../dominio/fechas';
import { CONCEPTOS_MOVIMIENTO, type ConceptoMovimiento } from '../../dominio/tipos';
import type { Identidad } from '../../sesion/token';
import { cargarParaCosto, registrarCosto, type ContextoCosto } from './costos';

/**
 * Registrar un costo del animal (RF-20, HU-16.1), solo el propietario. Especificación:
 * docs/tecnica/31-consolidado-economico.md, sección 3. Ruta: /animales/:id/costo.
 */
export function PantallaRegistrarCosto({ identidad }: { identidad: Identidad }) {
  const { id = '' } = useParams();
  const contexto = useLiveQuery(async () => ({ c: await cargarParaCosto(id) }), [id]);
  if (!contexto) return <p className="texto-secundario">Cargando…</p>;
  if (!contexto.c) {
    return (
      <div className="formulario">
        <p className="titulo-seccion">Registrar costo</p>
        <p>Este animal no está en este teléfono.</p>
        <Link className="boton boton--secundario boton--ancho" to="/animales">
          Volver al listado
        </Link>
      </div>
    );
  }
  return <Formulario contexto={contexto.c} identidad={identidad} />;
}

function Formulario({ contexto, identidad }: { contexto: ContextoCosto; identidad: Identidad }) {
  const navegar = useNavigate();
  const { animal } = contexto;
  const [hoy] = useState(() => fechaDelPredio());
  const [f, setF] = useState<FormularioCosto>({ concepto: null, fecha: hoy, valor: '', descripcion: '' });
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState<string | null>(null);
  const limites = { ...contexto, hoy };
  const validacion = validarCosto(f, limites);
  const errores = intentado && !validacion.ok ? validacion.errores : {};
  const conceptos = CONCEPTOS_MOVIMIENTO.filter((c) => c !== 'compra' || contexto.admiteCompra);

  // Al elegir la compra, la fecha llega con la de ingreso (sección 3).
  const elegir = (concepto: ConceptoMovimiento) =>
    setF((actual) => ({ ...actual, concepto, fecha: concepto === 'compra' && animal.fecha_ingreso ? animal.fecha_ingreso : actual.concepto === 'compra' ? hoy : actual.fecha }));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setIntentado(true);
    if (!validacion.ok) return;
    setGuardando(true);
    setErrorRegistro(null);
    try {
      const r = await registrarCosto(animal.id, f, identidad, hoy);
      if (r.ok) void navegar(`/animales/${animal.id}/consolidado`);
      else setErrorRegistro(r.errores.registro ?? 'Revise los datos señalados.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={guardar} noValidate>
      <Link className="enlace" to={`/animales/${animal.id}`}>
        ← Volver a la ficha
      </Link>
      <p className="titulo-seccion">Registrar costo</p>
      <p className="evento__animal">
        Animal <strong className="registrado__chapeta">{animal.codigo_chapeta}</strong> · {animal.sexo === 'hembra' ? 'Hembra' : 'Macho'}
      </p>
      {errorRegistro && (
        <p className="campo__error" role="alert">
          {errorRegistro}
        </p>
      )}

      <div className="campo">
        <fieldset className={conceptos.length === 3 ? 'opciones opciones--tres' : 'opciones'}>
          <legend>Concepto</legend>
          {conceptos.map((c) => (
            <button key={c} type="button" className="opcion" aria-pressed={f.concepto === c} onClick={() => elegir(c)}>
              {NOMBRE_CONCEPTO[c]}
            </button>
          ))}
        </fieldset>
        {errores.concepto && <span className="campo__error">{errores.concepto}</span>}
        {/* 3.8.12: el medicamento se anota en el evento sanitario, no aquí. */}
        <span className="campo__ayuda">El costo de los medicamentos se anota en el evento sanitario que los aplica.</span>
      </div>

      <label className="campo">
        <span>Fecha</span>
        <input
          type="date"
          max={contexto.salida && contexto.salida < hoy ? contexto.salida : hoy}
          min={contexto.llegada ?? undefined}
          value={f.fecha}
          aria-invalid={!!errores.fecha}
          onChange={(e) => setF((a) => ({ ...a, fecha: e.target.value }))}
        />
        {errores.fecha && <span className="campo__error">{errores.fecha}</span>}
      </label>

      <label className="campo">
        <span>Valor, en pesos</span>
        <input type="text" inputMode="numeric" value={f.valor} aria-invalid={!!errores.valor} onChange={(e) => setF((a) => ({ ...a, valor: e.target.value }))} />
        {errores.valor && <span className="campo__error">{errores.valor}</span>}
      </label>

      <label className="campo">
        <span>
          Descripción <span className="campo__ayuda">(opcional)</span>
        </span>
        <textarea rows={2} value={f.descripcion} aria-invalid={!!errores.descripcion} onChange={(e) => setF((a) => ({ ...a, descripcion: e.target.value }))} />
        {errores.descripcion && <span className="campo__error">{errores.descripcion}</span>}
      </label>

      {intentado && !validacion.ok && (
        <p className="campo__error" role="alert">
          Revise los datos señalados.
        </p>
      )}

      <div className="acciones-formulario">
        <button className="boton boton--principal boton--ancho" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar costo'}
        </button>
        <Link className="boton boton--secundario boton--ancho" to={`/animales/${animal.id}`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
