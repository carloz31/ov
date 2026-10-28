import { useAccionesPlanes } from '@/features/plans/hooks/useAccionesPlanes'
import { usePlanesServidor } from '@/features/plans/hooks/usePlanesServidor'

// Ajuste catalogo-datos-reales (F6b) · F07a: la carrera frente a los planes del servidor (el detalle de carrera
// solo existe en api): ya es un plan, los tres están ocupados, no es favorita (un plan se crea solo desde una
// favorita) o hay espacio para armarlo. Sin los planes (PLANES cerrada o cargando), el bloque no se muestra.
export function usePlanesCarrera(codigo: string, esFavorita: boolean) {
  const { datos } = usePlanesServidor()
  const acciones = useAccionesPlanes()
  const planes = datos?.planes ?? []
  return {
    disponible: !!datos,
    codigo,
    letra: planes.find((p) => p.carrera.codigo === codigo)?.prioridad ?? null,
    libres: (datos?.maximo_planes ?? 3) - planes.length,
    ocupados: planes.map((p) => ({ letra: p.prioridad, nombre: p.carrera.nombre })),
    esFavorita,
    armar: () => void acciones.crear(codigo),
    ocupado: !!acciones.ocupado,
    aviso: acciones.aviso,
    cerrarAviso: acciones.cerrarAviso,
  }
}
