import { modoApi } from '@/config/env'

// Ajuste panel-entrevistas-configuracion: en api, la configuración es del colegio y el ítem del menú se llama
// «Configuración»; el modo local conserva «Configuración del salón». El modo se lee al llamar.
export function useEtiquetaConfiguracion() {
  return modoApi ? 'Configuración' : 'Configuración del salón'
}
