import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
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

      {verFotos && <VistasFotos ficha={ficha} identidad={identidad} />}

      {/* Los datos que pidió el propietario, en su orden (3.10.4.4). */}
      <dl className="ficha__datos">
        <Dato nombre="Último peso" valor={textoPeso(ficha)} />
        <Dato nombre="Última vacuna" valor={ficha.vacuna ? `${ficha.vacuna.nombre} · ${formatearFecha(ficha.vacuna.fecha)}` : 'Sin vacunas registradas'} />
        {ficha.leche !== null && (
          <Dato
            nombre="Leche más reciente"
            valor={ficha.leche === 'sin_registros' ? 'Sin registros de leche' : `${formatearNumero(ficha.leche.litros)} litros · ${formatearFecha(ficha.leche.fecha)}`}
          />
        )}
        <Dato
          nombre="Destino productivo"
          valor={ficha.destino ? `${NOMBRE_DESTINO[ficha.destino.destino]} · desde el ${formatearFecha(ficha.destino.desde)}` : 'Sin destino asignado'}
        />
      </dl>

      <SeccionSanidad animalId={ficha.id} identidad={identidad} />

      {/* CU-12: solo el propietario cambia el destino y ve su historial; al trabajador no se le muestran (HU-06.4). */}
      {puedeUsar(identidad.perfil, 'CU-12') && <SeccionDestino animalId={ficha.id} identidad={identidad} hoy={hoy} />}

      <section className="tarjeta">
        <h2>Origen</h2>
        {ficha.origen === 'nacido' ? (
          <p>Nació en el predio{ficha.fecha_nacimiento ? ` el ${formatearFecha(ficha.fecha_nacimiento)}` : ''}.</p>
        ) : (
          <p>
            Comprado{ficha.fecha_ingreso ? `, ingresó el ${formatearFecha(ficha.fecha_ingreso)}` : ''}
            {ficha.procedencia ? `. Procedencia: ${ficha.procedencia}` : ''}.
          </p>
        )}
        {ficha.origen === 'comprado' && ficha.fecha_nacimiento && (
          <p className="texto-secundario">
            Nacimiento {ficha.fecha_nacimiento_exacta ? '' : 'aproximado '}el {formatearFecha(ficha.fecha_nacimiento)}.
          </p>
        )}
      </section>

      <section className="tarjeta">
        <h2>Genealogía</h2>
        <p>
          Madre: <TextoProgenitor progenitor={ficha.madre} desconocido="desconocida" externo="externa" />
        </p>
        <p>
          Padre: <TextoProgenitor progenitor={ficha.padre} desconocido="desconocido" externo="reproductor externo" />
        </p>
      </section>

      {/* HU-15: quién registró y cuándo, al pie (3.10.4.4). */}
      <p className="ficha__autoria">
        {/* Sin punto final: en Android la hora ya termina en «p. m.» y quedaría «p. m..» (PE-20). */}
        Registrado por <strong>{ficha.autor}</strong> el {formatearInstante(ficha.creado_en)}
      </p>
    </div>
  );
}

/** Registro e historial sanitario, para ambos perfiles (documento técnico 20, secciones 3 y 8; HU-02.4). */
function SeccionSanidad({ animalId, identidad }: { animalId: string; identidad: Identidad }) {
  const [verHistorial, setVerHistorial] = useState(false);
  const puedeRegistrar = puedeUsar(identidad.perfil, 'CU-04');
  if (!puedeRegistrar && !puedeUsar(identidad.perfil, 'CU-05')) return null;
  return (
    <>
      <div className="acciones-formulario">
        {puedeRegistrar && (
          <Link className="boton boton--principal boton--ancho" to={`/animales/${animalId}/evento-sanitario`}>
            Registrar evento sanitario
          </Link>
        )}
        {puedeUsar(identidad.perfil, 'CU-05') && (
          <button type="button" className="boton boton--secundario boton--ancho" aria-expanded={verHistorial} onClick={() => setVerHistorial((v) => !v)}>
            {verHistorial ? 'Ocultar historial sanitario' : 'Historial sanitario'}
          </button>
        )}
      </div>
      {verHistorial && <HistorialSanitario animalId={animalId} verCosto={puedeVerCosto(identidad.perfil)} puedeRegistrar={puedeRegistrar} />}
    </>
  );
}

