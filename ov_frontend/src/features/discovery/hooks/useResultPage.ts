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

export function useResultPage(pagina: string | undefined, resultadoRecibido?: ResultadoPublico) {
  const libro = useHelenaPages()
  const servidor = useEstadoServidor()
  const discovery = useDiscovery()
  const exploration = useExploration()
  const { search } = useLocation()
  const [guia, setGuia] = useState(() => new URLSearchParams(search).get('guia') === '1')
  useEffect(() => {
    if (new URLSearchParams(search).get('guia') === '1') setGuia(true)
  }, [pagina, search])
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
            guia,
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
    ejemplos: ejemplosDimension,
  })
  const ocupaciones = resumen.secciones.ocupaciones
    ? ocupacionesResultado(
        remoto,
        modoApi || !!resultadoRecibido,
        discovery.revealedPages,
        resumen.protagonistas.map((d) => d.code),
        exploration.profiles.filter((p) => p.interested).map((p) => p.occupationId),
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
            favorita: exploration.careerInterestIds.includes(c.codigo),
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
    guardarOcupacion: toggleOccupationInterest,
    guardarCarrera: toggleCareerInterest,
    crearPlan: createPlanFromCareer,
  }
}
