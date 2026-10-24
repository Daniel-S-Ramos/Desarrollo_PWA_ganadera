import { useLiveQuery } from 'dexie-react-hooks';
import { Bascula, Calendario, Camara, Camion, Cantina, CaraVaca, JeringaFrasco, Lapiz, Monedas, pelajeDe, Senal } from '../../ui/componentes/Ilustraciones';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { imagenCompletaLocal } from '../../datos/repositorio';
import { describirEdad } from '../../dominio/edad';
import { fechaDelPredio, formatearFecha, formatearInstante } from '../../dominio/fechas';
import { rutaImagen } from '../../dominio/fotografias';
import { NOMBRE_DESTINO } from '../../dominio/destino';
import { TIPOS_FOTOGRAFIA, type TipoFotografia } from '../../dominio/tipos';
import { crearServicioRemoto } from '../../servicios/servicioRemotoSupabase';
import { supabase } from '../../servicios/supabase';
import { puedeUsar } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import { DistintivoSync } from '../../ui/componentes/DistintivoSync';
import { useCargaInicialCompleta, useEnLinea } from '../../ui/useEstadoMotor';
import { useUrlDeImagen } from '../../ui/useUrlDeImagen';
import { agregarFotografia } from '../identificacion/actualizarFotos';
import { CapturaFoto } from '../identificacion/CapturaFoto';
import { CambiarDestino } from '../destino/CambiarDestino';
import { cargarContextoDestino } from '../destino/destino';
import { HistorialDestino } from '../destino/HistorialDestino';
import { AvisoChapeta } from '../identificacion/AvisoChapeta';
import { cargarVigente } from '../correcciones/correcciones';
import { EnlaceCorregir, MarcaCorreccion, useUsuarios } from '../correcciones/MarcaCorreccion';
import { describirSalida } from '../../dominio/salida';
import { salidaDelAnimal } from '../salida/salidas';
import { ResolverConflictoChapeta } from '../correcciones/ResolverConflicto';
import { EvolucionPeso } from '../peso/EvolucionPeso';
import { ControlReproductivo } from '../reproduccion/ControlReproductivo';
import { cargarControlReproductivo } from '../reproduccion/partos';
import { cargarConsolidado } from '../economia/consolidado';
import { formatearPesos } from '../../dominio/salida';
import { puedeVerCosto } from '../sanidad/eventos';
import { HistorialSanitario } from '../sanidad/HistorialSanitario';
import { consolidarFicha, type FichaAnimal, type FotoFicha, type Progenitor } from './ficha';

const NOMBRE_VISTA: Record<TipoFotografia, string> = { izquierdo: 'Costado izquierdo', derecho: 'Costado derecho', frontal: 'Frente' };

/**
 * Ficha del animal (CU-03, HU-02, HU-15). Especificación: docs/tecnica/16-ficha-del-animal.md
 * Se actualiza sola cuando cambia la base local: una foto nueva, un dato que llega de otro teléfono.
 */
