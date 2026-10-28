import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { resultadoFamilia, type ResultadoFamilia } from '@/lib/servidor/adaptadoresInstrumentos'
import { consultarResultadosHijo } from '@/store/servidor/apoderado'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { FamiliaApoderado } from '@/types/servidor'

// F03 (HU-022, HU-023): en api, con el diploma obtenido, los resultados del hijo que el salón comparte con
// la familia. Sin diploma no se piden: la vista muestra el aviso de siempre. Ajuste inicio-apoderado: del hijo
// `codigo` (uno de `familia.estudiantes`); al cambiar de hijo se vuelven a pedir.
export function useResultadosHijo(familia: FamiliaApoderado | null | undefined, codigo: string | null | undefined) {
  const hijo = familia?.estudiantes.some((e) => e.codigo === codigo) ? codigo! : null
  const habilitado = modoApi && !!familia?.diploma.obtenido && !!hijo
  const [cargados, setCargados] = useState<{ hijo: string; resultados: ResultadoFamilia[] } | null>(null)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    if (!habilitado || !hijo) return
    let vigente = true
    setError('')
    void (async () => {
      const respuesta = await consultarResultadosHijo(hijo)
      if (!vigente) return
      if (respuesta.tipo !== 'ok') {
        setError(mensajeErrorServidor(respuesta))
        return
      }
      setError('')
      setCargados({ hijo, resultados: respuesta.datos.resultados.map((r) => resultadoFamilia(r, respuesta.datos.catalogo)) })
    })()
    return () => {
      vigente = false
    }
  }, [habilitado, hijo, intento])
  return {
    habilitado,
    // Solo los del hijo pedido: mientras llegan los de otro hijo, sin resultados (cargando).
    resultados: cargados && cargados.hijo === hijo ? cargados.resultados : null,
    error,
    reintentar: () => {
      setError('')
      setIntento((i) => i + 1)
    },
  }
}
