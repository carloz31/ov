import { useState } from 'react'
import {
  abrirFichaApoderado,
  cargarFichaApoderado,
  cargarFichasApoderado,
  useFichasApoderado,
} from '@/store/servidor/apoderadoFichas'
import { mensajeErrorServidor } from '@/store/servidor/sesion'

// F08: la ficha del apoderado abierta en el modal compartido (Mis actividades y el cierre de una actividad). La
// lista se pide al montar; el contenido, al abrirla, y abrirla registra la vista.
export function useFichaApoderadoAbierta(activo = true) {
  const { lista, detalles } = useFichasApoderado(activo)
  const [abierta, setAbierta] = useState<string | null>(null)
  const fichas = lista.datos ?? []
  const detalle = abierta ? detalles[abierta] : undefined
  return {
    fichas,
    fichaAbierta: fichas.find((f) => f.codigo === abierta) ?? null,
    // Una ficha recién obtenida (desde el cierre) aún no está en la lista pedida al entrar: se vuelve a pedir.
    abrirFicha: async (codigo: string) => {
      setAbierta(codigo)
      if (!fichas.some((f) => f.codigo === codigo)) await cargarFichasApoderado()
      void abrirFichaApoderado(codigo)
    },
    cerrarFicha: () => setAbierta(null),
    contenidoFicha: abierta
      ? {
          estado: detalle?.estado ?? ('cargando' as const),
          contenido: detalle?.datos?.contenido ?? null,
          error: detalle?.estado === 'error' ? mensajeErrorServidor(detalle.error) : null,
          reintentar: () => cargarFichaApoderado(abierta),
        }
      : undefined,
  }
}
