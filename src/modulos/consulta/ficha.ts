/**
 * Ficha del animal: consolida lo que se sabe de un animal a partir de la base local (RF-05, CU-03, HU-15).
 * Especificación: docs/tecnica/16-ficha-del-animal.md
 *
 * Las reglas de cada dato son funciones puras; consolidarFicha solo reúne los registros y las aplica.
 * Cuando la Iteración 4 construya las correcciones, el valor vigente de cada dato se calculará aquí;
 * el de los litros ya se aplica (documento técnico 22, sección 8).
 */
import { consulta, reducidasLocales } from '../../datos/repositorio';
import { fotografiasVigentes } from '../../dominio/fotografias';
import { litrosVigentes } from '../../dominio/leche';
import {
  TIPOS_FOTOGRAFIA,
  type Destino,
  type EstadoSync,
  type FechaPredio,
  type Instante,
  type RegistroLocal,
  type Sexo,
  type TipoFotografia,
  type Uuid,
} from '../../dominio/tipos';
import { origenDe, type Origen } from '../../dominio/origen';
import { elegirFoto } from './listado';

// ---------------------------------------------------------------------------
// Reglas de cada dato (sección 3)
// ---------------------------------------------------------------------------

/** El registro más reciente por su fecha; a igual fecha, el creado después (mayor UUID v7). */
export function masReciente<T extends { id: Uuid }>(registros: readonly T[], fecha: (r: T) => FechaPredio): T | undefined {
  let elegido: T | undefined;
  for (const r of registros) {
    if (!elegido || fecha(r) > fecha(elegido) || (fecha(r) === fecha(elegido) && r.id > elegido.id)) elegido = r;
  }
  return elegido;
}

export type UltimoPeso =
  | { tipo: 'pesaje'; kg: number; fecha: FechaPredio }
  | { tipo: 'peso de compra' | 'peso al nacer'; kg: number; fecha: FechaPredio | null }
  | null;

/** El pesaje más reciente; sin pesajes, el peso inicial nombrado según el origen (sección 3.1). */
export function ultimoPeso(
  animal: Pick<RegistroLocal<'animal'>, 'peso_inicial' | 'fecha_ingreso' | 'fecha_nacimiento'>,
  pesajes: readonly RegistroLocal<'pesaje'>[],
): UltimoPeso {
  const reciente = masReciente(pesajes, (p) => p.fecha);
  if (reciente) return { tipo: 'pesaje', kg: reciente.peso, fecha: reciente.fecha };
  if (animal.peso_inicial === null) return null;
  return origenDe(animal) === 'comprado'
    ? { tipo: 'peso de compra', kg: animal.peso_inicial, fecha: animal.fecha_ingreso }
    : { tipo: 'peso al nacer', kg: animal.peso_inicial, fecha: animal.fecha_nacimiento };
}

/** El evento sanitario de tipo vacuna más reciente; las purgas, vitaminas y tratamientos no cuentan (sección 3.2). */
export function ultimaVacuna(eventos: readonly RegistroLocal<'evento_sanitario'>[]): RegistroLocal<'evento_sanitario'> | undefined {
  return masReciente(
    eventos.filter((e) => e.tipo === 'vacuna'),
    (e) => e.fecha,
  );
}

// ---------------------------------------------------------------------------
// La ficha consolidada
// ---------------------------------------------------------------------------

export interface Progenitor {
  forma: 'predio' | 'externo' | 'desconocido';
  /** Del predio: su identificador y su chapeta (o null si no está en el teléfono). Externo: el nombre. */
  id?: Uuid;
  texto?: string;
}

export interface FotoFicha {
  tipo: TipoFotografia;
  fotografia_id: Uuid;
  autor: string;
  creado_en: Instante;
}

export interface FichaAnimal {
  id: Uuid;
  codigo_chapeta: string;
  sexo: Sexo;
  fecha_nacimiento: FechaPredio | null;
  fecha_nacimiento_exacta: boolean;
  origen: Origen;
  fecha_ingreso: FechaPredio | null;
  procedencia: string | null;
  retirado: boolean;
  estado_sync: EstadoSync;
  detalle_conflicto?: string;

  peso: UltimoPeso;
  vacuna: { nombre: string; fecha: FechaPredio } | null;
  /** null en machos: la fila no se presenta (sección 3.3, decisión B). */
  leche: { litros: number; fecha: FechaPredio } | 'sin_registros' | null;
  destino: { destino: Destino; desde: FechaPredio } | null;

  madre: Progenitor;
  padre: Progenitor;

