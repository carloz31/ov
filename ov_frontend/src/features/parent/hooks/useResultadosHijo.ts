import { useMemo } from 'react'
import { modoApi } from '@/config/env'
import { resultadoFamilia } from '@/lib/servidor/adaptadoresInstrumentos'
import { useResultadosHijoSeccion } from '@/store/servidor/apoderadoResultados'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { FamiliaApoderado } from '@/types/servidor'

// F03 (HU-022, HU-023): en api, con el diploma obtenido, los resultados del hijo que el salón comparte con
// la familia. Sin diploma no se piden: la vista muestra el aviso de siempre. Ajuste inicio-apoderado: del hijo
// `codigo` (uno de `familia.estudiantes`), con su sección en `store/servidor/apoderadoResultados.ts`.
export function useResultadosHijo(familia: FamiliaApoderado | null | undefined, codigo: string | null | undefined) {
  const hijo = familia?.estudiantes.some((e) => e.codigo === codigo) ? codigo! : null
  const habilitado = modoApi && !!familia?.diploma.obtenido && !!hijo
  const { seccion, reintentar } = useResultadosHijoSeccion(hijo, habilitado)
  const resultados = useMemo(
    () => seccion.datos?.resultados.map((r) => resultadoFamilia(r, seccion.datos!.catalogo)) ?? null,
    [seccion.datos],
  )
  const error = seccion.estado === 'error' ? mensajeErrorServidor(seccion.error) : ''
  return { habilitado, resultados: error ? null : resultados, error, reintentar }
}
