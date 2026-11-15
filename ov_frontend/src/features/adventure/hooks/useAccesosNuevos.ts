import { modoApi } from '@/config/env'
import { primeraMisionResuelta } from '@/lib/servidor/adaptadores'
import { useEstadoServidor } from '@/store/servidor/sesion'
import type { AccesoSeccion } from './useSeccionesAcceso'

// Ajuste desbloqueos: un acceso rápido es «nuevo» mientras su sección está abierta y el estudiante no cerró la
// presentación de primera visita de la vista a la que lleva. Solo api, con las presentaciones que ya llegaron con el
// ingreso (cargando o con error, ninguno es nuevo). `trasPrimeraMision` (Recursos) espera, además, a resolver b0-1,
// como la presentación del mapa. Sin peticiones: lee el almacén.
export function useAccesosNuevos() {
  const servidor = useEstadoServidor()
  const vistas = servidor.presentaciones.datos?.vistas
  const actividades = servidor.actividades.datos
  return (vista: string, acceso: AccesoSeccion, trasPrimeraMision = false): boolean => {
    if (!modoApi || acceso.bloqueada || !vistas) return false
    if (trasPrimeraMision && !primeraMisionResuelta(actividades)) return false
    return !vistas.includes(vista)
  }
}
