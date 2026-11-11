import { useMemo, useState } from 'react'
import { modoApi } from '@/config/env'
import { useAdventure } from '@/store/adventureStore'
import { useJourney } from '@/store/journeyStore'
import { archivarPregunta } from '@/store/servidor/diario'
import { reintentarSeccion, useDiarioPreguntasServidor } from '@/store/servidor/secciones'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { cartasDiario, type CartaLumi } from '@/lib/servidor/adaptadoresDiario'
import { getLumiSuggestions, type LumiSuggestion } from '@/features/journal/lib/lumiSuggestions'
import type { AvisoDiario } from '@/features/journal/hooks/useJournalPage'

// Local: las sugerencias de Lumi como cartas listas, sin fechas, remitente ni archivo.
const cartaLocal = (s: LumiSuggestion): CartaLumi => ({
  codigo: s.activityId,
  nombre: s.title,
  texto: s.prompt,
  bandeja: 'PENDIENTE',
  recibidaEn: null,
  remitente: null,
  entrada: null,
  respondidaEn: null,
  archivadaEn: null,
})

// Ajuste del diario (F05): el buzón de cartas de Lumi. En api toda carta llega con su texto (ajuste cartas-diario);
// «Actualizar» («Cartas de Lumi») relee `diario/preguntas`.
export function useBuzonLumi(avisar: (aviso: AvisoDiario) => void) {
  const activo = modoApi
  const adventure = useAdventure(),
    journey = useJourney()
  const preguntas = useDiarioPreguntasServidor(activo)
  const [actualizando, setActualizando] = useState(false)
  const sugerencias = useMemo(
    () => (activo ? [] : getLumiSuggestions(adventure, journey)),
    [activo, adventure, journey],
  )
  const cartas = useMemo(
    () => (activo ? cartasDiario(preguntas.datos) : sugerencias.map(cartaLocal)),
    [activo, preguntas.datos, sugerencias],
  )
  async function archivar(carta: CartaLumi) {
    const respuesta = await archivarPregunta(carta.codigo)
    if (respuesta.tipo !== 'ok')
      avisar({ titulo: 'No se pudo archivar', descripcion: mensajeErrorServidor(respuesta), error: true })
  }
  async function actualizar() {
    setActualizando(true)
    await reintentarSeccion('diarioPreguntas')
    setActualizando(false)
  }
  return {
    activo,
    cartas,
    sugerencia: (codigo: string) => sugerencias.find((s) => s.activityId === codigo),
    archivar: activo ? archivar : undefined,
    actualizar: { onClick: () => void actualizar(), cargando: actualizando },
  }
}
