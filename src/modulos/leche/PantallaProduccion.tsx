import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { leerParametro } from '../../datos/parametros';
import { fechaDelPredio, formatearFecha } from '../../dominio/fechas';
import { DIAS_PROMEDIO_POR_DEFECTO, formatearLitros } from '../../dominio/leche';
import { agregar, diasEntreInclusive, etiquetaDia, periodosDeVentana, resumir, sumarDias, type Agregacion, type FilaPeriodo, type Periodo } from '../../dominio/periodos';
import { diaDeVaca, registrosDe, vacasConsultables, type DiaDeVaca } from './produccion';

const AGREGACIONES: [Agregacion, string][] = [
  ['diaria', 'Diaria'],
  ['semanal', 'Semanal'],
  ['mensual', 'Mensual'],
];

const MAS_AMPLIA: Partial<Record<Agregacion, [Agregacion, string]>> = {
  semanal: ['mensual', 'Ver por meses'],
};

/**
 * Consulta de producción por vaca, diaria, semanal y mensual (CU-07 pasos 1 a 4, RF-11). Solo el
 * propietario. Especificación: docs/tecnica/23-consulta-de-produccion.md, secciones 3 a 7.
 */
export function PantallaProduccion() {
  const [parametros, setParametros] = useSearchParams();
  const [hoy] = useState(() => fechaDelPredio());
  const [agregacion, setAgregacion] = useState<Agregacion>('diaria');
  const [desplazamiento, setDesplazamiento] = useState(0);
  const vacas = useLiveQuery(() => vacasConsultables(), []);
  const vacaId = parametros.get('vaca') ?? vacas?.[0]?.id ?? null;
  const registros = useLiveQuery(() => (vacaId ? registrosDe(vacaId) : Promise.resolve([])), [vacaId]);
  const diasPromedio = useLiveQuery(() => leerParametro('dias_promedio_produccion'), []) ?? DIAS_PROMEDIO_POR_DEFECTO;

  if (!vacas) return <p className="texto-secundario">Cargando…</p>;
  if (vacas.length === 0) {
    return (
      <div className="formulario">
        <p className="titulo-seccion">Producción de leche</p>
        <p>No hay vacas con registros de leche ni con el destino Producción de leche.</p>
        <Link className="boton boton--secundario boton--ancho" to="/">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const vaca = vacas.find((v) => v.id === vacaId) ?? vacas[0]!;
  const periodos = periodosDeVentana(agregacion, hoy, desplazamiento);
  const filas = registros ? agregar(periodos, registros, hoy) : [];
  const resumen = resumir(filas);
  const maximo = Math.max(0, ...filas.map((f) => valorDeBarra(f, agregacion) ?? 0));
  const amplia = MAS_AMPLIA[agregacion];

  const cambiarAgregacion = (a: Agregacion) => {
    setAgregacion(a);
    setDesplazamiento(0);
  };

  return (
    <div className="formulario produccion">
      <Link className="enlace" to="/">
        ← Volver al inicio
      </Link>
      <p className="titulo-seccion">Producción de leche</p>

      {/* CU-07, paso 5 (documento técnico 28). */}
      <Link className="boton boton--secundario boton--ancho" to="/produccion/comparar">
        Comparar con las demás vacas
      </Link>

      <label className="campo">
        <span>Vaca</span>
        <select
          value={vaca.id}
          onChange={(e) => {
            setParametros({ vaca: e.target.value }, { replace: true });
            setDesplazamiento(0);
          }}
        >
          {vacas.map((v) => (
            <option key={v.id} value={v.id}>
              {v.codigo_chapeta}
              {v.retirada ? ' (retirada)' : ''}
            </option>
          ))}
        </select>
      </label>

      <div className="opciones opciones--tres" role="group" aria-label="Agregación">
        {AGREGACIONES.map(([clave, nombre]) => (
          <button key={clave} type="button" className="opcion" aria-pressed={agregacion === clave} onClick={() => cambiarAgregacion(clave)}>
            {nombre}
          </button>
        ))}
      </div>

      <div className="produccion__navegacion">
        <button type="button" className="boton boton--secundario" onClick={() => setDesplazamiento((d) => d - 1)}>
          ← Anterior
        </button>
        <button type="button" className="boton boton--secundario" disabled={desplazamiento >= 0} onClick={() => setDesplazamiento((d) => d + 1)}>
          Siguiente →
        </button>
      </div>

      {agregacion === 'diaria' ? (
        // PE-34: la vista diaria es un día a la vez; Anterior y Siguiente se mueven de a un día.
        registros ? (
          <DiaVaca
            chapeta={vaca.codigo_chapeta}
            dia={diaDeVaca(registros, sumarDias(hoy, desplazamiento), diasPromedio)}
            hoy={hoy}
            diasPromedio={diasPromedio}
            irA={(fecha) => setDesplazamiento(1 - diasEntreInclusive(fecha, hoy))}
          />
        ) : (
          <p className="texto-secundario">Cargando…</p>
        )
      ) : !registros ? (
        <p className="texto-secundario">Cargando…</p>
      ) : (
        <>
          {/* El rango siempre a la vista: al retroceder sin registros no se sabía qué semanas o meses se veían (PE-34). */}
          <p className="produccion__ventana" aria-live="polite">
            {tituloVentana(periodos, agregacion)}
          </p>

          {resumen.total === null ? (
            // CU-07, 3a: se informa y se sugiere ampliar el rango; la lista de días sigue a la vista (PE-34).
            <div className="aviso aviso--atencion aviso--en-contenido">
              <p>Sin registros de {vaca.codigo_chapeta} en este periodo.</p>
              <div className="aviso__acciones">
                <button type="button" className="boton boton--secundario" onClick={() => setDesplazamiento((d) => d - 1)}>
                  Ver el periodo anterior
                </button>
                {amplia && (
                  <button type="button" className="boton boton--secundario" onClick={() => cambiarAgregacion(amplia[0])}>
                    {amplia[1]}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <section className="tarjeta produccion__resumen">
              <h2>{vaca.codigo_chapeta}</h2>
              <p>
                <strong>{formatearLitros(resumen.total)} litros</strong> · {formatearLitros(resumen.promedio!)} por día registrado ·{' '}
                {resumen.diasRegistrados} de {resumen.diasDelPeriodo} días registrados
              </p>
            </section>
          )}

          <ul className="produccion__filas">
            {filas.map((f) => (
              <Fila key={f.periodo.inicio} fila={f} agregacion={agregacion} maximo={maximo} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Un día de la vaca: sus litros y la comparación con su promedio, o el aviso con los ordeños cercanos (PE-34). */
function DiaVaca({ chapeta, dia, hoy, diasPromedio, irA }: { chapeta: string; dia: DiaDeVaca; hoy: string; diasPromedio: number; irA: (fecha: string) => void }) {
  const c = dia.comparacion;
  return (
    <>
      <p className="produccion__ventana" aria-live="polite">
        {formatearFecha(dia.fecha)}
        {dia.fecha === hoy ? ' (hoy)' : ''}
      </p>
      {dia.litros !== null ? (
        <section className="tarjeta produccion__resumen">
          <h2>
            {chapeta} · {formatearLitros(dia.litros)} litros
          </h2>
          <p className="texto-secundario">
            {dia.promedio
              ? `Promedio de los ${diasPromedio} días anteriores: ${formatearLitros(dia.promedio.promedio)} litros (${dia.promedio.registros} ${dia.promedio.registros === 1 ? 'registro' : 'registros'})`
              : `Sin registros en los ${diasPromedio} días anteriores para comparar`}
          </p>
          {c && (
            <p className={c.atencion ? 'aviso aviso--atencion aviso--en-contenido' : 'comparacion'}>
              {c.atencion && '⚠ '}
              {c.diferencia === 'Igual a su promedio' ? 'Igual a su promedio.' : `${c.palabras}: ${c.diferencia.charAt(0).toLowerCase() + c.diferencia.slice(1)}.`}
            </p>
          )}
        </section>
      ) : (
        <div className="aviso aviso--atencion aviso--en-contenido">
          <p>Sin registro de {chapeta} este día.</p>
          {(dia.anterior || dia.siguiente) && (
            <div className="aviso__acciones">
              {dia.anterior && (
                <button type="button" className="boton boton--secundario" onClick={() => irA(dia.anterior!.fecha)}>
                  Ir al ordeño anterior: {etiquetaDia(dia.anterior.fecha)}
                </button>
              )}
              {dia.siguiente && (
                <button type="button" className="boton boton--secundario" onClick={() => irA(dia.siguiente!.fecha)}>
                  Ir al siguiente: {etiquetaDia(dia.siguiente.fecha)}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/**
 * El rango de la ventana: «16 sep a 15 oct», «27 jul a 18 oct», «noviembre de 2025 a octubre de 2026».
 * Por semanas se usan los días extremos: «27 jul – 2 ago a 12 – 18 oct» se leía mal (PE-28).
 */
function tituloVentana(periodos: readonly Periodo[], agregacion: Agregacion): string {
  // En el orden de la lista, de lo más reciente a lo más antiguo (PE-34): «19 oct a 20 sep».
  const [reciente, antigua] = [periodos[0]!, periodos.at(-1)!];
  return agregacion === 'mensual' ? `${reciente.etiqueta} a ${antigua.etiqueta}` : `${etiquetaDia(reciente.fin)} a ${etiquetaDia(antigua.inicio)}`;
}

/** La barra: litros del día en la diaria, promedio por día registrado en las demás (sección 6). */
function valorDeBarra(fila: FilaPeriodo, agregacion: Agregacion): number | null {
  return agregacion === 'diaria' ? fila.total : fila.promedio;
}

function Fila({ fila, agregacion, maximo }: { fila: FilaPeriodo; agregacion: Agregacion; maximo: number }) {
  const valor = valorDeBarra(fila, agregacion);
  const ancho = valor === null || maximo === 0 ? 0 : (valor / maximo) * 100;
  const etiqueta = `${fila.periodo.etiqueta}${fila.periodo.enCurso && agregacion !== 'diaria' ? ' (en curso)' : ''}`;

  let detalle: string;
  if (fila.total === null) detalle = agregacion === 'diaria' ? 'Sin registro' : 'Sin registros';
  else if (agregacion === 'diaria') detalle = `${formatearLitros(fila.total)} litros`;
  else
    detalle = `${formatearLitros(fila.total)} litros · ${formatearLitros(fila.promedio!)} por día · ${fila.diasRegistrados} de ${fila.diasDelPeriodo} días registrados`;

  return (
    <li className="produccion__fila">
      <div className="produccion__texto">
        <span className="produccion__etiqueta">{etiqueta}</span>
        <span className={fila.total === null ? 'texto-secundario' : ''}>{detalle}</span>
      </div>
      {valor !== null && (
        <div className="produccion__barra" aria-hidden="true">
          <div className="produccion__relleno" style={{ width: `${Math.max(ancho, valor > 0 ? 2 : 0)}%` }} />
        </div>
      )}
    </li>
  );
}
