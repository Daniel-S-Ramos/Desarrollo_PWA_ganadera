import type { Ref } from 'react';
import { IconoLupa } from './Iconos';

/**
 * El buscador con lupa del listado de animales, para reutilizarlo en las pantallas donde hay que encontrar un
 * animal o un medicamento (pedido del propietario en la sesión C, 2026-10-26). Por chapeta, el teclado sale en
 * mayúsculas y sin autocorrección.
 */
export function Buscador({
  valor,
  alCambiar,
  etiqueta,
  marcador,
  porChapeta = true,
  campoRef,
}: {
  valor: string;
  alCambiar: (valor: string) => void;
  etiqueta: string;
  marcador: string;
  porChapeta?: boolean;
  campoRef?: Ref<HTMLInputElement>;
}) {
  return (
    <label className="campo">
      <span className="solo-lector">{etiqueta}</span>
      <span className="campo__grupo campo__grupo--busqueda">
        <span className="campo__icono campo__icono--claro" aria-hidden="true">
          <IconoLupa />
        </span>
        <input
          ref={campoRef}
          className={porChapeta ? 'campo__chapeta' : undefined}
          type="search"
          autoCapitalize={porChapeta ? 'characters' : 'sentences'}
          autoComplete="off"
          spellCheck={false}
          placeholder={marcador}
          value={valor}
          onChange={(e) => alCambiar(e.target.value)}
        />
      </span>
    </label>
  );
}
