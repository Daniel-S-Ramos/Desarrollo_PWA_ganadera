import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { fechaDelPredio } from '../../dominio/fechas';
import { formatearLitros } from '../../dominio/leche';
import { cargarComparacion, type TipoPeriodo, type VacaComparada } from './comparacion';

const PERIODOS: [TipoPeriodo, string][] = [
  ['semanal', 'Semana'],
  ['mensual', 'Mes'],
];

/**
 * Comparación de la producción entre vacas, solo para el propietario (CU-07 pasos 5 y 6, RF-12, HU-10).
 * Especificación: docs/tecnica/28-comparacion-entre-vacas.md
 */
export function PantallaComparacion() {
  const [hoy] = useState(() => fechaDelPredio());
  const [tipo, setTipo] = useState<TipoPeriodo>('mensual');
  const [desplazamiento, setDesplazamiento] = useState(0);
  const [orden, setOrden] = useState<'mayor' | 'menor'>('mayor');
  const comparacion = useLiveQuery(() => cargarComparacion(tipo, desplazamiento, hoy, orden), [tipo, desplazamiento, hoy, orden]);

  const anterior = () => setDesplazamiento((d) => d - 1);
  const titulo = comparacion
    ? `${comparacion.periodo.etiqueta.charAt(0).toUpperCase()}${comparacion.periodo.etiqueta.slice(1)}${comparacion.periodo.enCurso ? ' (en curso)' : ''}`
    : '';
  const maximo = Math.max(0, ...(comparacion?.conRegistros.map((v) => v.promedio ?? 0) ?? []));

  return (
    <div className="formulario produccion">
      <Link className="enlace" to="/produccion">
        ← Volver a la producción
      </Link>
      <p className="titulo-seccion">Comparación entre vacas</p>

      <div className="opciones" role="group" aria-label="Periodo">
        {PERIODOS.map(([clave, nombre]) => (
          <button
            key={clave}
            type="button"
            className="opcion"
            aria-pressed={tipo === clave}
            onClick={() => {
              setTipo(clave);
              setDesplazamiento(0);
            }}
          >
            {nombre}
          </button>
        ))}
      </div>

      <div className="produccion__navegacion">
        <button type="button" className="boton boton--secundario" onClick={anterior}>
          ← Anterior
        </button>
        <button type="button" className="boton boton--secundario" disabled={desplazamiento >= 0} onClick={() => setDesplazamiento((d) => d + 1)}>
          Siguiente →
        </button>
      </div>

      {!comparacion ? (
        <p className="texto-secundario">Cargando…</p>
      ) : (
        <>
          <h2 className="comparacion__titulo">{titulo}</h2>

          {comparacion.conRegistros.length + comparacion.sinRegistros.length === 0 ? (
            <AvisoSinComparacion texto="No hubo vacas en producción en este periodo." alAnterior={anterior} />
          ) : !comparacion.posible ? (
            // CU-07, 5a: con menos de dos vacas con registros no hay con qué comparar.
            <AvisoSinComparacion
              texto={
                comparacion.conRegistros.length === 1
                  ? `La comparación no es posible: solo ${comparacion.conRegistros[0]!.codigo_chapeta} tiene registros en este periodo.`
                  : 'La comparación no es posible: ninguna vaca tiene registros en este periodo.'
              }
              alAnterior={anterior}
            />
          ) : (
            <>
              <section className="tarjeta produccion__resumen">
                <p>
                  Promedio del hato: <strong>{formatearLitros(comparacion.promedioDelHato!)} litros por día</strong> · {comparacion.conRegistros.length} vacas con
                  registros
                </p>
                <button type="button" className="boton boton--secundario boton--ancho" onClick={() => setOrden((o) => (o === 'mayor' ? 'menor' : 'mayor'))}>
                  {orden === 'mayor' ? 'De menor a mayor' : 'De mayor a menor'}
                </button>
              </section>
              <ul className="produccion__filas">
                {comparacion.conRegistros.map((v) => (
                  <FilaVaca key={v.id} vaca={v} maximo={maximo} tipo={tipo} />
                ))}
              </ul>
            </>
          )}

          {comparacion.sinRegistros.length > 0 && (
            <section className="tarjeta">
              <h2>Sin registros en el periodo</h2>
              <ul className="produccion__filas">
                {comparacion.sinRegistros.map((v) => (
                  <FilaVaca key={v.id} vaca={v} maximo={maximo} tipo={tipo} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function AvisoSinComparacion({ texto, alAnterior }: { texto: string; alAnterior: () => void }) {
  return (
    <div className="aviso aviso--atencion aviso--en-contenido">
      <p>{texto}</p>
      <div className="aviso__acciones">
        <button type="button" className="boton boton--secundario" onClick={alAnterior}>
          Ver el periodo anterior
        </button>
      </div>
    </div>
  );
}

/** Una vaca: al tocarla abre su producción con la misma agregación (sección 8). */
function FilaVaca({ vaca: v, maximo, tipo }: { vaca: VacaComparada; maximo: number; tipo: TipoPeriodo }) {
  const ancho = v.promedio === null || maximo === 0 ? 0 : (v.promedio / maximo) * 100;
  return (
    <li className="produccion__fila">
      <Link className="comparacion__enlace" to={`/produccion?vaca=${v.id}&agregacion=${tipo}`}>
        <div className="produccion__texto">
          <span className="produccion__etiqueta">
            {v.codigo_chapeta}
            {v.retirada ? ' · Retirada' : ''}
          </span>
          {v.promedio === null ? (
            <span className="texto-secundario">Sin registros</span>
          ) : (
            <span>
              <strong>{formatearLitros(v.promedio)} litros por día</strong> · {formatearLitros(v.total!)} litros · {v.diasRegistrados} de {v.diasDelPeriodo} días
              registrados
            </span>
          )}
          {v.pocosRegistros && (
            <span className="comparacion__pocos">
              Pocos registros: {v.diasRegistrados} de {v.diasDelPeriodo} días
            </span>
          )}
        </div>
        {v.promedio !== null && (
          <div className="produccion__barra" aria-hidden="true">
            <div className="produccion__relleno" style={{ width: `${Math.max(ancho, v.promedio > 0 ? 2 : 0)}%` }} />
          </div>
        )}
      </Link>
    </li>
  );
}
