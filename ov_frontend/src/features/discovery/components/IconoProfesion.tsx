import type { CSSProperties } from 'react'
import { LockKeyhole } from 'lucide-react'
import { pictogramaDe } from '../data/gruposOcupacionales'

// Ajuste catalogo-datos-reales (F6): el ícono circular de una profesión. Revelado (obtenido en la Central de
// Casos): el pictograma de su grupo, a color, sobre fondo dorado con anillo; por revelar: círculo punteado con
// candado.
export function IconoProfesion({
  grupo,
  revelado,
  grande = false,
}: {
  grupo: string
  revelado: boolean
  grande?: boolean
}) {
  const { Icono, color } = pictogramaDe(grupo)
  return (
    <span
      className={`sx-c-icono${grande ? ' sx-c-icono-grande' : ''}`}
      data-revelado={revelado}
      style={{ '--sx-c-icono-color': color } as CSSProperties}
      role="img"
      aria-label={revelado ? 'Ícono revelado' : 'Ícono por revelar'}
    >
      {revelado ? <Icono aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
    </span>
  )
}
