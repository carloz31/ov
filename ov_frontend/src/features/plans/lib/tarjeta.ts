import { modoApi } from '@/config/env'

// F07a: la tarjeta v4 (planes del servidor) solo existe en api; en local, Mis planes y la guía siguen como antes.
// El modo se decide al llamar, nunca al cargar el módulo.
export const usaTarjetaV4 = () => modoApi
