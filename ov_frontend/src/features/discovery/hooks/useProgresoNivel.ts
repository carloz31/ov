import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { condicionesObjetivo } from '@/lib/servidor/adaptadores'
import { consultarProgreso } from '@/store/servidor/consultas'
import { useEstadoServidor } from '@/store/servidor/sesion'
import type { CondicionesPasaporte } from '@/types/profile'

// Ajuste pasaporte-perfil: las condiciones del siguiente título (`/progreso/NIVEL/N{n}`). En local, una sola
// condición con el texto del nivel actual. `null` mientras consulta por primera vez, si falla o si no hay siguiente.
export function useProgresoNivel(numero: number | undefined, textoLocal = ''): CondicionesPasaporte | null {
  // F5: vuelve a consultar solo si cambian los niveles obtenidos, no con cada `logros` nuevo (guardar la vitrina
  // publica uno), y conserva la lista anterior mientras llega la nueva: nada desaparece ni salta.
  const niveles = useEstadoServidor().logros.datos?.niveles.map((n) => `${n.numero}:${n.estado}`).join(',')
  const [respuesta, setRespuesta] = useState<{ numero: number; condiciones: CondicionesPasaporte | null }>()
  useEffect(() => {
    if (!modoApi || numero === undefined) return
    let vigente = true
    void consultarProgreso('NIVEL', `N${numero}`).then((r) => {
      if (vigente) setRespuesta({ numero, condiciones: r.tipo === 'ok' ? condicionesObjetivo(r.datos) : null })
    })
    return () => {
      vigente = false
    }
  }, [numero, niveles])
  if (numero === undefined) return null
  if (!modoApi) return { bloques: [[{ texto: textoLocal, cumplida: false }]], cumplidas: 0, total: 1, mejor: 0 }
  return respuesta?.numero === numero ? respuesta.condiciones : null
}
