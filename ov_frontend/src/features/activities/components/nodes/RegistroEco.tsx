import { reflectionCopy } from '@/data/activities/reflectionConfig'
import { RegistroLumi } from './RegistroLumi'

// Zona de eco de una consigna que retoma una respuesta (F02), con la burbuja de Lumi de los registros
// guiados: el recuerdo con la cita literal o, si la respuesta de origen quedó corta, una invitación sin cita.
export function RegistroEco({
  eco,
  hablanteId,
}: {
  eco: { estado: 'DISPONIBLE' | 'POR_DESARROLLAR'; texto: string; titulo: string }
  hablanteId?: string
}) {
  const texto =
    eco.estado === 'POR_DESARROLLAR'
      ? 'La vez pasada lo contaste en pocas palabras. Aquí puedes tomarte tu tiempo.'
      : `${reflectionCopy.memory(eco.titulo)}: «${eco.texto}»`
  return <RegistroLumi hablanteId={hablanteId} texto={texto} />
}
