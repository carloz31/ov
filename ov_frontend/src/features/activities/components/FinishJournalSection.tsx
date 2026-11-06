import { ArrowRight, Mail } from 'lucide-react'
import { Link } from 'react-router'

// Ajuste del diario (F05): la carta que la actividad dejó en el buzón, como una fila bajo «Se abrió para ti»: sobre
// con punto dorado, el texto y el enlace a la derecha. Sin botón: «Volver al mapa» sigue siendo la única acción
// principal. Una carta personalizada (`pregunta` nula) todavía no tiene texto: Lumi la escribe al abrirla en el diario.
export function FinishJournalSection({ pregunta, enlace }: { pregunta: string | null; enlace: string }) {
  return (
    <section className="sx-finish-letter" aria-labelledby="finish-letter-title">
      <span className="sx-finish-letter-icon" aria-hidden="true">
        <Mail size={20} />
        <span className="sx-finish-letter-dot" />
      </span>
      <div className="sx-finish-letter-copy">
        <h3 id="finish-letter-title">Lumi te dejó una carta en tu buzón</h3>
        {pregunta ? (
          <>
            <blockquote>“{pregunta}”</blockquote>
            <p>Respóndela cuando quieras, desde tu diario.</p>
          </>
        ) : (
          <p className="sx-finish-letter-lead">
            Ábrela en tu diario cuando quieras: Lumi la escribirá pensando en lo que le contaste aquí.
          </p>
        )}
      </div>
      <Link className="sx-finish-letter-link" to={enlace}>
        {pregunta ? 'Leer en el diario' : 'Ir al buzón'}
        <ArrowRight aria-hidden="true" size={16} />
      </Link>
    </section>
  )
}
