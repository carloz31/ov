import { modoApi } from '@/config/env'
import { actividadServidor } from '@/lib/servidor/adaptadores'
import { useEstadoServidor } from '@/store/servidor/sesion'
import type { DesbloqueoNuevo } from '@/types/servidor'
import { useNavigate } from 'react-router'
import { catalog } from '@/data/activities/content'
import type { Actividad } from '@/types/activities'
import { useJourney } from '@/store/journeyStore'
import { additionalMissions } from '@/data/activities/reflectionConfig'
import { appPaths } from '@/routes/paths'
import { resumirCierre } from '../lib/finishSummary'

export function useActivityFinish(
  activity: Actividad,
  desbloqueosServidor: DesbloqueoNuevo[] = [],
  yaCompletada = false,
) {
  const state = useJourney()
  const servidor = useEstadoServidor()
  const navigate = useNavigate()
  const completada = modoApi
    ? actividadServidor(servidor.actividades.datos, activity.id)?.estado === 'COMPLETADA'
    : state.progress[activity.id]?.estado === 'completada'
  const locales: DesbloqueoNuevo[] = []
  const piece =
    !modoApi && !yaCompletada
      ? catalog.piezasLlave.find(
          (p) => p.id === activity.recompensa?.piezaLlave && state.pieces.includes(p.id),
        )
      : undefined
  if (!modoApi && !yaCompletada) {
    const ids = new Set([
      ...activity.nodos.flatMap((n) => (n.tipo === 'diapositiva' ? (n.recursoIds ?? []) : [])),
      ...(activity.recompensa?.recursoIds ?? []),
    ])
    for (const r of catalog.recursos.filter(
      (r) => ids.has(r.id) && r.tipo === 'ficha' && state.resources.includes(r.id),
    ))
      locales.push({
        regla: activity.id,
        tipo_objetivo: 'FICHA',
        objetivo: { codigo: r.id, nombre: r.titulo },
        condiciones: [],
      })
    const badge = completada && additionalMissions.find((m) => m.id === activity.id)?.insignia
    if (badge)
      locales.push({
        regla: activity.id,
        tipo_objetivo: 'INSIGNIA',
        objetivo: { codigo: badge.codigo, nombre: badge.nombre },
        condiciones: [],
      })
  }
  const desbloqueos = modoApi ? desbloqueosServidor : locales
  const testimonios = Object.fromEntries(
    desbloqueos
      .filter((d) => d.tipo_objetivo === 'TESTIMONIO')
      .map((d) => {
        const recurso = catalog.recursos.find((r) => r.id === d.objetivo.codigo)
        // El catálogo actual no tiene campos de persona o rol: no se deducen del título.
        const cita = recurso?.contenido
          ?.split('\n')
          .find((linea) => linea.trim() && !linea.trim().startsWith('#'))
          ?.trim()
        return [d.objetivo.codigo, cita ? { cita } : {}]
      }),
  )
  const resumen = resumirCierre({
    desbloqueos,
    yaCompletada,
    completada,
    modoApi,
    testimonios,
    tienePreguntaDiario: !!activity.promptDiario,
    pieza: piece
      ? {
          codigo: piece.id,
          nombre: piece.nombre,
          obtenidas: catalog.piezasLlave.filter((p) => state.pieces.includes(p.id)).length,
          necesarias: catalog.piezasLlave.length,
        }
      : undefined,
  })
  return {
    resumen,
    abrirLibro: () => navigate('/student/profile/helena'),
    escribirDiario: () =>
      navigate(
        `${appPaths.student.journal}?${new URLSearchParams({
          activity: activity.id,
          title: activity.titulo,
          prompt: activity.promptDiario ?? '',
        })}`,
      ),
    volverAlMapa: () => navigate(appPaths.student.exploration),
  }
}
