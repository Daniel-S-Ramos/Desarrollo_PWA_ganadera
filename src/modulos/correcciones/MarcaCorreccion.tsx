import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { consulta } from '../../datos/repositorio';
import { CAMPOS_CORREGIBLES, desdeTexto, type CampoCorregible } from '../../dominio/camposCorregibles';
import { formatearFecha, formatearInstante } from '../../dominio/fechas';
import type { EntidadCorregible, Perfil, RegistroLocal, Uuid } from '../../dominio/tipos';
import type { Vigente } from '../../dominio/vigente';
import type { Identidad } from '../../sesion/token';
import { NOMBRE_MOTIVO, opcionDeCorreccion, type EntidadConCorreccion } from './correcciones';

/** Nombres y perfiles de los usuarios del predio, para las marcas y los permisos. */
export function useUsuarios(): Map<Uuid, { nombre: string; perfil: Perfil }> {
  const usuarios = useLiveQuery(() => consulta.usuario.toArray(), [], []);
  return new Map(usuarios.map((u) => [u.id, { nombre: u.nombre, perfil: u.perfil }]));
}

/** Nombres de animales y medicamentos, para mostrar los valores de madre, padre y medicamento. */
export function useNombresDeReferencia(): { animales: Map<Uuid, string>; medicamentos: Map<Uuid, string> } {
  const datos = useLiveQuery(
    async () => ({ animales: await consulta.animal.toArray(), medicamentos: await consulta.medicamento.toArray() }),
    [],
    { animales: [], medicamentos: [] },
  );
  return { animales: new Map(datos.animales.map((a) => [a.id, a.codigo_chapeta])), medicamentos: new Map(datos.medicamentos.map((m) => [m.id, m.nombre])) };
}

/** Un valor de corrección, legible: fechas, opciones, animales y medicamentos por su nombre. */
export function mostrarValor(campo: CampoCorregible | undefined, texto: string | null, nombres: ReturnType<typeof useNombresDeReferencia>): string {
  if (texto === null || texto === '') return 'vacío';
  if (!campo) return texto;
  const valor = desdeTexto(campo, texto);
  switch (campo.tipo) {
    case 'fecha':
      return formatearFecha(String(valor));
    case 'enum':
      return campo.opciones?.find(([v]) => v === valor)?.[1] ?? String(valor);
    case 'booleano':
      return valor ? 'Sí' : 'No';
    case 'animal':
      return nombres.animales.get(String(valor)) ?? 'un animal que no está en el teléfono';
    case 'medicamento':
      return nombres.medicamentos.get(String(valor)) ?? 'un medicamento que no está en el teléfono';
    case 'numero':
    case 'entero':
      return Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 2 });
    default:
      return String(valor);
  }
}

/**
 * La marca de un registro corregido o anulado (documento técnico 26, sección 6.4). Corregido: se despliega
 * con el valor anterior, el motivo, el autor y la fecha. Anulado: con su motivo y su autor.
 */
export function MarcaCorreccion<T extends { id: Uuid }>({ entidad, vigente }: { entidad: EntidadCorregible; vigente: Vigente<T> }) {
  const usuarios = useUsuarios();
  const nombres = useNombresDeReferencia();
  const [abierta, setAbierta] = useState(false);
  const autor = (id: Uuid) => usuarios.get(id)?.nombre ?? 'un usuario que ya no está en el predio';

  if (vigente.anulacion) {
    const a = vigente.anulacion;
    return (
      <p className="marca marca--anulado">
        Anulado: {NOMBRE_MOTIVO[a.motivo].toLowerCase()}, por {autor(a.autor_id)} el {formatearInstante(a.creado_en)}
        {a.nota ? `. ${a.nota}` : ''}
      </p>
    );
  }
  if (vigente.corregidos.size === 0) return null;
  const campos = CAMPOS_CORREGIBLES[entidad];
  return (
    <div>
      <button type="button" className="marca marca--corregido" aria-expanded={abierta} onClick={() => setAbierta((v) => !v)}>
        Corregido
      </button>
      {abierta && (
        <ul className="marca__detalle">
          {[...vigente.corregidos.entries()].flatMap(([nombre, lista]) =>
            lista.map((c) => (
              <li key={c.id}>
                {campos[nombre]?.etiqueta ?? nombre}: antes {mostrarValor(campos[nombre], c.valor_anterior, nombres)}, ahora {mostrarValor(campos[nombre], c.valor_nuevo, nombres)} ·{' '}
                {NOMBRE_MOTIVO[c.motivo].toLowerCase()} · {autor(c.autor_id)}, {formatearInstante(c.creado_en)}
                {c.nota ? ` · ${c.nota}` : ''}
              </li>
            )),
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * La opción «Corregir o anular» con la regla de permisos (sección 4): oculta al trabajador sobre registros del
 * propietario (CU-17, 2a); con el aviso de ventana vencida sobre uno de otro trabajador de otro día (2b).
 */
export function EnlaceCorregir({
  entidad,
  registro,
  identidad,
  texto = 'Corregir o anular',
}: {
  entidad: EntidadConCorreccion;
  registro: Pick<RegistroLocal<EntidadCorregible>, 'id' | 'autor_id' | 'creado_en'>;
  identidad: Identidad;
  texto?: string;
}) {
  const usuarios = useUsuarios();
  const [aviso, setAviso] = useState(false);
  const opcion = opcionDeCorreccion(identidad, registro, usuarios.get(registro.autor_id)?.perfil);
  if (opcion === 'oculta') return null;
  if (opcion === 'vencida') {
    return (
      <span>
        <button type="button" className="enlace" onClick={() => setAviso(true)}>
          {texto}
        </button>
        {aviso && <span className="campo__ayuda"> La ventana de corrección venció: solo el propietario puede enmendarlo.</span>}
      </span>
    );
  }
  return (
    <Link className="enlace" to={`/correccion/${entidad}/${registro.id}`}>
      {texto}
    </Link>
  );
}
