import { useEffect, useState } from 'react'
import { actividadPorContenido, registroServidor } from '@/lib/servidor/contenidos'
import { mensajeErrorServidor, obtenerEstadoServidor, useEstadoServidor } from '@/store/servidor/sesion'
import { consultarItemsRegistro, consultarRegistro } from '@/store/servidor/registro'
import type { Actividad } from '@/types/activities'
import type { RegistroServidor } from '../hooks/useRegistroServidor'
import { StudentActivityPlayer } from './StudentActivityPlayer'
import { PantallaCarga } from '@/components/student/PantallaCarga'

// F01: un registro del servidor se abre con sus ítems y lo guardado (borradores, posición y seguimiento).
export function RegistroServidorPlayer({
  codigo,
  imageUrl,
  onClose,
}: {
  codigo: string
  imageUrl?: string
  onClose: () => void
}) {
  const servidor = useEstadoServidor()
  const [carga, setCarga] = useState<{ activity: Actividad; registro: RegistroServidor }>()
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  const cuenta = servidor.resumen.datos?.cuenta.codigo
  useEffect(() => {
    let vigente = true
    void (async () => {
      const contenido = actividadPorContenido(obtenerEstadoServidor().actividades.datos, codigo)
      if (!contenido) return
      const [items, registro] = await Promise.all([consultarItemsRegistro(codigo), consultarRegistro(codigo)])
      if (!vigente) return
      if (items.tipo !== 'ok' || registro.tipo !== 'ok') {
        setError(mensajeErrorServidor(items.tipo !== 'ok' ? items : registro.tipo !== 'ok' ? registro : null))
        return
      }
      const activity = registroServidor(contenido, items.datos)
      if (!activity) {
        setError('Esta actividad no tiene todos sus ítems disponibles.')
        return
      }
      setCarga({ activity, registro: { items: items.datos, registro: registro.datos } })
      setError('')
    })()
    return () => {
      vigente = false
    }
  }, [codigo, intento, cuenta])
  if (!carga || error)
    return (
      <PantallaCarga
        estado={error ? 'error' : 'cargando'}
        titulo="Preparando la actividad"
        frase="Lumi está acomodando todo…"
        mensaje={error}
        onReintentar={() => {
          setError('')
          setIntento((i) => i + 1)
        }}
        volver={{ texto: 'Volver al mapa', onClick: onClose }}
      />
    )
  return (
    <StudentActivityPlayer
      key={`${cuenta}/${codigo}`}
      activity={carga.activity}
      registroServidor={carga.registro}
      imageUrl={imageUrl}
      onClose={onClose}
    />
  )
}
