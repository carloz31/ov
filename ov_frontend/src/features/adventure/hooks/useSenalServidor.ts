import { modoApi } from '@/config/env'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { ESCALA_CHECK_IN, senalDeHoy, senalesServidor } from '@/lib/servidor/adaptadoresDiario'

// F05: la señal (check-in) del servidor. `check-ins` lo pide el refresco del ingreso, solo con CHECK_IN abierta
// (`refresco.ts`); este hook solo lee, sin efectos, porque lo usan componentes del arnés de tests/local.
// Mientras secciones o check-ins cargan o fallan, el aviso al ingresar no aparece. En local, `activo` es falso.
export function useSenalServidor() {
  const activo = modoApi
  const { secciones, checkIns } = useEstadoServidor()
  const abierta =
    activo &&
    secciones.estado === 'listo' &&
    !!secciones.datos?.some((s) => s.codigo === 'CHECK_IN' && s.estado === 'DISPONIBLE')
  const datos = abierta && checkIns.estado === 'listo' ? checkIns.datos : null
  return {
    activo,
    abierta,
    pendiente: abierta && datos !== null && !datos.registrado_hoy,
    hoy: senalDeHoy(datos),
    serie: senalesServidor(datos),
    diasRegistrados: datos?.dias_registrados ?? 0,
    registradoHoy: Boolean(datos?.registrado_hoy),
    escala: ESCALA_CHECK_IN,
  }
}
