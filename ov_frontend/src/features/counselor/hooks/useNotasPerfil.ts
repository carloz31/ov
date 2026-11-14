import { useState } from 'react'
import {
  borradorNota,
  borrarNota,
  editarNota,
  escribirNota,
  guardarBorrador,
} from '@/store/servidor/panelEstudiante'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { RespuestaServidor } from '@/types/servidor'

// Ajuste panel-estudiantes §6 · «Mis notas». Auditoría del panel (F7): el envío y su error viven en el bloque de
// notas, así guardar no repinta todo el perfil. El borrador de la nota nueva queda con la visita del perfil:
// sobrevive al cambio de pestaña y se descarta al guardarla o al salir del perfil.
export function useNotasPerfil(estudiante: string) {
  const [enviando, setEnviando] = useState<string | null>(null)
  const [errorNota, setErrorNota] = useState<string | null>(null)
  const [nueva, setNueva] = useState(() => borradorNota(estudiante))

  // Guardar, editar o borrar una nota: el botón lleva su cargador y lo confirmado actualiza el perfil cargado.
  async function nota(clave: string, accion: () => Promise<RespuestaServidor<unknown>>) {
    setEnviando(clave)
    setErrorNota(null)
    const respuesta = await accion()
    setEnviando(null)
    if (respuesta.tipo === 'ok') return true
    setErrorNota(mensajeErrorServidor(respuesta))
    return false
  }

  return {
    enviando,
    errorNota,
    nueva,
    escribirNueva: (texto: string) => {
      setNueva(texto)
      guardarBorrador(estudiante, texto)
    },
    guardarNueva: async () => {
      const guardada = await nota('nueva', () => escribirNota(estudiante, nueva))
      if (guardada) setNueva('')
      return guardada
    },
    editarNota: (numero: number, texto: string) =>
      nota(`editar-${numero}`, () => editarNota(estudiante, numero, texto)),
    borrarNota: (numero: number) => nota(`borrar-${numero}`, () => borrarNota(estudiante, numero)),
  }
}
export type ModeloNotasPerfil = ReturnType<typeof useNotasPerfil>
