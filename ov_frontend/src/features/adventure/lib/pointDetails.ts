import type { JourneyState } from '@/types/activities'
import { modoApi } from '@/config/env'
import { obtenerEstadoServidor } from '@/store/servidor/sesion'
import { actividadServidor } from '@/lib/servidor/adaptadores'
import { idPuntoContenido } from './puntosServidor'
import { activityById } from '@/data/activities/content'
import { getForestFireCaseStatus } from '@/features/cases/lib/forestFireCaseLogic'
import { challenges } from '@/data/content/challenges'
import { challengeRequirements } from '@/lib/challenges'
import { cityCases, fieldMissions } from '@/data/content/adventure'
import { getActivityPrompt } from '@/data/content/journalPrompts'
import { getExplorationImagePath } from '@/lib/explorationAssets'
import type { AdventureState } from '@/types/adventure'
import { appPaths } from '@/routes/paths'
import { additionalMissions, pendingContent } from '@/data/activities/reflectionConfig'
import { isWithinStudentDemo } from '@/config/studentDemoScope'
import { getActivityType } from './caminoPoints'
import { getMissionMeta } from './caminoPoints'
import { orderedMissions } from './caminoPoints'
import type { StudentMapPoint } from './mapPoints'
export type PointDetails = {
  reviewActivities?: { codigo: string; titulo: string }[]
  caseProgress?: boolean
  title: string
  region: string
  badge: string
  meta: string
  type: string
  description: string
  requirement?: string
  actionLabel: string
  disabled: boolean
  activityId?: string
  revision?: boolean
  href?: string
  imageUrl?: string
  journal?: { completed: boolean; activityId: string; title: string; prompt: string }
}

