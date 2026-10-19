import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { consulta } from '../../datos/repositorio';
import { fechaDelPredio, formatearFecha } from '../../dominio/fechas';
import { LARGO_OBSERVACION, NOMBRE_RESULTADO, validarParto, type FormularioParto } from '../../dominio/reproduccion';
import { RESULTADOS_PARTO, type RegistroLocal } from '../../dominio/tipos';
import type { Identidad } from '../../sesion/token';
import { describirAnimalConChapeta, normalizarChapeta, type ErroresFormulario, type FotosCapturadas } from '../identificacion/registroAnimal';
import { SeccionFotografias } from '../identificacion/SeccionFotografias';
import { cargarParaParto, criaVacia, registrarParto, reproductorDe, type FormularioCria } from './partos';

/**
 * Registrar un parto con la cría (CU-10, HU-12). Especificación: docs/tecnica/25-parto-y-control-reproductivo.md,
 * secciones 4 y 5. Ruta: /animales/:id/parto. Un solo formulario: no anida otro <form> (hallazgo de PE-25).
 */
export function PantallaRegistrarParto({ identidad }: { identidad: Identidad }) {
  const { id = '' } = useParams();
  const vaca = useLiveQuery(async () => ({ vaca: await consulta.animal.get(id) }), [id]);
  if (!vaca) return <p className="texto-secundario">Cargando…</p>;
  if (!vaca.vaca) {
    return (
      <div className="formulario">
        <p className="titulo-seccion">Registrar parto</p>
        <p>Este animal no está en este teléfono.</p>
        <Link className="boton boton--secundario boton--ancho" to="/animales">
          Volver al listado
        </Link>
      </div>
    );
  }
  return <Formulario vaca={vaca.vaca} identidad={identidad} />;
}

