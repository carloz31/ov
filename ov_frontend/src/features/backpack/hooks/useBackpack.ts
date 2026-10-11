import { useFichasServidor } from '@/store/servidor/secciones'
import { useEffect, useRef, useState } from 'react'
import { modoApi } from '@/config/env'
import { mensajeErrorServidor, useEstadoServidor } from '@/store/servidor/sesion'
import { consultarProgreso } from '@/store/servidor/consultas'
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
  const [requisitoId, setRequisitoId] = useState<string | null>(null)
  const [requisito, setRequisito] = useState('')
  const [requisitoPendiente, setRequisitoPendiente] = useState(false)
  const [errorRequisito, setErrorRequisito] = useState(false)
  const [intentoRequisito, setIntentoRequisito] = useState(0)
  useEffect(() => {
    if (!modoApi || !requisitoId) return
    let vigente = true
    setRequisitoPendiente(true)
    setErrorRequisito(false)
    setRequisito('Consultando el requisito en el servidor…')
    void consultarProgreso('FICHA', requisitoId).then((respuesta) => {
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
  }, [requisitoId, servidor.actividades.datos, intentoRequisito])
  const resources = getTravelResources(),
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
    setSelectedId(resource.id)
    updateAdventure((current) =>
      current.visits.includes(resource.id)
        ? current
        : { ...current, visits: [...current.visits, resource.id] },
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
