import { useEffect, useRef, useState } from 'react'
import { modoApi } from '@/config/env'
import { catalog } from '@/data/activities/content'
import { useJourney, updateJourney, useJourneyError } from '@/store/journeyStore'
import { consultarBatallas, consultarPreguntasBatalla, resolverBatalla } from '@/store/servidor/batallas'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { batallaDesdePreguntas, ordenFichasRepaso, respuestaBatalla } from '../lib/batallaServidor'
import {
  answerBattle,
  canStartChallenge,
  challengeRequirements,
  recordBattle,
  startBattle,
} from '@/lib/challenges'
import type { Battle, Challenge } from '@/types/challenges'
import type { ContenidoEstado, DesbloqueoNuevo, RespuestaBatallaEntrada } from '@/types/servidor'
// F04: con `servidor`, la batalla del servidor que muestra este desafío: cada intento se envía, la
// práctica la decide el servidor y se repasan las fichas que la cuenta ya tiene.
export type DesafioServidor = { actividad: string }
export function useChallengePlayer({ challenge: c, servidor }: { challenge: Challenge; servidor?: DesafioServidor }) {
  const state = useJourney()
  const errorJourney = useJourneyError()
  const [errorEnvio, setErrorEnvio] = useState('')
  const [enviando, setEnviando] = useState(false)
  const conServidor = modoApi && !!servidor
  const error = conServidor ? errorEnvio : errorJourney
  const practice = useRef(!conServidor && state.progress[c.id]?.estado === 'completada')
  // F04b: las fichas de la batalla se derivan de sus preguntas; se repasan las que la cuenta ya tiene.
  const [fichasBatalla, setFichasBatalla] = useState<ContenidoEstado[]>([])
  const respuestas = useRef<RespuestaBatallaEntrada[]>([])
  // El cierre en api: si el intento era práctica (la batalla ya estaba superada) y lo que desbloqueó.
  const [practicaIntento, setPracticaIntento] = useState(false)
  const [desbloqueos, setDesbloqueos] = useState<DesbloqueoNuevo[]>([])
  useEffect(() => {
    if (!conServidor) return
    let vigente = true
    void consultarBatallas().then((respuesta) => {
      if (!vigente || respuesta.tipo !== 'ok') return
      const propia = respuesta.datos.find((b) => b.actividad === servidor!.actividad)
      practice.current = !!propia?.superada
      setFichasBatalla(propia?.fichas ?? [])
    })
    return () => {
      vigente = false
    }
  }, [conServidor, servidor?.actividad])
  const [stage, setStage] = useState<'intro' | 'battle' | 'result'>('intro')
  const [battle, setBattle] = useState<Battle>()
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  // En api, la disponibilidad ya la decidió el servidor: no se listan los requisitos locales.
  const requirements = conServidor ? [] : challengeRequirements(c, state)
  const puedeIniciar = conServidor || canStartChallenge(c, state)
  const disponibles = conServidor
    ? fichasBatalla
        .filter((f) => f.estado === 'DISPONIBLE' && catalog.recursos.some((r) => r.id === f.codigo))
        .map((f) => f.codigo)
    : c.requisitos.filter((r) => r.tipo === 'ficha').map((r) => r.id)
  // Tras perder, primero la ficha con más errores del intento; antes, la de su primera pregunta.
  const fallos = respuestas.current.flatMap((r) => {
    const pregunta = battle?.questions.find((q) => q.id === r.pregunta)
    return pregunta?.ficha && String(r.opcion) !== pregunta.correcta ? [pregunta.ficha.codigo] : []
  })
  const sheets = conServidor && stage === 'result' ? ordenFichasRepaso(disponibles, fallos) : disponibles
  const question = battle?.questions[battle.index]
  const hit = !!battle?.selected && battle.selected === question?.correcta
  const victory = battle?.enemyLife === 0
  useEffect(() => {
    title.current?.focus()
  }, [stage, battle?.answered])
  async function start() {
    if (!puedeIniciar || enviando) return
    setResourcesOpen(false)
    if (conServidor) {
      // Cada intento pide preguntas nuevas: al azar del pool y con las opciones mezcladas.
      setEnviando(true)
      setErrorEnvio('')
      const preguntas = await consultarPreguntasBatalla(servidor!.actividad)
      setEnviando(false)
      if (preguntas.tipo !== 'ok') return setErrorEnvio(mensajeErrorServidor(preguntas))
      const nueva = batallaDesdePreguntas(c, preguntas.datos)
      if (!nueva) return setErrorEnvio('La batalla no tiene preguntas suficientes para un intento.')
      respuestas.current = []
      setDesbloqueos([])
      setPracticaIntento(practice.current)
      setBattle(nueva)
      setStage('battle')
      return
    }
    setBattle(
      startBattle(
        c,
        battle?.questions.slice(0, battle.answered).map((q) => q.id),
      ),
    )
    setStage('battle')
  }
  async function answer(id: string) {
    if (!battle || battle.selected || enviando) return
    const next = answerBattle(battle, id)
    if (next.finished && conServidor) {
      // Cada intento se guarda con sus respuestas, también la práctica; la primera victoria trae sus desbloqueos.
      const enviadas = [...respuestas.current, respuestaBatalla(battle.questions[battle.index].id, id)]
      setEnviando(true)
      setErrorEnvio('')
      const respuesta = await resolverBatalla(servidor!.actividad, next.enemyLife === 0, enviadas)
      setEnviando(false)
      if (respuesta.tipo !== 'ok' && respuesta.tipo !== 'guardado_sin_refrescar')
        return setErrorEnvio(mensajeErrorServidor(respuesta))
      respuestas.current = enviadas
      setDesbloqueos(respuesta.datos.nuevos_desbloqueos)
      // Superada, los intentos siguientes son práctica.
      if (next.enemyLife === 0) practice.current = true
    } else if (conServidor) {
      respuestas.current = [...respuestas.current, respuestaBatalla(battle.questions[battle.index].id, id)]
    } else if (next.finished && !practice.current && !updateJourney((s) => recordBattle(c, next, s))) return
    setBattle(next)
  }
  const responseTitle = hit
    ? `¡Golpe de luz! ${c.nombre} pierde fuerza.`
    : `${c.nombre} resiste. Pierdes un destello.`
  const plural = conServidor && sheets.length > 1
  return {
    c,
    state,
    error,
    practice,
    stage,
    setStage,
    battle,
    setBattle,
    resourcesOpen,
    setResourcesOpen,
    exitOpen,
    setExitOpen,
    title,
    closeButton,
    requirements,
    puedeIniciar,
    // Las recompensas del servidor llegan como avisos; en api no se repiten en la tarjeta.
    muestraRecompensas: !conServidor,
    // F04b (api): cierres propios, repaso con pestañas y salida al mapa de la actividad.
    cierreServidor: conServidor,
    practicaIntento,
    desbloqueos,
    repasoConPestanas: conServidor,
    etiquetaRepaso: plural ? 'Repasar las fichas' : 'Repasar la ficha',
    etiquetaRepasoAntes: plural ? 'Repasar las fichas antes' : 'Repasar la ficha antes',
    salida: conServidor
      ? { titulo: '¿Quieres volver al mapa?', accion: 'Volver al mapa' }
      : { titulo: '¿Quieres volver a la ciudad?', accion: 'Volver a la ciudad' },
    sheets,
    question,
    hit,
    victory,
    start,
    answer,
    responseTitle,
  }
}
