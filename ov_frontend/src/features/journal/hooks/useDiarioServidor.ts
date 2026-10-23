import { useMemo } from 'react'
import { modoApi } from '@/config/env'
import { useAmistadServidor, useDiarioEntradasServidor } from '@/store/servidor/secciones'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { amistadDiario, entradasDiario } from '@/lib/servidor/adaptadoresDiario'
import { lumiBondServidor } from '@/features/journal/lib/lumiBond'

// F05: el diario del servidor (solo api). En local no pide nada y `activo` es falso.
export function useDiarioServidor() {
  const activo = modoApi
  // Las cartas (`diario/preguntas`) las lee el buzón (`useBuzonLumi`).
  const entradas = useDiarioEntradasServidor(activo),
    amistad = useAmistadServidor(activo)
  const vista = useMemo(() => entradasDiario(entradas.datos), [entradas.datos])
  const bond = amistad.datos ? lumiBondServidor(amistadDiario(amistad.datos)) : undefined
  const error = entradas.error ?? amistad.error
  return {
    activo,
    entradas: vista,
    bond,
    puntos: amistad.datos?.puntos ?? null,
    error: error ? mensajeErrorServidor(error) : '',
  }
}
