import { useEffect, useMemo, useState } from 'react'
import { consultarFamiliasInvestigar } from '@/store/servidor/investigaciones'
import type { FamiliaPublica } from '@/types/servidor'

const MAXIMO = 8
const sinTildes = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
export type EstadoBuscador = 'inactivo' | 'escribiendo' | 'listo' | 'sin_resultados' | 'error'

// Ajuste entrevistas por familia: el buscador del paso 1. Las familias del catálogo se piden una vez y se filtran
// aquí, por nombre y sin tildes; se navega con flechas y Enter, y un error se reintenta.
export function useBuscadorFamilia(onElegir: (familia: FamiliaPublica) => void) {
  const [texto, setTexto] = useState('')
  const [familias, setFamilias] = useState<FamiliaPublica[] | null>(null)
  const [fallo, setFallo] = useState(false)
  const [activo, setActivo] = useState(0)
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    let vigente = true
    void consultarFamiliasInvestigar().then((respuesta) => {
      if (!vigente) return
      if (respuesta.tipo === 'ok') setFamilias(respuesta.datos)
      else setFallo(true)
    })
    return () => {
      vigente = false
    }
  }, [intento])
  const buscado = sinTildes(texto.trim())
  const resultados = useMemo(
    () =>
      buscado
        ? (familias ?? []).filter((f) => sinTildes(f.nombre).includes(buscado)).slice(0, MAXIMO)
        : [],
    [buscado, familias],
  )
  const estado: EstadoBuscador = !buscado
    ? 'inactivo'
    : fallo
      ? 'error'
      : !familias
        ? 'escribiendo'
        : resultados.length
          ? 'listo'
          : 'sin_resultados'
  const elegir = (familia: FamiliaPublica) => {
    onElegir(familia)
    setTexto('')
  }
  const escribir = (valor: string) => {
    setTexto(valor)
    setActivo(0)
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
    escribir,
    estado,
    resultados,
    activo,
    setActivo,
    elegir,
    alTeclear,
    reintentar: () => {
      setFallo(false)
      setIntento((n) => n + 1)
    },
  }
}
