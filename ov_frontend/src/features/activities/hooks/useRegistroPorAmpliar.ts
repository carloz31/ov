import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { actividadServidor } from '@/lib/servidor/adaptadores'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { marcarCargaDrawer } from '@/store/cargaDrawerStore'
import { consultarItemsRegistro, consultarRegistro } from '@/store/servidor/registro'
import { filasPorAmpliar, type FilaPorAmpliar } from '../lib/porAmpliar'

// Ítems por ampliar de un registro completado (F01), para el drawer de la actividad. Se piden al abrirlo:
// `GET /cuentas/{c}/actividades/{a}/registro` ya los entrega con el registro cerrado. En local no hay.
export function useRegistroPorAmpliar(codigo: string) {
  const servidor = useEstadoServidor()
  const actividad = modoApi ? actividadServidor(servidor.actividades.datos, codigo) : undefined
  const aplica = actividad?.tipo === 'REGISTRO' && actividad.estado === 'COMPLETADA'
  const [filas, setFilas] = useState<FilaPorAmpliar[]>([])
  useEffect(() => {
    if (!aplica) {
      setFilas([])
      return
    }
    let vigente = true
    const clave = `por-ampliar/${codigo}`
    marcarCargaDrawer(clave, true)
    void Promise.all([consultarRegistro(codigo), consultarItemsRegistro(codigo)]).then(
      ([registro, items]) => {
        if (!vigente) return
        marcarCargaDrawer(clave, false)
        if (registro.tipo !== 'ok' || items.tipo !== 'ok') return
        setFilas(filasPorAmpliar(registro.datos.items_por_ampliar ?? [], items.datos))
      },
    )
    return () => {
      vigente = false
      marcarCargaDrawer(clave, false)
    }
  }, [codigo, aplica])
  return filas
}
