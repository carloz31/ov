import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useJourney } from '@/store/journeyStore'

import { useDiscovery, updateDiscovery, revelarPaginaApi, paginasReveladasApi } from '@/store/discoveryStore'

import type { InstrumentPageId } from '@/types/discovery'
import { getHelenaPages } from '@/features/discovery/lib/helenaPages'
import { modoApi } from '@/config/env'
import { mensajeErrorServidor, obtenerEstadoServidor, useEstadoServidor } from '@/store/servidor/sesion'
import { cargarInstrumentos, reiniciarInstrumento, revelarResultado } from '@/store/servidor/instrumentos'
import { consultarProgreso } from '@/store/servidor/consultas'
import { ciudadDisponible, textoRequisito } from '@/lib/servidor/adaptadores'
import { APLICACION_RIASEC } from '@/lib/servidor/adaptadoresInstrumentos'

import { resultPages } from '../data/resultPages'
import { resumenPagina } from '../lib/resultPage'
import { carrerasResultado, ocupacionesResultado } from '../lib/resultCatalog'
import { paginasLibroApi, resumenPartidaLlegada, type ExtrasPaginaApi } from '../lib/helenaPagesApi'

// F03: en api, el perfil plano invita a repetir las misiones (HU-095); con el reinicio usado, ya no.
const TEXTO_PLANO_USADO = 'Tus respuestas no distinguen un tipo de interés.'
const TEXTO_PLANO_API = `${TEXTO_PLANO_USADO} Puedes volver a hacer las misiones una vez.`

