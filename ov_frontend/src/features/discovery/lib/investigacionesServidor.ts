import { modoApi } from '@/config/env'

// F09: Investigaciones lee del servidor solo en api; en local siguen la guía y las vistas de siempre.
export const usaInvestigacionesServidor = () => modoApi