export function PantallaFicha({ identidad }: { identidad: Identidad }) {
  const { id = '' } = useParams();
  const [hoy] = useState(() => fechaDelPredio());
  const [verFotos, setVerFotos] = useState(false);
  const cargaCompleta = useCargaInicialCompleta();
  // Envuelto para distinguir «cargando» (undefined) de «no está en el teléfono» ({ ficha: undefined }).
  const resultado = useLiveQuery(async () => ({ ficha: await consolidarFicha(id) }), [id]);

  if (!resultado) return <p className="texto-secundario">Cargando…</p>;
  const { ficha } = resultado;
  if (!ficha) {
    return (
      <div className="formulario">
        <p className="titulo-seccion">Ficha del animal</p>
        <p>Este animal no está en este teléfono.</p>
        <Link className="boton boton--secundario boton--ancho" to="/animales">
          Volver al listado
        </Link>
      </div>
    );
  }

  const hembra = ficha.sexo === 'hembra';
  const puedeSalida = !ficha.retirado && puedeUsar(identidad.perfil, 'CU-13');

  // Reorganización del 2026-10-24: quién es, sus datos (origen y genealogía) y una tarjeta por tema, con el dato
  // vigente y sus acciones juntas; lo que se usa poco, al final. La lógica de cada sección no cambia.
  return (
    <div className="ficha">
      <Link className="enlace" to="/animales">
        ← Volver al listado
      </Link>

      {cargaCompleta === false && (
        // Carga inicial (documento técnico 17, sección 5): pueden faltar registros de este animal.
        <p className="aviso aviso--atencion aviso--en-contenido">La información del predio todavía está llegando a este teléfono.</p>
      )}

      <Encabezado ficha={ficha} hoy={hoy} verFotos={verFotos} alAlternarFotos={() => setVerFotos((v) => !v)} />

      {/* Documento técnico 25, sección 7.2: la chapeta pendiente de poner, para ambos perfiles. */}
      {/* Documento técnico 26, sección 10.1: la chapeta repetida, para el propietario o quien la registró. */}
      {ficha.estado_sync === 'conflicto' && <ResolverConflictoChapeta animalId={ficha.id} numero={ficha.codigo_chapeta} identidad={identidad} />}

      {/* Documento técnico 29, sección 7: la salida del animal, con su marca y su corrección. */}
      <SalidaDelAnimal animalId={ficha.id} hembra={hembra} identidad={identidad} />

      {/* Un animal retirado ya no recibe la chapeta (documento técnico 29, sección 7). */}
      {!ficha.retirado && <AvisoChapeta animalId={ficha.id} numero={ficha.codigo_chapeta} nacimiento={ficha.fecha_nacimiento} identidad={identidad} />}

      {verFotos && <VistasFotos ficha={ficha} identidad={identidad} />}

      <section>
        <h2 className="ficha__seccion">Datos del animal</h2>
        <div className="tarjeta ficha__datos-animal">
          <dl className="ficha__lista">
            <div className="ficha__dato">
              <dt>Origen</dt>
              {ficha.origen === 'nacido' ? (
                <dd>Nació en el predio{ficha.fecha_nacimiento ? ` el ${formatearFecha(ficha.fecha_nacimiento)}` : ''}</dd>
              ) : (
                <dd>
                  Comprado{ficha.fecha_ingreso ? `, ingresó el ${formatearFecha(ficha.fecha_ingreso)}` : ''}
                  {(ficha.procedencia || ficha.fecha_nacimiento) && (
                    <small>
                      {ficha.procedencia ? `Procedencia: ${ficha.procedencia}` : ''}
                      {ficha.procedencia && ficha.fecha_nacimiento ? ' · ' : ''}
                      {ficha.fecha_nacimiento ? `Nacimiento ${ficha.fecha_nacimiento_exacta ? '' : 'aproximado '}el ${formatearFecha(ficha.fecha_nacimiento)}` : ''}
                    </small>
                  )}
                </dd>
              )}
            </div>
            <div className="ficha__dato">
              <dt>Genealogía</dt>
              <dd>
                Madre: <TextoProgenitor progenitor={ficha.madre} desconocido="desconocida" externo="externa" />
                <br />
                Padre: <TextoProgenitor progenitor={ficha.padre} desconocido="desconocido" externo="reproductor externo" />
              </dd>
            </div>
          </dl>
          {/* Documento técnico 26, sección 3: la marca de los datos corregidos (la opción de corregir va al final). */}
          <MarcaDatosCorregidos animalId={ficha.id} />
        </div>
      </section>

      <section className="ficha__temas">
        <h2 className="ficha__seccion">Seguimiento</h2>

        {/* Peso: registrar (CU-08) y evolución (CU-09), para ambos perfiles (documento técnico 24, sección 3; HU-02.4). */}
        <TemaPeso ficha={ficha} identidad={identidad} />

        {/* Sanidad: registrar (CU-04) e historial (CU-05), para ambos perfiles (documento técnico 20). */}
        <TemaSanidad ficha={ficha} identidad={identidad} />

        {/* Leche: la producción de la vaca, solo para el propietario (documento técnico 23, sección 2; CU-07). */}
        {(ficha.leche !== null || (hembra && puedeUsar(identidad.perfil, 'CU-07'))) && (
          <Tema
            dibujo={<Cantina tamano={36} />}
            titulo="Leche"
            dato={
              ficha.leche === null ? undefined : ficha.leche === 'sin_registros' ? (
                'Sin registros de leche'
              ) : (
                <>
                  <strong>{formatearNumero(ficha.leche.litros)} litros</strong> · {formatearFecha(ficha.leche.fecha)}
                </>
              )
            }
          >
            {hembra && puedeUsar(identidad.perfil, 'CU-07') && (
              <div className="tema__acciones tema__acciones--una">
                <Link className="boton boton--secundario" to={`/produccion?vaca=${ficha.id}`}>
                  Ver producción
                </Link>
              </div>
            )}
          </Tema>
        )}

        {/* Reproducción: partos (ambos perfiles, CU-10) y control reproductivo (solo el propietario, CU-11). */}
        {hembra && <TemaReproduccion ficha={ficha} identidad={identidad} />}

        {/* Destino: a la vista de ambos; cambiarlo y su historial, solo el propietario (CU-12; HU-06.4). */}
        <TemaDestino ficha={ficha} identidad={identidad} hoy={hoy} />

        {/* Economía: costos y consolidado, solo el propietario; también en un retirado (documento técnico 31, sección 3). */}
        {puedeUsar(identidad.perfil, 'CU-14') && <TemaEconomia animalId={ficha.id} />}
      </section>

      <OtrasAcciones ficha={ficha} identidad={identidad} puedeSalida={puedeSalida} />

      {/* HU-15: quién registró y cuándo, al pie (3.10.4.4). */}
      <p className="ficha__autoria">
        {/* Sin punto final: en Android la hora ya termina en «p. m.» y quedaría «p. m..» (PE-20). */}
        Registrado por <strong>{ficha.autor}</strong> el {formatearInstante(ficha.creado_en)}
      </p>
    </div>
  );
}

