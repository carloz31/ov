import { ArrowRight, Mail } from 'lucide-react'
import { Link } from 'react-router'

// Ajuste del diario (F05): la carta que la actividad dejó en el buzón, como una fila bajo «Se abrió para ti»: sobre
// con punto dorado y el enlace. Sin botón: «Volver al mapa» sigue siendo la única acción principal. Ajuste
// cartas-diario: en api (`pregunta` nula) solo va el enlace al diario con esa carta, sin su nombre ni su texto; en
// local, la pregunta y «Leer en el diario», como antes.
export function FinishJournalSection({ pregunta, enlace }: { pregunta: string | null; enlace: string }) {
  if (!pregunta)
    return (
      <section className="sx-finish-letter" aria-label="Carta de Lumi">
        <span className="sx-finish-letter-icon" aria-hidden="true">
          <Mail size={20} />
          <span className="sx-finish-letter-dot" />
        </span>
        <Link className="sx-finish-letter-link" to={enlace}>
          Lumi te dejó una carta en tu diario
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </section>
    )
  return (
    <section className="sx-finish-letter" aria-labelledby="finish-letter-title">
      <span className="sx-finish-letter-icon" aria-hidden="true">
        <Mail size={20} />
        <span className="sx-finish-letter-dot" />
      </span>
      <div className="sx-finish-letter-copy">
        <h3 id="finish-letter-title">Lumi te dejó una carta en tu buzón</h3>
        <blockquote>“{pregunta}”</blockquote>
        <p>Respóndela cuando quieras, desde tu diario.</p>
      </div>
      <Link className="sx-finish-letter-link" to={enlace}>
        Leer en el diario
        <ArrowRight aria-hidden="true" size={16} />
      </Link>
    </section>
  )
}
