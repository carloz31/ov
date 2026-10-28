import { reintentarSeccion, usePlanesServidorSeccion } from '@/store/servidor/secciones'
import { mensajeErrorServidor, useEstadoServidor } from '@/store/servidor/sesion'
import { usaTarjetaV4 as enApi } from '../lib/tarjeta'

// F07a: los planes de carrera del servidor (tarjeta v4). Solo en api (`usaTarjetaV4`); en local las vistas siguen
// con los planes del navegador. Se piden al montar una vista que los usa y solo con la sección PLANES abierta
// (cerrada, GET /planes responde 409). Mientras se vuelven a pedir tras una acción, se conserva lo último leído.
export function usePlanesServidor(activo = true) {
  const usaTarjetaV4 = enApi()
  const almacen = useEstadoServidor()
  const planesAbierta = !!almacen.secciones.datos?.some(
    (s) => s.codigo === 'PLANES' && s.estado !== 'BLOQUEADA',
  )
  const seccion = usePlanesServidorSeccion(usaTarjetaV4 && activo && planesAbierta)
  const datos = usaTarjetaV4 ? seccion.datos : null
  return {
    usaTarjetaV4,
    planesAbierta,
    datos,
    estado: datos
      ? ('listo' as const)
      : seccion.estado === 'error'
        ? ('error' as const)
        : ('cargando' as const),
    mensajeError: seccion.estado === 'error' ? mensajeErrorServidor(seccion.error) : undefined,
    reintentar: () => void reintentarSeccion('planes'),
  }
}
