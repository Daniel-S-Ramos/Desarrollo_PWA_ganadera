import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { fechaDelPredio, formatearFecha } from '../../dominio/fechas';
import { formatearKg } from '../../dominio/peso';
import { Filete } from '../../ui/componentes/Ilustraciones';
import { TituloPantalla } from '../../ui/componentes/TituloPantalla';
import { cargarCicloDeCeba, cargarProduccionDelMes, describirEstimacion, type AnimalCiclo, type AnimalDelMes } from './produccionCarne';

/** «+24», «−3», «0»: con el signo menos tipográfico. */
function conSigno(kg: number): string {
  return kg === 0 ? '0' : `${kg > 0 ? '+' : '−'}${formatearKg(Math.abs(kg))}`;
}

/** «15 sep.»: la fecha corta de los pesos. */
function fechaCorta(fecha: string | null): string {
  return fecha ? formatearFecha(fecha).replace(/ de \d{4}$/, '') : 'fecha desconocida';
}

/**
 * Producción de carne, solo para el propietario (apartado 2.2.7, RF-13, RF-14, CU-09, HU-05).
 * Especificación: docs/tecnica/34-produccion-de-carne.md
 */
export function PantallaProduccionCarne() {
  const [vista, setVista] = useState<'mes' | 'ciclo'>('mes');
  return (
    <div className="formulario produccion">
      <Link className="enlace" to="/">
        ← Volver al inicio
      </Link>
      <TituloPantalla dibujo={<Filete tamano={42} />}>Producción de carne</TituloPantalla>
      <div className="opciones opciones--dos" role="group" aria-label="Vista">
        <button type="button" className="opcion" aria-pressed={vista === 'mes'} onClick={() => setVista('mes')}>
          Por mes
        </button>
        <button type="button" className="opcion" aria-pressed={vista === 'ciclo'} onClick={() => setVista('ciclo')}>
          Ciclo completo
        </button>
      </div>
      {vista === 'mes' ? <VistaMes /> : <VistaCiclo />}
    </div>
  );
}

