import { useEffect, useMemo, useRef, useState } from 'react'

import { useSearchParams } from 'react-router'

import { getFamilyConversationTopic } from '@/data/content/familyConversations'
import { updateAdventure, useAdventure } from '@/store/adventureStore'
import { updateStudentUi, useStudentUi } from '@/store/studentUiStore'
import { getLumiTags } from '@/features/journal/lib/lumiSuggestions'
import { useLumiNow } from '@/hooks/useLumiNow'
import type { JournalEntry } from '@/types/adventure'

import { useReturnFocus } from '@/hooks/useReturnFocus'
import { getLumiBond, lumiBondServidor } from '@/features/journal/lib/lumiBond'
import { useDiarioServidor } from '@/features/journal/hooks/useDiarioServidor'
import { usePreguntaDeHoy } from '@/features/journal/hooks/usePreguntaDeHoy'
import { useBuzonLumi } from '@/features/journal/hooks/useBuzonLumi'
import { useHistoriaLumi } from '@/features/journal/hooks/useHistoriaLumi'
import { borrarEntrada, editarEntrada, escribirEntrada } from '@/store/servidor/diario'
import { asegurarSeccion } from '@/store/servidor/secciones'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { idEntradaServidor, type CartaLumi } from '@/lib/servidor/adaptadoresDiario'
import { type DailyQuestionEditorContext } from '@/features/journal/components/DailyQuestionCard'

