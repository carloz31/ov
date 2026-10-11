import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router'
import { discoveryPaths } from '@/routes/discoveryPaths'
import type { HelenaPage, TipoResultadoHelena } from '@/types/profile'

export function ResultHeader({
  page,
  tipo,
}: {
  page: HelenaPage & { etiquetaDemo: string }
  tipo: TipoResultadoHelena
}) {
  return (
    <header className="sx-d-result-header">
      <Link className="sx-d-result-back" to={discoveryPaths.helena}>
        <ChevronLeft aria-hidden="true" />
        El libro de Helena
      </Link>
      <p className="sx-d-eyebrow">
        Página {page.numeral} · descifrada · {page.subtitle}
      </p>
      <h1>{page.title}</h1>
      <p>
        {tipo === 'COINCIDENCIAS'
          ? 'Helena leyó tus respuestas y encontró los tipos de actividad que más te llaman. No es un veredicto: es una pista para explorar ocupaciones y carreras que podrías no haber considerado.'
          : 'No hay una sola forma de ser inteligente. Helena leyó tus respuestas y encontró las capacidades que más usas para aprender, crear y resolver. Todas se pueden desarrollar.'}
      </p>
      {page.demo && (
        <p className="sx-d-demo">
          {page.etiquetaDemo}
          {tipo === 'COINCIDENCIAS'
            ? 'Este ejemplo no es tu resultado personal.'
            : 'Este instrumento aún no está disponible.'}
        </p>
      )}
    </header>
  )
}
