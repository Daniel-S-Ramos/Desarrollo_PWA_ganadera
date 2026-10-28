import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { leerParametro } from '../../datos/parametros';
import { fechaDelPredio, formatearFecha } from '../../dominio/fechas';
import { DIAS_PROMEDIO_POR_DEFECTO, VARIACION_ATIPICA_POR_DEFECTO, formatearLitros } from '../../dominio/leche';
import { etiquetaDia, sumarDias, type Agregacion } from '../../dominio/periodos';
import { periodoComparado } from './comparacion';
import { desplazamientoHasta, diaDeVaca, periodoDeVaca, registrosDe, vacasConsultables, type DiaDeVaca, type PeriodoDeVaca } from './produccion';
import { TituloPantalla } from '../../ui/componentes/TituloPantalla';
import { Cantinas } from '../../ui/componentes/Ilustraciones';

const AGREGACIONES: [Agregacion, string][] = [
  ['diaria', 'Diaria'],
  ['semanal', 'Semanal'],
  ['mensual', 'Mensual'],
];

/** Cómo se nombra el periodo en los avisos y en los botones de ir a otro registro. */
const NOMBRE: Record<Agregacion, { este: string; anterior: string; siguiente: string }> = {
  diaria: { este: 'este día', anterior: 'Ir al ordeño anterior', siguiente: 'Ir al siguiente' },
  semanal: { este: 'esta semana', anterior: 'Ir a la semana del ordeño anterior', siguiente: 'Ir a la semana del siguiente' },
  mensual: { este: 'este mes', anterior: 'Ir al mes del ordeño anterior', siguiente: 'Ir al mes del siguiente' },
};

/**
 * Consulta de producción por vaca (CU-07 pasos 1 a 4, RF-11). Solo el propietario. Especificación:
 * docs/tecnica/23-consulta-de-produccion.md. Desde PE-34 muestra un periodo a la vez: un día, una semana
 * o un mes, y Anterior y Siguiente se mueven de a uno.
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
  const variacionAtipica = useLiveQuery(() => leerParametro('variacion_atipica_leche'), []) ?? VARIACION_ATIPICA_POR_DEFECTO;

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
  const irA = (fecha: string) => setDesplazamiento(desplazamientoHasta(agregacion, fecha, hoy));

  return (
    <div className="formulario produccion">
      <Link className="enlace" to="/">
        ← Volver al inicio
      </Link>
      <TituloPantalla dibujo={<Cantinas tamano={32} />}>Producción de leche</TituloPantalla>

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
          <button
            key={clave}
            type="button"
            className="opcion"
            aria-pressed={agregacion === clave}
            onClick={() => {
              setAgregacion(clave);
              setDesplazamiento(0);
            }}
          >
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

      {!registros ? (
        <p className="texto-secundario">Cargando…</p>
      ) : agregacion === 'diaria' ? (
        <DiaVaca chapeta={vaca.codigo_chapeta} dia={diaDeVaca(registros, sumarDias(hoy, desplazamiento), diasPromedio, variacionAtipica)} hoy={hoy} diasPromedio={diasPromedio} irA={irA} />
      ) : (
        <PeriodoVaca chapeta={vaca.codigo_chapeta} datos={periodoDeVaca(registros, periodoComparado(agregacion, hoy, desplazamiento), hoy)} agregacion={agregacion} irA={irA} />
      )}
    </div>
  );
}

/** Los botones para saltar al registro anterior o siguiente cuando el periodo no tiene ninguno. */
function SinRegistro({
  chapeta,
  agregacion,
  anterior,
  siguiente,
  irA,
}: {
  chapeta: string;
  agregacion: Agregacion;
  anterior: { fecha: string } | null;
  siguiente: { fecha: string } | null;
  irA: (fecha: string) => void;
}) {
  const n = NOMBRE[agregacion];
  return (
    // CU-07, 3a: se informa y se ofrece ir al registro más cercano (PE-34).
    <div className="aviso aviso--atencion aviso--en-contenido">
      <p>
        Sin registro de {chapeta} {n.este}.
      </p>
      {(anterior || siguiente) && (
        <div className="aviso__acciones">
          {anterior && (
            <button type="button" className="boton boton--secundario" onClick={() => irA(anterior.fecha)}>
              {n.anterior}: {etiquetaDia(anterior.fecha)}
            </button>
          )}
          {siguiente && (
            <button type="button" className="boton boton--secundario" onClick={() => irA(siguiente.fecha)}>
              {n.siguiente}: {etiquetaDia(siguiente.fecha)}
            </button>
          )}
        </div>
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
            <span className="chapeta">{chapeta}</span> {formatearLitros(dia.litros)} litros
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
        <SinRegistro chapeta={chapeta} agregacion="diaria" anterior={dia.anterior} siguiente={dia.siguiente} irA={irA} />
      )}
    </>
  );
}

/** Una semana o un mes: el resumen y cada uno de sus días hasta hoy (PE-34). */
function PeriodoVaca({ chapeta, datos, agregacion, irA }: { chapeta: string; datos: PeriodoDeVaca; agregacion: Agregacion; irA: (fecha: string) => void }) {
  const { periodo, resumen, dias } = datos;
  const titulo = `${periodo.etiqueta.charAt(0).toUpperCase()}${periodo.etiqueta.slice(1)}${periodo.enCurso ? ' (en curso)' : ''}`;
  const maximo = Math.max(0, ...dias.map((d) => d.litros ?? 0));
  return (
    <>
      <p className="produccion__ventana" aria-live="polite">
        {titulo}
      </p>
      {resumen.total === null ? (
        <SinRegistro chapeta={chapeta} agregacion={agregacion} anterior={datos.anterior} siguiente={datos.siguiente} irA={irA} />
      ) : (
        <section className="tarjeta produccion__resumen">
          <h2>
            <span className="chapeta">{chapeta}</span> {formatearLitros(resumen.total)} litros
          </h2>
          <p>
            {formatearLitros(resumen.promedio!)} litros por día registrado · {resumen.diasRegistrados} de {resumen.diasDelPeriodo} días registrados
          </p>
        </section>
      )}
      {dias.length > 0 && (
        <ul className="produccion__filas">
          {dias.map((d) => (
            <li key={d.fecha} className="produccion__fila">
              <div className="produccion__texto">
                <span className="produccion__etiqueta">{etiquetaDia(d.fecha)}</span>
                <span className={d.litros === null ? 'texto-secundario' : ''}>{d.litros === null ? 'Sin registro' : `${formatearLitros(d.litros)} litros`}</span>
              </div>
              {d.litros !== null && (
                <div className="produccion__barra" aria-hidden="true">
                  <div className="produccion__relleno" style={{ width: `${maximo === 0 ? 0 : Math.max((d.litros / maximo) * 100, d.litros > 0 ? 2 : 0)}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