/** Las opciones del propietario sobre el destino (documento técnico 19, secciones 2 y 4). */
function SeccionDestino({ animalId, identidad, hoy }: { animalId: string; identidad: Identidad; hoy: string }) {
  const [abierto, setAbierto] = useState<'cambiar' | 'historial' | null>(null);
  const contexto = useLiveQuery(() => cargarContextoDestino(animalId), [animalId]);
  const alternar = (opcion: 'cambiar' | 'historial') => setAbierto((actual) => (actual === opcion ? null : opcion));

  return (
    <>
      <div className="acciones-formulario">
        <button type="button" className="boton boton--secundario boton--ancho" aria-expanded={abierto === 'cambiar'} onClick={() => alternar('cambiar')}>
          Cambiar destino
        </button>
        <button type="button" className="boton boton--secundario boton--ancho" aria-expanded={abierto === 'historial'} onClick={() => alternar('historial')}>
          {abierto === 'historial' ? 'Ocultar historial del destino' : 'Historial del destino'}
        </button>
      </div>
      {abierto === 'cambiar' && contexto && (
        <CambiarDestino animalId={animalId} contexto={contexto} identidad={identidad} hoy={hoy} alTerminar={() => setAbierto(null)} />
      )}
      {abierto === 'historial' && <HistorialDestino animalId={animalId} />}
    </>
  );
}

function Encabezado({ ficha, hoy, verFotos, alAlternarFotos }: { ficha: FichaAnimal; hoy: string; verFotos: boolean; alAlternarFotos: () => void }) {
  const foto = useUrlDeImagen(ficha.fotoPrincipal);
  const hembra = ficha.sexo === 'hembra';
  return (
    <header className="ficha__encabezado">
      {foto ? <img className="ficha__foto" src={foto} alt={`Animal ${ficha.codigo_chapeta}`} /> : <div className="ficha__foto fila-animal__sin-foto">Sin foto</div>}
      <div className="ficha__identidad">
        <span className="ficha__chapeta">{ficha.codigo_chapeta}</span>
        <span className="fila-animal__detalle">
          {hembra ? 'Hembra' : 'Macho'} · {describirEdad(ficha.fecha_nacimiento, ficha.fecha_nacimiento_exacta, hoy)}
        </span>
        {ficha.retirado && <span className="fila-animal__retirado">{hembra ? 'Retirada' : 'Retirado'} del predio</span>}
        <DistintivoSync estado={ficha.estado_sync} {...(ficha.detalle_conflicto ? { detalle: ficha.detalle_conflicto } : {})} />
      </div>
      <div className="ficha__fotos-resumen">
        {ficha.fotos.length < 3 ? (
          // Tabla 31: el registro fotográfico incompleto se señala para completarlo después.
          <p className="aviso aviso--atencion aviso--en-contenido">⚠ Registro fotográfico incompleto: {ficha.fotos.length} de 3.</p>
        ) : (
          <p className="texto-secundario">Fotos: 3 de 3</p>
        )}
        <button type="button" className="boton boton--secundario boton--ancho" onClick={alAlternarFotos}>
          {verFotos ? 'Ocultar fotos' : ficha.fotos.length < 3 ? 'Ver y completar fotos' : 'Ver fotos'}
        </button>
      </div>
    </header>
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
            <CapturaFoto
              etiqueta={foto ? 'Cambiar foto' : 'Tomar foto'}
              principal={!foto}
              alCapturar={async (nueva) => {
                await agregarFotografia(ficha.id, tipo, nueva, identidad);
              }}
            />
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

function Dato({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <div className="ficha__dato">
      <dt>{nombre}</dt>
      <dd>{valor}</dd>
    </div>
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
