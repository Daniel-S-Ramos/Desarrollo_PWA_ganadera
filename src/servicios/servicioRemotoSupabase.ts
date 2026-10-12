/**
 * Implementación del servicio remoto sobre Supabase (interfaz en src/sync/servicioRemoto.ts).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FilaRemota } from '../datos/sincronizacionLocal';
import type { NombreTabla, Parametro, Usuario, Uuid } from '../dominio/tipos';
import type { Desde, ResultadoEnvio, ServicioRemoto } from '../sync/servicioRemoto';

export function crearServicioRemoto(cliente: SupabaseClient): ServicioRemoto {
  return {
    async sesionVigente() {
      // getSession renueva el token si venció y hay red; si el token de refresco dejó de ser válido,
      // devuelve una sesión vacía.
      const { data } = await cliente.auth.getSession();
      return data.session !== null;
    },

    async insertar(tabla, fila): Promise<ResultadoEnvio> {
      try {
        const { data, error, status } = await cliente
          .from(tabla)
          // INSERT … ON CONFLICT (id) DO NOTHING (documento 09, sección 3.1).
          .upsert(fila, { onConflict: 'id', ignoreDuplicates: true })
          .select('recibido_en');
        if (error) return { ok: false, codigo: error.code || undefined, estado: status, mensaje: error.message };
        const recibido = (data as { recibido_en: string }[] | null)?.[0]?.recibido_en;
        return recibido ? { ok: true, recibido_en: recibido } : { ok: true };
      } catch (error) {
        return { ok: false, mensaje: error instanceof Error ? error.message : String(error) };
      }
    },

    async consultar(tabla: NombreTabla, desde: Desde, limite: number): Promise<FilaRemota[]> {
      let consulta = cliente
        .from(tabla)
        .select('*')
        .order('recibido_en', { ascending: true })
        .order('id', { ascending: true })
        .limit(limite);

      if (desde.tipo === 'despues_de') {
        consulta = consulta.gt('recibido_en', desde.recibido_en);
      } else if (desde.tipo === 'cursor') {
        // Después de la última fila: recibido_en mayor, o igual y con id mayor (documento 10, sección 3.3).
        consulta = consulta.or(
          `recibido_en.gt."${desde.recibido_en}",and(recibido_en.eq."${desde.recibido_en}",id.gt.${desde.id})`,
        );
      }

      const { data, error } = await consulta;
      if (error) throw new Error(`No fue posible descargar ${tabla}: ${error.message}`);
      return (data ?? []) as FilaRemota[];
    },

    async buscarOrdeno(animalId: Uuid, fecha: string) {
      const { data, error } = await cliente
        .from('produccion_leche')
        .select('id, litros')
        .eq('animal_id', animalId)
        .eq('fecha', fecha)
        .maybeSingle();
      if (error || !data) return null;
      return { id: data.id as Uuid, litros: Number(data.litros) };
    },

    async usuarios(): Promise<Usuario[]> {
      const { data, error } = await cliente.from('usuario').select('id, nombre, perfil');
      if (error) throw new Error(`No fue posible descargar los usuarios: ${error.message}`);
      return (data ?? []) as Usuario[];
    },

    async parametros(): Promise<Parametro[]> {
      const { data, error } = await cliente.from('parametro').select('clave, valor, unidad, descripcion');
      if (error) throw new Error(`No fue posible descargar los parámetros: ${error.message}`);
      return ((data ?? []) as Parametro[]).map((p) => ({ ...p, valor: Number(p.valor) }));
    },
  };
}
