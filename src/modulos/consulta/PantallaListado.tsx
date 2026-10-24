import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { NOMBRE_DESTINO } from '../../dominio/destino';
import { describirEdad } from '../../dominio/edad';
import type { Destino } from '../../dominio/tipos';
import { fechaDelPredio } from '../../dominio/fechas';
import { DistintivoSync } from '../../ui/componentes/DistintivoSync';
import { IconoFlecha, IconoLupa, IconoReiniciar } from '../../ui/componentes/Iconos';
import {
  Camion,
  Cantina,
  CaraVaca,
  CercaRota,
  Cruz,
  EtiquetaPrecio,
  FlechaCurva,
  GrupoVacas,
  Interrogacion,
  pelajeDe,
  Pasto,
  PlantaBeneficio,
  Toro,
  Visto,
} from '../../ui/componentes/Ilustraciones';
import { TituloPantalla } from '../../ui/componentes/TituloPantalla';
import { useUrlDeImagen } from '../../ui/useUrlDeImagen';
import { normalizarChapeta } from '../identificacion/registroAnimal';
import { buscar, cargarListado, contarListado, type AnimalListado, type FiltroDestino, type FiltroEstado, type FiltroSalida } from './listado';

/** Los tres estados, con su dibujo (paso 1 del listado). */
const ESTADOS: { clave: FiltroEstado; nombre: string; dibujo: ReactNode }[] = [
  { clave: 'activos', nombre: 'Activos', dibujo: <CaraVaca tamano={40} conFondo={false} /> },
  { clave: 'retirados', nombre: 'Retirados', dibujo: <span className="estado-gris"><CaraVaca tamano={40} pelaje="parda" conFondo={false} /></span> },
  { clave: 'todos', nombre: 'Todos', dibujo: <GrupoVacas tamano={46} /> },
];

/** Las categorías por destino (documento técnico 19, sección 6; 3.10.4.4), con su dibujo. */
const DIBUJO_DESTINO: Record<Destino, ReactNode> = {
  reproductor: <Toro />,
  reproductora: <CaraVaca tamano={44} conFondo={false} />,
  leche: <Cantina tamano={40} />,
  ceba: <Pasto />,
  venta: <EtiquetaPrecio />,
  sacrificio: <PlantaBeneficio />,
};
const CATEGORIAS_DESTINO: { clave: FiltroDestino; nombre: string; dibujo: ReactNode }[] = [
  { clave: 'todos', nombre: 'Todas', dibujo: <GrupoVacas /> },
  ...(Object.keys(DIBUJO_DESTINO) as Destino[]).map((d) => ({ clave: d as FiltroDestino, nombre: NOMBRE_DESTINO[d], dibujo: DIBUJO_DESTINO[d] })),
  { clave: 'sin_destino', nombre: 'Sin destino', dibujo: <Interrogacion /> },
];

/** Con los retirados, las categorías son los motivos de salida: así se encuentran los vendidos (2026-10-22). */
const CATEGORIAS_SALIDA: { clave: FiltroSalida; nombre: string; dibujo: ReactNode }[] = [
  { clave: 'todos', nombre: 'Todos', dibujo: <GrupoVacas /> },
  { clave: 'venta', nombre: 'Vendidos', dibujo: <Camion tamano={40} /> },
  { clave: 'muerte', nombre: 'Muertos', dibujo: <Cruz /> },
  { clave: 'perdida_robo', nombre: 'Pérdida o robo', dibujo: <CercaRota /> },
];

const NOMBRE_ESTADO: Record<FiltroEstado, string> = { activos: 'Activos', retirados: 'Retirados', todos: 'Todos' };
const animalesTexto = (n: number) => (n === 1 ? '1 animal' : `${n} animales`);

/**
 * Listado de animales con búsqueda por chapeta (CU-03, RF-06). Rediseño del 2026-10-24: primero el estado,
 * después la categoría, con dibujos y conteos, y la flecha que une los dos pasos.
 * Especificación: docs/tecnica/15-listado-de-animales.md, secciones 2 a 4 y 7
 */
