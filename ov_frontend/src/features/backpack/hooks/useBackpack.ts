import { useActividadesServidor, useFichasServidor } from '@/store/servidor/secciones'
import { ciudadDisponible } from '@/lib/servidor/adaptadores'
import { appPaths } from '@/routes/paths'
import { cityCases } from '@/data/content/adventure'
import { hrefActividad } from '@/features/discovery/lib/helenaPagesApi'
import { agruparFichas } from '../lib/agruparFichas'
import { filtrar, vocesListadas } from '../lib/compartimentos'
import { useEffect, useRef, useState } from 'react'
import { modoApi } from '@/config/env'
import { consultarTestimonios, verTestimonio as registrarVistaTestimonio } from '@/store/servidor/testimonios'
import { alternarFavorito } from '@/store/servidor/favoritos'
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
// Sin pestaña «Todo»: fichas o testimonios; sin `kind` válido, fichas.
type KindFilter = 'sheet' | 'testimonial'
export function useBackpack() {
  useFichasServidor()
  const actividades = useActividadesServidor()
  const adventure = useAdventure(),
    journey = useJourney(),
    navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const rawKind = params.get('kind')
  const kind: KindFilter = rawKind === 'testimonial' ? 'testimonial' : 'sheet'
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
  // Ajuste mochila (api): favoritos ya confirmados por el servidor, hasta que llega la consulta nueva, y los que
  // esperan su POST.
  const [optimistas, setOptimistas] = useState<Record<string, boolean>>({})
  const [pendientes, setPendientes] = useState<string[]>([])
  const testimonioRequisito = testimonios?.find((t) => t.codigo === requisitoId)
  const requisito = useRequisitoRecurso(requisitoId, testimonioRequisito)
  const resources = getTravelResources(testimonios),
    selected = resources.find((r) => r.id === selectedId)
  const isUnlocked = (r: TravelResource) => isTravelResourceUnlocked(r, journey, adventure)
  const esFavorita = (r: TravelResource) =>
    modoApi ? (optimistas[r.id] ?? !!r.favorita) : adventure.bookmarks.includes(r.id)
  // F04d: `?ficha=<codigo>` de una ficha bloqueada abre su pop up de requisito, no el visor.
  const solicitadaBloqueada = modoApi && !!selected && selected.kind === 'sheet' && !isUnlocked(selected)
  useEffect(() => {
    if (solicitadaBloqueada && fichaSolicitada) setRequisitoId(fichaSolicitada)
  }, [solicitadaBloqueada, fichaSolicitada])
  // Ajustes Central (7): un testimonio abierto desde un cierre (`?ficha=`) también registra su vista.
  const testimonioSolicitado = !!selected?.servidor && isUnlocked(selected) && selected.id === fichaSolicitada
  useEffect(() => {
    if (testimonioSolicitado && fichaSolicitada) void registrarVistaTestimonio(fichaSolicitada)
  }, [testimonioSolicitado, fichaSolicitada])
  const sheets = resources.filter((r) => r.kind === 'sheet'),
    voices = resources.filter((r) => r.kind === 'testimonial')
  const cityPoints = getCiudadPoints(adventure, journey)
  // Ajuste mochila: las fichas se listan solo obtenidas, agrupadas por tramo; «Nueva» = sin abrir aún.
  const esNueva = (r: TravelResource) =>
    modoApi ? (r.kind === 'sheet' ? r.ficha?.visto === false : r.servidor?.visto === false) : !adventure.visits.includes(r.id)
  const fichasObtenidas = sheets.filter(isUnlocked)
  // Una voz bloqueada se lista solo si su llamado ya está disponible (en local, si su punto se puede jugar).
  const casoLocal = (r: TravelResource) => ('caseId' in r.requirement ? r.requirement.caseId : undefined)
  const casoDisponible = (r: TravelResource) =>
    modoApi ? !!r.servidor?.casoDisponible : !!cityPoints.find((p) => p.id === casoLocal(r))?.actionEnabled
  const voces = vocesListadas(voices, isUnlocked, casoDisponible)
  const criterio = { query, favoritesOnly, esFavorita, isUnlocked }
  const fichasVisibles = filtrar(fichasObtenidas, criterio),
    vocesVisibles = filtrar([...voces.abiertas, ...voces.porDescubrir], criterio)
  const vacio = kind === 'sheet' ? !fichasObtenidas.length : !voces.abiertas.length && !voces.porDescubrir.length
  const sinResultados = !vacio && !(kind === 'sheet' ? fichasVisibles : vocesVisibles).length
  // El llamado que regala la voz y el drawer de ese llamado en la Central, sin pasar por el pop up de requisito.
  const casoVoz = (r: TravelResource) =>
    modoApi
      ? {
          titulo: r.servidor?.caso?.titulo,
          href: r.servidor?.caso ? hrefActividad(actividades.datos, r.servidor.caso.codigo) : undefined,
        }
      : {
          titulo: cityCases.find((c) => c.id === casoLocal(r))?.title,
          href: `${appPaths.student.exploration}?punto=${encodeURIComponent(casoLocal(r) ?? '')}`,
        }
  const centralAbierta = modoApi ? ciudadDisponible(actividades.datos) : cityPoints.some((p) => p.actionEnabled)
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
    // Ajuste mochila: en api, el favorito se guarda en el servidor. Mientras el POST corre, la estrella muestra
    // un cargador y no acepta otro clic; cambia solo cuando el servidor confirma.
    if (modoApi) {
      if (pendientes.includes(id)) return
      const valor = !esFavorita(item)
      setPendientes((actual) => [...actual, id])
      void alternarFavorito(item.kind === 'sheet' ? 'FICHA' : 'TESTIMONIO', id, valor).then(async (respuesta) => {
        setPendientes((actual) => actual.filter((p) => p !== id))
        if (respuesta.tipo !== 'ok') return
        setOptimistas((actual) => ({ ...actual, [id]: valor }))
        if (item.kind !== 'sheet') {
          const nuevos = await consultarTestimonios()
          if (nuevos.tipo === 'ok') setTestimonios(nuevos.datos)
        }
      })
      return
    }
    updateAdventure((current) => ({
      ...current,
      bookmarks: current.bookmarks.includes(id)
        ? current.bookmarks.filter((saved) => saved !== id)
        : [...current.bookmarks, id],
    }))
  }
  function openResource(resource: TravelResource) {
    if (!isUnlocked(resource)) return
    // Ajustes Central (7): un testimonio del servidor se abre en el visor y registra su vista.
    if (resource.servidor) void registrarVistaTestimonio(resource.id)
    setSelectedId(resource.id)
    updateAdventure((current) =>
      current.visits.includes(resource.id)
        ? current
        : { ...current, visits: [...current.visits, resource.id] },
    )
  }
  // «Limpiar filtros» deja la pestaña como está (ajuste mochila).
  const clear = () => {
    setQuery('')
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
    isUnlocked,
    esFavorita,
    favoritoPendiente: (id: string) => pendientes.includes(id),
    esNueva,
    sheets,
    voices,
    fichasObtenidas,
    gruposFichas: agruparFichas(fichasVisibles, (r) => r.ficha),
    fichasPendientes: sheets.length - fichasObtenidas.length,
    nuevas: fichasObtenidas.filter(esNueva).length,
    voces,
    vocesVisibles,
    vacio,
    sinResultados,
    casoVoz,
    centralAbierta,
    cityPoints,
    chooseKind,
    toggleFavorite,
    openResource,
    clear,
    consultarRequisito,
  }
}
