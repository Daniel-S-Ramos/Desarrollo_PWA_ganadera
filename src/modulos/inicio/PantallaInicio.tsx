import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { fechaDelPredio, formatearFecha } from '../../dominio/fechas';
import { formatearLitros } from '../../dominio/leche';
import { puedeUsar } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import { ConfirmacionCierre } from '../../ui/componentes/ConfirmacionCierre';
import { IconoFlecha } from '../../ui/componentes/Iconos';
import { CampanaConNumero, Cantina, Cantinas, CaraVaca, JeringaFrasco, Libreta } from '../../ui/componentes/Ilustraciones';
import { PreparandoTelefono } from '../../ui/componentes/PreparandoTelefono';
import paisaje from '../../ui/imagenes/paisaje.webp';
import { useUrlDeImagen } from '../../ui/useUrlDeImagen';
import { cargarListado } from '../consulta/listado';
import { cargarRonda } from '../leche/ronda';
import { cargarRecordatorios } from '../recordatorios/recordatorios';
import { Recordatorios } from '../recordatorios/SeccionRecordatorios';
import { TarjetaSesion } from './PantallaCuenta';
import { avanceDeRonda, cargarResumenProduccion, desglosePendientes, primerNombre, saludo } from './resumen';

/** Cuántos recordatorios se muestran en el inicio; el resto, en Alertas. */
const RECORDATORIOS_EN_INICIO = 3;

/**
 * Pantalla de inicio (rediseño del 2026-10-23): saludo, resumen, accesos ilustrados y recordatorios. Los
 * accesos se muestran solo a los perfiles que pueden usarlos (Tabla 27). Mientras se prepara el teléfono se
 * muestra el avance de la carga (documento técnico 17).
 */
export function PantallaInicio({ identidad, alCerrar, cargaCompleta }: { identidad: Identidad; alCerrar: () => void; cargaCompleta: boolean | undefined }) {
  const [hoy] = useState(() => fechaDelPredio());
  if (cargaCompleta === false) {
    return (
      <>
        <PreparandoTelefono />
        <TarjetaSesion identidad={identidad} />
        <ConfirmacionCierre alCerrar={alCerrar} />
        {/* La pantalla es corta: el paisaje la cierra, como en el ingreso. */}
        <img className="paisaje-pie" src={paisaje} alt="" width={1024} height={281} />
      </>
    );
  }
  const perfil = identidad.perfil;
  const conRonda = puedeUsar(perfil, 'CU-06') && cargaCompleta === true;
  return (
    <div className="inicio">
      <p className="inicio__saludo">
        {saludo(new Date().getHours())}, {primerNombre(identidad.nombre)}
      </p>
      <p className="texto-secundario inicio__subtitulo">Este es el estado de tu ganadería.</p>

      <div className="inicio__resumen">
        <TarjetaPendientes />
        {puedeUsar(perfil, 'CU-07') ? <TarjetaProduccion hoy={hoy} /> : conRonda ? <TarjetaRonda hoy={hoy} /> : null}
      </div>

      <h2 className="inicio__pregunta">¿Qué deseas hacer?</h2>
      <div className="accesos">
        {puedeUsar(perfil, 'CU-03') && <AccesoAnimales />}
        {conRonda && <AccesoOrdeno hoy={hoy} />}
        {puedeUsar(perfil, 'CU-07') && <Acceso a="/produccion" dibujo={<Cantinas />} titulo="Producción de leche" detalle="Consultar litros" />}
        <Acceso a="/medicamentos" dibujo={<JeringaFrasco />} titulo="Medicamentos" detalle="Catálogo" />
      </div>
      {puedeUsar(perfil, 'CU-18') && (
        <Link className="acceso-ancho" to="/correcciones">
          <span className="ilustracion ilustracion--chica">
            <Libreta />
          </span>
          <span className="acceso-ancho__texto">
            <strong>Correcciones recientes</strong>
            <span>Revisar cambios de registros</span>
          </span>
          <IconoFlecha />
        </Link>
      )}

      {/* Documento técnico 30: los recordatorios derivados, para ambos perfiles (incluye la chapeta del 4.2). */}
      <Recordatorios identidad={identidad} limite={RECORDATORIOS_EN_INICIO} />
    </div>
  );
}

function Acceso({ a, dibujo, titulo, detalle }: { a: string; dibujo: ReactNode; titulo: string; detalle: string }) {
  return (
    <Link className="acceso" to={a}>
      <span className="ilustracion">{dibujo}</span>
      <strong>{titulo}</strong>
      <span className="acceso__detalle">{detalle}</span>
    </Link>
  );
}

