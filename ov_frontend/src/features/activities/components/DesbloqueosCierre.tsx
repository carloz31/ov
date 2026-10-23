import type { DesbloqueoNuevo } from '@/types/servidor'
import { resumirCierre } from '../lib/finishSummary'
import { FinishMedalsSection } from './FinishMedalsSection'
import { FinishBackpackSection } from './FinishBackpackSection'
import { FinishExtrasSection } from './FinishExtrasSection'
import '../styles/finish.css'

// Ajustes Central (7): los desbloqueos de un intento con los mismos bloques que el cierre de una batalla
// (medallas, «Nuevo en tu mochila» y «Se abrió para ti»). Un testimonio va a Recursos y se abre allí.
export function DesbloqueosCierre({ desbloqueos }: { desbloqueos: DesbloqueoNuevo[] }) {
  const resumen = resumirCierre({
    desbloqueos,
    yaCompletada: false,
    completada: true,
    tienePreguntaDiario: false,
    modoApi: true,
  })
  return (
    <>
      {resumen.medallas.length > 0 && <FinishMedalsSection medallas={resumen.medallas} />}
      {resumen.totalRecursos > 0 && <FinishBackpackSection resumen={resumen} />}
      {resumen.extras.length > 0 && <FinishExtrasSection extras={resumen.extras} />}
    </>
  )
}
