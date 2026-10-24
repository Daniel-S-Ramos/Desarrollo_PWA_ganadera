import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { NOMBRE_DESTINO } from '../../dominio/destino';
import { describirEdad } from '../../dominio/edad';
import type { Destino } from '../../dominio/tipos';
import { fechaDelPredio } from '../../dominio/fechas';
import { DistintivoSync } from '../../ui/componentes/DistintivoSync';
import { IconoLupa } from '../../ui/componentes/Iconos';
import {
  Camion,
  Cantina,
  CaraVaca,
  CercaRota,
  Cruz,
  EtiquetaPrecio,
  Interrogacion,
  pelajeDe,
  Pasto,
  PlantaBeneficio,
  SiluetasVacas,
  SiluetaVaca,
  Visto,
} from '../../ui/componentes/Ilustraciones';
import { TituloPantalla } from '../../ui/componentes/TituloPantalla';
import { useUrlDeImagen } from '../../ui/useUrlDeImagen';
import { normalizarChapeta } from '../identificacion/registroAnimal';
import { buscar, cargarListado, contarEstados, type AnimalListado, type FiltroDestino, type FiltroEstado, type FiltroSalida } from './listado';

const VERDE = '#165232';
const GRIS = '#8a948d';

/** Los tres estados, con su silueta: la del elegido en verde (pedido del autor, 2026-10-24). */
const ESTADOS: { clave: FiltroEstado; nombre: string; dibujo: (elegido: boolean) => ReactNode }[] = [
  { clave: 'activos', nombre: 'Activos', dibujo: (e) => <SiluetaVaca color={e ? VERDE : GRIS} /> },
  { clave: 'retirados', nombre: 'Retirados', dibujo: (e) => <SiluetaVaca color={e ? VERDE : GRIS} /> },
  { clave: 'todos', nombre: 'Todos', dibujo: (e) => <SiluetasVacas color={e ? VERDE : GRIS} /> },
];

/** Fichas del filtro por destino, con su dibujo (documento técnico 19, sección 6; 3.10.4.4). */
const ICONO_DESTINO: Record<Destino, ReactNode> = {
  reproductor: <span className="ficha-filtro__simbolo">♂</span>,
  reproductora: <span className="ficha-filtro__simbolo">♀</span>,
  leche: <Cantina tamano={24} />,
  ceba: <Pasto tamano={24} />,
  venta: <EtiquetaPrecio tamano={24} />,
  sacrificio: <PlantaBeneficio tamano={24} />,
};
const FICHAS_DESTINO: { clave: FiltroDestino; nombre: string; icono: ReactNode }[] = [
  { clave: 'todos', nombre: 'Todas', icono: <IconoTodas /> },
  ...(Object.keys(ICONO_DESTINO) as Destino[]).map((d) => ({ clave: d as FiltroDestino, nombre: NOMBRE_DESTINO[d], icono: ICONO_DESTINO[d] })),
  { clave: 'sin_destino', nombre: 'Sin destino', icono: <Interrogacion tamano={22} /> },
];

/** Con los retirados, las fichas son los motivos de salida: así se encuentran los vendidos (2026-10-22). */
const FICHAS_SALIDA: { clave: FiltroSalida; nombre: string; icono: ReactNode }[] = [
  { clave: 'todos', nombre: 'Todos', icono: <IconoTodas /> },
  { clave: 'venta', nombre: 'Vendidos', icono: <Camion tamano={26} /> },
  { clave: 'muerte', nombre: 'Muertos', icono: <Cruz tamano={22} /> },
  { clave: 'perdida_robo', nombre: 'Pérdida o robo', icono: <CercaRota tamano={24} /> },
];

const NOMBRE_FILTRO: Record<FiltroEstado, [string, string]> = {
  activos: ['animal activo', 'animales activos'],
  retirados: ['animal retirado', 'animales retirados'],
  todos: ['animal', 'animales'],
};

