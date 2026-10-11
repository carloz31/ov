import { useEffect, useState } from 'react'

import { useJourney } from '@/store/journeyStore'

import { useDiscovery, updateDiscovery, revelarPaginaApi, paginasReveladasApi } from '@/store/discoveryStore'

import type { InstrumentPageId } from '@/types/discovery'
import { getHelenaPages, getHelenaPagesApi } from '@/features/discovery/lib/helenaPages'
import { modoApi } from '@/config/env'
import { mensajeErrorServidor, useEstadoServidor } from '@/store/servidor/sesion'
import { cargarResultadoRiasec } from '@/store/servidor/resultado'
import { consultarAvanceInstrumentos, consultarProgreso } from '@/store/servidor/consultas'
import { ciudadDisponible, textoRequisito, paginaInteresesServidor } from '@/lib/servidor/adaptadores'

import { resultPages } from '../data/resultPages'
import { resumenPagina } from '../lib/resultPage'
import { carrerasResultado, ocupacionesResultado } from '../lib/resultCatalog'

export function useHelenaPages() {
  const journey = useJourney(),
    discovery = useDiscovery(),
    servidor = useEstadoServidor()
  const pages = modoApi
    ? getHelenaPagesApi(
        paginaInteresesServidor(
          servidor.actividades.datos,
          servidor.resultadoRiasec,
          discovery,
          servidor.resumen.datos?.cuenta.codigo ?? null,
        ),
        paginasReveladasApi(
          discovery,
          servidor.resumen.datos?.cuenta.codigo,
          servidor.resultadoRiasec?.calculado_en,
        ),
      )
    : getHelenaPages(journey, discovery)
  const [requisito, setRequisito] = useState('Consultando el avance de tus encuentros…')
  const [errorConsulta, setErrorConsulta] = useState('')
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    if (!modoApi) return
    let vigente = true
    void (async () => {
      const resultado = await cargarResultadoRiasec()
      if (!vigente) return
      if (resultado.tipo !== 'ok') {
        setErrorConsulta(mensajeErrorServidor(resultado))
        return
      }
      if (resultado.datos) {
        setErrorConsulta('')
        return
      }
      if (!ciudadDisponible(servidor.actividades.datos)) {
        const progreso = await consultarProgreso('BLOQUE', 'CIUDAD')
        if (!vigente) return
        if (progreso.tipo === 'ok') {
          setRequisito(textoRequisito(progreso.datos, servidor.actividades.datos))
          setErrorConsulta('')
        } else setErrorConsulta(mensajeErrorServidor(progreso))
      } else {
        const avance = await consultarAvanceInstrumentos()
        if (!vigente) return
        if (avance.tipo !== 'ok') {
          setErrorConsulta(mensajeErrorServidor(avance))
          return
        }
        const aplicacion = avance.datos
          .find((i) => i.instrumento === 'TEST-RIASEC')
          ?.aplicaciones.find((a) => a.aplicacion === 'APL-RIASEC')
        const primera = aplicacion?.actividades.faltantes[0]
        setRequisito(
          primera
            ? `Conversa con Mara: interacción ${Number(primera.slice(-2))} de 14.`
            : 'Elena está preparando tu resultado.',
        )
        setErrorConsulta('')
      }
    })()
    return () => {
      vigente = false
    }
  }, [servidor.actividades.datos, intento])
  const [opening, setOpening] = useState<InstrumentPageId>()
  useEffect(() => {
    if (!opening) return
    const timer = setTimeout(() => setOpening(undefined), 400)
    return () => clearTimeout(timer)
  }, [opening])
  function revelarPagina(id: InstrumentPageId) {
    if (modoApi) {
      if (!servidor.resultadoRiasec || !servidor.actividades.datos) return
      revelarPaginaApi(servidor.resumen.datos!.cuenta.codigo, servidor.resultadoRiasec.calculado_en, id)
      setOpening(id)
      return
    }
    setOpening(id)
    updateDiscovery((s) =>
      s.revealedPages.includes(id) ? s : { ...s, revealedPages: [...s.revealedPages, id] },
    )
  }
  return {
    requisito,
    errorConsulta,
    setErrorConsulta,
    setIntento,
    opening,
    revelarPagina,
    errorResultado: servidor.errorResultado
      ? { mensaje: mensajeErrorServidor(servidor.errorResultado) }
      : null,
    pages: pages.map((p) => {
      const tipoResultado = resultPages[p.id]?.tipoResultado
      const coincidencias = tipoResultado === 'COINCIDENCIAS'
      const remoto = modoApi && coincidencias ? servidor.resultadoRiasec : undefined
      const ocupaciones =
        !modoApi && coincidencias && !p.perfilPlano && p.state === 'revealed'
          ? ocupacionesResultado(
              undefined,
              false,
              discovery.revealedPages,
              p.result?.areas.map((d) => d.code) ?? [],
              [],
            )
          : []
      return {
        ...p,
        tipoResultado,
        etiquetaDemo: modoApi ? 'Disponible en una próxima iteración · ' : 'Demostración · ',
        antetitulo: `Página ${p.numeral} · ${p.state === 'sealed' ? 'sellada' : p.state === 'ready' ? 'lista para revelar' : 'descifrada'}`,
        avisoDemo: `${modoApi ? 'Disponible en una próxima iteración · ' : 'Demostración · '}${p.state === 'sealed' ? 'Este instrumento aún no está disponible.' : 'Este ejemplo no es tu resultado personal.'}`,
        textoSello: `Helena terminó de leer tus respuestas. Rompe el sello para descubrir ${coincidencias ? 'tu código de interés' : 'tus inteligencias más desarrolladas'}.`,
        mostrarRequisito: modoApi && coincidencias,
        revelacionBloqueada: modoApi && !servidor.resultadoRiasec,
        resumen: resumenPagina(
          { ...p, tipoResultado },
          p.result
            ? {
                ...p.result,
                coincidencias: modoApi ? remoto?.coincidencias : ocupaciones,
                carreras_recomendadas: modoApi
                  ? remoto?.carreras_recomendadas
                  : carrerasResultado(undefined, false, ocupaciones),
              }
            : undefined,
        ),
      }
    }),
  }
}
