import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { consulta } from '../../datos/repositorio';
import { fechaDelPredio } from '../../dominio/fechas';
import { normalizarNombre } from '../../dominio/medicamentos';
import {
  formularioEventoVacio,
  LARGO_SINTOMAS,
  medicamentosDelTipo,
  NOMBRE_TIPO_EVENTO,
  tipoMedicamentoPropuesto,
  validarEvento,
  type ErroresEvento,
  type FormularioEvento,
} from '../../dominio/sanidad';
import { TIPOS_EVENTO_SANITARIO, type RegistroLocal } from '../../dominio/tipos';
import type { Identidad } from '../../sesion/token';
import { DistintivoSync } from '../../ui/componentes/DistintivoSync';
import { buscarPorChapeta, normalizarChapeta } from '../identificacion/registroAnimal';
import { listarCatalogo, type MedicamentoLocal } from './catalogo';
import { useCargaInicialCompleta } from '../../ui/useEstadoMotor';
import { AvisoRepeticion } from './AvisoRepeticion';
import { cargarContextoEvento, formularioComo, puedeVerCosto, registrarEvento, ultimaDosisDe, verificarRepeticion, type EventoLocal } from './eventos';
import { FormularioMedicamento } from './FormularioMedicamento';
import { TituloPantalla } from '../../ui/componentes/TituloPantalla';
import { JeringaFrasco } from '../../ui/componentes/Ilustraciones';

/**
 * Registrar un evento sanitario (CU-04, HU-03). Especificación: docs/tecnica/20-registro-sanitario.md.
 * Ruta: /animales/:id/evento-sanitario. Con ?como=<evento> copia ese evento (ronda, sección 7) y con
 * ?ronda=Z1,Z2 recuerda a qué animales ya se les aplicó.
 */
export function PantallaRegistrarEvento({ identidad }: { identidad: Identidad }) {
  const { id = '' } = useParams();
  const [parametros] = useSearchParams();
  const como = parametros.get('como');
  const ronda = (parametros.get('ronda') ?? '').split(',').filter(Boolean);
  const animal = useLiveQuery(async () => ({ animal: await consulta.animal.get(id) }), [id]);

  if (!animal) return <p className="texto-secundario">Cargando…</p>;
  if (!animal.animal) {
    return (
      <div className="formulario">
        <p className="titulo-seccion">Registrar evento sanitario</p>
        <p>Este animal no está en este teléfono.</p>
        <Link className="boton boton--secundario boton--ancho" to="/animales">
          Volver al listado
        </Link>
      </div>
    );
  }
  // La clave reinicia el formulario al pasar al siguiente animal de una ronda.
  return <Formulario key={`${id}-${como ?? ''}`} animal={animal.animal} identidad={identidad} como={como} ronda={ronda} />;
}

