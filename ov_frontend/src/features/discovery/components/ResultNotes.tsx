import { Compass, Star } from 'lucide-react'
import type { TipoResultadoHelena } from '@/types/profile'

export function ResultNotes({ tipo }: { tipo: TipoResultadoHelena }) {
  return (
    <footer className="sx-d-result-notes">
      {tipo === 'COINCIDENCIAS' ? (
        <>
          <p>
            <Compass aria-hidden="true" />
            <span>
              Estas sugerencias exploran, no deciden. Pueden confirmar opciones que ya tenías o abrir otras
              que no habías considerado.
            </span>
          </p>
          <p>
            <Star aria-hidden="true" />
            <span>
              Tus intereses son una parte de ti. Contrástalos con tus otras páginas, con lo que investigas y
              con quienes te conocen.
            </span>
          </p>
        </>
      ) : (
        <p>
          <Compass aria-hidden="true" />
          <span>
            Este perfil muestra cómo te ves hoy. Puede cambiar a medida que pruebas actividades nuevas.
          </span>
        </p>
      )}
    </footer>
  )
}
