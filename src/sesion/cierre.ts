/**
 * Cierre de sesión con la cola vacía (apartado 3.9.1, Tabla 31).
 * Especificación: docs/tecnica/12-cierre-de-sesion.md
 *
 * Las dependencias externas (el servicio remoto y el cierre de la sesión de supabase-js) llegan como
 * parámetros, de modo que la lógica se verifica con pruebas automáticas y un servicio simulado.
 */
import { contarPendientes } from '../datos/repositorio';
import { descartarPendientes } from '../datos/sincronizacionLocal';
import { leerEstadoMotor, sincronizar, suscribirseAlMotor } from '../sync/motor';
import type { ServicioRemoto } from '../sync/servicioRemoto';
import { borrarCodigo } from './desbloqueo';
import { borrarSesionLocal } from './sesionLocal';

export interface DependenciasCierre {
  servicio: ServicioRemoto;
  /** Cierra la sesión de supabase-js en este dispositivo. */
  cerrarServicio: () => Promise<void>;
}

export type MotivoNoCerrada = 'pendientes' | 'sin_red' | 'sesion_vencida' | 'no_enviados';

export type ResultadoCierre = { cerrada: true } | { cerrada: false; pendientes: number; motivo: MotivoNoCerrada };

/** Borra la sesión y el código. La información descargada del predio se conserva (documento 10, sección 6). */
async function cerrarDefinitivamente(dependencias: DependenciasCierre): Promise<void> {
  await dependencias.cerrarServicio();
  await borrarCodigo();
  await borrarSesionLocal();
}

/** Cierra si la cola está vacía; si no, informa cuántos pendientes hay para que el usuario decida. */
export async function intentarCerrar(dependencias: DependenciasCierre): Promise<ResultadoCierre> {
  const pendientes = await contarPendientes();
  if (pendientes > 0) return { cerrada: false, pendientes, motivo: 'pendientes' };
  await cerrarDefinitivamente(dependencias);
  return { cerrada: true };
}

/** Espera a que termine una sincronización en curso. */
function esperarMotorLibre(): Promise<void> {
  if (!leerEstadoMotor().sincronizando) return Promise.resolve();
  return new Promise((resolver) => {
    const dejar = suscribirseAlMotor((estado) => {
      if (!estado.sincronizando) {
        dejar();
        resolver();
      }
    });
  });
}

/** «Enviar y cerrar sesión» (sección 2.1): sincroniza y cierra solo si la cola quedó vacía. */
export async function enviarYCerrar(dependencias: DependenciasCierre): Promise<ResultadoCierre> {
  let resultado = await sincronizar(dependencias.servicio);
  if (resultado.estado === 'omitida') {
    // Ya había una sincronización en curso: se espera a que termine y se vuelve a intentar.
    await esperarMotorLibre();
    resultado = await sincronizar(dependencias.servicio);
  }

  const pendientes = await contarPendientes();
  if (pendientes === 0) {
    await cerrarDefinitivamente(dependencias);
    return { cerrada: true };
  }
  const motivo: MotivoNoCerrada =
    resultado.estado === 'sin_red' ? 'sin_red' : resultado.estado === 'sesion_vencida' ? 'sesion_vencida' : 'no_enviados';
  return { cerrada: false, pendientes, motivo };
}

/** «Sí, descartar y cerrar sesión» (sección 2.2): solo tras la segunda confirmación. */
export async function descartarYCerrar(dependencias: DependenciasCierre): Promise<{ descartados: number }> {
  const descartados = await descartarPendientes();
  await cerrarDefinitivamente(dependencias);
  return { descartados };
}

// ---------------------------------------------------------------------------
// Textos (sección 2)
// ---------------------------------------------------------------------------

const registros = (n: number) => (n === 1 ? '1 registro' : `${n} registros`);

export function textoPendientes(pendientes: number, enLinea: boolean): string {
  return enLinea
    ? `Hay ${registros(pendientes)} sin enviar.`
    : `Hay ${registros(pendientes)} sin enviar y no hay conexión. Si cierra la sesión ahora, se perderán.`;
}

export function textoNoCerrada(pendientes: number, motivo: Exclude<MotivoNoCerrada, 'pendientes'>): string {
  const causa = {
    sin_red: 'No hay conexión.',
    sesion_vencida: 'La sesión con el servicio venció: ingrese de nuevo con conexión para enviarlos.',
    no_enviados: 'Algunos registros todavía no pueden enviarse.',
  }[motivo];
  const quedan = pendientes === 1 ? 'queda 1 registro' : `quedan ${pendientes} registros`;
  return `No se cerró la sesión: ${quedan} sin enviar. ${causa}`;
}

export function textoSegundaConfirmacion(pendientes: number): string {
  const verbo = pendientes === 1 ? 'Se perderá 1 registro que no se ha enviado.' : `Se perderán ${pendientes} registros que no se han enviado.`;
  return `${verbo} Esta acción no se puede deshacer.`;
}