function Formulario({ animal, identidad, como, ronda }: { animal: RegistroLocal<'animal'>; identidad: Identidad; como: string | null; ronda: string[] }) {
  const navegar = useNavigate();
  const [hoy] = useState(() => fechaDelPredio());
  const conCosto = puedeVerCosto(identidad.perfil);
  const [formulario, setFormulario] = useState<FormularioEvento>(() => formularioEventoVacio(hoy));
  const [verTodo, setVerTodo] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [agregando, setAgregando] = useState(false);
  const [verSintomas, setVerSintomas] = useState(false);
  const [dosisPrecargada, setDosisPrecargada] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [erroresDeGuardado, setErroresDeGuardado] = useState<ErroresEvento>({});
  const [registrado, setRegistrado] = useState<EventoLocal | null>(null);
  // Documento técnico 21, sección 4: la confirmación de una repetición.
  const [confirmado, setConfirmado] = useState(false);
  const [faltaConfirmar, setFaltaConfirmar] = useState(false);
  const cargaCompleta = useCargaInicialCompleta();

  const catalogo = useLiveQuery(() => listarCatalogo(), [], []);
  const contexto = useLiveQuery(() => cargarContextoEvento(animal.id, formulario.medicamento_id), [animal.id, formulario.medicamento_id]);
  // Se recalcula sola si llega una aplicación desde otro teléfono (documento técnico 21, sección 5).
  const verificacion = useLiveQuery(
    () => verificarRepeticion(animal.id, formulario.medicamento_id, formulario.fecha),
    [animal.id, formulario.medicamento_id, formulario.fecha],
  );
  const advertencia = verificacion?.repeticion.nivel === 'advertencia';

  // Ronda: el formulario llega con el evento anterior copiado (sección 7).
  useEffect(() => {
    if (!como) return;
    void formularioComo(como, identidad.perfil).then((copia) => copia && setFormulario(copia));
  }, [como, identidad.perfil]);

  const cambiar = (cambios: Partial<FormularioEvento>) => {
    setFormulario((f) => ({ ...f, ...cambios }));
    setErroresDeGuardado({});
    // La advertencia confirmada ya no es la misma si cambia el medicamento o la fecha (sección 4).
    if ('medicamento_id' in cambios || 'fecha' in cambios) {
      setConfirmado(false);
      setFaltaConfirmar(false);
    }
  };

  async function elegirMedicamento(medicamento: MedicamentoLocal) {
    // La dosis se precarga con la última registrada de ese medicamento, para revisarla (sección 5.1).
    const dosis = await ultimaDosisDe(medicamento.id);
    cambiar({ medicamento_id: medicamento.id, dosis: dosis === null ? '' : String(dosis).replace('.', ',') });
    setDosisPrecargada(dosis !== null);
    setAgregando(false);
  }

  const validacion = contexto ? validarEvento(formulario, contexto, hoy) : null;
  const errores: ErroresEvento = { ...(validacion && !validacion.ok ? validacion.errores : {}), ...erroresDeGuardado };
  const mostrar = (campo: keyof ErroresEvento) => (intentado ? errores[campo] : undefined);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setIntentado(true);
    if (!validacion?.ok || (advertencia && !confirmado)) return;
    setGuardando(true);
    try {
      const resultado = await registrarEvento(animal.id, formulario, identidad, hoy, confirmado);
      if (resultado.ok) setRegistrado(resultado.evento);
      else if ('requiereConfirmacion' in resultado) {
        // Llegó una aplicación dentro del intervalo entre la vista y el guardado (sección 5).
        setConfirmado(false);
        setFaltaConfirmar(true);
      } else setErroresDeGuardado(resultado.errores);
    } finally {
      setGuardando(false);
    }
  }

  if (registrado) {
    return <EventoRegistrado evento={registrado} animal={animal} ronda={[...ronda, animal.codigo_chapeta]} catalogo={catalogo} alVerFicha={() => void navegar(`/animales/${animal.id}`)} />;
  }

  const elegido = catalogo.find((m) => m.id === formulario.medicamento_id) ?? null;
  const delTipo = formulario.tipo ? medicamentosDelTipo(catalogo, formulario.tipo) : [];
  const buscado = normalizarNombre(filtro);
  const lista = (verTodo ? catalogo : delTipo).filter((m) => buscado === '' || normalizarNombre(m.nombre).includes(buscado));
  const sintomasAbiertos = formulario.tipo === 'tratamiento' || verSintomas || formulario.sintomas !== '';

  return (
    <form className="formulario" onSubmit={guardar} noValidate>
      <Link className="enlace" to={`/animales/${animal.id}`}>
        ← Volver a la ficha
      </Link>
      <TituloPantalla dibujo={<JeringaFrasco tamano={34} />}>Registrar evento sanitario</TituloPantalla>
      <p className="evento__animal">
        Animal <strong className="registrado__chapeta chapeta">{animal.codigo_chapeta}</strong> · {animal.sexo === 'hembra' ? 'Hembra' : 'Macho'}
      </p>
      {ronda.length > 0 && <p className="texto-secundario">Ya se aplicó en esta ronda a: {ronda.join(', ')}</p>}
      {errores.animal && (
        <p className="campo__error" role="alert">
          {errores.animal}
        </p>
      )}

      {/* 1. Tipo (CU-04, paso 3) */}
      <div className="campo">
        <fieldset className="opciones opciones--tres">
          <legend>Tipo de evento</legend>
          {TIPOS_EVENTO_SANITARIO.map((tipo) => (
            <button
              key={tipo}
              type="button"
              className="opcion"
              aria-pressed={formulario.tipo === tipo}
              onClick={() => {
                cambiar({ tipo });
                setVerTodo(false);
              }}
            >
              {NOMBRE_TIPO_EVENTO[tipo]}
            </button>
          ))}
        </fieldset>
        {mostrar('tipo') && <span className="campo__error">{mostrar('tipo')}</span>}
      </div>

      {/* 2. Medicamento, del catálogo (sección 4) */}
      {formulario.tipo && (
        <div className="campo">
          <span className="campo__titulo">Medicamento</span>
          {elegido ? (
            <div className="medicamento-elegido">
              <span>
                <strong>{elegido.nombre}</strong> · {elegido.unidad}
              </span>
              <button type="button" className="enlace" onClick={() => cambiar({ medicamento_id: null, dosis: '' })}>
                Cambiar
              </button>
            </div>
          ) : agregando ? (
            <FormularioMedicamento
              identidad={identidad}
              tipoInicial={tipoMedicamentoPropuesto(formulario.tipo)}
              alTerminar={(m) => void elegirMedicamento(m)}
              alCancelar={() => setAgregando(false)}
            />
          ) : (
            <>
              {catalogo.length > 6 && (
                <input type="search" placeholder="Buscar medicamento" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
              )}
              {lista.length === 0 ? (
                <p className="texto-secundario">{verTodo ? 'No hay medicamentos con ese nombre.' : 'No hay medicamentos de este tipo en el catálogo.'}</p>
              ) : (
                <div className="lista-medicamentos">
                  {lista.map((m) => (
                    <button key={m.id} type="button" className="opcion opcion--medicamento" onClick={() => void elegirMedicamento(m)}>
                      {m.nombre} <span className="texto-secundario">· {m.unidad}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="acciones-en-linea">
                {!verTodo && formulario.tipo !== 'otro' && (
                  <button type="button" className="enlace" onClick={() => setVerTodo(true)}>
                    Ver todo el catálogo
                  </button>
                )}
                <button type="button" className="enlace" onClick={() => setAgregando(true)}>
                  Agregar un medicamento
                </button>
              </div>
            </>
          )}
          {mostrar('medicamento_id') && <span className="campo__error">{mostrar('medicamento_id')}</span>}
        </div>
      )}

      {/* La última aplicación de este medicamento al animal, en dos niveles (documento técnico 21). */}
      {verificacion && (
        <AvisoRepeticion
          verificacion={verificacion}
          chapeta={animal.codigo_chapeta}
          hoy={hoy}
          confirmado={confirmado}
          alConfirmar={(valor) => {
            setConfirmado(valor);
            setFaltaConfirmar(false);
          }}
          cargaIncompleta={cargaCompleta === false}
        />
      )}
      {faltaConfirmar && advertencia && (
        <p className="campo__error" role="alert">
          Se encontró una aplicación reciente de este medicamento. Revísela y confirme para guardar.
        </p>
      )}

      {/* 3. Fecha (CU-04, paso 2) */}
      <label className="campo">
        <span>Fecha de aplicación</span>
        <input type="date" max={hoy} value={formulario.fecha} aria-invalid={!!mostrar('fecha')} onChange={(e) => cambiar({ fecha: e.target.value })} />
        {mostrar('fecha') && <span className="campo__error">{mostrar('fecha')}</span>}
      </label>

      {/* 4. Dosis (sección 5.1) */}
      <label className="campo">
        <span>
          Dosis{elegido ? ` (${elegido.unidad})` : ''} <span className="campo__ayuda">(opcional)</span>
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={formulario.dosis}
          aria-invalid={!!mostrar('dosis')}
          onChange={(e) => {
            cambiar({ dosis: e.target.value });
            setDosisPrecargada(false);
          }}
        />
        {dosisPrecargada && <span className="campo__ayuda">Tomada del último registro de este medicamento: revísela.</span>}
        {mostrar('dosis') && <span className="campo__error">{mostrar('dosis')}</span>}
      </label>

      {/* 5. Costo, solo el propietario (sección 5.2) */}
      {conCosto && (
        <label className="campo">
          <span>
            Costo de esta aplicación, en pesos <span className="campo__ayuda">(opcional)</span>
          </span>
          <input type="text" inputMode="numeric" value={formulario.costo} aria-invalid={!!mostrar('costo')} onChange={(e) => cambiar({ costo: e.target.value })} />
          {mostrar('costo') && <span className="campo__error">{mostrar('costo')}</span>}
        </label>
      )}

      {/* 6. Síntomas (sección 5.3) */}
      {sintomasAbiertos ? (
        <label className="campo">
          <span>
            Síntomas observados <span className="campo__ayuda">(opcional)</span>
          </span>
          <textarea rows={3} maxLength={LARGO_SINTOMAS + 50} value={formulario.sintomas} aria-invalid={!!mostrar('sintomas')} onChange={(e) => cambiar({ sintomas: e.target.value })} />
          {mostrar('sintomas') && <span className="campo__error">{mostrar('sintomas')}</span>}
        </label>
      ) : (
        <button type="button" className="enlace" onClick={() => setVerSintomas(true)}>
          Agregar síntomas
        </button>
      )}

      {intentado && validacion && !validacion.ok && (
        <p className="campo__error" role="alert">
          Revise los datos señalados.
        </p>
      )}

      <div className="acciones-formulario">
        <button className="boton boton--principal boton--ancho" type="submit" disabled={guardando || agregando || (advertencia && !confirmado)}>
          {guardando ? 'Guardando…' : 'Guardar evento'}
        </button>
        <Link className="boton boton--secundario boton--ancho" to={`/animales/${animal.id}`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}

/** Confirmación, con la opción de aplicar lo mismo a otro animal (sección 7). */
function EventoRegistrado({
  evento,
  animal,
  ronda,
  catalogo,
  alVerFicha,
}: {
  evento: EventoLocal;
  animal: RegistroLocal<'animal'>;
  ronda: string[];
  catalogo: MedicamentoLocal[];
  alVerFicha: () => void;
}) {
  const navegar = useNavigate();
  const [chapeta, setChapeta] = useState('');
  const [error, setError] = useState<string | null>(null);
  const actual = useLiveQuery(() => consulta.evento_sanitario.get(evento.id), [evento.id], evento);
  const medicamento = catalogo.find((m) => m.id === evento.medicamento_id)?.nombre ?? 'El medicamento';

  async function siguiente(e: FormEvent) {
    e.preventDefault();
    const buscada = normalizarChapeta(chapeta);
    if (buscada === '') return setError('Escriba la chapeta del siguiente animal');
    if (buscada === animal.codigo_chapeta) return setError('Es el mismo animal');
    const encontrado = await buscarPorChapeta(buscada);
    if (!encontrado) return setError(`La chapeta ${buscada} no está registrada en este teléfono`);
    if (encontrado.retirado) return setError(`El animal ${buscada} salió del predio`);
    void navegar(`/animales/${encontrado.animal.id}/evento-sanitario?como=${evento.id}&ronda=${encodeURIComponent(ronda.join(','))}`);
  }

  return (
    <div className="formulario">
      <div className="aviso aviso--correcto aviso--en-contenido" role="status">
        <p>
          ✓ Evento registrado al animal <span className="registrado__chapeta chapeta">{animal.codigo_chapeta}</span>
        </p>
        {actual && <DistintivoSync estado={actual.estado_sync} {...(actual.detalle_conflicto ? { detalle: actual.detalle_conflicto } : {})} />}
      </div>
      <p>
        {NOMBRE_TIPO_EVENTO[evento.tipo]} · <strong>{medicamento}</strong>. En esta ronda: {ronda.length === 1 ? '1 animal' : `${ronda.length} animales`} ({ronda.join(', ')}).
      </p>

      <form className="tarjeta formulario" onSubmit={siguiente} noValidate>
        <h2>Aplicar lo mismo a otro animal</h2>
        <label className="campo">
          <span>Chapeta del siguiente animal</span>
          <input
            className="campo__chapeta"
            type="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            value={chapeta}
            onChange={(e) => {
              setChapeta(e.target.value);
              setError(null);
            }}
          />
          {error && <span className="campo__error">{error}</span>}
        </label>
        <button className="boton boton--principal boton--ancho" type="submit">
          Continuar con ese animal
        </button>
      </form>

      <button className="boton boton--secundario boton--ancho" type="button" onClick={alVerFicha}>
        Ver la ficha de {animal.codigo_chapeta}
      </button>
    </div>
  );
}
