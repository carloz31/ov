import { useEffect, useRef, useState } from 'react'
import { modoApi } from '@/config/env'
import { abrirRecurso } from '@/store/visorRecursoStore'
import { useJourney, updateJourney, useJourneyError } from '@/store/journeyStore'
import { consultarBatallas, consultarPreguntasBatalla, resolverBatalla } from '@/store/servidor/batallas'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import {
  batallaDesdePreguntas,
  respuestaBatalla,
  type ConfiguracionBatalla,
} from '../lib/batallaServidor'
import {
  answerBattle,
  canStartChallenge,
  challengeRequirements,
  recordBattle,
  startBattle,
} from '@/lib/challenges'
import type { Battle, Challenge } from '@/types/challenges'
import type { ContenidoEstado, RespuestaBatallaEntrada, RespuestaResolverBatalla } from '@/types/servidor'
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
  // Superada en este intento: el siguiente ya es práctica, pero el encabezado de este intento no cambia.
  const practicaSiguiente = useRef(false)
  // F04b: las fichas de la batalla se derivan de sus preguntas; se repasan las que la cuenta ya tiene.
  const [fichasBatalla, setFichasBatalla] = useState<ContenidoEstado[]>([])
  const respuestas = useRef<RespuestaBatallaEntrada[]>([])
  // F04c: vidas y destellos son de la batalla del servidor; el cierre sale de su respuesta al intento.
  const [configuracion, setConfiguracion] = useState<ConfiguracionBatalla>()
  const [errorLectura, setErrorLectura] = useState(false)
  const [resultado, setResultado] = useState<RespuestaResolverBatalla>()
  const [enviandoIntento, setEnviandoIntento] = useState(false)
  const [errorIntento, setErrorIntento] = useState('')
  useEffect(() => {
    if (!conServidor) return
    let vigente = true
    void consultarBatallas().then((respuesta) => {
      if (!vigente) return
      const propia = respuesta.tipo === 'ok' ? respuesta.datos.find((b) => b.actividad === servidor!.actividad) : undefined
      if (!propia) {
        setErrorLectura(true)
        return setErrorEnvio(
          respuesta.tipo === 'ok' ? 'No se encontró la batalla en el servidor.' : mensajeErrorServidor(respuesta),
        )
      }
      practice.current = propia.superada
      setFichasBatalla(propia.fichas)
      setConfiguracion({ vidasEnemigo: propia.vidas_enemigo, destellos: propia.destellos })
    })
    return () => {
      vigente = false
    }
  }, [conServidor, servidor?.actividad])
  const [stage, setStage] = useState<'intro' | 'battle' | 'result'>('intro')
  const [battle, setBattle] = useState<Battle>()
  const [exitOpen, setExitOpen] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  // En api, la disponibilidad ya la decidió el servidor: no se listan los requisitos locales.
  const requirements = conServidor ? [] : challengeRequirements(c, state)
  const puedeIniciar = conServidor ? !!configuracion : canStartChallenge(c, state)
  const estadoBatalla: 'lista' | 'cargando' | 'error' = !conServidor || configuracion
    ? 'lista'
    : errorLectura
      ? 'error'
      : 'cargando'
  // Local: las fichas de los requisitos del desafío. En api, el repaso del cierre sale del servidor
  // (`fichas_repaso`, F04d).
  const sheets = conServidor ? [] : c.requisitos.filter((r) => r.tipo === 'ficha').map((r) => r.id)
  const question = battle?.questions[battle.index]
  const hit = !!battle?.selected && battle.selected === question?.correcta
  const victory = battle?.enemyLife === 0
  useEffect(() => {
    title.current?.focus()
  }, [stage, battle?.answered])
  async function start() {
    if (!puedeIniciar || enviando) return
    if (conServidor) {
      // Cada intento pide preguntas nuevas: al azar del pool y con las opciones mezcladas.
      setEnviando(true)
      setErrorEnvio('')
      const preguntas = await consultarPreguntasBatalla(servidor!.actividad)
      setEnviando(false)
      if (preguntas.tipo !== 'ok') return setErrorEnvio(mensajeErrorServidor(preguntas))
      const nueva = batallaDesdePreguntas(configuracion!, preguntas.datos)
      if (!nueva) return setErrorEnvio('La batalla no tiene preguntas suficientes para un intento.')
      respuestas.current = []
      if (practicaSiguiente.current) practice.current = true
      setResultado(undefined)
      setErrorIntento('')
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
    if (conServidor) {
      // La batalla se anima con el cálculo local; al terminar, el intento se envía con todas sus respuestas.
      respuestas.current = [...respuestas.current, respuestaBatalla(battle.questions[battle.index].id, id)]
      setBattle(next)
      if (next.finished) void enviarIntento()
      return
    } else if (next.finished && !practice.current && !updateJourney((s) => recordBattle(c, next, s))) return
    setBattle(next)
  }
  // Envía las respuestas guardadas; «Reintentar» reenvía las mismas, sin repetir la batalla.
  async function enviarIntento() {
    setEnviandoIntento(true)
    setErrorIntento('')
    const respuesta = await resolverBatalla(servidor!.actividad, respuestas.current)
    setEnviandoIntento(false)
    if (respuesta.tipo !== 'ok' && respuesta.tipo !== 'guardado_sin_refrescar')
      return setErrorIntento(mensajeErrorServidor(respuesta))
    setResultado(respuesta.datos)
    // Superada, los intentos siguientes son práctica.
    if (respuesta.datos.victoria) practicaSiguiente.current = true
  }
  const responseTitle = hit
    ? `¡Golpe de luz! ${c.nombre} pierde fuerza.`
    : `${c.nombre} resiste. Pierdes un destello.`
  return {
    c,
    state,
    error,
    practice,
    stage,
    setStage,
    battle,
    setBattle,
    // F04d: las fichas se abren con el visor de la mochila, encima de la batalla: en repaso, las de la
    // batalla; la recompensa local, como en la mochila.
    repasar: () => sheets[0] && abrirRecurso(sheets[0], 'repaso'),
    abrirRecompensa: () => c.recompensa.recursoIds?.[0] && abrirRecurso(c.recompensa.recursoIds[0], 'mochila'),
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
    estadoBatalla,
    vidasEnemigo: conServidor ? (configuracion?.vidasEnemigo ?? 0) : c.vidasEnemigo,
    destellos: conServidor ? (configuracion?.destellos ?? 0) : c.vidasEstudiante,
    resultado,
    enviandoIntento,
    errorIntento,
    reintentarIntento: () => void enviarIntento(),
    // F04d: «Este desafío se basa en estas fichas»: todas las fichas de la batalla (api) o de sus requisitos (local).
    fichasIntro: conServidor
      ? fichasBatalla.map((f) => ({ codigo: f.codigo, titulo: f.titulo, bloqueada: f.estado === 'BLOQUEADA' }))
      : c.requisitos.filter((r) => r.tipo === 'ficha').map((r) => ({ codigo: r.id, titulo: r.titulo })),
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
