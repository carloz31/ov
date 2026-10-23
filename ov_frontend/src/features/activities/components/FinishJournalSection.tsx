import { Mail } from 'lucide-react'
import { Link } from 'react-router'

// Ajuste del diario (F05): la carta que la actividad dejó en el buzón, como una fila bajo «Se abrió para ti». Sin
// botón: «Volver al mapa» sigue siendo la única acción principal. Una carta personalizada (`pregunta` nula) todavía
// no tiene texto: Lumi la escribe cuando se abre en el diario.
export function FinishJournalSection({ pregunta, enlace }: { pregunta: string | null; enlace: string }) {
  return (
    <section className="sx-finish-letter" aria-labelledby="finish-letter-title">
      <span className="sx-finish-letter-icon" aria-hidden="true">
        <Mail size={18} />
        <span className="sx-finish-letter-dot" />
      </span>
      <div>
        <h3 id="finish-letter-title">Lumi te dejó una carta en tu buzón</h3>
        {pregunta ? (
          <>
            <blockquote>“{pregunta}”</blockquote>
            <p>Respóndela cuando quieras, desde tu diario</p>
            <Link to={enlace}>Leer en el diario</Link>
          </>
        ) : (
          <>
            <p>Ábrela en tu diario cuando quieras: Lumi la escribirá pensando en lo que le contaste aquí</p>
            <Link to={enlace}>Ir al buzón</Link>
          </>
        )}
      </div>
    </section>
  )
}
