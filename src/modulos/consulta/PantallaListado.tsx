import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { NOMBRE_DESTINO } from '../../dominio/destino';
import { describirEdad } from '../../dominio/edad';
import { DESTINOS } from '../../dominio/tipos';
import { fechaDelPredio } from '../../dominio/fechas';
import { DistintivoSync } from '../../ui/componentes/DistintivoSync';
import { CaraVaca, pelajeDe } from '../../ui/componentes/Ilustraciones';
import { useUrlDeImagen } from '../../ui/useUrlDeImagen';
import { normalizarChapeta } from '../identificacion/registroAnimal';
import { buscar, cargarListado, type AnimalListado, type FiltroDestino, type FiltroEstado, type FiltroSalida } from './listado';
import { TituloPantalla } from '../../ui/componentes/TituloPantalla';

const FILTROS: [FiltroEstado, string][] = [
  ['activos', 'Activos'],
  ['retirados', 'Retirados'],
  ['todos', 'Todos'],
];

/** Fichas pulsables del filtro por destino (documento técnico 19, sección 6; 3.10.4.4). */
const FILTROS_DESTINO: [FiltroDestino, string][] = [
  ['todos', 'Todos'],
  ...DESTINOS.map((d): [FiltroDestino, string] => [d, NOMBRE_DESTINO[d]]),
  ['sin_destino', 'Sin destino'],
];

/** Con los retirados, las fichas son los motivos de salida: así se encuentran los vendidos (2026-10-22). */
const FILTROS_SALIDA: [FiltroSalida, string][] = [
  ['todos', 'Todos'],
  ['venta', 'Vendidos'],
  ['muerte', 'Muertos'],
  ['perdida_robo', 'Pérdida o robo'],
];

const NOMBRE_FILTRO: Record<FiltroEstado, [string, string]> = {
  activos: ['animal activo', 'animales activos'],
  retirados: ['animal retirado', 'animales retirados'],
  todos: ['animal', 'animales'],
};

/**
 * Listado de animales con búsqueda por chapeta (CU-03, RF-06).
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
  const buscada = normalizarChapeta(texto);
  const [singular, plural] = NOMBRE_FILTRO[filtro];

  return (
    <div className="listado">
      <TituloPantalla dibujo={<CaraVaca tamano={40} conFondo={false} />}>Animales</TituloPantalla>
      {informacionIncompleta && (
        // Carga inicial (documento técnico 17, sección 5): la lista todavía no tiene todos los animales.
        <p className="aviso aviso--atencion aviso--en-contenido">La información del predio todavía está llegando a este teléfono.</p>
      )}

      <label className="campo">
        <span>Buscar por chapeta</span>
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
      </label>

      <div className="opciones opciones--tres" role="group" aria-label="Estado">
        {FILTROS.map(([clave, nombre]) => (
          <button key={clave} type="button" className="opcion" aria-pressed={filtro === clave} onClick={() => setFiltro(clave)}>
            {nombre}
          </button>
        ))}
      </div>

      {filtro === 'retirados' ? (
        <div className="fichas-filtro" role="group" aria-label="Motivo de la salida">
          {FILTROS_SALIDA.map(([clave, nombre]) => (
            <button key={clave} type="button" className="ficha-filtro" aria-pressed={filtroSalida === clave} onClick={() => setFiltroSalida(clave)}>
              {nombre}
            </button>
          ))}
        </div>
      ) : (
        <div className="fichas-filtro" role="group" aria-label="Destino productivo">
          {FILTROS_DESTINO.map(([clave, nombre]) => (
            <button key={clave} type="button" className="ficha-filtro" aria-pressed={filtroDestino === clave} onClick={() => setFiltroDestino(clave)}>
              {nombre}
            </button>
          ))}
        </div>
      )}

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
