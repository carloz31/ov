// Se configura en main antes de montar React; las pruebas conservan el modo local.
export let modoApi = false
export let urlApi = '/api'
export let desarrollo = false

export function configurarServidor(entorno: { VITE_DATOS?: string; VITE_API_URL?: string; DEV?: boolean }) {
  modoApi = entorno.VITE_DATOS === 'api'
  urlApi = (entorno.VITE_API_URL || '/api').replace(/\/+$/, '')
  desarrollo = entorno.DEV === true
}
