import { useEffect, useRef, useState } from 'react'
import { getDailyJournalPrompt } from '@/data/content/journalPrompts'
import { lumiDayKey } from '@/lib/lumiFriendship'
import { pedirPreguntaDelDia } from '@/store/servidor/diario'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { JournalEntry } from '@/types/adventure'
import type { DailyQuestionEditorContext } from '@/features/journal/components/DailyQuestionCard'

// La columna «Hoy» del diario (ajuste de F05).
// - `pregunta`: hay una vigente por responder.
// - `contada`: ya se respondió (o, en api, se cerró al borrar su respuesta).
// - `sin_pregunta`: no hay (el servidor responde 409 o no se pudo pedir).
// En api se pide al montar; es un POST que devuelve la vigente o la sortea. En local sale de `journalPrompts`.
export type EstadoHoy = {
  estado: 'cargando' | 'pregunta' | 'contada' | 'sin_pregunta'
  texto?: string
  error?: string
  editor?: DailyQuestionEditorContext
}

export function usePreguntaDeHoy(now: Date, entradas: JournalEntry[], activo: boolean): EstadoHoy {
  const day = lumiDayKey(now),
    dailyId = `daily-prompt-${day}`
  const [servidor, setServidor] = useState<EstadoHoy>({ estado: 'cargando' })
  const pedida = useRef<string | null>(null)
  useEffect(() => {
    if (!activo || pedida.current === day) return
    pedida.current = day
    void pedirPreguntaDelDia().then((respuesta) => {
      if (respuesta.tipo === 'ok') {
        const { texto, respondida, cerrada } = respuesta.datos
        setServidor({ estado: respondida || cerrada ? 'contada' : 'pregunta', texto })
      } else
        setServidor({
          estado: 'sin_pregunta',
          error:
            respuesta.tipo === 'http' && respuesta.estado === 409
              ? undefined
              : mensajeErrorServidor(respuesta),
        })
    })
  }, [activo, day])
  if (activo) {
    const respondidaHoy = entradas.some(
      (e) => e.etiqueta === 'Pregunta del día' && lumiDayKey(new Date(e.createdAt)) === day,
    )
    const estado = servidor.estado === 'pregunta' && respondidaHoy ? 'contada' : servidor.estado
    return {
      ...servidor,
      estado,
      editor: servidor.texto
        ? { prompt: servidor.texto, linkedActivityId: dailyId, title: '', lockedTags: [] }
        : undefined,
    }
  }
  let daily: ReturnType<typeof getDailyJournalPrompt> | undefined
  try {
    daily = getDailyJournalPrompt(now)
  } catch {
    daily = undefined
  }
  if (!daily?.prompt?.trim()) return { estado: 'sin_pregunta' }
  const respondida = entradas.some((entry) => entry.linkedActivityId === dailyId)
  return {
    estado: respondida ? 'contada' : 'pregunta',
    texto: daily.prompt,
    editor: {
      prompt: daily.prompt,
      linkedActivityId: dailyId,
      title: 'Tema del día',
      lockedTags: daily.tags,
    },
  }
}