/** Un mes a la vez, como lo pide el apartado 2.2.7 (secciones 3 a 6). */
function VistaMes() {
  const [hoy] = useState(() => fechaDelPredio());
  const [desplazamiento, setDesplazamiento] = useState(0);
  const [orden, setOrden] = useState<'mayor' | 'menor'>('mayor');
  const mes = useLiveQuery(() => cargarProduccionDelMes(desplazamiento, hoy, orden), [desplazamiento, hoy, orden]);
  const anterior = () => setDesplazamiento((d) => d - 1);
  const maximo = Math.max(0, ...(mes?.conTramo.map((a) => a.tramo!.gananciaDiaria) ?? []));
  const total = mes ? mes.conTramo.length + mes.sinTramo.length : 0;

  return (
    <>
      <div className="produccion__navegacion">
        <button type="button" className="boton boton--secundario" onClick={anterior}>
          ← Mes anterior
        </button>
        <button type="button" className="boton boton--secundario" disabled={desplazamiento >= 0} onClick={() => setDesplazamiento((d) => d + 1)}>
          Mes siguiente →
        </button>
      </div>
      {!mes ? (
        <p className="texto-secundario">Cargando…</p>
      ) : (
        <>
          <h2 className="comparacion__titulo">
            {mes.periodo.etiqueta.charAt(0).toUpperCase()}
            {mes.periodo.etiqueta.slice(1)}
            {mes.periodo.enCurso ? ' (en curso)' : ''}
          </h2>

          {total === 0 ? (
            <AvisoMes texto="No hubo animales en ceba en este mes." alAnterior={anterior} />
          ) : mes.conTramo.length === 0 ? (
            <AvisoMes texto="Ningún animal de ceba se pesó en este mes." alAnterior={anterior} />
          ) : (
            <>
              <section className="tarjeta produccion__resumen carne__lote">
                <p className="carne__lote-kg">
                  <strong>{conSigno(mes.kgGanados!)} kg</strong> ganados
                </p>
                <p>
                  Ganancia promedio: <strong>{formatearKg(mes.gananciaPromedio!)} kg por día</strong>
                  {mes.meta !== null && <> · meta {formatearKg(mes.meta)} kg por día</>}
                </p>
                <p>
                  {mes.pesados} de {total} pesados
                </p>
                <button type="button" className="boton boton--secundario boton--ancho" onClick={() => setOrden((o) => (o === 'mayor' ? 'menor' : 'mayor'))}>
                  {orden === 'mayor' ? 'De menor a mayor' : 'De mayor a menor'}
                </button>
              </section>
              <ul className="produccion__filas">
                {mes.conTramo.map((a) => (
                  <FilaMes key={a.id} animal={a} maximo={maximo} meta={mes.meta} />
                ))}
              </ul>
            </>
          )}

          {mes.sinTramo.length > 0 && (
            <section className="tarjeta">
              <h2>Sin pesaje este mes</h2>
              <ul className="produccion__filas">
                {mes.sinTramo.map((a) => (
                  <FilaMes key={a.id} animal={a} maximo={maximo} meta={mes.meta} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}

function AvisoMes({ texto, alAnterior }: { texto: string; alAnterior: () => void }) {
  return (
    <div className="aviso aviso--atencion aviso--en-contenido">
      <p>{texto}</p>
      <div className="aviso__acciones">
        <button type="button" className="boton boton--secundario" onClick={alAnterior}>
          Ver el mes anterior
        </button>
      </div>
    </div>
  );
}

/** Un animal en el mes: al tocarlo, su ficha con la evolución desplegada (sección 6). */
function FilaMes({ animal: a, maximo, meta }: { animal: AnimalDelMes; maximo: number; meta: number | null }) {
  const t = a.tramo;
  const ancho = !t || maximo <= 0 || t.gananciaDiaria <= 0 ? 0 : (t.gananciaDiaria / maximo) * 100;
  return (
    <li className="produccion__fila">
      <Link className="comparacion__enlace" to={`/animales/${a.id}?peso=1`}>
        <div className="produccion__texto">
          <span className="produccion__etiqueta">
            <span className="chapeta">{a.codigo_chapeta}</span>
            {a.retirado ? ' · Retirado' : ''}
          </span>
          {t ? (
            <>
              <span>
                <strong className={t.kg < 0 ? 'resumen__baja' : undefined}>{conSigno(t.kg)} kg</strong> en {t.dias === 1 ? '1 día' : `${t.dias} días`} ·{' '}
                {formatearKg(t.gananciaDiaria)} kg por día
              </span>
              <span className="texto-secundario">
                De {formatearKg(t.referencia.kg)} kg ({fechaCorta(t.referencia.fecha)}) a {formatearKg(t.final.kg)} kg ({fechaCorta(t.final.fecha)})
              </span>
              {t.bajoMeta && meta !== null && <span className="comparacion__pocos">Bajo lo esperado (meta: {formatearKg(meta)} kg por día)</span>}
              {t.metodosDistintos && <span className="comparacion__pocos">Compárese con cautela: cinta y báscula</span>}
            </>
          ) : a.primerPesaje !== null ? (
            <span className="texto-secundario">Primer pesaje: {formatearKg(a.primerPesaje)} kg</span>
          ) : (
            <span className="texto-secundario">Sin pesaje este mes</span>
          )}
        </div>
        {t && (
          <div className="produccion__barra" aria-hidden="true">
            <div className="produccion__relleno" style={{ width: `${Math.max(ancho, t.gananciaDiaria > 0 ? 2 : 0)}%` }} />
          </div>
        )}
      </Link>
    </li>
  );
}

/** El lote de ceba de hoy, de la llegada al predio al peso de finalización (sección 6 bis). */
function VistaCiclo() {
  const [hoy] = useState(() => fechaDelPredio());
  const ciclo = useLiveQuery(() => cargarCicloDeCeba(hoy), [hoy]);
  if (!ciclo) return <p className="texto-secundario">Cargando…</p>;
  if (ciclo.animales.length === 0) {
    return (
      <div className="aviso aviso--atencion aviso--en-contenido">
        <p>No hay animales en ceba hoy.</p>
      </div>
    );
  }
  return (
    <>
      <section className="tarjeta produccion__resumen carne__lote">
        <p className="carne__lote-kg">
          <strong>{ciclo.animales.length === 1 ? '1 animal' : `${ciclo.animales.length} animales`}</strong> en ceba
        </p>
        {ciclo.pesoFinal !== null && (
          <p>
            <strong>{ciclo.terminados}</strong> {ciclo.terminados === 1 ? 'terminado' : 'terminados'} (desde {formatearKg(ciclo.pesoFinal)} kg)
          </p>
        )}
        {ciclo.kgGanados !== null && (
          <p>
            <strong>{conSigno(ciclo.kgGanados)} kg</strong> ganados en el predio
          </p>
        )}
      </section>
      <ul className="produccion__filas">
        {ciclo.animales.map((a) => (
          <FilaCiclo key={a.id} animal={a} pesoFinal={ciclo.pesoFinal} />
        ))}
      </ul>
    </>
  );
}

function FilaCiclo({ animal: a, pesoFinal }: { animal: AnimalCiclo; pesoFinal: number | null }) {
  return (
    <li className="produccion__fila">
      <Link className="comparacion__enlace" to={`/animales/${a.id}?peso=1`}>
        <div className="produccion__texto">
          <span className="produccion__etiqueta">
            <span className="chapeta">{a.codigo_chapeta}</span>
          </span>
          {!a.ultimo ? (
            <span className="texto-secundario">Sin pesos registrados</span>
          ) : a.kg === null ? (
            <span>Un solo peso registrado: {formatearKg(a.ultimo.kg)} kg</span>
          ) : (
            <>
              <span>
                <strong className={a.kg < 0 ? 'resumen__baja' : undefined}>{conSigno(a.kg)} kg</strong> en {a.dias === 1 ? '1 día' : `${a.dias} días`} ·{' '}
                {formatearKg(a.gananciaDiaria!)} kg por día
              </span>
              <span className="texto-secundario">
                De {formatearKg(a.inicial!.kg)} kg ({a.inicial!.id === null ? a.inicial!.etiqueta.toLowerCase() : 'primer pesaje'}, {fechaCorta(a.inicial!.fecha)}) a{' '}
                {formatearKg(a.ultimo.kg)} kg ({fechaCorta(a.ultimo.fecha)})
              </span>
            </>
          )}
          {a.terminado ? (
            <span className="carne__terminado">Terminado: alcanzó los {formatearKg(pesoFinal!)} kg</span>
          ) : (
            a.falta !== null && (
              <span>
                <strong>
                  Faltan {formatearKg(a.falta)} kg para los {formatearKg(pesoFinal!)} kg
                </strong>
                {a.estimacionDias !== null && <> · a este ritmo, {describirEstimacion(a.estimacionDias)}</>}
              </span>
            )
          )}
          {a.pesajeViejo !== null && <span className="comparacion__pocos">Último pesaje hace {a.pesajeViejo} días</span>}
        </div>
        {a.avance !== null && (
          <div className="produccion__barra" aria-label={`Avance: ${a.avance} %`} role="img">
            <div className="produccion__relleno" style={{ width: `${Math.max(a.avance, a.avance > 0 ? 2 : 0)}%` }} />
          </div>
        )}
      </Link>
    </li>
  );
}
