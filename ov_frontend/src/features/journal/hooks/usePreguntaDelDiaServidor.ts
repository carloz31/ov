import { useEffect, useRef, useState } from 'react'
import { lumiDayKey } from '@/lib/lumiFriendship'
import { pedirPreguntaDelDia } from '@/store/servidor/diario'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { updateStudentUi, useStudentUi } from '@/store/studentUiStore'
import type { JournalEntry } from '@/types/adventure'
import type { PreguntaDelDia } from '@/types/servidor'

// F05, solo api: la pregunta del día se pide al abrirla (es un POST que la sortea) y, si ya se abrió hoy,
// al volver al diario. La respuesta es la entrada «Pregunta del día» de hoy.
export function usePreguntaDelDiaServidor(now: Date, entradas: JournalEntry[], activo: boolean) {
  const ui = useStudentUi(),
    day = lumiDayKey(now),
    abiertaHoy = ui.dailyQuestionOpenedOn === day
  const [pregunta, setPregunta] = useState<PreguntaDelDia | null>(null)
  const [error, setError] = useState('')
  const pedida = useRef(false)
  async function cargar() {
    pedida.current = true
    setError('')
    const respuesta = await pedirPreguntaDelDia()
    if (respuesta.tipo === 'ok') setPregunta(respuesta.datos)
    else setError(mensajeErrorServidor(respuesta))
  }
  function abrir() {
    updateStudentUi((current) => ({ ...current, dailyQuestionOpenedOn: day }))
    return cargar()
  }
  // Ya abierta hoy: se vuelve a pedir una sola vez al montar (el servidor devuelve la vigente).
  useEffect(() => {
    if (!activo || !abiertaHoy || pedida.current) return
    pedida.current = true
    void pedirPreguntaDelDia().then((respuesta) => {
      if (respuesta.tipo === 'ok') setPregunta(respuesta.datos)
      else setError(mensajeErrorServidor(respuesta))
    })
  }, [activo, abiertaHoy])
  const respuesta = entradas.find(
    (e) => e.etiqueta === 'Pregunta del día' && lumiDayKey(new Date(e.createdAt)) === day,
  )
  return {
    pregunta,
    respuesta,
    respondida: Boolean(respuesta) || Boolean(pregunta?.respondida),
    abrir,
    error,
  }
}
