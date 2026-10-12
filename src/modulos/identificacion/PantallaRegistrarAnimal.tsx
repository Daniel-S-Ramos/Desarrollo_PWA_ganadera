import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { consulta } from '../../datos/repositorio';
import { fechaDelPredio } from '../../dominio/fechas';
import type { RegistroLocal } from '../../dominio/tipos';
import type { Identidad } from '../../sesion/token';
import { DistintivoSync } from '../../ui/componentes/DistintivoSync';
import {
  buscarPorChapeta,
  describirAnimalConChapeta,
  errorDeChapeta,
  formularioModificado,
  formularioVacio,
  listarProgenitores,
  normalizarChapeta,
  registrarAnimal,
  validarFormulario,
  type AnimalConChapeta,
  type CampoFormulario,
  type ErroresFormulario,
  type FormularioAnimal,
  type Progenitor,
} from './registroAnimal';

/**
 * Registrar un animal (CU-02). Especificación: docs/tecnica/13-registro-de-animal.md, sección 7.
 * Una sola pantalla, en el orden en que se necesitan los datos. Nada se guarda hasta confirmar:
 * si la aplicación se cierra a mitad del registro, al volver el formulario aparece vacío (Tabla 31).
 */
export function PantallaRegistrarAnimal({ identidad }: { identidad: Identidad }) {
  const navegar = useNavigate();
  const [hoy] = useState(() => fechaDelPredio());
  const [formulario, setFormulario] = useState<FormularioAnimal>(() => formularioVacio(hoy));
  const [tocados, setTocados] = useState<ReadonlySet<CampoFormulario>>(new Set());
  const [intentado, setIntentado] = useState(false);
  const [erroresDeGuardado, setErroresDeGuardado] = useState<ErroresFormulario>({});
  const [asignada, setAsignada] = useState<AnimalConChapeta | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [registrado, setRegistrado] = useState<RegistroLocal<'animal'> | null>(null);

  const progenitores = useLiveQuery(() => listarProgenitores(), [], { hembras: [], machos: [] });
  const chapeta = normalizarChapeta(formulario.chapeta);

  // CU-02 paso 4: la chapeta se verifica mientras se escribe, antes de guardar.
  useEffect(() => {
    let vigente = true;
    if (errorDeChapeta(chapeta)) {
      setAsignada(null);
      return;
    }
    void buscarPorChapeta(chapeta).then((encontrado) => vigente && setAsignada(encontrado));
    return () => {
      vigente = false;
    };
  }, [chapeta]);

  const validacion = validarFormulario(formulario, hoy);
  const errores: ErroresFormulario = { ...(validacion.ok ? {} : validacion.errores), ...erroresDeGuardado };
  /**
   * El error de un campo se muestra al intentar guardar, o al salir de él si ya se escribió algo.
   * Un campo vacío no se señala antes de intentar guardar: el usuario puede no haber llegado a él.
   */
  const errorDe = (campo: CampoFormulario) => {
    if (intentado) return errores[campo];
    const valor = formulario[campo];
    return tocados.has(campo) && valor !== '' && valor !== null ? errores[campo] : undefined;
  };

  function cambiar(cambios: Partial<FormularioAnimal>) {
    setFormulario((actual) => ({ ...actual, ...cambios }));
    setErroresDeGuardado({});
  }
  const tocar = (campo: CampoFormulario) => setTocados((actual) => new Set(actual).add(campo));

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setIntentado(true);
    if (!validacion.ok || asignada) return;
    setGuardando(true);
    try {
      const resultado = await registrarAnimal(formulario, identidad, hoy);
      if (resultado.ok) setRegistrado(resultado.animal);
      else if ('chapetaAsignada' in resultado) setAsignada(resultado.chapetaAsignada);
      else setErroresDeGuardado(resultado.errores);
    } finally {
      setGuardando(false);
    }
  }

  function registrarOtro() {
    setFormulario(formularioVacio(hoy));
    setTocados(new Set());
    setIntentado(false);
    setErroresDeGuardado({});
    setRegistrado(null);
  }

  function cancelar() {
    if (formularioModificado(formulario, hoy)) setConfirmarCancelar(true);
    else void navegar('/');
  }

  if (registrado) {
    return <AnimalRegistrado animal={registrado} alRegistrarOtro={registrarOtro} alVolver={() => void navegar('/')} />;
  }

  const esComprado = formulario.origen === 'comprado';
  const pideFechaNacimiento = formulario.origen === 'nacido' || (esComprado && formulario.nacimiento_comprado === 'fecha');

  return (
    <form className="formulario" onSubmit={guardar} noValidate>
      <p className="titulo-seccion">Registrar animal</p>

      {/* 1. Chapeta */}
      <label className="campo">
        <span>Número de chapeta</span>
        <input
          className="campo__chapeta"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={30}
          autoFocus
          value={formulario.chapeta}
          aria-invalid={!!errorDe('chapeta') || !!asignada}
          onChange={(e) => cambiar({ chapeta: e.target.value })}
          onBlur={() => {
            tocar('chapeta');
            if (formulario.chapeta !== chapeta) cambiar({ chapeta });
          }}
        />
        <Error texto={errorDe('chapeta')} />
      </label>

      {asignada && (
        <div className="aviso aviso--atencion aviso--en-contenido" role="alert">
          <p>
            ⚠ <strong>La chapeta {asignada.animal.codigo_chapeta} ya está asignada.</strong>
          </p>
          <p>{describirAnimalConChapeta(asignada)}</p>
          {asignada.retirado && (
            <p>
              <em>{asignada.animal.sexo === 'hembra' ? 'Retirada' : 'Retirado'} del predio</em>
            </p>
          )}
          <p className="aviso__detalle">Escriba un número distinto para continuar.</p>
        </div>
      )}

      {/* 2. Sexo */}
      <Opciones
        leyenda="Sexo"
        valor={formulario.sexo}
        opciones={[
          ['hembra', 'Hembra'],
          ['macho', 'Macho'],
        ]}
        alElegir={(sexo) => cambiar({ sexo })}
        error={intentado ? errores.sexo : undefined}
      />

      {/* 3. Origen (sección 3) */}
      <Opciones
        leyenda="Origen"
        valor={formulario.origen}
        opciones={[
          ['nacido', 'Nació en el predio'],
          ['comprado', 'Comprado'],
        ]}
        // La fecha de un nacido en el predio es exacta; la de un comprado se estima (3.8.10).
        alElegir={(origen) => cambiar({ origen, fecha_nacimiento_exacta: origen === 'nacido' })}
        error={intentado ? errores.origen : undefined}
      />

      {esComprado && (
        <>
          <CampoFecha
            etiqueta="Fecha de ingreso"
            valor={formulario.fecha_ingreso}
            maximo={hoy}
            error={errorDe('fecha_ingreso')}
            alCambiar={(fecha_ingreso) => cambiar({ fecha_ingreso })}
            alSalir={() => tocar('fecha_ingreso')}
          />

          <label className="campo">
            <span>
              Procedencia <span className="campo__ayuda">(opcional)</span>
            </span>
            <input
              type="text"
              maxLength={100}
              placeholder="Finca, vendedor o municipio"
              value={formulario.procedencia}
              aria-invalid={!!errorDe('procedencia')}
              onChange={(e) => cambiar({ procedencia: e.target.value })}
              onBlur={() => tocar('procedencia')}
            />
            <Error texto={errorDe('procedencia')} />
          </label>

          <Opciones
            leyenda="Nacimiento"
            valor={formulario.nacimiento_comprado}
            opciones={[
              ['edad', 'Sé la edad'],
              ['fecha', 'Sé la fecha'],
              ['desconocido', 'No se sabe'],
            ]}
            alElegir={(nacimiento_comprado) => cambiar({ nacimiento_comprado, fecha_nacimiento_exacta: false })}
          />

          {formulario.nacimiento_comprado === 'edad' && (
            <div className="fila-campos">
              <label className="campo">
                <span>Edad aproximada</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formulario.edad}
                  aria-invalid={!!errorDe('edad')}
                  onChange={(e) => cambiar({ edad: e.target.value })}
                  onBlur={() => tocar('edad')}
                />
              </label>
              <Opciones
                leyenda=""
                valor={formulario.unidad_edad}
                opciones={[
                  ['meses', 'Meses'],
                  ['anios', 'Años'],
                ]}
                alElegir={(unidad_edad) => cambiar({ unidad_edad })}
              />
            </div>
          )}
          {formulario.nacimiento_comprado === 'edad' && <Error texto={errorDe('edad')} />}
        </>
      )}

      {pideFechaNacimiento && (
        <>
          <CampoFecha
            etiqueta="Fecha de nacimiento"
            valor={formulario.fecha_nacimiento}
            maximo={hoy}
            error={errorDe('fecha_nacimiento')}
            alCambiar={(fecha_nacimiento) => cambiar({ fecha_nacimiento })}
            alSalir={() => tocar('fecha_nacimiento')}
          />
          <label className="casilla">
            <input
              type="checkbox"
              checked={!formulario.fecha_nacimiento_exacta}
              onChange={(e) => cambiar({ fecha_nacimiento_exacta: !e.target.checked })}
            />
            La fecha es aproximada
          </label>
        </>
      )}

      {/* 4. Peso inicial */}
      <label className="campo">
        <span>
          Peso inicial en kg <span className="campo__ayuda">(opcional)</span>
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={formulario.peso_inicial}
          aria-invalid={!!errorDe('peso_inicial')}
          onChange={(e) => cambiar({ peso_inicial: e.target.value })}
          onBlur={() => tocar('peso_inicial')}
        />
        <Error texto={errorDe('peso_inicial')} />
      </label>

      {/* 5. Genealogía (sección 4) */}
      <details
        className="plegable"
        open={intentado && !!(errores.madre_id || errores.madre_externa || errores.padre_id || errores.padre_externo)}
      >
        <summary>Genealogía (opcional)</summary>
        <div className="formulario">
          <Opciones
            leyenda="Madre"
            valor={formulario.forma_madre}
            opciones={[
              ['desconocido', 'Desconocida'],
              ['predio', 'Del predio'],
              ['externo', 'Externa'],
            ]}
            alElegir={(forma_madre) => cambiar({ forma_madre })}
          />
          {formulario.forma_madre === 'predio' && (
            <ProgenitorDelPredio
              etiqueta="Madre del predio"
              vacio="Elija una hembra"
              sinAnimales="No hay hembras registradas en este teléfono."
              animales={progenitores.hembras}
              retirado="retirada"
              valor={formulario.madre_id}
              error={errorDe('madre_id')}
              alCambiar={(madre_id) => cambiar({ madre_id })}
              alSalir={() => tocar('madre_id')}
            />
          )}
          {formulario.forma_madre === 'externo' && (
            <ProgenitorExterno
              etiqueta="Madre externa"
              ejemplo="Nombre o referencia de la vaca"
              valor={formulario.madre_externa}
              error={errorDe('madre_externa')}
              alCambiar={(madre_externa) => cambiar({ madre_externa })}
              alSalir={() => tocar('madre_externa')}
            />
          )}

          <Opciones
            leyenda="Padre"
            valor={formulario.forma_padre}
            opciones={[
              ['desconocido', 'Desconocido'],
              ['predio', 'Del predio'],
              ['externo', 'Externo'],
            ]}
            alElegir={(forma_padre) => cambiar({ forma_padre })}
          />
          {formulario.forma_padre === 'predio' && (
            <ProgenitorDelPredio
              etiqueta="Padre del predio"
              vacio="Elija un macho"
              sinAnimales="No hay machos registrados en este teléfono."
              animales={progenitores.machos}
              retirado="retirado"
              valor={formulario.padre_id}
              error={errorDe('padre_id')}
              alCambiar={(padre_id) => cambiar({ padre_id })}
              alSalir={() => tocar('padre_id')}
            />
          )}
          {formulario.forma_padre === 'externo' && (
            <ProgenitorExterno
              etiqueta="Reproductor externo"
              ejemplo="Nombre o referencia del toro"
              valor={formulario.padre_externo}
              error={errorDe('padre_externo')}
              alCambiar={(padre_externo) => cambiar({ padre_externo })}
              alSalir={() => tocar('padre_externo')}
            />
          )}
        </div>
      </details>

      {intentado && !validacion.ok && (
        <p className="campo__error" role="alert">
          Revise los datos señalados.
        </p>
      )}

      {confirmarCancelar ? (
        <div className="aviso aviso--atencion aviso--en-contenido" role="alertdialog" aria-label="Descartar el registro">
          <p>⚠ ¿Descartar los datos de este animal?</p>
          <div className="aviso__acciones aviso__acciones--columna">
            <button type="button" className="boton boton--principal" onClick={() => setConfirmarCancelar(false)}>
              No, seguir registrando
            </button>
            <button type="button" className="boton boton--secundario" onClick={() => void navegar('/')}>
              Sí, descartar
            </button>
          </div>
        </div>
      ) : (
        <div className="acciones-formulario">
          <button className="boton boton--principal boton--ancho" type="submit" disabled={guardando || !!asignada}>
            {guardando ? 'Guardando…' : 'Guardar animal'}
          </button>
          <button className="boton boton--secundario boton--ancho" type="button" onClick={cancelar}>
            Cancelar
          </button>
        </div>
      )}
    </form>
  );
}