export function getPointDetails(
  point: StudentMapPoint,
  adventure: AdventureState,
  journey: JourneyState,
): PointDetails {
  if (modoApi) {
    const actividad = actividadServidor(obtenerEstadoServidor().actividades.datos, point.specActivityId ?? '')
    const enCurso = actividad?.estado === 'EN_CURSO'
    const badge =
      point.status === 'completed'
        ? 'Completada'
        : point.status === 'locked'
          ? 'Bloqueada'
          : enCurso
            ? 'En progreso'
            : 'Disponible'
    const idPresentacion = actividad ? idPuntoContenido(actividad.contenido, actividad.codigo) : point.id
    const mission = fieldMissions.find((m) => m.id === idPresentacion)
    if (mission)
      return {
        title: point.title,
        region: mission.region,
        badge,
        meta: getMissionMeta(mission),
        type: getActivityType(mission),
        description: mission.description,
        requirement: point.status === 'locked' ? 'Consultando el requisito en el servidor…' : undefined,
        actionLabel:
          point.status === 'locked'
            ? 'Actividad bloqueada'
            : point.status === 'completed'
              ? getActivityType(mission) === 'Informativa'
                ? 'Volver a realizar esta misión'
                : 'Ver o modificar mis respuestas'
              : enCurso
                ? 'Continuar actividad'
                : 'Iniciar actividad',
        disabled: point.status === 'locked',
        activityId: point.specActivityId,
        revision: point.status === 'completed',
      }
    if (point.id === 'city')
      return {
        title: point.title,
        region: 'Meta del recorrido',
        badge,
        meta: 'Ciudad',
        type: 'Ciudad',
        description: 'La ciudad te espera al final del camino.',
        requirement: point.status === 'locked' ? 'Consultando el requisito en el servidor…' : undefined,
        actionLabel: 'Ir a la ciudad',
        disabled: point.status === 'locked',
        href: appPaths.student.exploration,
      }
    if (point.id === 'mara-test') {
      const secuencia = point.secuencia ?? []
      const numero = Math.max(1, secuencia.findIndex((a) => a.codigo === point.specActivityId) + 1)
      return {
        title: point.title,
        region: 'Molino de la ciudad',
        badge,
        meta: `Interacción ${numero} de ${secuencia.length}`,
        type: 'Test',
        description: 'Conversa con Mara. No hay respuestas correctas o incorrectas.',
        requirement: point.status === 'locked' ? 'Consultando el requisito en el servidor…' : undefined,
        actionLabel:
          point.status === 'locked'
            ? 'Encuentro bloqueado'
            : point.status === 'completed'
              ? 'Revisar encuentro'
              : 'Conversar con Mara',
        disabled: point.status === 'locked',
        activityId: point.specActivityId,
        revision: point.status === 'completed',
        reviewActivities: secuencia.flatMap((a, i) =>
          a.estado === 'COMPLETADA'
            ? [{ codigo: a.codigo, titulo: `Interacción ${i + 1} · ${a.titulo}` }]
            : [],
        ),
      }
    }
    if (point.id === 'elena-result')
      return {
        title: point.title,
        region: 'Río de la ciudad',
        badge,
        meta: 'Tus intereses',
        type: 'Resultado',
        description: 'Elena reúne las pistas de tus encuentros con Mara.',
        requirement: point.status === 'locked' ? 'Completa los 14 encuentros con Mara.' : undefined,
        actionLabel: point.status === 'completed' ? 'Revisar resultado' : 'Conversar con Elena',
        disabled: point.status === 'locked',
        activityId: point.specActivityId,
        revision: point.status === 'completed',
      }
    return {
      title: point.title,
      region: 'Ciudad',
      badge: 'Bloqueada',
      meta: 'Próximamente',
      type: challenges.some((c) => c.id === point.id) ? 'Desafío' : 'Central de casos',
      description: 'Disponible en una próxima iteración',
      requirement: 'Disponible en una próxima iteración',
      actionLabel: 'No disponible',
      disabled: true,
    }
  }
  const challenge = challenges.find((c) => c.id === point.id)
  const extra = additionalMissions.find((m) => m.id === point.id)
  if (extra)
    return {
      title: point.title,
      region: 'Un sendero del Camino',
      badge: point.status === 'completed' ? 'Completada · Adicional' : 'MISIÓN ADICIONAL · OPCIONAL',
      meta: `${activityById(extra.id)?.duracionEstimadaMin ?? 4} min`,
      type: 'Registro opcional',
      description: extra.descripcion,
      actionLabel: point.status === 'completed' ? 'Ver o modificar mis respuestas' : 'Emprender',
      disabled: false,
      activityId: extra.id,
      revision: point.status === 'completed',
    }
  if (challenge)
    return {
      title: point.title,
      region: challenge.ubicacion ?? 'Ciudad',
      badge:
        point.status === 'completed' ? 'Completada' : point.status === 'locked' ? 'Bloqueada' : 'Disponible',
      meta: 'A tu ritmo',
      type: 'Desafío',
      description: challenge.presentacionEnemigo,
      requirement: challengeRequirements(challenge, journey)
        .map((r) => `${r.completed ? '✓' : 'Pendiente:'} ${r.titulo}`)
        .join(' · '),
      actionLabel: point.status === 'completed' ? 'Practicar de nuevo' : 'Enfrentar al enemigo',
      disabled: point.status === 'locked',
      activityId: challenge.id,
      imageUrl: challenge.ilustracion,
    }
  const mission = fieldMissions.find((item) => item.id === point.id)
  const activity = activityById(point.specActivityId ?? '')
  const inProgress = journey.progress[point.specActivityId ?? '']?.estado === 'en_curso'
  const badge =
    point.status === 'locked'
      ? 'Bloqueada'
      : point.status === 'completed'
        ? 'Completada'
        : inProgress
          ? 'En progreso'
          : 'Disponible'
  const journal = (title: string) => ({
    completed: point.status === 'completed',
    activityId: point.specActivityId ?? point.id,
    title,
    prompt:
      activity?.promptDiario ??
      getActivityPrompt(point.specActivityId ?? point.id, adventure.readinessCheckIns),
  })
  if (mission) {
    const index = orderedMissions.findIndex((item) => item.id === mission.id)
    const previous = index > 0 ? orderedMissions[index - 1] : undefined
    const outsideScope = !isWithinStudentDemo(point.specActivityId ?? '')
    const pending = pendingContent.has(point.specActivityId ?? '') && point.status !== 'completed'
    return {
      title: point.title,
      region: mission.region,
      badge: pending ? 'Contenido pendiente' : badge,
      meta: getMissionMeta(mission),
      type: getActivityType(mission),
      description: mission.description,
      requirement:
        point.status === 'locked'
          ? outsideScope
            ? 'Esta actividad aún no está disponible.'
            : pending
              ? 'Contenido pendiente de preparación.'
              : previous
                ? `Requisito: completa la actividad “${previous.title}”.`
                : 'Esta actividad aún no está disponible.'
          : undefined,
      actionLabel:
        point.status === 'locked'
          ? pending
            ? 'Contenido pendiente'
            : 'Actividad bloqueada'
          : point.status === 'completed'
            ? getActivityType(mission) === 'Informativa'
              ? 'Volver a realizar esta misión'
              : 'Ver o modificar mis respuestas'
            : inProgress
              ? 'Continuar actividad'
              : 'Iniciar actividad',
      disabled: point.status === 'locked',
      activityId: point.specActivityId,
      revision: point.status === 'completed',
      journal: journal(point.title),
    }
  }
  if (point.id === 'city')
    return {
      title: point.title,
      region: 'Meta del recorrido',
      badge,
      meta: 'Ciudad',
      type: 'Ciudad',
      description:
        'Cambia a la ciudad para atender sus llamados, investigar carreras y encontrarte con nuevas actividades.',
      actionLabel: 'Ir a la ciudad',
      disabled: false,
      href: appPaths.student.exploration,
    }
  if (point.id === 'mara-test')
    return {
      title: point.title,
      region: 'Molino de la ciudad',
      badge,
      meta: 'Interacción 1 de 14 · 4 min',
      type: 'Test',
      description:
        'Conversa con Mara y responde siete preguntas del Test de Intereses Profesionales. No hay respuestas correctas o incorrectas.',
      actionLabel: point.status === 'completed' ? 'Ver resumen' : 'Iniciar test',
      disabled: false,
      activityId: 'act-tip-01',
      revision: false,
      journal: journal(activity?.titulo ?? point.title),
    }
  const cityCase = cityCases.find((item) => item.id === point.id)
  return {
    title: point.title,
    region: 'Llamado de la ciudad',
    badge: point.id === 'forest-fire' ? getForestFireCaseStatus(adventure).badge : badge,
    meta: 'Caso vocacional',
    type: 'Central de casos',
    caseProgress: point.id === 'forest-fire',
    description: cityCase?.description ?? '',
    imageUrl: getExplorationImagePath(
      point.id === 'forest-fire' ? 'forest-fire-case-background.png' : 'exploration-case-background.png',
    ),
    actionLabel: point.id === 'forest-fire' ? getForestFireCaseStatus(adventure).actionLabel : 'Iniciar',
    disabled: !point.actionEnabled,
    href: appPaths.student.case(point.id),
  }
}
