import { useEffect, useMemo, useRef, useState } from 'react'

import { useSearchParams } from 'react-router'

import { getFamilyConversationTopic } from '@/data/content/familyConversations'
import { updateAdventure, useAdventure } from '@/store/adventureStore'
import { getLumiTags } from '@/features/journal/lib/lumiSuggestions'
import { useLumiNow } from '@/hooks/useLumiNow'
import type { JournalEntry } from '@/types/adventure'

import { useReturnFocus } from '@/hooks/useReturnFocus'
import { getLumiBond, lumiBondServidor } from '@/features/journal/lib/lumiBond'
import { useDiarioServidor } from '@/features/journal/hooks/useDiarioServidor'
import { usePreguntaDelDiaServidor } from '@/features/journal/hooks/usePreguntaDelDiaServidor'
import { abrirPregunta, borrarEntrada, editarEntrada, escribirEntrada } from '@/store/servidor/diario'
import { asegurarSeccion } from '@/store/servidor/secciones'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { CartaLumi } from '@/lib/servidor/adaptadoresDiario'
import { type DailyQuestionEditorContext } from '@/features/journal/components/DailyQuestionCard'

type JournalScreen = 'home' | 'write' | 'detail'
export type AvisoDiario = { titulo: string; descripcion?: string; error?: boolean }
const avisos = {
  suma: { titulo: '¡Conversación guardada!', descripcion: 'Tu amistad con Lumi suma una conversación.' },
  tope: {
    titulo: 'Conversación guardada.',
    descripcion: 'Hoy ya contaron tus 3 conversaciones; esta igual se guarda.',
  },
  editada: { titulo: 'Conversación actualizada.', descripcion: 'Editar no suma conversaciones.' },
} satisfies Record<string, AvisoDiario>
const avisoError = (titulo: string, error: Parameters<typeof mensajeErrorServidor>[0]): AvisoDiario => ({
  titulo,
  descripcion: mensajeErrorServidor(error),
  error: true,
})
type JournalGrouping = 'timeline' | 'topics'
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
  const [grouping, setGrouping] = useState<JournalGrouping>('timeline')
  const [query, setQuery] = useState('')
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
  const [escribiendo, setEscribiendo] = useState(false)
  const [preguntaAbierta, setPreguntaAbierta] = useState<string>()
  const returnFocus = useReturnFocus()
  // El aviso tras guardar, editar o borrar se muestra como toast (`AvisoToast`); `error` cambia su ícono.
  // Cada aviso lleva su `id`: uno nuevo reinicia el toast aunque repita el texto.
  const [saveNotice, guardarAviso] = useState<(AvisoDiario & { id: number }) | null>(null)
  const avisoId = useRef(0)
  const setSaveNotice = (aviso: AvisoDiario | null) =>
    guardarAviso(aviso && { ...aviso, id: ++avisoId.current })
  const requestedMemory = Number(searchParams.get('memory'))
  useEffect(() => {
    if (Number.isInteger(requestedMemory) && requestedMemory >= 1 && requestedMemory <= bond.memoriesOpened)
      setScreen('home')
  }, [requestedMemory, bond.memoriesOpened])
  const locales = useMemo(
    () => [...state.journal].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.journal],
  )
  const entries: JournalEntry[] = servidor.activo ? servidor.entradas : locales
  const delDia = usePreguntaDelDiaServidor(now, entries, servidor.activo)
  const filteredEntries = entries.filter((entry) => {
    const normalized = query.trim().toLocaleLowerCase('es-PE')
    if (!normalized) return true
    return `${entry.topicTags.join(' ')} ${entry.title} ${entry.promptShown ?? ''} ${entry.body}`
      .toLocaleLowerCase('es-PE')
      .includes(normalized)
  })
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

  // F05: una carta de Lumi del servidor; su texto llega con `abrir-pregunta` (las personalizadas tardan).
  async function abrirCarta(carta: CartaLumi) {
    setSaveNotice(null)
    setEditingId(undefined)
    setDestino({ pregunta: carta.codigo })
    setBody('')
    setTags([])
    setLockedTags([])
    setPromptShown(undefined)
    setLinkedActivityId(undefined)
    setEntryTitle('')
    setEscribiendo(carta.porRedactar)
    setScreen('write')
    const respuesta = await abrirPregunta(carta.codigo)
    setEscribiendo(false)
    if (respuesta.tipo === 'ok') setPromptShown(respuesta.datos.texto)
    else {
      setScreen('home')
      setSaveNotice(avisoError('No se pudo abrir la carta', respuesta))
    }
  }
  // Desde el cierre de una actividad (`?pregunta=`): abre esa carta cuando llegan las preguntas.
  useEffect(() => {
    if (!servidor.activo || !preguntaPedida || preguntaAbierta === preguntaPedida) return
    const carta = servidor.cartas.find((c) => c.codigo === preguntaPedida)
    if (!carta) return
    setPreguntaAbierta(preguntaPedida)
    void abrirCarta(carta)
  }, [servidor.activo, servidor.cartas, preguntaPedida, preguntaAbierta])

  function startOnboardingEntry() {
    updateAdventure((current) => ({ ...current, journalOnboardingSeen: true }))
    if (!initialPrompt) {
      setPromptShown('¿Cómo llegas al inicio de este proceso?')
      setLinkedActivityId('journal-onboarding')
      setEntryTitle('Al inicio del camino')
      setLockedTags([])
      setBody('')
      setScreen('write')
    }
  }

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
        ? { titulo: 'Conversación guardada.' }
        : amistad.datos.puntos > antes
          ? avisos.suma
          : avisos.tope,
    )
  }

  function saveEntry() {
    if (servidor.activo) {
      if (body.trim() && !escribiendo) void guardarEnServidor()
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
    grouping,
    setGrouping,
    query,
    setQuery,
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
    filteredEntries,
    selected,
    usedTags,
    openEditor,
    startBlankEntry,
    startOnboardingEntry,
    addTag,
    saveEntry,
    editEntry,
    deleteEntry,
    // F05: lo que en api viene del servidor; en local, sin definir y la vista se comporta como antes.
    diarioServidor: servidor.activo
      ? {
          error: servidor.error,
          escribiendo,
          cartas: { cartas: servidor.cartas, porDescubrir: servidor.porDescubrir, onCarta: abrirCarta },
          preguntaDelDia: {
            texto: delDia.pregunta?.texto ?? null,
            respondida: delDia.respondida,
            respuesta: delDia.respuesta,
            abrir: () => void delDia.abrir(),
            error: delDia.error,
          },
        }
      : undefined,
  }
}
