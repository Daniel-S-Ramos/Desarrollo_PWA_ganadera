import { useEffect, useState } from 'react';

/**
 * Dirección temporal (blob:) para mostrar una imagen guardada en memoria o en la base local. Se
 * libera al cambiar la imagen o al desaparecer el componente, para no retener memoria.
 */
export function useUrlDeImagen(imagen: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!imagen) {
      setUrl(null);
      return;
    }
    const nueva = URL.createObjectURL(imagen);
    setUrl(nueva);
    return () => URL.revokeObjectURL(nueva);
  }, [imagen]);
  return url;
}
