import { ListChecks, PenLine } from 'lucide-react'
import { CharacterAvatar } from '@/components/student/CharacterAvatar'
import type { FilaPorAmpliar } from '../../lib/porAmpliar'
import '../../styles/registro-guiado.css'

// Lumi (una sola vez) con su texto y la lista de ítems por ampliar: lo comparten el cierre del registro y
// el drawer de la actividad. En el drawer va compacto y sin pistas.
export function BloquePorAmpliar({
  titulo,
  texto,
  filas,
  conPista,
  compacto = false,
}: {
  titulo?: string
  texto?: string
  filas: FilaPorAmpliar[]
  conPista: boolean
  compacto?: boolean
}) {
  return (
    <section className={`sx-por-ampliar ${compacto ? 'is-compact' : ''}`} aria-label="Lo que podrías ampliar">
      <div className="sx-por-ampliar-lumi">
        <CharacterAvatar id="companero" size="sm" />
        <div>
          {titulo && <strong>{titulo}</strong>}
          {texto && <p>{texto}</p>}
        </div>
      </div>
      {filas.length > 0 && (
        <ul className="sx-por-ampliar-lista">
          {filas.map((f) => {
            const Icon = f.conEleccion ? ListChecks : PenLine
            return (
              <li key={f.item}>
                <Icon size={18} aria-hidden="true" />
                <span>
                  <strong>{f.nombre}</strong>
                  {conPista && <small>{f.pista}</small>}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
