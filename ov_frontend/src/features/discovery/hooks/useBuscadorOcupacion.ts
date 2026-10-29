import { useEffect, useRef, useState } from 'react'
import { useOpcionesCatalogo } from '@/store/servidor/catalogo'
import { buscarOcupaciones } from '@/store/servidor/investigaciones'
import type { OcupacionResumen } from '@/types/servidor'

const ESPERA = 500
export type EstadoBuscador = 'inactivo' | 'escribiendo' | 'listo' | 'sin_resultados' | 'error'

// F09 (boceto 09): el buscador de ocupación del paso 1. Espera medio segundo, trae hasta 8 del catálogo con el
// nombre de su grupo, se navega con flechas y Enter, y un error se reintenta.
export function useBuscadorOcupacion(onElegir: (ocupacion: { codigo: string; titulo: string }) => void) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<OcupacionResumen[]>([])
  const [estado, setEstado] = useState<EstadoBuscador>('inactivo')
  const [activo, setActivo] = useState(0)
  const [intento, setIntento] = useState(0)
  const peticion = useRef<AbortController | null>(null)
  const opciones = useOpcionesCatalogo(true)
  useEffect(() => {
    const buscado = texto.trim()
    peticion.current?.abort()
    if (!buscado) {
      setEstado('inactivo')
      setResultados([])
      return
    }
    setEstado('escribiendo')
    const espera = setTimeout(() => {
      const control = new AbortController()
      peticion.current = control
      void buscarOcupaciones(buscado, control.signal).then((respuesta) => {
        if (control.signal.aborted) return
        if (respuesta.tipo !== 'ok') return setEstado('error')
        setResultados(respuesta.datos.items)
        setActivo(0)
        setEstado(respuesta.datos.items.length ? 'listo' : 'sin_resultados')
      })
    }, ESPERA)
    return () => clearTimeout(espera)
  }, [texto, intento])
  const elegir = (ocupacion: OcupacionResumen) => {
    onElegir({ codigo: ocupacion.codigo, titulo: ocupacion.titulo })
    setTexto('')
  }
  const alTeclear = (evento: { key: string; preventDefault: () => void }) => {
    if (estado !== 'listo') return
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault()
      const paso = evento.key === 'ArrowDown' ? 1 : -1
      setActivo((a) => (a + paso + resultados.length) % resultados.length)
    } else if (evento.key === 'Enter') {
      evento.preventDefault()
      elegir(resultados[activo])
    } else if (evento.key === 'Escape') setTexto('')
  }
  return {
    texto,
    escribir: setTexto,
    estado,
    resultados,
    activo,
    setActivo,
    grupo: (codigo: string) => opciones?.grupos.find((g) => g.codigo === codigo)?.nombre ?? '',
    elegir,
    alTeclear,
    reintentar: () => setIntento((n) => n + 1),
  }
}