export function useHelenaPages() {
  const journey = useJourney(),
    discovery = useDiscovery(),
    servidor = useEstadoServidor(),
    navigate = useNavigate()
  const cuenta = servidor.resumen.datos?.cuenta.codigo
  const libro = servidor.instrumentos
  const pages: (ReturnType<typeof getHelenaPages>[number] & Partial<ExtrasPaginaApi>)[] = modoApi
    ? paginasLibroApi(
        servidor.actividades.datos,
        libro,
        paginasReveladasApi(discovery, cuenta, servidor.resultadoRiasec?.calculado_en),
      )
    : getHelenaPages(journey, discovery)
  const [requisitoCiudad, setRequisitoCiudad] = useState('')
  const [errorConsulta, setErrorConsulta] = useState('')
  const [intento, setIntento] = useState(0)
  const [revelando, setRevelando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')
  useEffect(() => {
    if (!modoApi) return
    let vigente = true
    void (async () => {
      const respuesta = await cargarInstrumentos(intento > 0)
      if (!vigente) return
      if (respuesta.tipo !== 'ok') {
        setErrorConsulta(mensajeErrorServidor(respuesta))
        return
      }
      setErrorConsulta('')
      // Con la Ciudad cerrada, intereses espera lo que pide la Ciudad.
      if (ciudadDisponible(servidor.actividades.datos)) return setRequisitoCiudad('')
      const progreso = await consultarProgreso('BLOQUE', 'CIUDAD')
      if (!vigente) return
      if (progreso.tipo === 'ok') setRequisitoCiudad(textoRequisito(progreso.datos, servidor.actividades.datos))
      else setErrorConsulta(mensajeErrorServidor(progreso))
    })()
    return () => {
      vigente = false
    }
  }, [servidor.actividades.datos, intento, cuenta])
  const [opening, setOpening] = useState<InstrumentPageId>()
  useEffect(() => {
    if (!opening) return
    const timer = setTimeout(() => setOpening(undefined), 400)
    return () => clearTimeout(timer)
  }, [opening])
  async function accion(tarea: () => Promise<{ tipo: string }>, alTerminar: () => void) {
    setRevelando(true)
    setErrorAccion('')
    const respuesta = await tarea()
    setRevelando(false)
    if (respuesta.tipo === 'ok' || respuesta.tipo === 'guardado_sin_refrescar') alTerminar()
    else setErrorAccion(mensajeErrorServidor(respuesta as Parameters<typeof mensajeErrorServidor>[0]))
  }
  function revelarPagina(id: InstrumentPageId) {
    const sello = pages.find((p) => p.id === id)?.aplicacionSello
    if (modoApi && sello) {
      void accion(
        () => revelarResultado(sello.instrumento, sello.aplicacion),
        () => setOpening(id),
      )
      return
    }
    if (modoApi) {
      // Páginas de ejemplo: su revelado sigue siendo local.
      if (!servidor.resultadoRiasec || !cuenta) return
      revelarPaginaApi(cuenta, servidor.resultadoRiasec.calculado_en, id)
      setOpening(id)
      return
    }
    setOpening(id)
    updateDiscovery((s) =>
      s.revealedPages.includes(id) ? s : { ...s, revealedPages: [...s.revealedPages, id] },
    )
  }
  // HU-095: anula el resultado plano y lleva a la primera misión de intereses.
  function reiniciarIntereses() {
    void accion(
      () => reiniciarInstrumento(APLICACION_RIASEC.instrumento, APLICACION_RIASEC.aplicacion),
      () => {
        // Tras el reinicio, el libro ya se volvió a leer: la misión que falta es la primera de intereses.
        const estado = obtenerEstadoServidor()
        const href = paginasLibroApi(estado.actividades.datos, estado.instrumentos, []).find(
          (p) => p.id === 'intereses',
        )?.faltante?.href
        navigate(href ?? '/student/exploration')
      },
    )
  }
  return {
    errorConsulta,
    setErrorConsulta,
    setIntento,
    opening,
    revelarPagina,
    reiniciarIntereses,
    revelando,
    errorAccion,
    cargando: modoApi && (libro.estado === 'sin_cargar' || libro.estado === 'cargando'),
    errorResultado: servidor.errorResultado
      ? { mensaje: mensajeErrorServidor(servidor.errorResultado) }
      : null,
    pages: pages.map((p) => {
      const tipoResultado = resultPages[p.id]?.tipoResultado
      const coincidencias = tipoResultado === 'COINCIDENCIAS'
      const comparacion = tipoResultado === 'COMPARACION'
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
      const servidorPagina = modoApi && (coincidencias || comparacion)
      // En api, la misión que falta (o, en intereses con la Ciudad cerrada, lo que pide la Ciudad).
      const requisito =
        coincidencias && requisitoCiudad
          ? requisitoCiudad
          : p.faltante
            ? `Completa: ${p.faltante.titulo}`
            : ''
      const textoPlano = p.puedeReiniciar ? TEXTO_PLANO_API : TEXTO_PLANO_USADO
      const resumen = comparacion
        ? resumenPartidaLlegada(libro)
        : resumenPagina(
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
            modoApi ? { textoPlano } : undefined,
          )
      return {
        ...p,
        tipoResultado,
        activityHref: servidorPagina ? (p.faltante?.href ?? p.activityHref) : p.activityHref,
        etiquetaDemo: modoApi ? 'Disponible en una próxima iteración · ' : 'Demostración · ',
        antetitulo: `Página ${p.numeral} · ${p.state === 'sealed' ? 'sellada' : p.state === 'ready' ? 'lista para revelar' : 'descifrada'}`,
        avisoDemo: `${modoApi ? 'Disponible en una próxima iteración · ' : 'Demostración · '}${p.state === 'sealed' ? 'Este instrumento aún no está disponible.' : 'Este ejemplo no es tu resultado personal.'}`,
        textoSello: comparacion
          ? 'Helena terminó de leer tus respuestas. Rompe el sello para descubrir tu punto de partida.'
          : `Helena terminó de leer tus respuestas. Rompe el sello para descubrir ${coincidencias ? 'tu código de interés' : 'tus inteligencias más desarrolladas'}.`,
        mostrarRequisito: servidorPagina && !!requisito,
        requisito,
        revelacionBloqueada: modoApi && (servidorPagina ? !p.aplicacionSello : !servidor.resultadoRiasec),
        // HU-095: solo en api, con perfil plano y el reinicio sin usar.
        reinicioApi: modoApi && coincidencias,
        textoPlano,
        resumen,
      }
    }),
  }
}
