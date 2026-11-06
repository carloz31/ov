import { useState } from 'react'
import { useFavoritosCatalogo } from '@/features/discovery/hooks/useFavoritosCatalogo'
import { useAccionesPlanes } from './useAccionesPlanes'
import { usePlanesServidor } from './usePlanesServidor'

const LETRAS = 'ABC'

// F07a: Mis planes en api. Los planes y sus estados salen del servidor; el diálogo de crear, de las carreras
// favoritas; los de eliminar y subir prioridad guardan qué plan se confirma.
export function useMisPlanes() {
  const servidor = usePlanesServidor()
  const { favoritos } = useFavoritosCatalogo()
  const acciones = useAccionesPlanes()
  const [creando, setCreando] = useState(false)
  const [porEliminar, setPorEliminar] = useState<string | null>(null)
  const [porSubir, setPorSubir] = useState<string | null>(null)
  const planes = servidor.datos?.planes ?? []
  return {
    ...servidor,
    ...acciones,
    planes,
    favoritas: favoritos?.carreras ?? null,
    letraLibre: LETRAS[planes.length] ?? '',
    creando,
    abrirCrear: () => setCreando(true),
    cerrarCrear: () => setCreando(false),
    porEliminar: planes.find((p) => p.carrera.codigo === porEliminar) ?? null,
    pedirEliminar: (carrera: string | null) => setPorEliminar(carrera),
    // Como subir prioridad: el diálogo queda abierto, con su botón ocupado, hasta la respuesta.
    confirmarEliminar: async () => {
      if (!porEliminar) return
      await acciones.eliminar(porEliminar)
      setPorEliminar(null)
    },
    // Subir prioridad pide confirmación; el diálogo queda abierto, con su botón ocupado, hasta la respuesta.
    porSubir: planes.find((p) => p.carrera.codigo === porSubir) ?? null,
    planArriba: planes[planes.findIndex((p) => p.carrera.codigo === porSubir) - 1] ?? null,
    pedirSubir: (carrera: string | null) => setPorSubir(carrera),
    confirmarSubir: async () => {
      if (!porSubir) return
      await acciones.subir(planes, porSubir)
      setPorSubir(null)
    },
    crearDesdeDialogo: async (carrera: string) => {
      await acciones.crear(carrera)
      setCreando(false)
    },
  }
}
