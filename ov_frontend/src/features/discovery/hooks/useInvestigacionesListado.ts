import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { pasoInvestigacion, sellosVitrina } from '@/lib/servidor/adaptadoresInvestigaciones'
import { cuentaActiva } from '@/store/servidor/cuenta'
import {
  cargarListaEntrevistas,
  reintentarListaEntrevistas,
  useListaEntrevistas,
} from '@/store/servidor/entrevistas'
import { alternarFavoritoEntrevista, cancelarInvestigacion } from '@/store/servidor/investigaciones'
import {
  reintentarSeccion,
  useInvestigacionesServidorSeccion,
  useLogrosServidor,
} from '@/store/servidor/secciones'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { FiltrosEntrevistas, OrdenEntrevistas, VistaEntrevistas } from '@/types/servidor'
import { mostrarAvisoInvestigacion } from '../store/avisoInvestigaciones'
import { avisarRechazoInvestigacion } from './cierreInvestigacion'

const ESPERA_BUSQUEDA = 300
const VISTAS: Record<string, VistaEntrevistas> = { salon: 'SALON', leyendas: 'LEYENDAS', mias: 'MIAS' }
export type Chip = 'favoritas' | 'no_vistas' | 'destacadas'

// F09 (api): el listado de Investigaciones. La vista va en la URL (`?vista=leyendas|mias`) para volver a ella
// desde un detalle; la búsqueda espera 300 ms; los chips y el orden no aplican a Mis investigaciones.
export function useInvestigacionesListado() {
  const seccion = useInvestigacionesServidorSeccion(true)
  // Los nombres de los sellos de la vitrina de los aliados salen de los logros propios.
  const logros = useLogrosServidor(true).datos
  const [params, setParams] = useSearchParams()
  const navegar = useNavigate()
  const vista = VISTAS[params.get('vista') ?? ''] ?? 'SALON'
  const [texto, setTexto] = useState('')
  const [buscar, setBuscar] = useState('')
  const [chips, setChips] = useState<Record<Chip, boolean>>({
    favoritas: false,
    no_vistas: false,
    destacadas: false,
  })
  const [orden, setOrden] = useState<OrdenEntrevistas>('RECIENTES')
  const [favoritosPendientes, setFavoritosPendientes] = useState<string[]>([])
  const [cancelando, setCancelando] = useState(false)
  useEffect(() => {
    const espera = setTimeout(() => setBuscar(texto.trim()), ESPERA_BUSQUEDA)
    return () => clearTimeout(espera)
  }, [texto])
  const filtros: FiltrosEntrevistas =
    vista === 'MIAS' ? { vista, buscar } : { vista, buscar, ...chips, orden }
  const lista = useListaEntrevistas('entrevistas', filtros, true)
  const datos = seccion.datos
  const enCurso = datos?.en_curso ?? null

  const elegirVista = (siguiente: VistaEntrevistas) => {
    const clave = Object.keys(VISTAS).find((k) => VISTAS[k] === siguiente)!
    setParams(siguiente === 'SALON' ? {} : { vista: clave }, { replace: true })
  }
  async function alternarFavorito(codigo: string, marcar: boolean) {
    if (favoritosPendientes.includes(codigo)) return
    setFavoritosPendientes((p) => [...p, codigo])
    const respuesta = await alternarFavoritoEntrevista(codigo, marcar)
    setFavoritosPendientes((p) => p.filter((c) => c !== codigo))
    if (respuesta.tipo === 'ok')
      mostrarAvisoInvestigacion(marcar ? 'Guardada en tus favoritas' : 'Quitada de tus favoritas')
    else mostrarAvisoInvestigacion('No se pudo guardar', mensajeErrorServidor(respuesta), true)
  }
  async function cancelar() {
    setCancelando(true)
    const respuesta = await cancelarInvestigacion()
    setCancelando(false)
    if (respuesta.tipo === 'ok' || respuesta.tipo === 'guardado_sin_refrescar') {
      mostrarAvisoInvestigacion('Investigación cancelada', 'Tu guion y lo que pensabas se borraron.')
      return true
    }
    await avisarRechazoInvestigacion(respuesta, 'No se pudo cancelar', (ruta) => void navegar(ruta))
    return respuesta.tipo === 'bloqueado'
  }
  return {
    cuenta: cuentaActiva(),
    seccion: { estado: seccion.estado, error: seccion.error, datos },
    reintentarSeccion: () => void reintentarSeccion('investigaciones'),
    enCurso,
    sellos: (codigos: string[]) => sellosVitrina(codigos, logros),
    pasoGuion: pasoInvestigacion(enCurso),
    vista,
    elegirVista,
    texto,
    buscarTexto: setTexto,
    chips,
    alternarChip: (chip: Chip) => setChips((c) => ({ ...c, [chip]: !c[chip] })),
    orden,
    setOrden,
    lista,
    buscando: !lista || lista.estado === 'cargando',
    cargandoMas: lista?.estado === 'mas',
    hayMas: !!lista && lista.estado === 'listo' && lista.items.length < lista.total,
    mostrarMas: () => void cargarListaEntrevistas('entrevistas', filtros, true),
    reintentar: () => void reintentarListaEntrevistas('entrevistas', filtros),
    favoritoPendiente: (codigo: string) => favoritosPendientes.includes(codigo),
    alternarFavorito,
    cancelando,
    cancelar,
  }
}
export type ModeloListado = ReturnType<typeof useInvestigacionesListado>
