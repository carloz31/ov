import { Clock } from 'lucide-react'
import { reflectionCopy } from '@/data/activities/reflectionConfig'

// Zona de eco de una consigna que retoma una respuesta (F02), con el marcado de QuestionMemory: la cita
// literal o, si la respuesta de origen está por desarrollar, un aviso sin cita ni enlace.
export function RegistroEco({
  eco,
}: {
  eco: { estado: 'DISPONIBLE' | 'POR_DESARROLLAR'; texto: string; titulo: string }
}) {
  if (eco.estado === 'POR_DESARROLLAR')
    return (
      <aside className="sx-question-memory is-neutral">
        <div>
          <p>
            Tu respuesta en «{eco.titulo}» aún está por desarrollar. Puedes ampliarla desde ese registro, con
            «Ver o modificar mis respuestas».
          </p>
        </div>
      </aside>
    )
  return (
    <aside className="sx-question-memory">
      <Clock size={18} aria-hidden="true" />
      <div>
        <strong>{reflectionCopy.memory(eco.titulo)}</strong>
        <blockquote>
          <mark>«{eco.texto}»</mark>
        </blockquote>
      </div>
    </aside>
  )
}
