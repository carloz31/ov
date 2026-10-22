import { useEffect, useState } from 'react'
import { actividadPorContenido, encuentroConEco } from '@/lib/servidor/contenidos'
import { mensajeErrorServidor, obtenerEstadoServidor, useEstadoServidor } from '@/store/servidor/sesion'
import { consultarReferencias } from '@/store/servidor/referencias'
import type { Actividad } from '@/types/activities'
import { StudentActivityPlayer } from './StudentActivityPlayer'
import { PantallaCarga } from '@/components/student/PantallaCarga'

// F03: un encuentro cuyos diálogos citan algo de la cuenta (eco) pide sus referencias antes de abrirse.
export function EncuentroServidorPlayer({
  codigo,
  imageUrl,
  edit = false,
  onClose,
}: {
  codigo: string
  imageUrl?: string
  // Al reintentar una completada se recorre desde el principio, con «Anterior» (ajuste de F03).
  edit?: boolean
  onClose: () => void
}) {
  const servidor = useEstadoServidor()
  const [activity, setActivity] = useState<Actividad>()
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  const cuenta = servidor.resumen.datos?.cuenta.codigo
  useEffect(() => {
    let vigente = true
    void (async () => {
      const contenido = actividadPorContenido(obtenerEstadoServidor().actividades.datos, codigo)
      if (!contenido) return
      const referencias = await consultarReferencias(codigo)
      if (!vigente) return
      if (referencias.tipo !== 'ok') {
        setError(mensajeErrorServidor(referencias))
        return
      }
      setActivity(encuentroConEco(contenido, referencias.datos.referencias))
      setError('')
    })()
    return () => {
      vigente = false
    }
  }, [codigo, intento, cuenta])
  if (!activity || error)
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
      activity={activity}
      imageUrl={imageUrl}
      edit={edit}
      onClose={onClose}
    />
  )
}