  /** Fotografía vigente de cada vista, en orden: izquierdo, derecho, frente. */
  fotos: FotoFicha[];
  /** La reducida que se muestra en el encabezado. */
  fotoPrincipal: Blob | null;

  autor: string;
  creado_en: Instante;
}

/** Si el autor no está en la copia local de los usuarios no se muestra su identificador (sección 4). */
export const AUTOR_DESCONOCIDO = 'un usuario que ya no está en el predio';

function progenitor(id: Uuid | null, externo: string | null, chapetas: ReadonlyMap<Uuid, string>): Progenitor {
  if (id) return { forma: 'predio', id, texto: chapetas.get(id) ?? 'un animal que no está en este teléfono' };
  if (externo) return { forma: 'externo', texto: externo };
  return { forma: 'desconocido' };
}

/** Reúne la ficha de un animal desde la base local. undefined si el animal no está en el teléfono. */
export async function consolidarFicha(animalId: Uuid): Promise<FichaAnimal | undefined> {
  const animal = await consulta.animal.get(animalId);
  if (!animal) return undefined;

  const [pesajes, eventos, ordenos, destinos, fotografias, salidas, usuarios, reducidas, medicamentos] = await Promise.all([
    consulta.pesaje.where('animal_id').equals(animalId).toArray(),
    consulta.evento_sanitario.where('animal_id').equals(animalId).toArray(),
    consulta.produccion_leche.where('animal_id').equals(animalId).toArray(),
    consulta.destino_productivo.where('animal_id').equals(animalId).toArray(),
    consulta.fotografia.where('animal_id').equals(animalId).toArray(),
    consulta.salida.where('animal_id').equals(animalId).count(),
    consulta.usuario.toArray(),
    reducidasLocales(),
    consulta.medicamento.toArray(),
  ]);
  const nombres = new Map(usuarios.map((u) => [u.id, u.nombre]));
  const nombreDe = (id: Uuid) => nombres.get(id) ?? AUTOR_DESCONOCIDO;

  const progenitores = [animal.madre_id, animal.padre_id].filter((id): id is Uuid => id !== null);
  const chapetas = new Map(
    (await consulta.animal.bulkGet(progenitores)).filter((a) => a !== undefined).map((a) => [a!.id, a!.codigo_chapeta]),
  );

  const vacuna = ultimaVacuna(eventos);
  const ordeno = masReciente(ordenos, (o) => o.fecha);
  // Los litros vigentes: con su corrección más reciente aplicada (documento técnico 22, sección 8).
  const litrosOrdeno = ordeno
    ? (litrosVigentes([ordeno], await consulta.correccion.where('registro_id').equals(ordeno.id).toArray()).get(ordeno.id) ?? ordeno.litros)
    : null;
  const destino = masReciente(destinos, (d) => d.desde);
  const vigentes = fotografiasVigentes(fotografias);

  return {
    id: animal.id,
    codigo_chapeta: animal.codigo_chapeta,
    sexo: animal.sexo,
    fecha_nacimiento: animal.fecha_nacimiento,
    fecha_nacimiento_exacta: animal.fecha_nacimiento_exacta,
    origen: origenDe(animal),
    fecha_ingreso: animal.fecha_ingreso,
    procedencia: animal.procedencia,
    retirado: salidas > 0,
    estado_sync: animal.estado_sync,
    ...(animal.detalle_conflicto ? { detalle_conflicto: animal.detalle_conflicto } : {}),

    peso: ultimoPeso(animal, pesajes),
    vacuna: vacuna
      ? { nombre: medicamentos.find((m) => m.id === vacuna.medicamento_id)?.nombre ?? 'Vacuna', fecha: vacuna.fecha }
      : null,
    leche: animal.sexo === 'macho' ? null : ordeno ? { litros: litrosOrdeno!, fecha: ordeno.fecha } : 'sin_registros',
    destino: destino ? { destino: destino.destino, desde: destino.desde } : null,

    madre: progenitor(animal.madre_id, animal.madre_externa, chapetas),
    padre: progenitor(animal.padre_id, animal.padre_externo, chapetas),

    fotos: TIPOS_FOTOGRAFIA.flatMap((tipo) => {
      const foto = vigentes.get(tipo);
      return foto ? [{ tipo, fotografia_id: foto.id, autor: nombreDe(foto.autor_id), creado_en: foto.creado_en }] : [];
    }),
    // La misma regla del listado: la principal si está en el teléfono; si no, otra reducida del animal.
    fotoPrincipal: elegirFoto(fotografias, reducidas),

    autor: nombreDe(animal.autor_id),
    creado_en: animal.creado_en,
  };
}