type JournalScreen = 'home' | 'write' | 'detail'
export type AvisoDiario = { titulo: string; descripcion?: string; error?: boolean }
// Ajuste del diario (F05): «conversaciones» pasa a «cartas».
const avisos = {
  suma: { titulo: '¡Carta guardada!', descripcion: 'Tu amistad con Lumi suma una carta.' },
  tope: {
    titulo: 'Carta guardada.',
    descripcion: 'Hoy ya contaron tus 3 cartas; esta igual se guarda.',
  },
  editada: { titulo: 'Carta actualizada.', descripcion: 'Editar no suma cartas.' },
} satisfies Record<string, AvisoDiario>
const avisoError = (titulo: string, error: Parameters<typeof mensajeErrorServidor>[0]): AvisoDiario => ({
  titulo,
  descripcion: mensajeErrorServidor(error),
  error: true,
})
export function useJournalPage() {
  const state = useAdventure()
  const now = useLumiNow()
  const servidor = useDiarioServidor()
  // F05: en api, la amistad del servidor; mientras llega, sin puntos.
  const bond = servidor.activo
    ? (servidor.bond ??
      lumiBondServidor({ puntos: 0, nivel: 'Conociéndonos', indiceNivel: 0, recuerdosAbiertos: 0 }))
    : getLumiBond(state.lumiRegistrations, now)
  const [searchParams] = useSearchParams()
  const preguntaPedida = searchParams.get('pregunta')
  // «Leer en el cuaderno» desde «Cartas de Lumi» (`?entrada=`): abre el detalle de esa entrada.
  const entradaPedida = searchParams.get('entrada')
  const conversationTopic = getFamilyConversationTopic(searchParams.get('conversation') ?? '')
  const eventTitle = searchParams.get('event')
  const eventOutcome = searchParams.get('outcome')
  const activityId = searchParams.get('activity') ?? undefined
  const activityPrompt = searchParams.get('prompt') ?? undefined
  const activityTitle = searchParams.get('title') ?? undefined
  const initialPrompt = eventTitle
    ? eventOutcome === 'attended'
      ? `Hoy fue ${eventTitle}, ¿qué aprendiste o qué te sorprendió de esta experiencia?`
      : `No asististe a ${eventTitle}. ¿Qué pasó y qué podrías hacer distinto si aparece una experiencia similar?`
    : conversationTopic
      ? `¿Qué te llevaste de esta conversación con tu familia sobre ${conversationTopic.title.toLocaleLowerCase('es-PE')}?`
      : activityPrompt
  const [screen, setScreen] = useState<JournalScreen>(
    conversationTopic || eventTitle || activityPrompt ? 'write' : 'home',
  )
  // Ajuste del diario (F05): «Ver todo el cuaderno» es la misma vista con `?cuaderno=completo`.
  const cuadernoCompleto = searchParams.get('cuaderno') === 'completo'
  const [selectedId, setSelectedId] = useState<string>()
  const [editingId, setEditingId] = useState<string>()
  const [body, setBody] = useState('')
  const [tags, setTags] = useState<string[]>(
    eventTitle
      ? ['evento']
      : conversationTopic
        ? ['familia']
        : activityPrompt
          ? getLumiTags(activityId ?? '')
          : [],
  )
  const [lockedTags, setLockedTags] = useState<string[]>(activityPrompt ? getLumiTags(activityId ?? '') : [])
  const [tagDraft, setTagDraft] = useState('')
  const [promptShown, setPromptShown] = useState(initialPrompt)
  const [linkedActivityId, setLinkedActivityId] = useState(
    eventTitle ? `event-${eventTitle}` : conversationTopic ? `family-${conversationTopic.id}` : activityId,
  )
  const [entryTitle, setEntryTitle] = useState(
    eventTitle
      ? `Evento: ${eventTitle}`
      : conversationTopic
        ? `Conversación: ${conversationTopic.title}`
        : (activityTitle ?? 'Conversación libre con Lumi'),
  )
  const [deleteOpen, setDeleteOpen] = useState(false)
  // F05: a qué responde la entrada en el servidor (una carta o la pregunta del día) y si Lumi la redacta.
  const [destino, setDestino] = useState<{ pregunta?: string; delDia?: boolean }>({})
  const [preguntaAbierta, setPreguntaAbierta] = useState<string>()
  const returnFocus = useReturnFocus()
  // El aviso tras guardar, editar o borrar se muestra como toast (`AvisoToast`); `error` cambia su ícono.
  // Cada aviso lleva su `id`: uno nuevo reinicia el toast aunque repita el texto.
  const [saveNotice, guardarAviso] = useState<(AvisoDiario & { id: number }) | null>(null)
  const avisoId = useRef(0)
  const setSaveNotice = (aviso: AvisoDiario | null) =>
    guardarAviso(aviso && { ...aviso, id: ++avisoId.current })
  // Ajuste del diario (F05): la historia de Lumi. Un capítulo se abre en el reproductor de actividades (`capitulo`)
  // solo cuando el estudiante lo pide: el recién desbloqueado se destaca en la historia hasta que lo ve. `?memory=n`
  // (aviso de un recuerdo nuevo) abre el capítulo n si ya está abierto.
  const historia = useHistoriaLumi(bond)
  const ui = useStudentUi()
  const [capitulo, abrirCapitulo] = useState<string>()
  // En local, abrir un capítulo lo marca como visto; en api deja de ser nuevo al completarlo.
  const setCapitulo = (codigo?: string) => {
    const numero = historia.capitulos.find((c) => c.codigo === codigo)?.numero
    if (!servidor.activo && numero && !ui.seenLumiMemories.includes(numero))
      updateStudentUi((current) => ({ ...current, seenLumiMemories: [...current.seenLumiMemories, numero] }))
    abrirCapitulo(codigo)
  }
  const requestedMemory = Number(searchParams.get('memory'))
  const [memoriaAbierta, setMemoriaAbierta] = useState<number>()
  useEffect(() => {
    if (!Number.isInteger(requestedMemory) || memoriaAbierta === requestedMemory) return
    const pedido = historia.capitulos[requestedMemory - 1]
    if (!pedido?.desbloqueado) return
    setMemoriaAbierta(requestedMemory)
    setScreen('home')
    if (!servidor.activo)
      updateStudentUi((current) =>
        current.seenLumiMemories.includes(pedido.numero)
          ? current
          : { ...current, seenLumiMemories: [...current.seenLumiMemories, pedido.numero] },
      )
    abrirCapitulo(pedido.codigo)
  }, [requestedMemory, memoriaAbierta, historia.capitulos, servidor.activo])
  const locales = useMemo(
    () => [...state.journal].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.journal],
  )
  const entries: JournalEntry[] = servidor.activo ? servidor.entradas : locales
  const hoy = usePreguntaDeHoy(now, entries, servidor.activo)
  const buzon = useBuzonLumi((aviso) => setSaveNotice(aviso))
  const selected = entries.find((entry) => entry.id === selectedId)
  const numeroDe = (id?: string) => servidor.entradas.find((entry) => entry.id === id)?.numero
  const usedTags = [...new Set(entries.flatMap((entry) => entry.topicTags))].sort()

  function openEditor({
    prompt,
    linkedActivityId,
    title,
    lockedTags: initialTags,
  }: DailyQuestionEditorContext) {
    setSaveNotice(null)
    setEditingId(undefined)
    setDestino(linkedActivityId.startsWith('daily-prompt-') ? { delDia: true } : {})
    setBody('')
    setTags(initialTags)
    setLockedTags(initialTags)
    setTagDraft('')
    setPromptShown(prompt)
    setLinkedActivityId(linkedActivityId)
    setEntryTitle(title)
    setScreen('write')
  }

  function startBlankEntry() {
    setSaveNotice(null)
    setEditingId(undefined)
    setBody('')
    setTags([])
    setLockedTags([])
    setTagDraft('')
    setPromptShown(undefined)
    setLinkedActivityId(undefined)
    setDestino({})
    // En api el título es opcional: sin él, el servidor la muestra como «Entrada libre N».
    setEntryTitle(servidor.activo ? '' : 'Conversación libre con Lumi')
    setScreen('write')
  }

  // Una carta lista se responde en el editor con su pregunta; en local, como la sugerencia de Lumi que es.
  function responderCarta(carta: CartaLumi) {
    const local = buzon.sugerencia(carta.codigo)
    if (local)
      return openEditor({
        prompt: local.prompt,
        linkedActivityId: local.activityId,
        title: local.title,
        lockedTags: local.tags,
      })
    if (carta.estado !== 'lista' || !carta.texto) return
    openEditor({ prompt: carta.texto, linkedActivityId: carta.codigo, title: '', lockedTags: [] })
    setDestino({ pregunta: carta.codigo })
  }
  const [entradaAbierta, setEntradaAbierta] = useState<string>()
  useEffect(() => {
    if (!servidor.activo || !entradaPedida || entradaAbierta === entradaPedida) return
    const id = idEntradaServidor(Number(entradaPedida))
    if (!servidor.entradas.some((e) => e.id === id)) return
    setEntradaAbierta(entradaPedida)
    setSelectedId(id)
    setScreen('detail')
  }, [servidor.activo, servidor.entradas, entradaPedida, entradaAbierta])
  const responder = useRef(responderCarta)
  responder.current = responderCarta
  // `?pregunta=` (cierre de una actividad o drawer): abre el editor solo si la carta está lista; sellada o en
  // redacción, la portada muestra su estado en el buzón.
  useEffect(() => {
    if (!servidor.activo || !preguntaPedida || preguntaAbierta === preguntaPedida) return
    const carta = buzon.cartas.find((c) => c.codigo === preguntaPedida)
    if (!carta) return
    setPreguntaAbierta(preguntaPedida)
    if (carta.estado === 'lista' && carta.bandeja === 'PENDIENTE') responder.current(carta)
  }, [servidor.activo, buzon.cartas, preguntaPedida, preguntaAbierta])

  function addTag(raw = tagDraft) {
    const next = raw.trim().replace(/^#/, '').toLocaleLowerCase('es-PE')
    if (!next || tags.includes(next)) return
    setTags((current) => [...current, next])
    setTagDraft('')
  }

  async function guardarEnServidor() {
    const texto = body.trim(),
      titulo = entryTitle.trim() || null
    if (editingId) {
      const numero = numeroDe(editingId)
      if (numero === undefined) return
      const respuesta = await editarEntrada(numero, texto, titulo)
      if (respuesta.tipo !== 'ok') return setSaveNotice(avisoError('No se pudo guardar', respuesta))
      setSelectedId(editingId)
      setEditingId(undefined)
      setScreen('detail')
      return setSaveNotice(avisos.editada)
    }
    const antes = servidor.puntos
    const respuesta = await escribirEntrada({ texto, titulo, ...destino })
    if (respuesta.tipo !== 'ok' && respuesta.tipo !== 'guardado_sin_refrescar')
      return setSaveNotice(avisoError('No se pudo guardar', respuesta))
    setDestino({})
    setScreen('home')
    // La amistad cuenta escrituras con tope diario: se sabe si sumó comparando los puntos.
    const amistad = await asegurarSeccion('amistad')
    setSaveNotice(
      amistad.tipo !== 'ok' || antes === null
        ? { titulo: 'Carta guardada.' }
        : amistad.datos.puntos > antes
          ? avisos.suma
          : avisos.tope,
    )
  }

  function saveEntry() {
    if (servidor.activo) {
      if (body.trim()) void guardarEnServidor()
      return
    }
    if (!body.trim() || !entryTitle.trim()) return
    const remaining = getLumiBond(state.lumiRegistrations).remainingToday
    updateAdventure((current) => {
      const existing = current.journal.find((entry) => entry.id === editingId)
      const entry: JournalEntry = {
        id: existing?.id ?? crypto.randomUUID(),
        title: entryTitle.trim(),
        body: body.trim(),
        kind: promptShown ? 'prompted' : 'open',
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        linkedActivityId,
        promptShown,
        topicTags: tags,
        lockedTopicTags: lockedTags,
        missionId: existing?.missionId,
      }
      return {
        ...current,
        journal: [...current.journal.filter((item) => item.id !== entry.id), entry],
      }
    })
    setSelectedId(editingId)
    setEditingId(undefined)
    setScreen(editingId ? 'detail' : 'home')
    setSaveNotice(editingId ? avisos.editada : remaining > 0 ? avisos.suma : avisos.tope)
  }

  function editEntry(entry: JournalEntry) {
    setEditingId(entry.id)
    setDestino({})
    setBody(entry.body)
    setTags(entry.topicTags)
    setLockedTags(entry.lockedTopicTags ?? [])
    setTagDraft('')
    setPromptShown(entry.promptShown)
    setLinkedActivityId(entry.linkedActivityId)
    setEntryTitle(
      servidor.activo ? (servidor.entradas.find((e) => e.id === entry.id)?.tituloPropio ?? '') : entry.title,
    )
    setScreen('write')
  }

  async function borrarEnServidor(numero: number) {
    const respuesta = await borrarEntrada(numero)
    setDeleteOpen(false)
    if (respuesta.tipo !== 'ok') return setSaveNotice(avisoError('No se pudo borrar', respuesta))
    setSelectedId(undefined)
    setScreen('home')
  }

  function deleteEntry() {
    if (!selected) return
    const numero = numeroDe(selected.id)
    if (servidor.activo) {
      if (numero !== undefined) void borrarEnServidor(numero)
      return
    }
    updateAdventure((current) => ({
      ...current,
      journal: current.journal.filter((entry) => entry.id !== selected.id),
    }))
    setDeleteOpen(false)
    setSelectedId(undefined)
    setScreen('home')
  }

  return {
    state,
    now,
    bond,
    activityId,
    screen,
    setScreen,
    cuadernoCompleto,
    setSelectedId,
    editingId,
    body,
    setBody,
    tags,
    setTags,
    lockedTags,
    tagDraft,
    setTagDraft,
    promptShown,
    linkedActivityId,
    entryTitle,
    setEntryTitle,
    deleteOpen,
    setDeleteOpen,
    returnFocus,
    saveNotice,
    setSaveNotice,
    entries,
    selected,
    usedTags,
    openEditor,
    startBlankEntry,
    addTag,
    saveEntry,
    editEntry,
    deleteEntry,
    // Ajuste del diario (F05): «Hoy», el buzón y, en api, lo que no hay en local (temas fuera y errores).
    hoy,
    historia,
    capitulo: capitulo ? historia.actividad(capitulo) : undefined,
    verCapitulo: setCapitulo,
    cerrarCapitulo: () => setCapitulo(undefined),
    buzon: { ...buzon, responder: responderCarta },
    diarioServidor: servidor.activo ? { error: servidor.error } : undefined,
  }
}
