import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { animalesVigentes, vigentes } from '../../datos/vigentes';
import { consulta } from '../../datos/repositorio';
import { CAMPOS_CORREGIBLES, seAnula, type CampoCorregible } from '../../dominio/camposCorregibles';
import { NOMBRE_DESTINO } from '../../dominio/destino';
import { fechaDelPredio, formatearFecha, formatearInstante } from '../../dominio/fechas';
import { MOTIVOS_CORRECCION, type Destino, type MotivoCorreccion, type MotivoSalida, type RegistroLocal } from '../../dominio/tipos';
import type { Identidad } from '../../sesion/token';
import {
  camposPara,
  cargarVigente,
  contextoDeValor,
  esEntidadConCorreccion,
  LARGO_NOTA,
  NOMBRE_MOTIVO,
  opcionDeCorreccion,
  registrarCorreccion,
  validarCorreccion,
  type EntidadConCorreccion,
  type ErroresCorreccion,
  type FormularioCorreccion,
} from './correcciones';
import { NOMBRE_MOTIVO_SALIDA } from '../../dominio/salida';
import { MarcaCorreccion, mostrarValor, useNombresDeReferencia, useUsuarios } from './MarcaCorreccion';

const NOMBRE_ENTIDAD: Record<EntidadConCorreccion, string> = {
  evento_sanitario: 'Evento sanitario',
  produccion_leche: 'Ordeño',
  pesaje: 'Pesaje',
  parto: 'Parto',
  destino_productivo: 'Destino productivo',
  animal: 'Datos del animal',
  medicamento: 'Medicamento',
  salida: 'Salida del predio',
};

/** Un resumen del registro para reconocerlo (sección 5). */
function resumen(entidad: EntidadConCorreccion, registro: Record<string, unknown>, nombres: ReturnType<typeof useNombresDeReferencia>): string {
  const animal = typeof registro['animal_id'] === 'string' ? nombres.animales.get(registro['animal_id']) : typeof registro['madre_id'] === 'string' && entidad === 'parto' ? nombres.animales.get(registro['madre_id']) : undefined;
  const fecha = typeof registro['fecha'] === 'string' ? formatearFecha(registro['fecha']) : typeof registro['desde'] === 'string' ? `desde el ${formatearFecha(registro['desde'])}` : '';
  switch (entidad) {
    case 'evento_sanitario':
      return `${animal} · ${nombres.medicamentos.get(String(registro['medicamento_id'])) ?? ''} · ${fecha}`;
    case 'produccion_leche':
      return `${animal} · ${registro['litros']} litros · ${fecha}`;
    case 'pesaje':
      return `${animal} · ${registro['peso']} kg · ${fecha}`;
    case 'parto':
      return `Vaca ${animal} · ${fecha}`;
    case 'destino_productivo':
      return `${animal} · ${NOMBRE_DESTINO[registro['destino'] as Destino] ?? ''} ${fecha}`;
    case 'animal':
      return `Animal ${registro['codigo_chapeta']}`;
    case 'medicamento':
      return String(registro['nombre']);
    case 'salida':
      return `${animal} · ${NOMBRE_MOTIVO_SALIDA[registro['motivo'] as MotivoSalida] ?? ''} · ${fecha}`;
  }
}

/**
 * Corregir o anular un registro (CU-17, HU-17). Especificación: docs/tecnica/26-correccion-y-anulacion.md,
 * secciones 2 a 5 y 7. Ruta: /correccion/:entidad/:id.
 */
export function PantallaCorregir({ identidad }: { identidad: Identidad }) {
  const { entidad = '', id = '' } = useParams();
  if (!esEntidadConCorreccion(entidad)) return <p>Este tipo de registro no se corrige.</p>;
  return <Corregir entidad={entidad} id={id} identidad={identidad} />;
}

