import { useMemo } from 'react'
import { modoApi } from '@/config/env'
import {
  useAmistadServidor,
  useDiarioEntradasServidor,
  useDiarioPreguntasServidor,
} from '@/store/servidor/secciones'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { amistadDiario, cartasDiario, entradasDiario } from '@/lib/servidor/adaptadoresDiario'
import { lumiBondServidor } from '@/features/journal/lib/lumiBond'

// F05: el diario del servidor (solo api). En local no pide nada y `activo` es falso.
export function useDiarioServidor() {
  const activo = modoApi
  const entradas = useDiarioEntradasServidor(activo),
    preguntas = useDiarioPreguntasServidor(activo),
    amistad = useAmistadServidor(activo)
  const vista = useMemo(() => entradasDiario(entradas.datos), [entradas.datos])
  const { cartas, porDescubrir } = useMemo(() => cartasDiario(preguntas.datos), [preguntas.datos])
  const bond = amistad.datos ? lumiBondServidor(amistadDiario(amistad.datos)) : undefined
  const error = entradas.error ?? preguntas.error ?? amistad.error
  return {
    activo,
    entradas: vista,
    cartas,
    porDescubrir,
    bond,
    puntos: amistad.datos?.puntos ?? null,
    error: error ? mensajeErrorServidor(error) : '',
  }
}
