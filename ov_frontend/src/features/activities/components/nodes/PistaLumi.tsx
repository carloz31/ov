import { AvatarItem } from './AvatarItem'

// Ajuste front de registros (lote 2, §3 y §4): la pista, un bloque suave con el avatar pequeño de Lumi, su rótulo
// («Lumi aún quiere saber» en lectura, «Podrías contar más sobre esto» en edición) y la pregunta. Sin botón.
export function PistaLumi({ rotulo, texto }: { rotulo: string; texto: string }) {
  return (
    <div className="sx-item-pista">
      <AvatarItem id="companero" pequeno />
      <div>
        <span className="sx-item-pista-rotulo">{rotulo}</span>
        <p>{texto}</p>
      </div>
    </div>
  )
}
