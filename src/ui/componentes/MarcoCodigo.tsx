import type { ReactNode } from 'react';
import candadoListo from '../imagenes/candado-listo.webp';
import candado from '../imagenes/candado.webp';
import paisaje from '../imagenes/paisaje-cerca.webp';

/**
 * Marco común de las pantallas del código de desbloqueo (elegir, repetir y desbloquear): la ilustración
 * del candado, el título, la explicación y el paisaje al pie. Solo presentación.
 */
export function MarcoCodigo({
  ilustracion,
  titulo,
  explicacion,
  children,
}: {
  /** cerrado: elegir el código o desbloquear · listo: repetirlo para confirmar. */
  ilustracion: 'cerrado' | 'listo';
  titulo: string;
  explicacion: string;
  children: ReactNode;
}) {
  return (
    <div className="pantalla-ilustrada">
      {/* Imágenes decorativas: el título dice qué se pide. */}
      <img className="pantalla-ilustrada__dibujo" src={ilustracion === 'listo' ? candadoListo : candado} alt="" width={883} height={357} />
      <h2 className="pantalla-ilustrada__titulo">{titulo}</h2>
      <p className="pantalla-ilustrada__explicacion">{explicacion}</p>
      <div className="pantalla-ilustrada__contenido">{children}</div>
      <img className="pantalla-ilustrada__paisaje" src={paisaje} alt="" width={1086} height={246} />
    </div>
  );
}
