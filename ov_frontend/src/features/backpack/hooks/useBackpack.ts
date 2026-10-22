import { useFichasServidor } from '@/store/servidor/secciones'
import { useEffect, useRef, useState } from 'react'
import { modoApi } from '@/config/env'
import { mensajeErrorServidor, useEstadoServidor } from '@/store/servidor/sesion'
import { consultarProgreso } from '@/store/servidor/consultas'
import { consultarTestimonios, verTestimonio as registrarVistaTestimonio } from '@/store/servidor/testimonios'
import type { TestimonioEstado } from '@/types/servidor'
import { textoRequisito } from '@/lib/servidor/adaptadores'
import { useNavigate, useSearchParams } from 'react-router'
import { updateJourney, useJourney } from '@/store/journeyStore'
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
  const servidor = useEstadoServidor()
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
  const [requisito, setRequisito] = useState('')
  const [requisitoPendiente, setRequisitoPendiente] = useState(false)
  const [errorRequisito, setErrorRequisito] = useState(false)
  const [intentoRequisito, setIntentoRequisito] = useState(0)
  // Lo bloqueado de un contenido concreto se explica en un pop up: la pista del testimonio, si la tiene;
  // si no, el mensaje de bloqueo del servidor, como en las fichas.
  const testimonioRequisito = testimonios?.find((t) => t.codigo === requisitoId)
  const tituloRequisito = testimonioRequisito ? 'Cómo conocer este testimonio' : 'Cómo obtener esta ficha'
  useEffect(() => {
    if (!modoApi || !requisitoId) return
    if (testimonioRequisito?.pista) {
      setRequisitoPendiente(false)
      setErrorRequisito(false)
      setRequisito(testimonioRequisito.pista)
      return
    }
    let vigente = true
    setRequisitoPendiente(true)
    setErrorRequisito(false)
    setRequisito('Consultando el requisito en el servidor…')
    void consultarProgreso(testimonioRequisito ? 'TESTIMONIO' : 'FICHA', requisitoId).then((respuesta) => {
      if (!vigente) return
      setRequisito(
        respuesta.tipo === 'ok'
          ? textoRequisito(respuesta.datos, servidor.actividades.datos)
          : mensajeErrorServidor(respuesta),
      )
      setRequisitoPendiente(false)
      setErrorRequisito(respuesta.tipo !== 'ok')
    })
    return () => {
      vigente = false
    }
  }, [requisitoId, servidor.actividades.datos, intentoRequisito, testimonioRequisito])
  const resources = getTravelResources(testimonios),
    selected = resources.find((r) => r.id === selectedId)
  const isUnlocked = (r: TravelResource) => isTravelResourceUnlocked(r, journey, adventure)
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
  function marcarLeida(selected: TravelResource) {
    return updateJourney((current) => ({
      ...current,
      readResourceIds: [...new Set([...(current.readResourceIds ?? current.resources), selected.id])],
    }))
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
    requisito,
    requisitoPendiente,
    errorRequisito,
    setIntentoRequisito,
    mostrarRequisito: modoApi,
    tituloRequisito,
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
    marcarLeida,
  }
}
