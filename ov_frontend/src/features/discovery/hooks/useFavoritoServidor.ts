import { useState } from 'react'
import { alternarFavorito } from '@/store/servidor/favoritos'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { TipoFavorito } from '@/types/servidor'

export type AvisoFavorito = { id: number; mensaje: string }
let avisos = 0

// F06: favoritos del catálogo en el servidor. Mientras el POST corre, el corazón muestra su cargador y no acepta
// otro clic; cambia solo cuando el servidor confirma (el almacén lo aplica a lo cargado). Si falla, un aviso.
export function useFavoritoServidor() {
  const [pendientes, setPendientes] = useState<string[]>([])
  const [aviso, setAviso] = useState<AvisoFavorito | null>(null)
  const llave = (tipo: TipoFavorito, codigo: string) => `${tipo}:${codigo}`
  function alternar(tipo: TipoFavorito, codigo: string, marcar: boolean) {
    if (pendientes.includes(llave(tipo, codigo))) return
    setPendientes((actuales) => [...actuales, llave(tipo, codigo)])
    void alternarFavorito(tipo, codigo, marcar)
      .then((respuesta) => {
        if (respuesta.tipo !== 'ok') setAviso({ id: ++avisos, mensaje: mensajeErrorServidor(respuesta) })
      })
      .finally(() => setPendientes((actuales) => actuales.filter((p) => p !== llave(tipo, codigo))))
  }
  return {
    alternar,
    pendiente: (tipo: TipoFavorito, codigo: string) => pendientes.includes(llave(tipo, codigo)),
    aviso,
    cerrarAviso: () => setAviso(null),
  }
}
