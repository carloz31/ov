import { useFichasServidor } from '@/store/servidor/secciones'
import { useEffect, useRef, useState } from 'react'
import { modoApi } from '@/config/env'
import { consultarTestimonios, verTestimonio as registrarVistaTestimonio } from '@/store/servidor/testimonios'
import type { TestimonioEstado } from '@/types/servidor'
import { useRequisitoRecurso } from './useRequisitoRecurso'
import { useNavigate, useSearchParams } from 'react-router'
import { useJourney } from '@/store/journeyStore'
import { updateAdventure, useAdventure } from '@/store/adventureStore'
import { isTravelResourceUnlocked, type TravelResource } from '@/features/backpack/lib/travelerResources'
import {
  getStudentTravelResources as getTravelResources,
  studentResourceRequirement as resourceRequirement,
} from '@/features/backpack/lib/challengeResources'
import { getCiudadPoints } from '@/features/adventure/lib/ciudadPoints'
type KindFilter = 'all' | 'sheet' | 'testimonial'
export function useBackpack() {
  useFichasServidor()
  const adventure = useAdventure(),
    journey = useJourney(),
    navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const rawKind = params.get('kind')
  const kind: KindFilter = rawKind === 'sheet' || rawKind === 'testimonial' ? rawKind : 'all'
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const [query, setQuery] = useState(''),
    [favoritesOnly, setFavoritesOnly] = useState(false),
    [selectedId, setSelectedId] = useState<string | null>(params.get('ficha'))
  const fichaSolicitada = params.get('ficha')
  useEffect(() => {
    setSelectedId(fichaSolicitada)
  }, [fichaSolicitada])
  // F04: los testimonios se piden al abrir la mochila.
  const [testimonios, setTestimonios] = useState<TestimonioEstado[] | null>(null)
  useEffect(() => {
    if (!modoApi) return
    let vigente = true
    void consultarTestimonios().then((respuesta) => {
      if (vigente && respuesta.tipo === 'ok') setTestimonios(respuesta.datos)
    })
    return () => {
      vigente = false
    }
  }, [])
  const [requisitoId, setRequisitoId] = useState<string | null>(null)
  const testimonioRequisito = testimonios?.find((t) => t.codigo === requisitoId)
  const requisito = useRequisitoRecurso(requisitoId, testimonioRequisito)
  const resources = getTravelResources(testimonios),
    selected = resources.find((r) => r.id === selectedId)
  const isUnlocked = (r: TravelResource) => isTravelResourceUnlocked(r, journey, adventure)
  // F04d: `?ficha=<codigo>` de una ficha bloqueada abre su pop up de requisito, no el visor.
  const solicitadaBloqueada = modoApi && !!selected && selected.kind === 'sheet' && !isUnlocked(selected)
  useEffect(() => {
    if (solicitadaBloqueada && fichaSolicitada) setRequisitoId(fichaSolicitada)
  }, [solicitadaBloqueada, fichaSolicitada])
  const visible = resources.filter(
    (item) =>
      (!favoritesOnly || (isUnlocked(item) && adventure.bookmarks.includes(item.id))) &&
      `${item.title} ${item.summary} ${isUnlocked(item) ? (item.author ?? '') : ''}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  )
  const sheets = resources.filter((r) => r.kind === 'sheet'),
    voices = resources.filter((r) => r.kind === 'testimonial')
  const cityPoints = getCiudadPoints(adventure, journey)
  function chooseKind(next: KindFilter) {
    setParams((current) => {
      const nextParams = new URLSearchParams(current)
      nextParams.set('kind', next)
      return nextParams
    })
  }
  function toggleFavorite(id: string) {
    const item = resources.find((r) => r.id === id)
    if (!item || !isUnlocked(item)) return
    updateAdventure((current) => ({
      ...current,
      bookmarks: current.bookmarks.includes(id)
        ? current.bookmarks.filter((saved) => saved !== id)
        : [...current.bookmarks, id],
    }))
  }
  function openResource(resource: TravelResource) {
    if (!isUnlocked(resource)) return
    if (resource.servidor) return verTestimonio(resource)
    setSelectedId(resource.id)
    updateAdventure((current) =>
      current.visits.includes(resource.id)
        ? current
        : { ...current, visits: [...current.visits, resource.id] },
    )
  }
  // El enlace se abre en el mismo clic, para que el navegador no bloquee la pestaña; la vista se
  // registra después, sin esperar la respuesta.
  function verTestimonio(resource: TravelResource) {
    if (resource.url) window.open(resource.url, '_blank', 'noopener,noreferrer')
    void registrarVistaTestimonio(resource.id)
    updateAdventure((current) =>
      current.visits.includes(resource.id) ? current : { ...current, visits: [...current.visits, resource.id] },
    )
  }
  const clear = () => {
    setQuery('')
    chooseKind('all')
    setFavoritesOnly(false)
  }
  function consultarRequisito(resource: TravelResource) {
    return modoApi ? setRequisitoId(resource.id) : navigate(resourceRequirement(resource).url)
  }

  return {
    adventure,
    journey,
    navigate,
    kind,
    tabs,
    query,
    setQuery,
    favoritesOnly,
    setFavoritesOnly,
    selected,
    setSelectedId,
    requisitoId,
    setRequisitoId,
    requisito: requisito.texto,
    requisitoPendiente: requisito.pendiente,
    errorRequisito: requisito.error,
    reintentarRequisito: requisito.reintentar,
    mostrarRequisito: modoApi,
    tituloRequisito: requisito.titulo,
    // El bloque fijo de «más voces» es del modo local.
    muestraMasVoces: !modoApi,
    isUnlocked,
    visible,
    sheets,
    voices,
    cityPoints,
    chooseKind,
    toggleFavorite,
    openResource,
    clear,
    consultarRequisito,
  }
}