function Corregir({ entidad, id, identidad }: { entidad: EntidadConCorreccion; id: string; identidad: Identidad }) {
  const navegar = useNavigate();
  const [hoy] = useState(() => fechaDelPredio());
  const vigente = useLiveQuery(async () => ({ v: await cargarVigente(entidad, id) }), [entidad, id]);
  const contexto = useLiveQuery(async () => (vigente?.v ? contextoDeValor(entidad, vigente.v.registro, hoy) : null), [vigente, hoy]);
  const opciones = useLiveQuery(
    async () => ({
      animales: await animalesVigentes(),
      medicamentos: entidad === 'evento_sanitario' ? await vigentes('medicamento', await consulta.medicamento.toArray()) : ([] as RegistroLocal<'medicamento'>[]),
    }),
    [entidad],
  );
  const usuarios = useUsuarios();
  const nombres = useNombresDeReferencia();
  const [f, setF] = useState<FormularioCorreccion>({ operacion: seAnula(entidad) && entidad === 'destino_productivo' ? 'anular' : 'corregir', campo: '', valor: '', motivo: null, nota: '' });
  const [intentado, setIntentado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [erroresDeGuardado, setErroresDeGuardado] = useState<ErroresCorreccion>({});

  if (!vigente || !contexto || !opciones) return <p className="texto-secundario">Cargando…</p>;
  if (!vigente.v) return <p>Este registro no está en este teléfono.</p>;
  const v = vigente.v;
  const volver = () => navegar(-1);
  const opcion = opcionDeCorreccion(identidad, v.original, usuarios.get(v.original.autor_id)?.perfil);

  const encabezado = (
    <>
      <button type="button" className="enlace" onClick={volver}>
        ← Volver
      </button>
      <p className="titulo-seccion">Corregir o anular</p>
      <section className="tarjeta">
        <h2>{NOMBRE_ENTIDAD[entidad]}</h2>
        <p>{resumen(entidad, v.registro as unknown as Record<string, unknown>, nombres)}</p>
        <p className="texto-secundario">
          Registrado por {usuarios.get(v.original.autor_id)?.nombre ?? 'un usuario que ya no está en el predio'} el {formatearInstante(v.original.creado_en)}
        </p>
        <MarcaCorreccion entidad={entidad} vigente={v} />
      </section>
    </>
  );

  // CU-17, 2a y 2b: sin permiso, no hay formulario.
  if (opcion !== 'mostrar') {
    return (
      <div className="formulario">
        {encabezado}
        <p className="aviso aviso--atencion aviso--en-contenido">
          {opcion === 'vencida' ? 'La ventana de corrección venció: solo el propietario puede enmendarlo.' : 'Solo el propietario puede corregir este registro.'}
        </p>
      </div>
    );
  }
  // CU-17, 1a.
  if (v.anulacion) {
    return (
      <div className="formulario">
        {encabezado}
        <p className="aviso aviso--atencion aviso--en-contenido">Este registro está anulado. Si el dato era correcto, regístrelo de nuevo.</p>
      </div>
    );
  }

  const campos = camposPara(entidad, identidad.perfil);
  const definicion: CampoCorregible | undefined = CAMPOS_CORREGIBLES[entidad][f.campo];
  const actual = definicion ? ((v.registro as unknown as Record<string, unknown>)[f.campo] ?? null) : null;
  const validacion = validarCorreccion(entidad, v, f, identidad.perfil, contexto);
  const errores: ErroresCorreccion = { ...(intentado && !validacion.ok ? validacion.errores : {}), ...erroresDeGuardado };
  const cambiar = (cambios: Partial<FormularioCorreccion>) => {
    setF((x) => ({ ...x, ...cambios }));
    setConfirmando(false);
    setErroresDeGuardado({});
  };

  function revisar(e: FormEvent) {
    e.preventDefault();
    setIntentado(true);
    if (validacion.ok) setConfirmando(true);
  }

  async function guardar() {
    setGuardando(true);
    try {
      const r = await registrarCorreccion(entidad, id, f, identidad, hoy);
      if (r.ok) volver();
      else {
        setErroresDeGuardado(r.errores);
        setConfirmando(false);
      }
    } finally {
      setGuardando(false);
    }
  }

  const textoActual = definicion ? mostrarValor(definicion, actual === null ? '' : String(actual), nombres) : '';
  const textoNuevo = validacion.ok && validacion.correccion.tipo === 'correccion' ? mostrarValor(definicion, validacion.correccion.valor_nuevo, nombres) : '';

  return (
    <form className="formulario" onSubmit={revisar} noValidate>
      {encabezado}
      {errores.registro && <p className="campo__error">{errores.registro}</p>}

      {seAnula(entidad) && campos.length > 0 && (
        <div className="opciones" role="group" aria-label="Qué hacer">
          <button type="button" className="opcion" aria-pressed={f.operacion === 'corregir'} onClick={() => cambiar({ operacion: 'corregir' })}>
            Corregir un campo
          </button>
          <button type="button" className="opcion" aria-pressed={f.operacion === 'anular'} onClick={() => cambiar({ operacion: 'anular' })}>
            Anular el registro
          </button>
        </div>
      )}

      {f.operacion === 'corregir' && (
        <>
          <label className="campo">
            <span>Campo</span>
            <select value={f.campo} onChange={(e) => cambiar({ campo: e.target.value, valor: '' })}>
              <option value="">Elija el campo</option>
              {campos.map(([nombre, c]) => (
                <option key={nombre} value={nombre}>
                  {c.etiqueta}
                </option>
              ))}
            </select>
            {errores.campo && <span className="campo__error">{errores.campo}</span>}
          </label>
          {definicion && (
            <>
              <p className="comparacion">Valor vigente: {textoActual}</p>
              <ControlValor campo={definicion} valor={f.valor} alCambiar={(valor) => cambiar({ valor })} hoy={hoy} opciones={opciones} />
              {errores.valor && <span className="campo__error">{errores.valor}</span>}
            </>
          )}
        </>
      )}

      {f.operacion === 'anular' && entidad === 'produccion_leche' && (
        // Sección 7: el ordeño anulado impide otro de esa vaca ese día.
        <p className="aviso aviso--atencion aviso--en-contenido">
          Esta vaca no podrá tener otro ordeño el {formatearFecha(String((v.registro as RegistroLocal<'produccion_leche'>).fecha))}. Si el error es la cantidad, corrija los litros en
          lugar de anular.
        </p>
      )}

      {f.operacion === 'anular' && entidad === 'salida' && (
        // Documento técnico 29, sección 8: anulada, el animal vuelve al inventario y admite una salida nueva.
        <p className="aviso aviso--atencion aviso--en-contenido">
          El animal volverá al inventario activo; si salió por otro motivo o en otra fecha, registre después la salida correcta. Si el error es la fecha, el
          peso, el valor o el comprador, corríjalo en lugar de anular.
        </p>
      )}

      <div className="campo">
        <fieldset className="opciones">
          <legend>Motivo</legend>
          {MOTIVOS_CORRECCION.map((m) => (
            <button key={m} type="button" className="opcion" aria-pressed={f.motivo === m} onClick={() => cambiar({ motivo: m as MotivoCorreccion })}>
              {NOMBRE_MOTIVO[m]}
            </button>
          ))}
        </fieldset>
        {errores.motivo && <span className="campo__error">{errores.motivo}</span>}
      </div>

      <label className="campo">
        <span>
          Nota <span className="campo__ayuda">{f.motivo === 'otro' ? '(obligatoria con «otro»)' : '(opcional)'}</span>
        </span>
        <textarea rows={2} maxLength={LARGO_NOTA + 50} value={f.nota} onChange={(e) => cambiar({ nota: e.target.value })} />
        {errores.nota && <span className="campo__error">{errores.nota}</span>}
      </label>

      {confirmando && validacion.ok ? (
        <div className="aviso aviso--atencion aviso--en-contenido" role="alertdialog" aria-label="Confirmar">
          <p>
            {validacion.correccion.tipo === 'anulacion'
              ? `${NOMBRE_ENTIDAD[entidad]} «${resumen(entidad, v.registro as unknown as Record<string, unknown>, nombres)}» quedará anulado.`
              : `${definicion?.etiqueta} pasará de ${textoActual} a ${textoNuevo}.`}
          </p>
          <div className="aviso__acciones aviso__acciones--columna">
            <button type="button" className="boton boton--principal" disabled={guardando} onClick={() => void guardar()}>
              {guardando ? 'Guardando…' : 'Confirmar'}
            </button>
            <button type="button" className="boton boton--secundario" onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="acciones-formulario">
          <button className="boton boton--principal boton--ancho" type="submit">
            {f.operacion === 'anular' ? 'Anular registro' : 'Guardar corrección'}
          </button>
          <button className="boton boton--secundario boton--ancho" type="button" onClick={volver}>
            Cancelar
          </button>
        </div>
      )}
    </form>
  );
}

/** El control del valor nuevo según el tipo del campo (sección 5). */
function ControlValor({
  campo,
  valor,
  alCambiar,
  hoy,
  opciones,
}: {
  campo: CampoCorregible;
  valor: string;
  alCambiar: (valor: string) => void;
  hoy: string;
  opciones: { animales: RegistroLocal<'animal'>[]; medicamentos: RegistroLocal<'medicamento'>[] };
}) {
  const etiqueta = <span>Valor nuevo{campo.vacio ? <span className="campo__ayuda"> (puede quedar vacío)</span> : null}</span>;
  switch (campo.tipo) {
    case 'fecha':
      return (
        <label className="campo">
          {etiqueta}
          <input type="date" max={hoy} value={valor} onChange={(e) => alCambiar(e.target.value)} />
        </label>
      );
    case 'enum':
    case 'booleano': {
      const lista = campo.tipo === 'booleano' ? ([['true', 'Sí'], ['false', 'No']] as const) : (campo.opciones ?? []);
      return (
        <div className="campo">
          <fieldset className="opciones">
            <legend>Valor nuevo</legend>
            {lista.map(([v, nombre]) => (
              <button key={v} type="button" className="opcion" aria-pressed={valor === v} onClick={() => alCambiar(v)}>
                {nombre}
              </button>
            ))}
          </fieldset>
        </div>
      );
    }
    case 'animal':
    case 'medicamento': {
      const lista =
        campo.tipo === 'animal'
          ? opciones.animales.filter((a) => !campo.sexo || a.sexo === campo.sexo).map((a) => [a.id, a.codigo_chapeta] as const)
          : opciones.medicamentos.map((m) => [m.id, `${m.nombre} · ${m.unidad}`] as const);
      return (
        <label className="campo">
          {etiqueta}
          <select value={valor} onChange={(e) => alCambiar(e.target.value)}>
            <option value="">{campo.vacio ? 'Vacío' : 'Elija'}</option>
            {lista.map(([v, nombre]) => (
              <option key={v} value={v}>
                {nombre}
              </option>
            ))}
          </select>
        </label>
      );
    }
    default:
      return (
        <label className="campo">
          {etiqueta}
          {campo.tipo === 'texto' && (campo.maximoTexto ?? 0) > 100 ? (
            <textarea rows={3} value={valor} onChange={(e) => alCambiar(e.target.value)} />
          ) : (
            <input type="text" inputMode={campo.tipo === 'texto' ? 'text' : 'decimal'} value={valor} onChange={(e) => alCambiar(e.target.value)} />
          )}
        </label>
      );
  }
}
