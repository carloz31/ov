import { useState } from 'react'
import { useFavoritosCatalogo } from '@/features/discovery/hooks/useFavoritosCatalogo'
import { useAccionesPlanes } from './useAccionesPlanes'
import { usePlanesServidor } from './usePlanesServidor'

const LETRAS = 'ABC'

// F07a: Mis planes en api. Los planes y sus estados salen del servidor; el diálogo de crear, de las carreras
// favoritas; el de eliminar guarda qué plan se confirma.
export function useMisPlanes() {
  const servidor = usePlanesServidor()
  const { favoritos } = useFavoritosCatalogo()
  const acciones = useAccionesPlanes()
  const [creando, setCreando] = useState(false)
  const [porEliminar, setPorEliminar] = useState<string | null>(null)
  const planes = servidor.datos?.planes ?? []
  return {
    ...servidor,
    ...acciones,
    planes,
    favoritas: favoritos?.carreras ?? null,
    listos: planes.filter((p) => p.lista_para_comparar).length,
    letraLibre: LETRAS[planes.length] ?? '',
    creando,
    abrirCrear: () => setCreando(true),
    cerrarCrear: () => setCreando(false),
    porEliminar: planes.find((p) => p.carrera.codigo === porEliminar) ?? null,
    pedirEliminar: (carrera: string | null) => setPorEliminar(carrera),
    confirmarEliminar: async () => {
      if (!porEliminar) return
      const carrera = porEliminar
      setPorEliminar(null)
      await acciones.eliminar(carrera)
    },
    crearDesdeDialogo: async (carrera: string) => {
      await acciones.crear(carrera)
      setCreando(false)
    },
  }
}
