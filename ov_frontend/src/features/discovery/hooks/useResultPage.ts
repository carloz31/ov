import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { modoApi } from '@/config/env'
import { resultadoHelenaCompleto } from '@/lib/servidor/adaptadores'
import { useDiscovery } from '@/store/discoveryStore'
import { useExploration, toggleCareerInterest, toggleOccupationInterest } from '@/store/explorationStore'
import { useEstadoServidor } from '@/store/servidor/sesion'
import type { InstrumentPageId } from '@/types/discovery'
import type { ResultadoPublico } from '@/types/servidor'
import { ejemplosDimension } from '../data/dimensionExamples'
import { resultPages } from '../data/resultPages'
import { carrerasResultado, ocupacionesResultado } from '../lib/resultCatalog'
import { createPlanFromCareer, getOrderedPlans } from '../lib/plans'
import { filtrarPorAjuste, ordenarCarreras, resumirResultado } from '../lib/resultPage'
import { useHelenaPages } from './useHelenaPages'

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
  const remoto =
    resultadoRecibido ??
    (modoApi && configuracion?.tipoResultado === 'COINCIDENCIAS'
      ? (servidor.resultadoRiasec ?? undefined)
      : undefined)
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