function Formulario({ vaca, identidad }: { vaca: RegistroLocal<'animal'>; identidad: Identidad }) {
  const navegar = useNavigate();
  const [hoy] = useState(() => fechaDelPredio());
  const [parto, setParto] = useState<FormularioParto>({ resultado: null, fecha: hoy, observacion: '' });
  const [cria, setCria] = useState<FormularioCria>(criaVacia(''));
  const [numeroTocado, setNumeroTocado] = useState(false);
  const [fotos, setFotos] = useState<FotosCapturadas>({});
  const [verObservacion, setVerObservacion] = useState(false);
  const [confirmaCercano, setConfirmaCercano] = useState(false);
  const [confirmaParentesco, setConfirmaParentesco] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [erroresCria, setErroresCria] = useState<ErroresFormulario>({});
  const [aviso, setAviso] = useState<string | null>(null);

  const conCria = parto.resultado === 'cria_viva';
  const reproductor = conCria ? reproductorDe(cria) : null;
  const datos = useLiveQuery(
    () => cargarParaParto(vaca.id, parto.fecha, reproductor),
    [vaca.id, parto.fecha, conCria, cria.forma_padre, cria.padre_id, cria.padre_externo],
  );

  // El número de la cría llega prellenado con el siguiente libre, mientras el usuario no lo cambie (sección 6).
  useEffect(() => {
    if (datos && !numeroTocado) setCria((c) => ({ ...c, chapeta: datos.numeroSugerido }));
  }, [datos?.numeroSugerido, numeroTocado]);

  const cambiarParto = (cambios: Partial<FormularioParto>) => {
    setParto((p) => ({ ...p, ...cambios }));
    if ('fecha' in cambios) setConfirmaCercano(false);
    setAviso(null);
  };
  const cambiarCria = (cambios: Partial<FormularioCria>) => {
    setCria((c) => ({ ...c, ...cambios }));
    if ('forma_padre' in cambios || 'padre_id' in cambios || 'padre_externo' in cambios) setConfirmaParentesco(false);
    setErroresCria({});
    setAviso(null);
  };

  const validacion = datos ? validarParto(parto, datos.contexto, hoy) : null;
  const errores = intentado && validacion && !validacion.ok ? validacion.errores : {};
  const mostrarCria = (campo: keyof ErroresFormulario) => (intentado ? erroresCria[campo] : undefined);
  const faltaConfirmar = (!!datos?.cercano && !confirmaCercano) || (!!datos?.parentesco && !confirmaParentesco);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setIntentado(true);
    if (!validacion?.ok || faltaConfirmar) return;
    setGuardando(true);
    try {
      const r = await registrarParto(vaca.id, parto, conCria ? cria : null, identidad, { cercano: confirmaCercano, parentesco: confirmaParentesco }, hoy, fotos);
      if (r.ok) void navegar(r.cria ? `/animales/${r.cria.id}` : `/animales/${vaca.id}?reproduccion=1`);
      else if ('chapetaAsignada' in r) setAviso(`La chapeta ${r.chapetaAsignada.animal.codigo_chapeta} ya está asignada: ${describirAnimalConChapeta(r.chapetaAsignada)}. Escriba otro número.`);
      else if ('requiereConfirmacion' in r) setAviso('Mientras escribía cambió la información del teléfono. Revise los avisos y confirme para guardar.');
      else setErroresCria(r.erroresCria);
    } finally {
      setGuardando(false);
    }
  }

  const observacionAbierta = parto.resultado === 'cria_nacida_muerta' || parto.resultado === 'aborto' || verObservacion || parto.observacion !== '';

  return (
    <form className="formulario" onSubmit={guardar} noValidate>
      <Link className="enlace" to={`/animales/${vaca.id}`}>
        ← Volver a la ficha
      </Link>
      <p className="titulo-seccion">Registrar parto</p>
      <p className="evento__animal">
        Vaca <strong className="registrado__chapeta">{vaca.codigo_chapeta}</strong>
      </p>
      {errores.vaca && (
        <p className="campo__error" role="alert">
          {errores.vaca}
        </p>
      )}

      <label className="campo">
        <span>Fecha del parto</span>
        <input type="date" max={hoy} value={parto.fecha} aria-invalid={!!errores.fecha} onChange={(e) => cambiarParto({ fecha: e.target.value })} />
        {errores.fecha && <span className="campo__error">{errores.fecha}</span>}
      </label>

      {/* Sección 4.2: otro parto cercano pide confirmación. */}
      {datos?.cercano && (
        <div className="aviso aviso--atencion aviso--en-contenido" role="alert">
          <p>
            ⚠ {vaca.codigo_chapeta} tiene un parto del {formatearFecha(datos.cercano.fecha)}, a {datos.cercano.dias === 1 ? '1 día' : `${datos.cercano.dias} días`} de
            esta fecha. Una gestación dura unos nueve meses: ¿no es el mismo parto?
          </p>
          <label className="casilla">
            <input type="checkbox" checked={confirmaCercano} onChange={(e) => setConfirmaCercano(e.target.checked)} />
            Es otro parto
          </label>
        </div>
      )}

      <div className="campo">
        <fieldset className="opciones opciones--tres">
          <legend>Resultado</legend>
          {RESULTADOS_PARTO.map((r) => (
            <button key={r} type="button" className="opcion" aria-pressed={parto.resultado === r} onClick={() => cambiarParto({ resultado: r })}>
              {NOMBRE_RESULTADO[r]}
            </button>
          ))}
        </fieldset>
        {errores.resultado && <span className="campo__error">{errores.resultado}</span>}
      </div>

      {conCria && (
        <fieldset className="tarjeta formulario">
          <legend className="titulo-seccion">La cría</legend>

          <label className="campo">
            <span>Número de la cría</span>
            <span className="campo__ayuda">El siguiente libre. La chapeta se le pondrá después: quedará pendiente.</span>
            <input
              className="campo__chapeta"
              type="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              value={cria.chapeta}
              aria-invalid={!!mostrarCria('chapeta')}
              onChange={(e) => {
                setNumeroTocado(true);
                cambiarCria({ chapeta: e.target.value });
              }}
              onBlur={() => cambiarCria({ chapeta: normalizarChapeta(cria.chapeta) })}
            />
            {mostrarCria('chapeta') && <span className="campo__error">{mostrarCria('chapeta')}</span>}
          </label>

          <div className="campo">
            <fieldset className="opciones">
              <legend>Sexo</legend>
              {(['hembra', 'macho'] as const).map((s) => (
                <button key={s} type="button" className="opcion" aria-pressed={cria.sexo === s} onClick={() => cambiarCria({ sexo: s })}>
                  {s === 'hembra' ? 'Hembra' : 'Macho'}
                </button>
              ))}
            </fieldset>
            {mostrarCria('sexo') && <span className="campo__error">{mostrarCria('sexo')}</span>}
          </div>

          <label className="campo">
            <span>
              Peso al nacer en kg <span className="campo__ayuda">(opcional)</span>
            </span>
            <input type="text" inputMode="decimal" value={cria.peso_inicial} onChange={(e) => cambiarCria({ peso_inicial: e.target.value })} />
            {mostrarCria('peso_inicial') && <span className="campo__error">{mostrarCria('peso_inicial')}</span>}
          </label>

          <SeccionFotografias fotos={fotos} alCambiar={setFotos} />

          <div className="campo">
            <fieldset className="opciones opciones--tres">
              <legend>Reproductor</legend>
              {(
                [
                  ['desconocido', 'Desconocido'],
                  ['predio', 'Del predio'],
                  ['externo', 'Externo'],
                ] as const
              ).map(([forma, texto]) => (
                <button key={forma} type="button" className="opcion" aria-pressed={cria.forma_padre === forma} onClick={() => cambiarCria({ forma_padre: forma })}>
                  {texto}
                </button>
              ))}
            </fieldset>
          </div>
          {cria.forma_padre === 'predio' && (
            <label className="campo">
              <span>Reproductor del predio</span>
              <select value={cria.padre_id} onChange={(e) => cambiarCria({ padre_id: e.target.value })} disabled={!datos?.machos.length}>
                <option value="">Elija un macho</option>
                {datos?.machos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.codigo_chapeta}
                  </option>
                ))}
              </select>
              {mostrarCria('padre_id') && <span className="campo__error">{mostrarCria('padre_id')}</span>}
            </label>
          )}
          {cria.forma_padre === 'externo' && (
            <label className="campo">
              <span>Reproductor externo</span>
              <input type="text" maxLength={100} placeholder="Nombre o referencia del toro" value={cria.padre_externo} onChange={(e) => cambiarCria({ padre_externo: e.target.value })} />
              {mostrarCria('padre_externo') && <span className="campo__error">{mostrarCria('padre_externo')}</span>}
            </label>
          )}

          {/* Sección 5: parentesco con la vaca, con confirmación explícita (CU-10 8b). */}
          {datos?.parentesco && (
            <div className="aviso aviso--atencion aviso--en-contenido" role="alert">
              <p>⚠ {datos.parentesco.texto}</p>
              <p className="aviso__detalle">La revisión usa solo la genealogía registrada en la aplicación.</p>
              <label className="casilla">
                <input type="checkbox" checked={confirmaParentesco} onChange={(e) => setConfirmaParentesco(e.target.checked)} />
                Confirmo el cruce
              </label>
            </div>
          )}
        </fieldset>
      )}

      {observacionAbierta ? (
        <label className="campo">
          <span>
            Observación <span className="campo__ayuda">(opcional)</span>
          </span>
          <textarea rows={3} maxLength={LARGO_OBSERVACION + 50} value={parto.observacion} onChange={(e) => cambiarParto({ observacion: e.target.value })} />
          {errores.observacion && <span className="campo__error">{errores.observacion}</span>}
        </label>
      ) : (
        <button type="button" className="enlace" onClick={() => setVerObservacion(true)}>
          Agregar observación
        </button>
      )}

      {aviso && (
        <p className="campo__error" role="alert">
          {aviso}
        </p>
      )}
      {intentado && validacion && !validacion.ok && (
        <p className="campo__error" role="alert">
          Revise los datos señalados.
        </p>
      )}

      <div className="acciones-formulario">
        <button className="boton boton--principal boton--ancho" type="submit" disabled={guardando || faltaConfirmar}>
          {guardando ? 'Guardando…' : conCria ? 'Guardar parto y cría' : 'Guardar parto'}
        </button>
        <Link className="boton boton--secundario boton--ancho" to={`/animales/${vaca.id}`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
