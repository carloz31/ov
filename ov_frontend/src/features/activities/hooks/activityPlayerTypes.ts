import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Actividad, NodoDialogo } from '@/types/activities'
import type { RespuestaCompletarActividad } from '@/types/servidor'
import type { InstrumentoServidor } from '../components/MaraInteractionPlayer'
export type ActivityCompletionContext = {
  activity: Actividad
  onClose: () => void
  instrumentoServidor?: InstrumentoServidor
  revisionInstrumento: boolean
  nodeId: string | undefined
  enviando: RefObject<boolean>
  montado: RefObject<boolean>
  respuestasConfirmadas: RefObject<Record<string, number>>
  confirmacion: RefObject<RespuestaCompletarActividad | undefined>
  setGuardando: Dispatch<SetStateAction<boolean>>
  setErrorServidor: Dispatch<SetStateAction<string>>
  setCierreServidor: Dispatch<SetStateAction<RespuestaCompletarActividad | undefined>>
  setNodeId: Dispatch<SetStateAction<string | undefined>>
  setReactions: Dispatch<SetStateAction<NodoDialogo[]>>
}
