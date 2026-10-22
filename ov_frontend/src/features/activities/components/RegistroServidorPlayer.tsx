import { useEffect, useState } from 'react'
import { actividadPorContenido, registroServidor } from '@/lib/servidor/contenidos'
import { mensajeErrorServidor, obtenerEstadoServidor, useEstadoServidor } from '@/store/servidor/sesion'
import { consultarItemsRegistro, consultarRegistro } from '@/store/servidor/registro'
import { consultarReferencias } from '@/store/servidor/referencias'
import { necesitaReferencias } from '@/lib/servidor/adaptadoresRegistro'
import type { Actividad } from '@/types/activities'
import type { RegistroServidor } from '../hooks/useRegistroServidor'
import { actividadConsulta, esConsulta } from '../lib/edicionRegistro'
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
      // F02: las elecciones que retoman otra y los ecos leen lo que la cuenta respondió antes.
      const ecos = contenido.nodos.map((n) => (n.tipo === 'consigna' ? n.eco : undefined))
      const referencias = necesitaReferencias(items.datos, ecos)
        ? await consultarReferencias(codigo)
        : undefined
      if (!vigente) return
      if (referencias && referencias.tipo !== 'ok') {
        setError(mensajeErrorServidor(referencias))
        return
      }
      const resueltas = referencias?.datos.referencias ?? []
      const completo = registroServidor(contenido, items.datos)
      // F02: un registro cerrado se consulta en el mismo reproductor, solo con sus consignas.
      const activity = completo && esConsulta(registro.datos) ? actividadConsulta(completo) : completo
      if (!activity) {
        setError('Esta actividad no tiene todos sus ítems disponibles.')
        return
      }
      setCarga({
        activity,
        registro: { items: items.datos, registro: registro.datos, referencias: resueltas },
      })
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
