import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { catalog } from '@/data/activities/content'
import { actividadServidor } from '@/lib/servidor/adaptadores'
import { consultarBatallas } from '@/store/servidor/batallas'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { fichasDeRepaso } from '../lib/batallaServidor'
import type { ContenidoEstado } from '@/types/servidor'

// F04b: fichas de las que se alimenta una batalla, para el drawer. Se piden al abrirlo; solo las que la
// cuenta ya tiene y tienen contenido. En local no hay.
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
    void consultarBatallas().then((respuesta) => {
      if (!vigente || respuesta.tipo !== 'ok') return
      const batalla = respuesta.datos.find((b) => b.actividad === codigo)
      setFichas(fichasDeRepaso(batalla?.fichas ?? [], (id) => catalog.recursos.some((r) => r.id === id)))
    })
    return () => {
      vigente = false
    }
  }, [codigo, aplica])
  return { fichas }
}
