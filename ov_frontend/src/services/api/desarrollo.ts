import { enviar } from './cliente'
import type { RespuestaServidor } from '@/types/servidor'

export function reiniciar(): Promise<RespuestaServidor<{ mensaje: string }>> {
  return enviar('/desarrollo/reiniciar', {})
}
