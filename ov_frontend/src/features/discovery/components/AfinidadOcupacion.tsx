import { Sparkles } from 'lucide-react'
import { Parchment } from '@/components/student/Parchment'
import type { OcupacionAfinPublica } from '@/types/servidor'

// La afinidad de una ocupación con el resultado de intereses: del servidor, con posición y parecido.
export function AfinidadOcupacion({
  afinidad,
  coincidencia,
}: {
  afinidad: string | undefined
  coincidencia: OcupacionAfinPublica | undefined
}) {
  if (!afinidad) return null
  return (
    <Parchment title="Afinidad contigo" className="sx-d-affinity">
      <Sparkles aria-hidden="true" />
      <h3>{afinidad}</h3>
      <p>Según lo que Helena descifró de tus intereses</p>
      {coincidencia ? (
        <small>
          Posición {coincidencia.posicion} · {coincidencia.parecido} %
        </small>
      ) : (
        <small>Afinidad de demostración. No se calculó a partir de tus respuestas.</small>
      )}
    </Parchment>
  )
}