export function PantallaListado({ puedeRegistrar, informacionIncompleta = false }: { puedeRegistrar: boolean; informacionIncompleta?: boolean }) {
  const navegar = useNavigate();
  const [texto, setTexto] = useState('');
  const [filtro, setFiltro] = useState<FiltroEstado>('activos');
  const [filtroDestino, setFiltroDestino] = useState<FiltroDestino>('todos');
  const [filtroSalida, setFiltroSalida] = useState<FiltroSalida>('todos');
  const [hoy] = useState(() => fechaDelPredio());
  // La lista observa la base local: se actualiza sola cuando llega un animal o una foto.
  const animales = useLiveQuery(() => cargarListado(), []);

  if (!animales) return <p className="texto-secundario">Cargando…</p>;

  const resultado = buscar(animales, texto, filtro, filtroDestino, filtroSalida);
  const conteos = contarListado(animales, filtro);
  const buscada = normalizarChapeta(texto);
  const porMotivo = filtro === 'retirados';
  const categorias = porMotivo
    ? CATEGORIAS_SALIDA.map((c) => ({ ...c, cantidad: conteos.salidas[c.clave], elegida: filtroSalida === c.clave, elegir: () => setFiltroSalida(c.clave) }))
    : CATEGORIAS_DESTINO.map((c) => ({ ...c, cantidad: conteos.destinos[c.clave] ?? 0, elegida: filtroDestino === c.clave, elegir: () => setFiltroDestino(c.clave) }));
  const categoriaElegida = categorias.find((c) => c.elegida)?.nombre ?? 'Todas';
  const conFiltros = texto !== '' || filtro !== 'activos' || filtroDestino !== 'todos' || filtroSalida !== 'todos';

  function limpiar() {
    setTexto('');
    setFiltro('activos');
    setFiltroDestino('todos');
    setFiltroSalida('todos');
  }

  return (
    <div className="listado">
      <TituloPantalla dibujo={<CaraVaca tamano={40} conFondo={false} />}>Animales</TituloPantalla>
      <p className="texto-secundario listado__subtitulo">Busque y consulte sus animales registrados.</p>
      {informacionIncompleta && (
        // Carga inicial (documento técnico 17, sección 5): la lista todavía no tiene todos los animales.
        <p className="aviso aviso--atencion aviso--en-contenido">La información del predio todavía está llegando a este teléfono.</p>
      )}

      <label className="campo">
        <span className="solo-lector">Buscar por chapeta</span>
        <span className="campo__grupo campo__grupo--busqueda">
          <span className="campo__icono campo__icono--claro" aria-hidden="true">
            <IconoLupa />
          </span>
          <input
            className="campo__chapeta"
            type="search"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="Número de chapeta"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </span>
      </label>

      <h2 className="listado__paso">1. Seleccione el estado</h2>
      <div className="estados" role="group" aria-label="Estado">
        {ESTADOS.map((e) => (
          <button key={e.clave} type="button" className="estado" aria-pressed={filtro === e.clave} onClick={() => setFiltro(e.clave)}>
            <span className="estado__dibujo">{e.dibujo}</span>
            <strong>{e.nombre}</strong>
            <span className="estado__cantidad">{animalesTexto(conteos.estados[e.clave])}</span>
          </button>
        ))}
      </div>
      {/* La flecha baja del estado elegido hacia el paso 2 (pedido del autor, 2026-10-24). */}
      <div className="estados__flechas" aria-hidden="true">
        {ESTADOS.map((e) => (
          <span key={e.clave}>{filtro === e.clave && <FlechaCurva />}</span>
        ))}
      </div>

      <section className="categorias">
        <h2 className="listado__paso">{porMotivo ? '2. ¿Por qué salieron?' : '2. ¿Qué tipo de animal busca?'}</h2>
        <p className="categorias__ayuda">
          {porMotivo ? 'Motivo de la salida de los animales retirados.' : filtro === 'todos' ? 'Categorías de todos los animales.' : 'Categorías de los animales activos.'}
        </p>
        <div className="categorias__rejilla" role="group" aria-label={porMotivo ? 'Motivo de la salida' : 'Destino productivo'}>
          {categorias.map((c) => (
            <button key={c.clave} type="button" className="categoria" aria-pressed={c.elegida} onClick={c.elegir}>
              {c.elegida && (
                <span className="categoria__visto">
                  <Visto />
                </span>
              )}
              <span className="categoria__dibujo">{c.dibujo}</span>
              <span className="categoria__texto">
                <strong>{c.nombre}</strong>
                <span>{c.cantidad}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="listado__resumen" aria-live="polite">
        <div>
          <strong>{resultado.animales.length === 1 ? '1 animal encontrado' : `${resultado.animales.length} animales encontrados`}</strong>
          <span>
            Estado: {NOMBRE_ESTADO[filtro]} · {porMotivo ? 'Motivo' : 'Categoría'}: {categoriaElegida}
          </span>
        </div>
        {conFiltros && (
          <button type="button" className="boton boton--secundario listado__limpiar" onClick={limpiar}>
            <IconoReiniciar />
            <span>Limpiar filtros</span>
          </button>
        )}
      </div>

      {resultado.errorFormato && <p className="campo__error">{resultado.errorFormato}</p>}

      <ul className="listado__filas">
        {resultado.animales.map((animal) => (
          <FilaAnimal
            key={animal.id}
            animal={animal}
            hoy={hoy}
            exacta={animal.codigo_chapeta === buscada}
            alAbrir={() => void navegar(`/animales/${animal.id}`)}
          />
        ))}
      </ul>

      {resultado.ofrecerRegistro && !informacionIncompleta && (
        // CU-03, 2a, y 3.11.1: si el animal no aparece, se registra en ese momento.
        <div className="aviso aviso--atencion aviso--en-contenido">
          <p>
            La chapeta <strong>{resultado.ofrecerRegistro}</strong> no está registrada en este teléfono.
          </p>
          {puedeRegistrar && (
            <div className="aviso__acciones">
              <Link className="boton boton--principal boton--ancho" to={`/animales/nuevo?chapeta=${encodeURIComponent(resultado.ofrecerRegistro)}`}>
                Registrar el animal {resultado.ofrecerRegistro}
              </Link>
            </div>
          )}
        </div>
      )}

      {puedeRegistrar && !resultado.ofrecerRegistro && (
        <Link className="boton boton--secundario boton--ancho separado" to="/animales/nuevo">
          Registrar animal
        </Link>
      )}
    </div>
  );
}

function FilaAnimal({ animal, hoy, exacta, alAbrir }: { animal: AnimalListado; hoy: string; exacta: boolean; alAbrir: () => void }) {
  const foto = useUrlDeImagen(animal.foto);
  const hembra = animal.sexo === 'hembra';
  return (
    <li>
      <button type="button" className={`fila-animal${exacta ? ' fila-animal--exacta' : ''}`} onClick={alAbrir}>
        {foto ? (
          <img className="fila-animal__foto" src={foto} alt="" />
        ) : (
          <span className="fila-animal__foto fila-animal__foto--ilustrada" role="img" aria-label="Sin foto">
            <CaraVaca tamano={64} pelaje={pelajeDe(animal.id)} />
          </span>
        )}
        <span className="fila-animal__datos">
          <span className="fila-animal__chapeta chapeta">{animal.codigo_chapeta}</span>
          <span className="fila-animal__detalle">
            <span className="fila-animal__sexo" aria-hidden="true">
              {hembra ? '♀' : '♂'}
            </span>{' '}
            {hembra ? 'Hembra' : 'Macho'} · {describirEdad(animal.fecha_nacimiento, animal.fecha_nacimiento_exacta, hoy)}
            {animal.destino ? ` · ${NOMBRE_DESTINO[animal.destino]}` : ''}
          </span>
          {animal.retirado && <span className="fila-animal__retirado">{hembra ? 'Retirada' : 'Retirado'}</span>}
          {animal.chapetaPendiente && <span className="fila-animal__chapeta-pendiente">Sin chapeta puesta</span>}
          <DistintivoSync estado={animal.estado_sync} {...(animal.detalle_conflicto ? { detalle: animal.detalle_conflicto } : {})} />
        </span>
        <span className="fila-animal__flecha">
          <IconoFlecha />
        </span>
      </button>
    </li>
  );
}
