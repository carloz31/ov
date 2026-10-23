import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { appPaths } from '@/routes/paths'
import { desarchivarPregunta } from '@/store/servidor/diario'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { useLumiNow } from '@/hooks/useLumiNow'
import type { CartaLumi } from '@/lib/servidor/adaptadoresDiario'
import { useBuzonLumi } from '@/features/journal/hooks/useBuzonLumi'
import type { AvisoDiario } from '@/features/journal/hooks/useJournalPage'

export type BandejaVista = 'PENDIENTE' | 'RESPONDIDA' | 'ARCHIVADA'

// Ajuste del diario (F05): «Cartas de Lumi», el buzón completo con sus bandejas.
// - Responder lleva al editor del diario con esa carta (en local, con la sugerencia de Lumi).
// - «Leer en el cuaderno» abre la entrada que la respondió.
// En local solo hay cartas por responder: no hay bandejas, cartas en redacción ni archivo.
export function useCartasLumi() {
  const navigate = useNavigate()
  const ahora = useLumiNow()
  const [bandeja, setBandeja] = useState<BandejaVista>('PENDIENTE')
  const [aviso, guardarAviso] = useState<(AvisoDiario & { id: number }) | null>(null)
  const avisoId = useRef(0)
  const avisar = (nuevo: AvisoDiario | null) => guardarAviso(nuevo && { ...nuevo, id: ++avisoId.current })
  const buzon = useBuzonLumi(avisar)
  const cuenta = (b: BandejaVista) => buzon.cartas.filter((c) => c.bandeja === b).length
  function responder(carta: CartaLumi) {
    const local = buzon.sugerencia(carta.codigo)
    const consulta: Record<string, string> = local
      ? { activity: local.activityId, title: local.title, prompt: local.prompt }
      : { pregunta: carta.codigo }
    navigate(`${appPaths.student.journal}?${new URLSearchParams(consulta)}`)
  }
  async function desarchivar(carta: CartaLumi) {
    const respuesta = await desarchivarPregunta(carta.codigo)
    if (respuesta.tipo !== 'ok')
      avisar({ titulo: 'No se pudo desarchivar', descripcion: mensajeErrorServidor(respuesta), error: true })
  }
  return {
    ahora,
    buzon,
    conBandejas: buzon.activo,
    bandeja: buzon.activo ? bandeja : 'PENDIENTE',
    setBandeja,
    conteos: {
      PENDIENTE: cuenta('PENDIENTE'),
      RESPONDIDA: cuenta('RESPONDIDA'),
      ARCHIVADA: cuenta('ARCHIVADA'),
    },
    enBandeja: (b: BandejaVista) => buzon.cartas.filter((c) => c.bandeja === b),
    responder,
    desarchivar: (carta: CartaLumi) => void desarchivar(carta),
    leer: (carta: CartaLumi) =>
      carta.entrada !== null &&
      navigate(`${appPaths.student.journal}?${new URLSearchParams({ entrada: String(carta.entrada) })}`),
    aviso,
    cerrarAviso: () => avisar(null),
  }
}