/** Confirmación tras guardar, con el estado de sincronización del registro (Tabla 22). */
function AnimalRegistrado({
  animal,
  alRegistrarOtro,
  alVolver,
}: {
  animal: RegistroLocal<'animal'>;
  alRegistrarOtro: () => void;
  alVolver: () => void;
}) {
  // El distintivo cambia solo cuando el motor envía el registro.
  const actual = useLiveQuery(() => consulta.animal.get(animal.id), [animal.id], animal);
  return (
    <div className="formulario">
      <div className="aviso aviso--correcto aviso--en-contenido" role="status">
        <p>
          ✓ Animal <span className="registrado__chapeta">{animal.codigo_chapeta}</span> registrado
        </p>
        {actual && <DistintivoSync estado={actual.estado_sync} detalle={actual.detalle_conflicto} />}
      </div>
      <div className="acciones-formulario">
        <button className="boton boton--principal boton--ancho" type="button" onClick={alRegistrarOtro}>
          Registrar otro
        </button>
        <button className="boton boton--secundario boton--ancho" type="button" onClick={alVolver}>
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

function Opciones<T extends string>({
  leyenda,
  valor,
  opciones,
  alElegir,
  error,
}: {
  leyenda: string;
  valor: T | null;
  opciones: [T, string][];
  alElegir: (valor: T) => void;
  error?: string | undefined;
}) {
  return (
    <div className="campo">
      <fieldset className="opciones">
        {leyenda && <legend>{leyenda}</legend>}
        {opciones.map(([clave, texto]) => (
          <button key={clave} type="button" className="opcion" aria-pressed={valor === clave} onClick={() => alElegir(clave)}>
            {texto}
          </button>
        ))}
      </fieldset>
      <Error texto={error} />
    </div>
  );
}

/** Lista de hembras o machos del teléfono. Si no hay ninguno, lo dice en lugar de mostrar una lista vacía. */
function ProgenitorDelPredio({
  etiqueta,
  vacio,
  sinAnimales,
  animales,
  retirado,
  valor,
  error,
  alCambiar,
  alSalir,
}: {
  etiqueta: string;
  vacio: string;
  sinAnimales: string;
  animales: Progenitor[];
  retirado: string;
  valor: string;
  error: string | undefined;
  alCambiar: (valor: string) => void;
  alSalir: () => void;
}) {
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      <select value={valor} disabled={animales.length === 0} aria-invalid={!!error} onChange={(e) => alCambiar(e.target.value)} onBlur={alSalir}>
        <option value="">{vacio}</option>
        {animales.map((a) => (
          <option key={a.id} value={a.id}>
            {a.codigo_chapeta}
            {a.retirado ? ` (${retirado})` : ''}
          </option>
        ))}
      </select>
      {animales.length === 0 && <span className="campo__ayuda">{sinAnimales}</span>}
      <Error texto={error} />
    </label>
  );
}

function ProgenitorExterno({
  etiqueta,
  ejemplo,
  valor,
  error,
  alCambiar,
  alSalir,
}: {
  etiqueta: string;
  ejemplo: string;
  valor: string;
  error: string | undefined;
  alCambiar: (valor: string) => void;
  alSalir: () => void;
}) {
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      <input
        type="text"
        maxLength={100}
        placeholder={ejemplo}
        value={valor}
        aria-invalid={!!error}
        onChange={(e) => alCambiar(e.target.value)}
        onBlur={alSalir}
      />
      <Error texto={error} />
    </label>
  );
}

function CampoFecha({
  etiqueta,
  valor,
  maximo,
  error,
  alCambiar,
  alSalir,
}: {
  etiqueta: string;
  valor: string;
  maximo: string;
  error: string | undefined;
  alCambiar: (valor: string) => void;
  alSalir: () => void;
}) {
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      <input type="date" max={maximo} value={valor} aria-invalid={!!error} onChange={(e) => alCambiar(e.target.value)} onBlur={alSalir} />
      <Error texto={error} />
    </label>
  );
}

function Error({ texto }: { texto: string | undefined }): ReactNode {
  return texto ? <span className="campo__error">{texto}</span> : null;
}
