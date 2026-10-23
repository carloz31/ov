import { useMemo, useState } from 'react'
import { modoApi } from '@/config/env'
import { useAdventure } from '@/store/adventureStore'
import { useJourney } from '@/store/journeyStore'
import { abrirPregunta, archivarPregunta } from '@/store/servidor/diario'
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
  estado: 'lista',
  bandeja: 'PENDIENTE',
  recibidaEn: null,
  remitente: null,
  entrada: null,
  respondidaEn: null,
  archivadaEn: null,
})

// Ajuste del diario (F05): el buzón de cartas de Lumi. En api:
// - «Abrir» una sellada llama a `abrir-pregunta` sin abrir el editor y la deja «en redacción» hasta que vuelve;
// - si falla, vuelve a sellada con un aviso;
// - «Actualizar» relee `diario/preguntas`.
// Las cartas abiertas en esta sesión se recuerdan solo en memoria.
export function useBuzonLumi(avisar: (aviso: AvisoDiario) => void) {
  const activo = modoApi
  const adventure = useAdventure(),
    journey = useJourney()
  const preguntas = useDiarioPreguntasServidor(activo)
  const [enRedaccion, setEnRedaccion] = useState<string[]>([])
  const [actualizando, setActualizando] = useState(false)
  const sugerencias = useMemo(
    () => (activo ? [] : getLumiSuggestions(adventure, journey)),
    [activo, adventure, journey],
  )
  const cartas = useMemo(
    () => (activo ? cartasDiario(preguntas.datos) : sugerencias.map(cartaLocal)),
    [activo, preguntas.datos, sugerencias],
  )
  async function abrir(carta: CartaLumi) {
    setEnRedaccion((actual) => [...new Set([...actual, carta.codigo])])
    const respuesta = await abrirPregunta(carta.codigo)
    if (respuesta.tipo !== 'ok') {
      setEnRedaccion((actual) => actual.filter((codigo) => codigo !== carta.codigo))
      avisar({ titulo: 'Lumi no pudo escribir ahora, inténtalo en un momento', error: true })
    }
  }
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
    // Una sellada abierta en esta sesión sigue «en redacción» mientras el servidor no la entregue redactada.
    enRedaccion: enRedaccion.filter(
      (codigo) => cartas.find((c) => c.codigo === codigo)?.estado === 'sellada',
    ),
    sugerencia: (codigo: string) => sugerencias.find((s) => s.activityId === codigo),
    abrir: activo ? abrir : undefined,
    archivar: activo ? archivar : undefined,
    actualizar: { onClick: () => void actualizar(), cargando: actualizando },
  }
}
