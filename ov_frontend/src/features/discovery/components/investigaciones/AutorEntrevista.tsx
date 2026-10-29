import { iniciales, lineaNivel } from '@/lib/servidor/adaptadoresInvestigaciones'
import type { PersonaInvestigacion } from '@/types/servidor'

// F09: un autor como chip (avatar con iniciales, nombre y «Nivel N · título»). En el detalle, sin título; la
// cuenta propia se nombra «Tú».
export function AutorEntrevista({
  autor,
  propio = false,
  conTitulo = true,
  nota,
}: {
  autor: PersonaInvestigacion
  propio?: boolean
  conTitulo?: boolean
  nota?: string
}) {
  const nivel = lineaNivel(autor.nivel, conTitulo)
  return (
    <span className="sx-i-autor">
      <span className="sx-i-avatar" aria-hidden="true">
        {propio ? 'Tú' : iniciales(autor.nombre)}
      </span>
      <span>
        <strong>{propio ? 'Tú' : autor.nombre}</strong>
        {(nota ?? nivel) && <small>{nota ?? nivel}</small>}
      </span>
    </span>
  )
}
