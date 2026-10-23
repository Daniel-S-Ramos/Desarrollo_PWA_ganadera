import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { fechaDelPredio, formatearFecha } from '../../dominio/fechas';
import { formatearLitros } from '../../dominio/leche';
import { puedeUsar } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import { ConfirmacionCierre } from '../../ui/componentes/ConfirmacionCierre';
import { IconoBarras, IconoBotella, IconoCampana, IconoFlecha, IconoHistorial, IconoPastilla, IconoPortapapeles, IconoVaca } from '../../ui/componentes/Iconos';
import { PreparandoTelefono } from '../../ui/componentes/PreparandoTelefono';
import paisaje from '../../ui/imagenes/paisaje.webp';
import { cargarRonda } from '../leche/ronda';
import { cargarRecordatorios } from '../recordatorios/recordatorios';
import { Recordatorios } from '../recordatorios/SeccionRecordatorios';
import { TarjetaSesion } from './PantallaCuenta';
import { avanceDeRonda, cargarResumenProduccion, primerNombre, saludo } from './resumen';

/** Cuántos recordatorios se muestran en el inicio; el resto, en Alertas. */
const RECORDATORIOS_EN_INICIO = 3;

/**
 * Pantalla de inicio (rediseño del 2026-10-22): saludo, resumen, accesos y recordatorios. Los accesos se
 * muestran solo a los perfiles que pueden usarlos (Tabla 27). Mientras se prepara el teléfono se muestra el
 * avance de la carga (documento técnico 17).
 */
export function PantallaInicio({ identidad, alCerrar, cargaCompleta }: { identidad: Identidad; alCerrar: () => void; cargaCompleta: boolean | undefined }) {
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
  return (
    <div className="inicio">
      <p className="inicio__saludo">
        {saludo(new Date().getHours())}, {primerNombre(identidad.nombre)}
      </p>
      <p className="texto-secundario inicio__subtitulo">Este es el estado de tu ganadería.</p>

      <div className="inicio__resumen">
        <TarjetaPendientes />
        {puedeUsar(perfil, 'CU-07') ? <TarjetaProduccion /> : puedeUsar(perfil, 'CU-06') ? <TarjetaRonda /> : null}
      </div>

      <h2 className="inicio__pregunta">¿Qué deseas hacer?</h2>
      <div className="accesos">
        {puedeUsar(perfil, 'CU-03') && (
          <Acceso a="/animales" icono={<IconoVaca />} titulo="Mis animales" detalle={puedeUsar(perfil, 'CU-02') ? 'Consultar y registrar' : 'Consultar'} />
        )}
        {puedeUsar(perfil, 'CU-06') && cargaCompleta === true && <Acceso a="/ordeno" icono={<IconoPortapapeles />} titulo="Ordeño" detalle="Registrar la ronda" />}
        {puedeUsar(perfil, 'CU-07') && <Acceso a="/produccion" icono={<IconoBarras />} titulo="Producción" detalle="Consultar litros" />}
        <Acceso a="/medicamentos" icono={<IconoPastilla />} titulo="Medicamentos" detalle="Catálogo" />
      </div>
      {puedeUsar(perfil, 'CU-18') && (
        <Link className="acceso-ancho" to="/correcciones">
          <IconoHistorial />
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

function Acceso({ a, icono, titulo, detalle }: { a: string; icono: ReactNode; titulo: string; detalle: string }) {
  return (
    <Link className="acceso" to={a}>
      <span className="acceso__icono">{icono}</span>
      <strong>{titulo}</strong>
      <span className="acceso__detalle">{detalle}</span>
    </Link>
  );
}

function Resumen({ a, icono, etiqueta, valor, detalle }: { a: string; icono: ReactNode; etiqueta: string; valor: string; detalle: string }) {
  return (
    <Link className="resumen" to={a}>
      <span className="resumen__cabeza">
        {icono}
        <span>{etiqueta}</span>
      </span>
      <span className="resumen__valor">{valor}</span>
      <span className="resumen__detalle">{detalle}</span>
    </Link>
  );
}

function TarjetaPendientes() {
  const grupos = useLiveQuery(() => cargarRecordatorios(), []);
  const total = grupos?.reduce((n, g) => n + g.recordatorios.length, 0);
  return <Resumen a="/alertas" icono={<IconoCampana />} etiqueta="Pendientes" valor={total === undefined ? '…' : String(total)} detalle="Por revisar" />;
}

/** Propietario: los litros de hoy o del último día con ordeños. */
function TarjetaProduccion() {
  const [hoy] = useState(() => fechaDelPredio());
  const resumen = useLiveQuery(() => cargarResumenProduccion(hoy), [hoy]);
  const valor = resumen === undefined ? '…' : resumen ? `${formatearLitros(resumen.litros)} L` : '—';
  const detalle = resumen === undefined ? '' : !resumen ? 'Sin ordeños registrados' : resumen.esHoy ? 'Total de hoy' : `Último ordeño: ${formatearFecha(resumen.fecha)}`;
  return <Resumen a="/produccion" icono={<IconoBotella />} etiqueta="Producción" valor={valor} detalle={detalle} />;
}

/** Trabajador: cuántas vacas de la ronda de hoy tienen ordeño (no tiene acceso a la producción, Tabla 27). */
function TarjetaRonda() {
  const [hoy] = useState(() => fechaDelPredio());
  const vacas = useLiveQuery(() => cargarRonda(hoy), [hoy]);
  const avance = vacas ? avanceDeRonda(vacas) : undefined;
  return (
    <Resumen
      a="/ordeno"
      icono={<IconoPortapapeles />}
      etiqueta="Ordeño"
      valor={avance ? `${avance.registradas} de ${avance.total}` : '…'}
      detalle={avance?.total === 1 ? 'vaca ordeñada hoy' : 'vacas ordeñadas hoy'}
    />
  );
}
