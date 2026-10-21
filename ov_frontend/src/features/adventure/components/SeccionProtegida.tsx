import type { ReactNode } from 'react'
import { SeccionBloqueada } from '@/components/student/SeccionBloqueada'
import { useSeccionesAcceso, type CodigoSeccion } from '../hooks/useSeccionesAcceso'

// Entrada directa por URL: con la sección cerrada en el servidor, la vista muestra su tarjeta de bloqueo.
export function SeccionProtegida({
  seccion,
  titulo,
  children,
}: {
  seccion: CodigoSeccion
  titulo?: string
  children: ReactNode
}) {
  const acceso = useSeccionesAcceso()(seccion)
  if (!acceso.pasos) return children
  return <SeccionBloqueada titulo={titulo ?? acceso.nombre ?? ''} mensaje={acceso.mensaje ?? ''} />
}
