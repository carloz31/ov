import { CharacterAvatar } from '@/components/student/CharacterAvatar'
import { burbujaRegistro, type EcoRegistro } from '../../lib/edicionRegistro'
import { RegistroLumi } from './RegistroLumi'

// Lumi sobre una consigna de registro, con la burbuja de los registros guiados: el recuerdo del eco (F02)
// y, en la consulta, la pista del ítem por ampliar, en una sola burbuja. Sin nada que decir, solo el avatar.
export function RegistroEco({
  eco,
  pista,
  hablanteId,
}: {
  eco?: EcoRegistro
  pista?: string
  hablanteId?: string
}) {
  const texto = burbujaRegistro(eco, pista)
  if (texto) return <RegistroLumi hablanteId={hablanteId} texto={texto} />
  return hablanteId ? <CharacterAvatar id={hablanteId} size="sm" /> : null
}
