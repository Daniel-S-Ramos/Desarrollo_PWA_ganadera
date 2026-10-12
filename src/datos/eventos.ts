/**
 * Aviso de que se guardó información en el dispositivo. El motor de sincronización lo escucha para
 * intentar enviar pocos segundos después (docs/tecnica/09-sincronizacion-subida.md, sección 2), sin
 * que la capa de datos dependa del motor.
 */
type Oyente = () => void;

const oyentes = new Set<Oyente>();

export function alGuardarLocalmente(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function avisarGuardadoLocal(): void {
  for (const oyente of oyentes) oyente();
}