/** Una tarjeta de seguimiento: dibujo, título, el dato vigente y sus acciones; lo que se abre, debajo. */
function Tema({ dibujo, titulo, dato, children }: { dibujo: ReactNode; titulo: string; dato?: ReactNode; children?: ReactNode }) {
  return (
    <div className="tarjeta tema">
      <div className="tema__cabeza">
        <span className="ilustracion">{dibujo}</span>
        <div>
          <h3 className="tema__titulo">{titulo}</h3>
          {dato !== undefined && <p className="tema__dato">{dato}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

/** La marca de los datos corregidos del animal (documento técnico 26, sección 3). */
function MarcaDatosCorregidos({ animalId }: { animalId: string }) {
  const vigente = useLiveQuery(() => cargarVigente('animal', animalId), [animalId]);
  if (!vigente) return null;
  return <MarcaCorreccion entidad="animal" vigente={vigente} />;
}

/**
 * Lo que se usa poco: corregir los datos del animal (documento técnico 26, sección 3; la chapeta no) y registrar
 * su salida (documento técnico 29, sección 2: solo el propietario y en un animal activo).
 */
function OtrasAcciones({ ficha, identidad, puedeSalida }: { ficha: FichaAnimal; identidad: Identidad; puedeSalida: boolean }) {
  const vigente = useLiveQuery(() => cargarVigente('animal', ficha.id), [ficha.id]);
  return (
    <section>
      <h2 className="ficha__seccion">Otras acciones</h2>
      <div className="ficha__otras">
        {vigente && (
          <EnlaceCorregir
            entidad="animal"
            registro={vigente.original}
            identidad={identidad}
            texto="Corregir datos"
            clase="boton boton--secundario boton--ilustrado"
            antes={
              <span className="boton__ilustracion">
                <Lapiz />
              </span>
            }
          />
        )}
        {puedeSalida && (
          <Link className="boton boton--secundario boton--ilustrado" to={`/animales/${ficha.id}/salida`}>
            <span className="boton__ilustracion">
              <Camion />
            </span>
            <span>Registrar salida</span>
          </Link>
        )}
      </div>
    </section>
  );
}

/**
 * Peso: registrar y evolución, para ambos perfiles (documento técnico 24, sección 3; HU-02.4). Al volver de
 * registrar un pesaje (?peso=1), la evolución aparece abierta.
 */
function TemaPeso({ ficha, identidad }: { ficha: FichaAnimal; identidad: Identidad }) {
  const [parametros] = useSearchParams();
  const [verEvolucion, setVerEvolucion] = useState(() => parametros.get('peso') === '1');
  const puedeRegistrar = puedeUsar(identidad.perfil, 'CU-08') && !ficha.retirado;
  const puedeVer = puedeUsar(identidad.perfil, 'CU-09');
  return (
    <Tema dibujo={<Bascula tamano={36} />} titulo="Peso" dato={textoPeso(ficha)}>
      {(puedeRegistrar || puedeVer) && (
        <div className={puedeRegistrar && puedeVer ? 'tema__acciones' : 'tema__acciones tema__acciones--una'}>
          {puedeRegistrar && (
            <Link className="boton boton--principal" to={`/animales/${ficha.id}/pesaje`}>
              Registrar pesaje
            </Link>
          )}
          {puedeVer && (
            <button type="button" className="boton boton--secundario" aria-expanded={verEvolucion} onClick={() => setVerEvolucion((v) => !v)}>
              {verEvolucion ? 'Ocultar evolución' : 'Ver evolución'}
            </button>
          )}
        </div>
      )}
      {verEvolucion && <EvolucionPeso animalId={ficha.id} puedeRegistrar={puedeRegistrar} identidad={identidad} />}
    </Tema>
  );
}

/** Sanidad: registrar e historial, para ambos perfiles (documento técnico 20, secciones 3 y 8; HU-02.4). */
function TemaSanidad({ ficha, identidad }: { ficha: FichaAnimal; identidad: Identidad }) {
  // Desde la consulta de correcciones (?sanidad=1) el historial aparece abierto (documento técnico 27, sección 6).
  const [parametros] = useSearchParams();
  const [verHistorial, setVerHistorial] = useState(() => parametros.get('sanidad') === '1');
  const puedeRegistrar = puedeUsar(identidad.perfil, 'CU-04') && !ficha.retirado;
  const puedeVer = puedeUsar(identidad.perfil, 'CU-05');
  return (
    <Tema
      dibujo={<JeringaFrasco tamano={38} />}
      titulo="Sanidad"
      dato={
        ficha.vacuna ? (
          <>
            <strong>{ficha.vacuna.nombre}</strong> · última vacuna, {formatearFecha(ficha.vacuna.fecha)}
          </>
        ) : (
          'Sin vacunas registradas'
        )
      }
    >
      {(puedeRegistrar || puedeVer) && (
        <div className={puedeRegistrar && puedeVer ? 'tema__acciones' : 'tema__acciones tema__acciones--una'}>
          {puedeRegistrar && (
            <Link className="boton boton--principal" to={`/animales/${ficha.id}/evento-sanitario`}>
              Registrar evento
            </Link>
          )}
          {puedeVer && (
            <button type="button" className="boton boton--secundario" aria-expanded={verHistorial} onClick={() => setVerHistorial((v) => !v)}>
              {verHistorial ? 'Ocultar historial' : 'Ver historial'}
            </button>
          )}
        </div>
      )}
      {verHistorial && <HistorialSanitario animalId={ficha.id} verCosto={puedeVerCosto(identidad.perfil)} puedeRegistrar={puedeRegistrar} identidad={identidad} />}
    </Tema>
  );
}

/**
 * Reproducción: registrar partos (ambos perfiles, CU-10) y el control reproductivo (solo el propietario, CU-11).
 * Documento técnico 25, sección 3. Al volver de registrar un parto sin cría (?reproduccion=1), el control
 * aparece abierto. El número de partos solo lo ve quien ve el control.
 */
function TemaReproduccion({ ficha, identidad }: { ficha: FichaAnimal; identidad: Identidad }) {
  const [parametros] = useSearchParams();
  const puedeVerControl = puedeUsar(identidad.perfil, 'CU-11');
  const [verControl, setVerControl] = useState(() => puedeVerControl && parametros.get('reproduccion') === '1');
  const puedeRegistrar = puedeUsar(identidad.perfil, 'CU-10') && !ficha.retirado;
  const control = useLiveQuery(() => (puedeVerControl ? cargarControlReproductivo(ficha.id) : Promise.resolve(null)), [ficha.id, puedeVerControl]);
  if (!puedeRegistrar && !puedeVerControl) return null;
  const partos = control ? [...control.vigentes.values()].filter((v) => v.anulacion === null).length : null;
  return (
    <Tema
      dibujo={<Calendario tamano={34} />}
      titulo="Reproducción"
      dato={partos === null ? undefined : partos === 0 ? 'Sin partos registrados' : partos === 1 ? <strong>1 parto</strong> : <strong>{partos} partos</strong>}
    >
      <div className={puedeRegistrar && puedeVerControl ? 'tema__acciones' : 'tema__acciones tema__acciones--una'}>
        {puedeRegistrar && (
          <Link className="boton boton--principal" to={`/animales/${ficha.id}/parto`}>
            Registrar parto
          </Link>
        )}
        {puedeVerControl && (
          <button type="button" className="boton boton--secundario" aria-expanded={verControl} onClick={() => setVerControl((v) => !v)}>
            {verControl ? 'Ocultar control' : 'Control reproductivo'}
          </button>
        )}
      </div>
      {verControl && <ControlReproductivo vacaId={ficha.id} identidad={identidad} />}
    </Tema>
  );
}

/** Destino: a la vista de ambos perfiles; cambiarlo y su historial, solo el propietario (documento técnico 19). */
function TemaDestino({ ficha, identidad, hoy }: { ficha: FichaAnimal; identidad: Identidad; hoy: string }) {
  // Desde la consulta de correcciones (?destino=1) el historial aparece abierto (documento técnico 27, sección 6).
  const [parametros] = useSearchParams();
  const puedeGestionar = puedeUsar(identidad.perfil, 'CU-12');
  const [abierto, setAbierto] = useState<'cambiar' | 'historial' | null>(() => (puedeGestionar && parametros.get('destino') === '1' ? 'historial' : null));
  const contexto = useLiveQuery(() => cargarContextoDestino(ficha.id), [ficha.id]);
  const alternar = (opcion: 'cambiar' | 'historial') => setAbierto((actual) => (actual === opcion ? null : opcion));
  return (
    <Tema
      dibujo={<Senal tamano={34} />}
      titulo="Destino"
      dato={
        ficha.destino ? (
          <>
            <strong>{NOMBRE_DESTINO[ficha.destino.destino]}</strong> · desde el {formatearFecha(ficha.destino.desde)}
          </>
        ) : (
          'Sin destino asignado'
        )
      }
    >
      {puedeGestionar && (
        <div className={!ficha.retirado ? 'tema__acciones' : 'tema__acciones tema__acciones--una'}>
          {!ficha.retirado && (
            <button type="button" className="boton boton--secundario" aria-expanded={abierto === 'cambiar'} onClick={() => alternar('cambiar')}>
              Cambiar destino
            </button>
          )}
          <button type="button" className="boton boton--secundario" aria-expanded={abierto === 'historial'} onClick={() => alternar('historial')}>
            {abierto === 'historial' ? 'Ocultar historial' : 'Ver historial'}
          </button>
        </div>
      )}
      {abierto === 'cambiar' && contexto && (
        <CambiarDestino animalId={ficha.id} contexto={contexto} identidad={identidad} hoy={hoy} alTerminar={() => setAbierto(null)} />
      )}
      {abierto === 'historial' && <HistorialDestino animalId={ficha.id} identidad={identidad} />}
    </Tema>
  );
}

/** Economía: lo invertido y los accesos a registrar un costo y al consolidado (documento técnico 31). */
function TemaEconomia({ animalId }: { animalId: string }) {
  const consolidado = useLiveQuery(() => cargarConsolidado(animalId), [animalId]);
  return (
    <Tema
      dibujo={<Monedas tamano={36} />}
      titulo="Economía"
      dato={
        consolidado ? (
          <>
            Invertido <strong>{formatearPesos(consolidado.totalInvertido)}</strong>
          </>
        ) : undefined
      }
    >
      <div className="tema__acciones">
        <Link className="boton boton--secundario" to={`/animales/${animalId}/costo`}>
          Registrar costo
        </Link>
        <Link className="boton boton--secundario" to={`/animales/${animalId}/consolidado`}>
          Ver consolidado
        </Link>
      </div>
    </Tema>
  );
}

function Encabezado({ ficha, hoy, verFotos, alAlternarFotos }: { ficha: FichaAnimal; hoy: string; verFotos: boolean; alAlternarFotos: () => void }) {
  const foto = useUrlDeImagen(ficha.fotoPrincipal);
  const hembra = ficha.sexo === 'hembra';
  const incompleto = ficha.fotos.length < 3 && !ficha.retirado;
  return (
    <header className="ficha__encabezado">
      {foto ? (
        <img className="ficha__foto" src={foto} alt={`Animal ${ficha.codigo_chapeta}`} />
      ) : (
        <div className="ficha__foto ficha__foto--ilustrada" role="img" aria-label="Sin foto">
          <CaraVaca tamano={112} pelaje={pelajeDe(ficha.id)} />
        </div>
      )}
      <div className="ficha__identidad">
        <span className="ficha__chapeta chapeta chapeta--grande">{ficha.codigo_chapeta}</span>
        <span className="fila-animal__detalle">
          <span className="fila-animal__sexo" aria-hidden="true">
            {hembra ? '♀' : '♂'}
          </span>{' '}
          {hembra ? 'Hembra' : 'Macho'} · {describirEdad(ficha.fecha_nacimiento, ficha.fecha_nacimiento_exacta, hoy)}
        </span>
        {ficha.retirado && <span className="fila-animal__retirado">{hembra ? 'Retirada' : 'Retirado'} del predio</span>}
        <DistintivoSync estado={ficha.estado_sync} {...(ficha.detalle_conflicto ? { detalle: ficha.detalle_conflicto } : {})} />
      </div>
      {/* Tabla 31: el registro fotográfico incompleto se señala para completarlo después; en una franja, con su acción al lado. */}
      <div className={incompleto ? 'ficha__fotos-franja ficha__fotos-franja--incompleta' : 'ficha__fotos-franja'}>
        <span>
          {incompleto ? '⚠ ' : ''}Fotos: {ficha.fotos.length} de 3
        </span>
        <button type="button" className="boton boton--secundario boton--ilustrado ficha__fotos-boton" aria-expanded={verFotos} onClick={alAlternarFotos}>
          <span className="boton__ilustracion">
            <Camara tamano={26} />
          </span>
          <span>{verFotos ? 'Ocultar fotos' : incompleto ? 'Completar fotos' : 'Ver fotos'}</span>
        </button>
      </div>
    </header>
  );
}

/**
 * La salida del animal (documento técnico 29, secciones 7 y 8): «Vendido el …», con su autor, la marca de
 * corregida o anulada y la opción de corregirla o anularla. Anulada, se muestra tachada.
 */
function SalidaDelAnimal({ animalId, hembra, identidad }: { animalId: string; hembra: boolean; identidad: Identidad }) {
  const salida = useLiveQuery(() => salidaDelAnimal(animalId), [animalId]);
  const usuarios = useUsuarios();
  if (!salida) return null;
  const s = salida.registro;
  const anulada = salida.anulacion !== null;
  return (
    <section className={anulada ? 'tarjeta ficha__salida ficha__salida--anulada' : 'tarjeta ficha__salida'}>
      <p className={anulada ? 'ficha__salida-texto tachado' : 'ficha__salida-texto'}>{describirSalida({ ...s, observacion: s.observacion ?? null }, hembra)}</p>
      <p className="texto-secundario">Registrado por {usuarios.get(s.autor_id)?.nombre ?? 'un usuario que ya no está en el predio'}</p>
      <MarcaCorreccion entidad="salida" vigente={salida} />
      {!anulada && <EnlaceCorregir entidad="salida" registro={salida.original} identidad={identidad} />}
    </section>
  );
}

/** Las tres vistas, con su autoría, y la opción de completar o cambiar cada una (sección 5). */
function VistasFotos({ ficha, identidad }: { ficha: FichaAnimal; identidad: Identidad }) {
  const enLinea = useEnLinea();
  return (
    <section className="tarjeta fotografias">
      {!enLinea && <p className="texto-secundario">Las fotos completas requieren conexión.</p>}
      {TIPOS_FOTOGRAFIA.map((tipo) => {
        const foto = ficha.fotos.find((f) => f.tipo === tipo);
        return (
          <div key={tipo} className="ficha__vista">
            <p className="ficha__vista-nombre">{NOMBRE_VISTA[tipo]}</p>
            {foto ? <FotoCompleta animalId={ficha.id} foto={foto} enLinea={enLinea} /> : <div className="ficha__vacia fila-animal__sin-foto">Sin foto</div>}
            {/* Documento técnico 29, sección 7: un animal retirado ya no recibe fotos nuevas. */}
            {!ficha.retirado && (
              <CapturaFoto
                etiqueta={foto ? 'Cambiar foto' : 'Tomar foto'}
                principal={!foto}
                alCapturar={async (nueva) => {
                  await agregarFotografia(ficha.id, tipo, nueva, identidad);
                }}
              />
            )}
          </div>
        );
      })}
    </section>
  );
}

/** La versión completa: la local si aún no se subió; si no, del servicio, solo con conexión (sección 5.1). */
function FotoCompleta({ animalId, foto, enLinea }: { animalId: string; foto: FotoFicha; enLinea: boolean }) {
  const [imagen, setImagen] = useState<Blob | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'lista' | 'sin_conexion' | 'no_disponible'>('cargando');
  const url = useUrlDeImagen(imagen);

  useEffect(() => {
    let vigente = true;
    void (async () => {
      const local = await imagenCompletaLocal(foto.fotografia_id);
      if (local) {
        if (vigente) {
          setImagen(local);
          setEstado('lista');
        }
        return;
      }
      if (!enLinea) {
        if (vigente) setEstado('sin_conexion');
        return;
      }
      const resultado = await crearServicioRemoto(supabase).descargarImagen(rutaImagen(animalId, foto.fotografia_id, 'completa'));
      if (!vigente) return;
      if (resultado.ok) {
        setImagen(resultado.imagen);
        setEstado('lista');
      } else setEstado('no_disponible');
    })();
    return () => {
      vigente = false;
    };
  }, [animalId, foto.fotografia_id, enLinea]);

  return (
    <figure className="ficha__figura">
      {estado === 'lista' && url ? (
        <img className="ficha__completa" src={url} alt={NOMBRE_VISTA[foto.tipo]} />
      ) : (
        <div className="ficha__vacia fila-animal__sin-foto">
          {estado === 'cargando' ? 'Cargando…' : estado === 'sin_conexion' ? 'Requiere conexión' : 'Imagen no disponible todavía'}
        </div>
      )}
      {/* HU-15: la autoría de cada dato (decisión G). */}
      <figcaption className="texto-secundario">
        Foto de {foto.autor}, {formatearInstante(foto.creado_en)}
      </figcaption>
    </figure>
  );
}

function TextoProgenitor({ progenitor, desconocido, externo }: { progenitor: Progenitor; desconocido: string; externo: string }) {
  if (progenitor.forma === 'predio' && progenitor.id) {
    return <Link to={`/animales/${progenitor.id}`}>{progenitor.texto}</Link>;
  }
  if (progenitor.forma === 'externo') {
    return (
      <>
        {progenitor.texto} <span className="texto-secundario">({externo})</span>
      </>
    );
  }
  return <>{desconocido}</>;
}

function textoPeso(ficha: FichaAnimal): string {
  const peso = ficha.peso;
  if (!peso) return 'Sin pesajes registrados';
  const kg = `${formatearNumero(peso.kg)} kg`;
  if (peso.tipo === 'pesaje') return `${kg} · ${formatearFecha(peso.fecha)}`;
  return peso.fecha ? `${kg} · ${peso.tipo}, ${formatearFecha(peso.fecha)}` : `${kg} · ${peso.tipo}`;
}

/** 14,5 en lugar de 14.5: la coma decimal de Colombia (litros y kilos). */
function formatearNumero(valor: number): string {
  return valor.toLocaleString('es-CO', { maximumFractionDigits: 1 });
}
