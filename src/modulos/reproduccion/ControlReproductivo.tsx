import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { formatearFecha } from '../../dominio/fechas';
import { NOMBRE_RESULTADO } from '../../dominio/reproduccion';
import type { Uuid } from '../../dominio/tipos';
import { cargarControlReproductivo } from './partos';
import { EnlaceCorregir, MarcaCorreccion } from '../correcciones/MarcaCorreccion';
import type { Identidad } from '../../sesion/token';

function meses(valor: number): string {
  return `${valor.toLocaleString('es-CO', { maximumFractionDigits: 1 })} ${valor === 1 ? 'mes' : 'meses'}`;
}

/**
 * Control reproductivo de la vaca (CU-11, RF-17, HU-12.3). Solo el propietario. Especificación:
 * docs/tecnica/25-parto-y-control-reproductivo.md, sección 8.
 */
export function ControlReproductivo({ vacaId, identidad }: { vacaId: Uuid; identidad: Identidad }) {
  const control = useLiveQuery(() => cargarControlReproductivo(vacaId), [vacaId]);
  if (!control) return <p className="texto-secundario">Cargando…</p>;

  return (
    <section className="tarjeta">
      <h2>Control reproductivo</h2>
      {control.total === 0 ? (
        <p>Esta vaca no tiene partos registrados.</p>
      ) : (
        <>
          <p>
            <strong>
              {control.total} {control.total === 1 ? 'parto' : 'partos'}
            </strong>
            {control.promedioMeses !== null && ` · intervalo promedio: ${meses(control.promedioMeses)}`}
          </p>
          {control.total === 1 && <p className="texto-secundario">Con un solo parto no se puede calcular el intervalo.</p>}
          <ol className="historial">
            {control.tramos.map((t) => (
              <li key={t.parto.id} className="historial__entrada">
                <p>
                  <strong>{formatearFecha(t.parto.fecha)}</strong> · {NOMBRE_RESULTADO[t.parto.resultado]}
                </p>
                {t.intervaloDias !== null && (
                  <p className="texto-secundario">
                    {t.intervaloDias} días desde el parto anterior · {meses(t.intervaloMeses!)}
                  </p>
                )}
                {t.parto.observacion && <p className="texto-secundario">{t.parto.observacion}</p>}
                {control.vigentes.get(t.parto.id) && <MarcaCorreccion entidad="parto" vigente={control.vigentes.get(t.parto.id)!} />}
                <EnlaceCorregir entidad="parto" registro={t.parto} identidad={identidad} />
              </li>
            ))}
          </ol>

          {control.anulados.length > 0 && (
            <>
              <h3>Partos anulados</h3>
              <ul className="historial">
                {control.anulados.map(({ vigente, autor }) => (
                  <li key={vigente.registro.id} className="historial__entrada historial__entrada--anulada">
                    <p>
                      {formatearFecha(vigente.registro.fecha)} · {NOMBRE_RESULTADO[vigente.registro.resultado]} · registrado por {autor}
                    </p>
                    <MarcaCorreccion entidad="parto" vigente={vigente} />
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3>Descendencia</h3>
          {control.crias.length === 0 ? (
            <p className="texto-secundario">Sin crías vivas registradas.</p>
          ) : (
            <ul className="historial">
              {control.crias.map((c) => (
                <li key={c.id} className="historial__entrada">
                  <Link to={`/animales/${c.id}`}>{c.codigo_chapeta}</Link> · {c.sexo === 'hembra' ? 'Hembra' : 'Macho'}
                  {c.fecha_nacimiento ? ` · nació el ${formatearFecha(c.fecha_nacimiento)}` : ''}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
