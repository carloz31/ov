import { getCharacterVisual } from '@/data/content/characters'

// Ajuste front de registros (lote 2, §3 y §4): la pista, un bloque suave con el avatar pequeño de Lumi, su rótulo
// («Lumi aún quiere saber» en lectura, «Podrías contar más sobre esto» en edición) y la pregunta. Sin botón.
export function PistaLumi({ rotulo, texto }: { rotulo: string; texto: string }) {
  const lumi = getCharacterVisual('companero')
  return (
    <div className="sx-item-pista">
      <span aria-hidden="true" className="sx-item-avatar is-pequeno">
        {lumi.emoji}
      </span>
      <div>
        <span className="sx-item-pista-rotulo">{rotulo}</span>
        <p>{texto}</p>
      </div>
    </div>
  )
}
