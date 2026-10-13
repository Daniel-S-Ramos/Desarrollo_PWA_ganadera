import { useRef, useState } from 'react';
import { TIPOS_FOTOGRAFIA, type TipoFotografia } from '../../dominio/tipos';
import { useUrlDeImagen } from '../../ui/useUrlDeImagen';
import { comprimirFoto } from './fotografias';
import type { FotosCapturadas } from './registroAnimal';

const NOMBRE_VISTA: Record<TipoFotografia, string> = {
  izquierdo: 'Costado izquierdo',
  derecho: 'Costado derecho',
  frontal: 'Frente',
};

/**
 * Las tres vistas del animal (docs/tecnica/14-fotografias.md, sección 8.1). Cada foto se comprime al
 * capturarla y vive solo en la memoria de la pantalla hasta que se guarda el animal (Tabla 31).
 */
export function SeccionFotografias({ fotos, alCambiar }: { fotos: FotosCapturadas; alCambiar: (fotos: FotosCapturadas) => void }) {
  const capturadas = TIPOS_FOTOGRAFIA.filter((t) => fotos[t]).length;
  return (
    <fieldset className="fotografias">
      <legend>
        Fotografías <span className="campo__ayuda">({capturadas} de 3)</span>
      </legend>
      {TIPOS_FOTOGRAFIA.map((tipo) => (
        <CasillaFoto
          key={tipo}
          tipo={tipo}
          foto={fotos[tipo]}
          alCapturar={(foto) => alCambiar({ ...fotos, [tipo]: foto })}
          alQuitar={() => {
            const resto = { ...fotos };
            delete resto[tipo];
            alCambiar(resto);
          }}
        />
      ))}
    </fieldset>
  );
}

function CasillaFoto({
  tipo,
  foto,
  alCapturar,
  alQuitar,
}: {
  tipo: TipoFotografia;
  foto: { completa: Blob; reducida: Blob } | undefined;
  alCapturar: (foto: { completa: Blob; reducida: Blob }) => void;
  alQuitar: () => void;
}) {
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const miniatura = useUrlDeImagen(foto?.reducida);

  async function recibir(archivo: File | undefined) {
    if (!archivo) return;
    setError(null);
    setProcesando(true);
    try {
      alCapturar(await comprimirFoto(archivo));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo procesar la imagen.');
    } finally {
      setProcesando(false);
    }
  }

  const entrada = (referencia: React.RefObject<HTMLInputElement | null>, conCamara: boolean) => (
    <input
      ref={referencia}
      type="file"
      accept="image/*"
      {...(conCamara ? { capture: 'environment' as const } : {})}
      hidden
      onChange={(e) => {
        void recibir(e.target.files?.[0]);
        e.target.value = ''; // permite elegir el mismo archivo otra vez
      }}
    />
  );

  return (
    <div className="foto">
      <div className="foto__vista">
        {miniatura ? (
          <img className="foto__miniatura" src={miniatura} alt={`${NOMBRE_VISTA[tipo]} del animal`} />
        ) : (
          <div className="foto__vacia" aria-hidden="true">
            📷
          </div>
        )}
        <span className="foto__nombre">{NOMBRE_VISTA[tipo]}</span>
      </div>

      {procesando ? (
        <p className="texto-secundario">Procesando…</p>
      ) : (
        <div className="foto__acciones">
          <button type="button" className={`boton ${foto ? 'boton--secundario' : 'boton--principal'}`} onClick={() => camara.current?.click()}>
            {foto ? 'Repetir' : 'Tomar foto'}
          </button>
          {foto ? (
            <button type="button" className="enlace" onClick={alQuitar}>
              Quitar
            </button>
          ) : (
            <button type="button" className="enlace" onClick={() => galeria.current?.click()}>
              Elegir de la galería
            </button>
          )}
        </div>
      )}
      {error && <span className="campo__error">{error}</span>}
      {entrada(camara, true)}
      {entrada(galeria, false)}
    </div>
  );
}
