import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { resultadoFamilia, type ResultadoFamilia } from '@/lib/servidor/adaptadoresInstrumentos'
import { consultarResultadosHijo } from '@/store/servidor/apoderado'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { FamiliaApoderado } from '@/types/servidor'

// F03 (HU-022, HU-023): en api, con el diploma obtenido, los resultados del hijo que el salón comparte con
// la familia. Sin diploma no se piden: la vista muestra el aviso de siempre.
export function useResultadosHijo(familia: FamiliaApoderado | null | undefined) {
  const habilitado = modoApi && !!familia?.diploma.obtenido && !!familia.estudiante
  const [resultados, setResultados] = useState<ResultadoFamilia[] | null>(null)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    if (!habilitado) return
    let vigente = true
    void (async () => {
      const respuesta = await consultarResultadosHijo()
      if (!vigente) return
      if (respuesta.tipo !== 'ok') {
        setError(mensajeErrorServidor(respuesta))
        return
      }
      setError('')
      setResultados(respuesta.datos.resultados.map((r) => resultadoFamilia(r, respuesta.datos.catalogo)))
    })()
    return () => {
      vigente = false
    }
  }, [habilitado, intento])
  return {
    habilitado,
    resultados,
    error,
    reintentar: () => {
      setError('')
      setIntento((i) => i + 1)
    },
  }
}