/** «Mis animales» con las fotos de tres animales activos y cuántos hay; sin fotos, caras ilustradas. */
function AccesoAnimales() {
  const animales = useLiveQuery(() => cargarListado(), []);
  const activos = animales?.filter((a) => !a.retirado) ?? [];
  const conFoto = activos.filter((a) => a.foto !== null).slice(0, 3);
  return (
    <Link className="acceso" to="/animales">
      <span className="acceso__fotos">
        {[0, 1, 2].map((i) => (
          <FotoMini key={i} foto={conFoto[i]?.foto ?? null} pelaje={(['holstein', 'parda', 'negra'] as const)[i]!} />
        ))}
      </span>
      <strong>Mis animales</strong>
      <span className="acceso__detalle">{animales === undefined ? '…' : activos.length === 1 ? '1 activo' : `${activos.length} activos`}</span>
    </Link>
  );
}

function FotoMini({ foto, pelaje }: { foto: Blob | null; pelaje: 'holstein' | 'parda' | 'negra' }) {
  const url = useUrlDeImagen(foto);
  return <span className="foto-mini">{url ? <img src={url} alt="" /> : <CaraVaca tamano={46} pelaje={pelaje} />}</span>;
}

/** «Ordeño» con el avance de la ronda de hoy. */
function AccesoOrdeno({ hoy }: { hoy: string }) {
  const vacas = useLiveQuery(() => cargarRonda(hoy), [hoy]);
  const avance = vacas ? avanceDeRonda(vacas) : undefined;
  return <Acceso a="/ordeno" dibujo={<Cantina />} titulo="Ordeño" detalle={avance ? `Ronda de hoy: ${avance.registradas} de ${avance.total}` : 'Registrar la ronda'} />;
}

function TarjetaPendientes() {
  const grupos = useLiveQuery(() => cargarRecordatorios(), []);
  const total = grupos?.reduce((n, g) => n + g.recordatorios.length, 0);
  return (
    <Link className="resumen" to="/alertas">
      <span className="resumen__etiqueta">Pendientes</span>
      <span className="resumen__campana">
        <CampanaConNumero numero={total === undefined ? '…' : String(total)} />
        <span className="resumen__detalle">por revisar</span>
      </span>
      <span className="resumen__detalle">{grupos && total ? desglosePendientes(grupos) : total === 0 ? 'Todo al día' : ''}</span>
    </Link>
  );
}

/** Propietario: los litros de hoy o del último día con ordeños, con la mini gráfica de 7 días. */
function TarjetaProduccion({ hoy }: { hoy: string }) {
  const resumen = useLiveQuery(() => cargarResumenProduccion(hoy), [hoy]);
  const maximo = resumen ? Math.max(...resumen.serie, 1) : 1;
  return (
    <Link className="resumen" to="/produccion">
      <span className="resumen__etiqueta">Producción de leche</span>
      {resumen && (
        // Los 7 días como cantinas que se llenan; la del día resumido, llena de verde.
        <span className="resumen__cantinas" aria-hidden="true">
          {resumen.serie.map((litros, i) => (
            <i key={i} style={{ height: `${Math.max(12, (litros / maximo) * 100)}%` }} />
          ))}
        </span>
      )}
      <span className="resumen__valor">{resumen === undefined ? '…' : resumen ? `${formatearLitros(resumen.litros)} L` : '—'}</span>
      <span className="resumen__detalle">
        {resumen === undefined ? '' : !resumen ? 'Sin ordeños registrados' : resumen.esHoy ? 'Hoy' : `Último ordeño: ${formatearFecha(resumen.fecha)}`}
        {resumen && resumen.diferencia !== null && (
          <>
            {' · '}
            <strong className={resumen.diferencia >= 0 ? 'resumen__sube' : 'resumen__baja'}>
              {resumen.diferencia >= 0 ? '+' : '−'}
              {formatearLitros(Math.abs(resumen.diferencia))} L
            </strong>{' '}
            {resumen.esHoy ? 'frente a ayer' : 'frente al día anterior'}
          </>
        )}
      </span>
    </Link>
  );
}

/** Trabajador: cuántas vacas de la ronda de hoy tienen ordeño (no tiene acceso a la producción, Tabla 27). */
function TarjetaRonda({ hoy }: { hoy: string }) {
  const vacas = useLiveQuery(() => cargarRonda(hoy), [hoy]);
  const avance = vacas ? avanceDeRonda(vacas) : undefined;
  return (
    <Link className="resumen" to="/ordeno">
      <span className="resumen__etiqueta">Ordeño de hoy</span>
      <span className="resumen__valor">{avance ? `${avance.registradas} de ${avance.total}` : '…'}</span>
      <span className="resumen__detalle">{avance?.total === 1 ? 'vaca ordeñada' : 'vacas ordeñadas'}</span>
    </Link>
  );
}
