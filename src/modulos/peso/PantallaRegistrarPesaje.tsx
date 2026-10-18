import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { consulta } from '../../datos/repositorio';
import { fechaDelPredio } from '../../dominio/fechas';
import { compararConAnterior, describirComparacion, formatearKg, leerPeso, NOMBRE_METODO, validarPesaje, type FormularioPesaje } from '../../dominio/peso';
import { METODOS_PESAJE, type RegistroLocal } from '../../dominio/tipos';
import type { Identidad } from '../../sesion/token';
import { cargarParaPesaje, metaDeGanancia, registrarPesaje } from './pesajes';

/**
 * Registrar un pesaje (CU-08, HU-05). Especificación: docs/tecnica/24-pesaje-y-evolucion.md, secciones 2 a 6.
 * Ruta: /animales/:id/pesaje. Cancelar descarta el registro (CU-08, 4a).
 */
export function PantallaRegistrarPesaje({ identidad }: { identidad: Identidad }) {
  const { id = '' } = useParams();
  const animal = useLiveQuery(async () => ({ animal: await consulta.animal.get(id) }), [id]);
  if (!animal) return <p className="texto-secundario">Cargando…</p>;
  if (!animal.animal) {
    return (
      <div className="formulario">
        <p className="titulo-seccion">Registrar pesaje</p>
        <p>Este animal no está en este teléfono.</p>
        <Link className="boton boton--secundario boton--ancho" to="/animales">
          Volver al listado
        </Link>
      </div>
    );
  }
  return <Formulario animal={animal.animal} identidad={identidad} />;
}

function Formulario({ animal, identidad }: { animal: RegistroLocal<'animal'>; identidad: Identidad }) {
  const navegar = useNavigate();
  const [hoy] = useState(() => fechaDelPredio());
  const [formulario, setFormulario] = useState<FormularioPesaje>({ peso: '', metodo: null, fecha: hoy });
  const [confirmado, setConfirmado] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [faltaConfirmar, setFaltaConfirmar] = useState(false);
  const datos = useLiveQuery(() => cargarParaPesaje(animal.id, formulario.fecha), [animal.id, formulario.fecha]);
  const meta = useLiveQuery(() => metaDeGanancia(), [], null);

  const cambiar = (cambios: Partial<FormularioPesaje>) => {
    setFormulario((f) => ({ ...f, ...cambios }));
    // La confirmación era de otro peso u otra fecha (sección 6).
    if ('peso' in cambios || 'fecha' in cambios) {
      setConfirmado(false);
      setFaltaConfirmar(false);
    }
  };

  const validacion = datos ? validarPesaje(formulario, datos.contexto, hoy) : null;
  const errores = intentado && validacion && !validacion.ok ? validacion.errores : {};
  const peso = leerPeso(formulario.peso);
  const comparacion = peso !== null && datos ? compararConAnterior(peso, formulario.fecha, datos.anterior) : null;
  const atipica = comparacion?.atipica === true;
  const bajoMeta = meta !== null && comparacion?.gananciaDiaria != null && comparacion.gananciaDiaria < meta;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setIntentado(true);
    if (!validacion?.ok || (atipica && !confirmado)) return;
    setGuardando(true);
    try {
      const r = await registrarPesaje(animal.id, formulario, identidad, confirmado, hoy);
      if (r.ok) void navegar(`/animales/${animal.id}?peso=1`);
      else if ('requiereConfirmacion' in r) {
        setConfirmado(false);
        setFaltaConfirmar(true);
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={guardar} noValidate>
      <Link className="enlace" to={`/animales/${animal.id}`}>
        ← Volver a la ficha
      </Link>
      <p className="titulo-seccion">Registrar pesaje</p>
      <p className="evento__animal">
        Animal <strong className="registrado__chapeta">{animal.codigo_chapeta}</strong> · {animal.sexo === 'hembra' ? 'Hembra' : 'Macho'}
      </p>
      {errores.animal && (
        <p className="campo__error" role="alert">
          {errores.animal}
        </p>
      )}

      <label className="campo">
        <span>Peso en kg</span>
        <input
          className="campo__litros"
          type="text"
          inputMode="decimal"
          autoFocus
          value={formulario.peso}
          aria-invalid={!!errores.peso}
          onChange={(e) => cambiar({ peso: e.target.value })}
        />
        {errores.peso && <span className="campo__error">{errores.peso}</span>}
      </label>

      {/* Sección 6: diferencia y ganancia diaria al escribir (Figura 25). */}
      {datos?.anterior && comparacion && !atipica && (
        <p className={bajoMeta ? 'aviso aviso--atencion aviso--en-contenido' : 'texto-secundario'} role="status">
          {describirComparacion(comparacion, datos.anterior)}
          {bajoMeta && `. Por debajo de la meta de ${formatearKg(meta!)} kg por día`}
        </p>
      )}
      {datos?.anterior && comparacion && atipica && (
        // CU-08, 3a: variación significativa con confirmación.
        <div className="aviso aviso--atencion aviso--en-contenido" role="alert">
          <p>⚠ {describirComparacion(comparacion, datos.anterior)}. ¿Es correcto?</p>
          <label className="casilla">
            <input
              type="checkbox"
              checked={confirmado}
              onChange={(e) => {
                setConfirmado(e.target.checked);
                setFaltaConfirmar(false);
              }}
            />
            Confirmo que el peso es correcto
          </label>
        </div>
      )}
      {datos?.anterior && !comparacion && peso !== null && (
        <p className="texto-secundario">
          {datos.anterior.etiqueta}: {formatearKg(datos.anterior.kg)} kg, sin fecha para comparar.
        </p>
      )}
      {faltaConfirmar && (
        <p className="campo__error" role="alert">
          Mientras escribía cambió el peso anterior. Revise la diferencia y confirme para guardar.
        </p>
      )}

      <div className="campo">
        <fieldset className="opciones">
          <legend>¿Cómo se pesó?</legend>
          {METODOS_PESAJE.map((m) => (
            <button key={m} type="button" className="opcion" aria-pressed={formulario.metodo === m} onClick={() => cambiar({ metodo: m })}>
              {NOMBRE_METODO[m]}
            </button>
          ))}
        </fieldset>
        {errores.metodo && <span className="campo__error">{errores.metodo}</span>}
      </div>

      <label className="campo">
        <span>Fecha del pesaje</span>
        <input type="date" max={hoy} value={formulario.fecha} aria-invalid={!!errores.fecha} onChange={(e) => cambiar({ fecha: e.target.value })} />
        {errores.fecha && <span className="campo__error">{errores.fecha}</span>}
      </label>

      {/* Sección 5: otro pesaje en la misma fecha se informa sin bloquear. */}
      {datos && datos.mismoDia.length > 0 && (
        <p className="texto-secundario">
          Ya tiene un pesaje de esta fecha: {formatearKg(datos.mismoDia[0]!.peso)} kg ({NOMBRE_METODO[datos.mismoDia[0]!.metodo].toLowerCase()}).
        </p>
      )}

      {intentado && validacion && !validacion.ok && (
        <p className="campo__error" role="alert">
          Revise los datos señalados.
        </p>
      )}

      <div className="acciones-formulario">
        <button className="boton boton--principal boton--ancho" type="submit" disabled={guardando || (atipica && !confirmado)}>
          {guardando ? 'Guardando…' : 'Guardar pesaje'}
        </button>
        <Link className="boton boton--secundario boton--ancho" to={`/animales/${animal.id}`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