/**
 * Listado de animales con búsqueda por chapeta (CU-03, RF-06). Reorganizado el 2026-10-24: el título, el acceso
 * a registrar, el buscador, los estados con su cantidad y las categorías con su dibujo.
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
  const cantidades = contarEstados(animales);
  const buscada = normalizarChapeta(texto);
  const [singular, plural] = NOMBRE_FILTRO[filtro];
  const porMotivo = filtro === 'retirados';
  const fichas = porMotivo
    ? FICHAS_SALIDA.map((f) => ({ ...f, elegida: filtroSalida === f.clave, elegir: () => setFiltroSalida(f.clave) }))
    : FICHAS_DESTINO.map((f) => ({ ...f, elegida: filtroDestino === f.clave, elegir: () => setFiltroDestino(f.clave) }));

  return (
    <div className="listado">
      <TituloPantalla dibujo={<CaraVaca tamano={40} conFondo={false} />}>Animales</TituloPantalla>
      <p className="texto-secundario listado__subtitulo">Busque y consulte sus animales registrados.</p>

      {/* Registrar un animal, arriba: lo primero que se busca al llegar con un animal nuevo (pedido del autor). */}
      {puedeRegistrar && (
        <Link className="boton boton--principal boton--ancho boton--ilustrado listado__registrar" to="/animales/nuevo">
          <span className="boton__ilustracion">
            <CaraVaca tamano={34} conFondo={false} />
          </span>
          <span>Registrar animal</span>
        </Link>
      )}

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

      <div className="filtro-estados" role="group" aria-label="Estado">
        {ESTADOS.map((e) => {
          const elegido = filtro === e.clave;
          return (
            <button key={e.clave} type="button" className="filtro-estado" aria-pressed={elegido} onClick={() => setFiltro(e.clave)}>
              {elegido && (
                <span className="filtro-estado__visto">
                  <Visto tamano={24} />
                </span>
              )}
              <span className="filtro-estado__dibujo">{e.dibujo(elegido)}</span>
              <span className="filtro-estado__texto">
                <strong>{e.nombre}</strong>
                <span>{cantidades[e.clave] === 1 ? '1 animal' : `${cantidades[e.clave]} animales`}</span>
              </span>
              {elegido && (
                <svg className="filtro-estado__ola" viewBox="0 0 200 30" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                  <path d="M0 18 C40 6 80 26 120 14 S180 6 200 12 V30 H0Z" fill="#cfe6d6" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      <div className="filtro-categorias">
        <div className="filtro-categorias__etiqueta">
          <IconoEtiqueta />
          <span>
            <strong>{porMotivo ? 'Motivo de salida' : 'Categorías'}</strong>
            <span>{porMotivo ? 'de los animales retirados' : filtro === 'todos' ? 'de todos los animales' : 'de los animales activos'}</span>
          </span>
        </div>
        <div className="fichas-filtro" role="group" aria-label={porMotivo ? 'Motivo de la salida' : 'Destino productivo'}>
          {fichas.map((f) => (
            <button key={f.clave} type="button" className="ficha-filtro ficha-filtro--icono" aria-pressed={f.elegida} onClick={f.elegir}>
              <span className="ficha-filtro__icono">{f.icono}</span>
              <span>{f.nombre}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="texto-secundario" aria-live="polite">
        {resultado.animales.length === 1 ? `1 ${singular}` : `${resultado.animales.length} ${plural}`}
      </p>

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
    </div>
  );
}

function IconoTodas() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconoEtiqueta() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path d="M3 4.5V11l9.5 9.5a2 2 0 0 0 2.8 0l5.2-5.2a2 2 0 0 0 0-2.8L11 3H4.5A1.5 1.5 0 0 0 3 4.5Z" fill={VERDE} />
      <circle cx="7.5" cy="7.5" r="1.7" fill="#dcefe2" />
    </svg>
  );
}

function FilaAnimal({ animal, hoy, exacta, alAbrir }: { animal: AnimalListado; hoy: string; exacta: boolean; alAbrir: () => void }) {
  const foto = useUrlDeImagen(animal.foto);
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
            {animal.sexo === 'hembra' ? 'Hembra' : 'Macho'} · {describirEdad(animal.fecha_nacimiento, animal.fecha_nacimiento_exacta, hoy)}
            {animal.destino ? ` · ${NOMBRE_DESTINO[animal.destino]}` : ''}
          </span>
          {animal.retirado && <span className="fila-animal__retirado">{animal.sexo === 'hembra' ? 'Retirada' : 'Retirado'}</span>}
          {animal.chapetaPendiente && <span className="fila-animal__chapeta-pendiente">Sin chapeta puesta</span>}
          <DistintivoSync estado={animal.estado_sync} {...(animal.detalle_conflicto ? { detalle: animal.detalle_conflicto } : {})} />
        </span>
      </button>
    </li>
  );
}
