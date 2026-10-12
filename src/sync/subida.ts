/**
 * Subida: vacía la cola de operaciones hacia el servicio, en orden.
 * Especificación: docs/tecnica/09-sincronizacion-subida.md
 */
import { operacionesPendientes, type OperacionPendiente } from '../datos/repositorio';
import {
  confirmarEnvio,
  convertirOrdenoEnCorreccion,
  leerRegistro,
  marcarConflicto,
  marcarEstado,
  registrarIntento,
  reiniciarEnTransmision,
  retirarOperacion,
  sinAtributosLocales,
} from '../datos/sincronizacionLocal';
import type { NombreTabla, RegistroLocal } from '../dominio/tipos';
import type { ResultadoEnvio, ServicioRemoto } from './servicioRemoto';

export type Clase = 'aceptada' | 'transitoria' | 'dependencia' | 'conflicto' | 'definitivo';

/** Clasificación de las respuestas del servicio (documento 09, sección 4). */
export function clasificar(resultado: ResultadoEnvio): Clase {
  if (resultado.ok) return 'aceptada';
  const { codigo } = resultado;
  if (codigo === '23503') return 'dependencia';
  if (codigo === '23505') return 'conflicto';
  if (codigo) return 'definitivo';
  // Sin código del servicio: no hubo respuesta, se agotó el tiempo o el servicio falló.
  return 'transitoria';
}

/** Causa que se muestra al propietario en un registro en conflicto. */
const CAUSA_UNICIDAD: Partial<Record<NombreTabla, string>> = {
  animal: 'El código de chapeta ya está asignado a otro animal.',
  medicamento: 'Ya existe un medicamento con ese nombre.',
  movimiento_economico: 'Este animal ya tiene registrada su compra.',
  salida: 'Este animal ya tiene registrada su salida.',
};

function causaDefinitiva(operacion: OperacionPendiente, registro: Record<string, unknown>, resultado: ResultadoEnvio): string {
  const codigo = resultado.ok ? undefined : resultado.codigo;
  if (codigo === '42501') {
    if (operacion.entidad === 'correccion' && registro['motivo'] === 'registro_duplicado') {
      return 'Solo el propietario puede reemplazar este ordeño. Se conserva el valor registrado para que el propietario decida.';
    }
    return 'El servicio rechazó el registro por los permisos del perfil.';
  }
  return `El servicio rechazó el registro (${codigo ?? 'sin código'}): ${resultado.ok ? '' : resultado.mensaje}`;
}

export interface ResumenSubida {
  estado: 'completa' | 'detenida_sin_red' | 'sesion_vencida';
  enviadas: number;
  pendientes_por_dependencia: number;
  conflictos: number;
}

/**
 * Recorre la cola en orden de creación y envía cada registro. Se detiene ante una falla de red;
 * continúa ante una dependencia faltante, un conflicto o un rechazo definitivo.
 */
export async function subir(servicio: ServicioRemoto): Promise<ResumenSubida> {
  const resumen: ResumenSubida = { estado: 'completa', enviadas: 0, pendientes_por_dependencia: 0, conflictos: 0 };

  if (!(await servicio.sesionVigente())) return { ...resumen, estado: 'sesion_vencida' };

  await reiniciarEnTransmision();

  // La cola se relee en cada vuelta: una conversión de ordeño duplicado agrega una corrección al
  // final, que debe enviarse en esta misma subida. Cada operación se intenta una sola vez por subida.
  const intentadas = new Set<number>();
  for (;;) {
    const operacion = (await operacionesPendientes()).find((o) => !intentadas.has(o.seq!));
    if (!operacion) break;
    intentadas.add(operacion.seq!);

    const encontrado = await leerRegistro(operacion.entidad, operacion.registro_id);
    if (!encontrado) {
      await retirarOperacion(operacion);
      continue;
    }
    const registro = encontrado as unknown as Record<string, unknown>;

    await marcarEstado(operacion.entidad, operacion.registro_id, 'en_transmision');
    const resultado = await servicio.insertar(operacion.entidad, sinAtributosLocales(registro));

    switch (clasificar(resultado)) {
      case 'aceptada':
        await confirmarEnvio(operacion, resultado.ok ? resultado.recibido_en : undefined);
        resumen.enviadas++;
        break;

      case 'transitoria':
        await registrarIntento(operacion);
        return { ...resumen, estado: 'detenida_sin_red' };

      case 'dependencia':
        await registrarIntento(operacion);
        resumen.pendientes_por_dependencia++;
        break;

      case 'conflicto':
        if (operacion.entidad === 'produccion_leche') {
          const ordeno = encontrado as RegistroLocal<'produccion_leche'>;
          const aceptado = await servicio.buscarOrdeno(ordeno.animal_id, ordeno.fecha);
          if (aceptado) {
            await convertirOrdenoEnCorreccion(operacion, ordeno, aceptado);
            break;
          }
        }
        await marcarConflicto(operacion, CAUSA_UNICIDAD[operacion.entidad] ?? 'Ya existe un registro igual en el servicio.');
        resumen.conflictos++;
        break;

      case 'definitivo':
        await marcarConflicto(operacion, causaDefinitiva(operacion, registro, resultado));
        resumen.conflictos++;
        break;
    }
  }
  return resumen;
}
