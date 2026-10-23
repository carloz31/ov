import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { actividadServidor } from '@/lib/servidor/adaptadores'
import { consultarBatallas } from '@/store/servidor/batallas'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { marcarCargaDrawer } from '@/store/cargaDrawerStore'
import type { ContenidoEstado } from '@/types/servidor'

// F04b: fichas de las que se alimenta una batalla, para el drawer. Se piden al abrirlo. F04d: todas, con su
// estado para la cuenta (las bloqueadas llevan candado). En local no hay.
export function useFichasBatalla(codigo: string) {
  const servidor = useEstadoServidor()
  const actividad = modoApi ? actividadServidor(servidor.actividades.datos, codigo) : undefined
  const aplica = actividad?.tipo === 'BATALLA'
  const [fichas, setFichas] = useState<ContenidoEstado[]>([])
  useEffect(() => {
    if (!aplica) {
      setFichas([])
      return
    }
    let vigente = true
    const clave = `fichas-batalla/${codigo}`
    marcarCargaDrawer(clave, true)
    void consultarBatallas().then((respuesta) => {
      if (!vigente) return
      marcarCargaDrawer(clave, false)
      if (respuesta.tipo !== 'ok') return
      const batalla = respuesta.datos.find((b) => b.actividad === codigo)
      setFichas(batalla?.fichas ?? [])
    })
    return () => {
      vigente = false
      marcarCargaDrawer(clave, false)
    }
  }, [codigo, aplica])
  return { fichas }
}
