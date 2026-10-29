import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { datosSesion } from '@/store/accesoStore'
import {
  cargarListaEntrevistas,
  contarConReportes,
  reintentarListaEntrevistas,
  useListaEntrevistas,
  useRevisionEntrevistas,
} from '@/store/servidor/entrevistas'
import type { EstadoPublicacion, FiltrosPublicaciones } from '@/types/servidor'

const ESPERA_BUSQUEDA = 300
// El nombre de uno de sus salones (de la sesión); otro salón, su código.
export const nombreSalon = (codigo: string | null) =>
  datosSesion().salones.find((s) => s.codigo === codigo)?.nombre ?? codigo ?? '—'

// F09 (api, boceto 12): la tabla de publicaciones de la orientadora, con buscador, salón, estado y «Con
// reportes». El salón va en la URL (`?salon=`), como en local; la tabla se revalida al abrirla.
export function usePublicacionesServidor() {
  const [params, setParams] = useSearchParams()
  const salon = params.get('salon') ?? ''
  const [texto, setTexto] = useState('')
  const [buscar, setBuscar] = useState('')
  const [estado, setEstado] = useState<EstadoPublicacion | ''>('')
  const [conReportes, setConReportes] = useState(false)
  const [reportadas, setReportadas] = useState<number | null>(null)
  const revision = useRevisionEntrevistas()
  useEffect(() => {
    const espera = setTimeout(() => setBuscar(texto.trim()), ESPERA_BUSQUEDA)
    return () => clearTimeout(espera)
  }, [texto])
  useEffect(() => {
    let vigente = true
    void contarConReportes().then((n) => vigente && setReportadas(n))
    return () => {
      vigente = false
    }
  }, [revision])
  const filtros: FiltrosPublicaciones = {
    salon: salon || undefined,
    estado: estado || undefined,
    con_reportes: conReportes,
    buscar,
  }
  const lista = useListaEntrevistas('publicaciones', filtros, true)
  return {
    salones: datosSesion().salones,
    salon,
    elegirSalon: (codigo: string) => setParams(codigo ? { salon: codigo } : {}, { replace: true }),
    texto,
    buscarTexto: setTexto,
    estado,
    setEstado,
    conReportes,
    setConReportes,
    reportadas,
    lista,
    cargando: !lista || lista.estado === 'cargando',
    cargandoMas: lista?.estado === 'mas',
    hayMas: !!lista && lista.estado === 'listo' && lista.items.length < lista.total,
    mostrarMas: () => void cargarListaEntrevistas('publicaciones', filtros, true),
    reintentar: () => void reintentarListaEntrevistas('publicaciones', filtros),
    nombreSalon,
  }
}
export type ModeloPublicaciones = ReturnType<typeof usePublicacionesServidor>
