import { modoApi } from '@/config/env'

// F08: Familia del servidor solo existe en api; en local la sección sigue como antes. El modo se decide al llamar.
export const usaFamiliaServidor = () => modoApi

export const contarPalabras = (texto: string) => texto.trim().split(/\s+/).filter(Boolean).length
