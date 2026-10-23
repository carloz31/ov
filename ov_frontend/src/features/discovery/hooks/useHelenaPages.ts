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
import { ADENTRO_PARTIDA_SIN_PARTES, TEXTO_LLEGADA_LISTA, TEXTOS_REVELADO } from '../data/revealTexts'
import { resumenPagina } from '../lib/resultPage'
import { carrerasResultado, ocupacionesResultado } from '../lib/resultCatalog'
import { paginasLibroApi, type ExtrasPaginaApi } from '../lib/helenaPagesApi'
import { modeloPartidaLlegada } from '../lib/partidaLlegada'
import type { ContenidoPagina } from '../types'

// F03: en api, el perfil plano invita a repetir las misiones (HU-095); con el reinicio usado, ya no.
const TEXTO_PLANO_USADO = 'Tus respuestas no distinguen un tipo de interés.'
const TEXTO_PLANO_API = `${TEXTO_PLANO_USADO} Puedes volver a hacer las misiones una vez.`

// Ajuste de F03: lo que dice la tarjeta lista para revelar (o con la llegada lista).
function textosRevelado(id: InstrumentPageId, llegada: boolean, partes: number | null | undefined) {
  const textos = TEXTOS_REVELADO[llegada ? 'llegada' : id]
  return {
    llegada,
    texto: llegada
      ? TEXTO_LLEGADA_LISTA
      : `Helena terminó de leer tus respuestas. Rompe el sello para descubrir ${textos.descubrir}.`,
    adentro: !textos.adentro.includes('{partes}')
      ? textos.adentro
      : partes
        ? textos.adentro.replace('{partes}', String(partes))
        : ADENTRO_PARTIDA_SIN_PARTES,
  }
}

// Ajuste de F03: «En tu resultado completo» de partida y llegada, según su estado.
const CONTENIDOS_PARTIDA_LLEGADA: Record<'partida' | 'completo', ContenidoPagina[]> = {
  partida: [
    { texto: 'Tus respuestas, parte por parte', icono: 'perfil' },
    { texto: 'Qué significa cada zona', icono: 'ideas' },
  ],
  completo: [
    { texto: 'Qué cambió en cada respuesta', icono: 'perfil' },
    { texto: 'Lo que trabajaste en cada parte del camino', icono: 'ideas' },
  ],
}

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
  // Ajuste de F03: la página recién revelada hace entrar su contenido escalonado tras el sello.
  const [entrando, setEntrando] = useState<InstrumentPageId>()
  useEffect(() => {
    if (!opening) return
    const timer = setTimeout(() => setOpening(undefined), 400)
    return () => clearTimeout(timer)
  }, [opening])
  const abrir = (id: InstrumentPageId) => {
    setOpening(id)
    setEntrando(id)
  }
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
        () => abrir(id),
      )
      return
    }
    if (modoApi) {
      // Páginas de ejemplo: su revelado sigue siendo local.
      if (!servidor.resultadoRiasec || !cuenta) return
      revelarPaginaApi(cuenta, servidor.resultadoRiasec.calculado_en, id)
      abrir(id)
      return
    }
    abrir(id)
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
    entrando,
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
      const partidaLlegada = comparacion && modoApi ? modeloPartidaLlegada(libro) : null
      const resumen = comparacion
        ? {
            rotulo: '',
            filas: [],
            cierre: '',
            contenidos: partidaLlegada
              ? CONTENIDOS_PARTIDA_LLEGADA[partidaLlegada.completo ? 'completo' : 'partida']
              : [],
          }
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
        antetitulo: p.selloLlegada
          ? `Página ${p.numeral} · tu llegada está lista`
          : `Página ${p.numeral} · ${p.state === 'sealed' ? 'sellada' : p.state === 'ready' ? 'lista para revelar' : 'descifrada'}${partidaLlegada && !partidaLlegada.completo ? ' · falta la llegada' : ''}`,
        avisoDemo: `${modoApi ? 'Disponible en una próxima iteración · ' : 'Demostración · '}${p.state === 'sealed' ? 'Este instrumento aún no está disponible.' : 'Este ejemplo no es tu resultado personal.'}`,
        revelado: textosRevelado(p.id, !!p.selloLlegada, libro.partesPartida),
        mostrarRequisito: servidorPagina && !!requisito,
        requisito,
        revelacionBloqueada: modoApi && (servidorPagina ? !p.aplicacionSello : !servidor.resultadoRiasec),
        // HU-095: solo en api, con perfil plano y el reinicio sin usar.
        reinicioApi: modoApi && coincidencias,
        textoPlano,
        resumen,
        // Ajuste de F03: la tarjeta de partida y llegada pinta sus zonas con este modelo.
        partidaLlegada,
      }
    }),
  }
}
