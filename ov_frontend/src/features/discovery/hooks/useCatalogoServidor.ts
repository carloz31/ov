import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { modoApi } from '@/config/env'
import {
  cargarLista,
  reintentarLista,
  useListaCatalogo,
  useOpcionesCatalogo,
  useTotalDominio,
  type ClaseCatalogo,
  type FiltrosCatalogo,
} from '@/store/servidor/catalogo'
import { cargarResultadoRiasec } from '@/store/servidor/resultado'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { alternarLetra } from '@/lib/servidor/adaptadoresCatalogo'
import type { TipoFavorito } from '@/types/servidor'
import {
  cambiarFiltros,
  escribirFiltros,
  leerFiltros,
  letrasAfines,
  recordarBusqueda,
  type FiltrosUrl,
  type SeccionCatalogo,
} from '../lib/filtrosCatalogo'
import { useFavoritoServidor } from './useFavoritoServidor'

export type { SeccionCatalogo } from '../lib/filtrosCatalogo'
export const claseDeSeccion: Record<SeccionCatalogo, ClaseCatalogo> = {
  professions: 'ocupaciones',
  careers: 'carreras',
  institutions: 'instituciones',
}
export const tipoFavoritoDe: Record<ClaseCatalogo, TipoFavorito> = {
  carreras: 'CARRERA',
  ocupaciones: 'OCUPACION',
  instituciones: 'INSTITUCION',
}

// F06: en api, el catálogo, sus detalles y sus favoritos salen del servidor. En local, todo sigue como antes.
export function useCatalogoDelServidor() {
  return { catalogoDelServidor: modoApi }
}

// Ajuste catalogo-datos-reales (F6a): el texto espera 300 ms tras la última tecla y los demás filtros, 400 ms tras
// el último cambio (pulsar R, I y C pide una sola vez «RIC»).
export const ESPERA_BUSQUEDA = 300
export const ESPERA_FILTROS = 400

const sinBuscar = (clave: string) => {
  const parametros = new URLSearchParams(clave)
  parametros.delete('buscar')
  return parametros.toString()
}

// Los filtros de la URL como los pide el servidor: «afines» se traduce a las letras del resultado.
function filtrosApi(filtros: FiltrosUrl, afines: string): FiltrosCatalogo {
  const { afines: conAfines, favoritos, riasec, ...resto } = filtros
  return { ...resto, riasec: conAfines ? afines || undefined : riasec, favoritos: favoritos === '1' }
}

// La lista de la pestaña a la vista, con sus filtros en la URL, la espera, «Mostrar más» y los favoritos.
export function useCatalogoServidor(seccion: SeccionCatalogo) {
  const clase = claseDeSeccion[seccion]
  const [parametros, setParametros] = useSearchParams()
  const filtros = leerFiltros(seccion, parametros)
  const clave = escribirFiltros(seccion, filtros).toString()
  const servidor = useEstadoServidor()
  const afines = letrasAfines(servidor.resultadoRiasec?.codigo_interes?.codigo)
  const [texto, setTexto] = useState(filtros.buscar ?? '')
  const escrito = useRef(filtros.buscar ?? '')
  const [consultada, setConsultada] = useState(clave)

  // Cada cambio se calcula sobre la última URL escrita, así que dos pulsaciones antes de volver a pintar no se
  // pisan.
  const ultima = useRef(parametros)
  ultima.current = parametros
  const cambiar = (cambios: FiltrosUrl | ((actuales: FiltrosUrl) => FiltrosUrl)) => {
    const actuales = leerFiltros(seccion, ultima.current)
    const nuevos = escribirFiltros(
      seccion,
      cambiarFiltros(actuales, typeof cambios === 'function' ? cambios(actuales) : cambios),
    )
    ultima.current = nuevos
    setParametros(nuevos, { replace: true })
  }

  useEffect(() => {
    if (seccion !== 'institutions' && servidor.estadoResultado === 'sin_cargar') void cargarResultadoRiasec()
  }, [seccion, servidor.estadoResultado])
  useEffect(() => recordarBusqueda(seccion, clave), [seccion, clave])
  // La URL cambió desde fuera (atrás, un enlace filtrado): el campo de búsqueda la sigue.
  useEffect(() => {
    if ((filtros.buscar ?? '') === escrito.current) return
    escrito.current = filtros.buscar ?? ''
    setTexto(filtros.buscar ?? '')
  }, [filtros.buscar])
  useEffect(() => {
    if (texto.trim() === escrito.current) return
    const espera = setTimeout(() => {
      escrito.current = texto.trim()
      cambiar({ buscar: texto.trim() })
    }, ESPERA_BUSQUEDA)
    return () => clearTimeout(espera)
    // `cambiar` lee la URL al aplicarse; no hace falta en las dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto])
  useEffect(() => {
    if (clave === consultada) return
    // El texto ya esperó al escribirse; los demás filtros esperan aquí.
    const espera = setTimeout(
      () => setConsultada(clave),
      sinBuscar(clave) === sinBuscar(consultada) ? 0 : ESPERA_FILTROS,
    )
    return () => clearTimeout(espera)
  }, [clave, consultada])

  const consulta = filtrosApi(leerFiltros(seccion, new URLSearchParams(consultada)), afines)
  const lista = useListaCatalogo(clase, consulta, true)
  const totalDominio = useTotalDominio(clase)
  const opciones = useOpcionesCatalogo(true)
  const favorito = useFavoritoServidor()
  const letras = filtros.afines ? afines : (filtros.riasec ?? '')
  // Filtros activos: las letras y «afines» cuentan como uno (los intereses); la búsqueda y «Mis favoritos», también.
  const activos = new Set(Object.keys(filtros).map((nombre) => (nombre === 'afines' ? 'riasec' : nombre))).size
  return {
    clase,
    filtros,
    texto,
    letras,
    afinesDisponibles: !!afines,
    opciones,
    lista,
    totalDominio,
    buscando: clave !== consultada || !lista || lista.estado === 'cargando',
    cargandoMas: lista?.estado === 'mas',
    sinResultados: clave === consultada && lista?.estado === 'listo' && lista.items.length === 0,
    hayMas: !!lista && lista.estado === 'listo' && lista.items.length < lista.total,
    activos,
    buscar: setTexto,
    cambiar,
    // Limpia solo la pestaña activa y pide su lista de inmediato, sin esperar.
    limpiar: () => {
      escrito.current = ''
      setTexto('')
      ultima.current = new URLSearchParams()
      setParametros(ultima.current, { replace: true })
      setConsultada('')
    },
    alternarLetra: (letra: string) =>
      cambiar((f) => ({ riasec: alternarLetra(f.afines ? afines : (f.riasec ?? ''), letra) })),
    alternarAfines: () => cambiar((f) => ({ afines: f.afines ? '' : '1' })),
    alternarFavoritos: () => cambiar((f) => ({ favoritos: f.favoritos ? '' : '1' })),
    mostrarMas: () => void cargarLista(clase, consulta, true),
    reintentar: () => void reintentarLista(clase, consulta),
    favorito: {
      ...favorito,
      alternar: (codigo: string, marcar: boolean) => favorito.alternar(tipoFavoritoDe[clase], codigo, marcar),
      pendiente: (codigo: string) => favorito.pendiente(tipoFavoritoDe[clase], codigo),
    },
  }
}
