import { useRef, useState } from 'react';
import { comprimirFoto, type FotoComprimida } from './fotografias';

/**
 * Botón de cámara con la opción de galería, que entrega la foto ya comprimida
 * (docs/tecnica/14-fotografias.md, secciones 2 y 8.1).
 */
export function CapturaFoto({
  etiqueta,
  principal = true,
  alCapturar,
}: {
  etiqueta: string;
  principal?: boolean;
  alCapturar: (foto: FotoComprimida) => Promise<void> | void;
}) {
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function recibir(archivo: File | undefined) {
    if (!archivo) return;
    setError(null);
    setProcesando(true);
    try {
      await alCapturar(await comprimirFoto(archivo));
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
        e.target.value = '';
      }}
    />
  );

  if (procesando) return <p className="texto-secundario">Procesando…</p>;
  return (
    <div className="foto__acciones">
      <button type="button" className={`boton ${principal ? 'boton--principal' : 'boton--secundario'}`} onClick={() => camara.current?.click()}>
        {etiqueta}
      </button>
      <button type="button" className="enlace" onClick={() => galeria.current?.click()}>
        Elegir de la galería
      </button>
      {error && <span className="campo__error">{error}</span>}
      {entrada(camara, true)}
      {entrada(galeria, false)}
    </div>
  );
}
