import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { modoApi } from '@/config/env'
import { resultadoHelenaCompleto } from '@/lib/servidor/adaptadores'
import { useDiscovery } from '@/store/discoveryStore'
import { useExploration, toggleCareerInterest, toggleOccupationInterest } from '@/store/explorationStore'
import { mensajeErrorServidor, useEstadoServidor } from '@/store/servidor/sesion'
import { cargarRespuestasPartida } from '@/store/servidor/instrumentos'
import type { InstrumentPageId } from '@/types/discovery'
import type { ResultadoPublico } from '@/types/servidor'
import { ejemplosDimension } from '../data/dimensionExamples'
import { resultPages } from '../data/resultPages'
import { carrerasResultado, ocupacionesResultado } from '../lib/resultCatalog'
import { createPlanFromCareer, getOrderedPlans } from '../lib/plans'
import { filtrarPorAjuste, ordenarCarreras, resumirResultado } from '../lib/resultPage'
import { useHelenaPages } from './useHelenaPages'
import { modeloPartidaLlegada } from '../lib/partidaLlegada'
import type { FiltroBanda, VistaOcupaciones } from '../lib/resultadoIntereses'
import { useFavoritoServidor } from './useFavoritoServidor'

export function useResultPage(pagina: string | undefined, resultadoRecibido?: ResultadoPublico) {
  const libro = useHelenaPages()
  const servidor = useEstadoServidor()
  const discovery = useDiscovery()
  const exploration = useExploration()
  const favorito = useFavoritoServidor()
  const { search } = useLocation()
  // Ajuste resultados-intereses: en api, sin elección del estudiante, la guía arranca como dice el servidor.
  const [guiaElegida, setGuia] = useState<boolean | null>(() =>
    new URLSearchParams(search).get('guia') === '1' ? true : null,
  )
  const [resaltada, setResaltada] = useState<string | null>(null)
  useEffect(() => {
    if (new URLSearchParams(search).get('guia') === '1') setGuia(true)
  }, [pagina, search])
  const [vista, setVista] = useState<VistaOcupaciones>('lista')
  const [filtroBanda, setFiltroBanda] = useState<FiltroBanda>('TODAS')
  const [todas, setTodas] = useState(false)
  const [expandidas, setExpandidas] = useState<string[]>([])
  const [ajuste, setAjuste] = useState('Todas')
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const configuracion = resultPages[pagina as InstrumentPageId]
  const page = libro.pages.find((p) => p.id === pagina)
  // Ajuste de F03: con solo la partida revelada, sus respuestas ítem por ítem se piden al abrir la vista.
  const soloPartida =
    modoApi && configuracion?.tipoResultado === 'COMPARACION' && page?.state === 'revealed' && !page.conComparacion
  useEffect(() => {
    if (soloPartida) void cargarRespuestasPartida()
  }, [soloPartida])
  const remoto =
    resultadoRecibido ??
    (modoApi && configuracion?.tipoResultado === 'COINCIDENCIAS'
      ? (servidor.resultadoRiasec ?? undefined)
      : undefined)
  // F03: al recargar la vista, mientras el libro se lee del servidor (o si falló), no se vuelve al libro.
  if (modoApi && configuracion && page?.state !== 'revealed' && (libro.cargando || libro.errorConsulta))
    return {
      espera: { error: libro.errorConsulta, reintentar: () => libro.setIntento((i) => i + 1) },
    } as const
  // F03 (HU-094): partida y llegada tiene su propia vista, sin puntajes.
  if (configuracion?.tipoResultado === 'COMPARACION') {
    const modelo = page?.state === 'revealed' ? modeloPartidaLlegada(servidor.instrumentos, servidor.respuestasPartida) : null
    const respuestas = servidor.respuestasPartida
    return page && modelo
      ? ({
          comparacion: {
            page,
            modelo,
            // Solo partida: carga y error propios de la sección de ítems; las zonas se ven igual.
            cargandoItems: !modelo.completo && respuestas.estado !== 'listo' && respuestas.estado !== 'error',
            errorItems: modelo.completo ? '' : mensajeErrorServidor(respuestas.error),
            reintentarItems: () => void cargarRespuestasPartida(true),
            guia: !!guiaElegida,
            setGuia,
          },
        } as const)
      : null
  }
  const resultado =
    remoto && configuracion ? resultadoHelenaCompleto(remoto, configuracion.tipoResultado) : page?.result
  if (!configuracion || page?.state !== 'revealed' || !resultado) return null
  const resumen = resumirResultado(configuracion.tipoResultado, resultado, {
    perfilPlano: remoto?.perfil_plano ?? page.perfilPlano,
    hayEmpate: remoto?.codigo_interes?.hay_empate,
    // Ajuste carga-instrumentos: en api los ejemplos llegan del servidor; el mapa fijo queda para local.
    ejemplos: modoApi ? undefined : ejemplosDimension,
    puntajeVisual: modoApi,
    pagina: page.id,
  })
  const guia = guiaElegida ?? (modoApi && resumen.guiaAbierta)
  // Ajuste resultados-intereses: en api, el resultado de intereses muestra ocupaciones afines y familias.
  const intereses =
    modoApi && remoto && !remoto.perfil_plano && configuracion.tipoResultado === 'COINCIDENCIAS'
      ? {
          codigo: remoto.codigo_interes?.codigo ?? '',
          ocupaciones: remoto.ocupaciones ?? [],
          porArea: remoto.por_area ?? [],
          familias: remoto.familias ?? [],
          pocoMarcado: !!remoto.perfil_poco_marcado,
          vista,
          elegirVista: setVista,
          filtro: filtroBanda,
          filtrar: (filtro: FiltroBanda) => {
            setFiltroBanda(filtro)
            setTodas(false)
          },
          todas,
          mostrarTodas: () => setTodas(true),
        }
      : null
  // F06 (HU-026): en api, los favoritos del propio resultado son los del servidor y el corazón escribe allí;
  // con el catálogo cerrado no hay corazones.
  const favoritosServidor = modoApi && !resultadoRecibido
  const catalogoAbierto =
    !favoritosServidor || servidor.secciones.datos?.find((s) => s.codigo === 'CATALOGO')?.estado !== 'BLOQUEADA'
  // Ajuste resultados-intereses: el resultado del servidor no lleva favoritos.
  const ocupacionFavorita = (_codigo: string) => false
  const carreraFavorita = (codigo: string) =>
    !favoritosServidor && exploration.careerInterestIds.includes(codigo)
  const ocupaciones = resumen.secciones.ocupaciones
    ? ocupacionesResultado(
        remoto,
        modoApi || !!resultadoRecibido,
        discovery.revealedPages,
        resumen.protagonistas.map((d) => d.code),
        favoritosServidor ? [] : exploration.profiles.filter((p) => p.interested).map((p) => p.occupationId),
      )
    : []
  const elegida = ocupaciones.find((o) => o.clave === seleccion)
  const planes = getOrderedPlans(exploration.decisionSheets, discovery.planOrder)
  const cantidadPlanes = exploration.decisionSheets.filter((p) => p.status !== 'archived').length
  const carreras = resumen.secciones.carreras
    ? ordenarCarreras(carrerasResultado(remoto, modoApi || !!resultadoRecibido, ocupaciones))
        .filter((c) => !elegida || c.via.some((o) => o.codigo_onet === elegida.clave))
        .map((c) => {
          const indicePlan = planes.findIndex((p) => p.sourceId === c.codigo)
          return {
            ...c,
            favorita: carreraFavorita(c.codigo),
            plan: indicePlan >= 0 ? ['A', 'B', 'C'][indicePlan] : undefined,
          }
        })
    : []
  return {
    page: { ...page, demo: !remoto && page.demo },
    resumen,
    errorResultado: libro.errorResultado,
    errorConsulta: libro.errorConsulta,
    reintentar: () => libro.setIntento((i) => i + 1),
    // F03 (HU-095): en api, el perfil plano se repite desde aquí.
    reinicio: page.reinicioApi
      ? {
          texto: page.textoPlano,
          puede: !!page.puedeReiniciar,
          reiniciar: libro.reiniciarIntereses,
          ocupado: libro.revelando,
          error: libro.errorAccion,
        }
      : undefined,
    guia,
    setGuia,
    resaltada,
    // Pulsar una letra o una barra abre la guía en esa tarjeta.
    abrirGuia: (codigo?: string) => {
      setGuia(true)
      setResaltada(codigo ?? null)
    },
    intereses,
    expandidas,
    alternarDimension: (codigo: string) =>
      setExpandidas((actual) =>
        actual.includes(codigo) ? actual.filter((c) => c !== codigo) : [...actual, codigo],
      ),
    ajuste,
    setAjuste,
    ocupaciones: filtrarPorAjuste(ocupaciones, ajuste),
    mostrarOcupaciones: resumen.secciones.ocupaciones && ocupaciones.length > 0,
    mostrarCarreras: resumen.secciones.carreras && (modoApi || ocupaciones.length > 0),
    elegida,
    setSeleccion,
    carreras,
    siguientePlan: cantidadPlanes < 3 ? ['A', 'B', 'C'][cantidadPlanes] : undefined,
    guardarOcupacion: !catalogoAbierto
      ? undefined
      : favoritosServidor
        ? (codigo: string) => favorito.alternar('OCUPACION', codigo, !ocupacionFavorita(codigo))
        : toggleOccupationInterest,
    guardarCarrera: !catalogoAbierto
      ? undefined
      : favoritosServidor
        ? (codigo: string) => favorito.alternar('CARRERA', codigo, !carreraFavorita(codigo))
        : toggleCareerInterest,
    ocupacionPendiente: (codigo: string) => favorito.pendiente('OCUPACION', codigo),
    carreraPendiente: (codigo: string) => favorito.pendiente('CARRERA', codigo),
    avisoFavorito: favorito.aviso,
    cerrarAvisoFavorito: favorito.cerrarAviso,
    crearPlan: createPlanFromCareer,
  }
}
