import type { ReactNode } from 'react'
import { modoApi } from '@/config/env'

// F08: una vista que en api reemplaza a la local (Familia y Conversaciones); el modo se decide al renderizar.
function SegunModo({ local, api }: { local: ReactNode; api: ReactNode }) {
  return modoApi ? api : local
}

export { SegunModo }
