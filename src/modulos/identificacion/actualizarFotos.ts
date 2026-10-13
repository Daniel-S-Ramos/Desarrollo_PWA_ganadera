/**
 * Completar o cambiar una foto de un animal ya registrado (RF-02, Tabla 31).
 * Especificación: docs/tecnica/16-ficha-del-animal.md, sección 5.2
 *
 * Una foto nueva es un registro nuevo de fotografía: no reemplaza ni borra la anterior, que queda en
 * el historial. La vigente de cada vista es la más reciente (documento 05, sección 5.2).
 */
import { consulta, unidadDeTrabajo } from '../../datos/repositorio';
import type { RegistroLocal, TipoFotografia, Uuid } from '../../dominio/tipos';
import { PermisoDenegado, puedeCrear } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import type { FotoComprimida } from './fotografias';

/**
 * Agrega una fotografía de una vista al animal, con sus imágenes y su entrada en la cola de imágenes,
 * en una sola transacción. La retención de la Tabla 25 se aplica cuando la imagen sube.
 *
 * @throws PermisoDenegado si el perfil no puede crear fotografías (Tabla 27).
 * @throws Error si el animal no está en el teléfono.
 */
export async function agregarFotografia(
  animalId: Uuid,
  tipo: TipoFotografia,
  foto: FotoComprimida,
  usuario: Identidad,
): Promise<RegistroLocal<'fotografia'>> {
  if (!puedeCrear(usuario.perfil, 'fotografia')) throw new PermisoDenegado(usuario.perfil, 'fotografia');

  return unidadDeTrabajo(usuario.usuario_id, async (tx) => {
    if (!(await consulta.animal.get(animalId))) throw new Error('El animal no está en este teléfono');
    const fotografia = await tx.crear('fotografia', { animal_id: animalId, tipo });
    await tx.guardarImagen(fotografia, foto);
    return fotografia;
  });
}
