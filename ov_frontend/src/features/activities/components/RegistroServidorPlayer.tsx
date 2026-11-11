import { useEffect, useState } from 'react'
import { actividadPorContenido, encuentroConEco, registroServidor } from '@/lib/servidor/contenidos'
import { mensajeErrorServidor, obtenerEstadoServidor, useEstadoServidor } from '@/store/servidor/sesion'
import { consultarRegistro } from '@/store/servidor/registro'
import { consultarReferencias } from '@/store/servidor/referencias'
import { necesitaReferencias } from '@/lib/servidor/adaptadoresRegistro'
import type { Actividad } from '@/types/activities'
import type { RegistroServidor } from '../hooks/useRegistroServidor'
import { StudentActivityPlayer } from './StudentActivityPlayer'
import { PantallaCarga } from '@/components/student/PantallaCarga'

// F01: un registro del servidor se abre con lo de la cuenta. Ajuste front de registros (lote 1): el registro trae
// cada ítem con su consigna, sus opciones, sus ecos y la respuesta vigente; las referencias solo se piden si los
// diálogos de la apertura citan alguna.
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
      const registro = await consultarRegistro(codigo)
      if (!vigente) return
      if (registro.tipo !== 'ok') {
        setError(mensajeErrorServidor(registro))
        return
      }
      const ecos = contenido.nodos.map((n) => (n.tipo === 'dialogo' ? n.eco : undefined))
      const referencias = necesitaReferencias(ecos) ? await consultarReferencias(codigo) : undefined
      if (!vigente) return
      if (referencias && referencias.tipo !== 'ok') {
        setError(mensajeErrorServidor(referencias))
        return
      }
      const resueltas = referencias?.datos.referencias ?? []
      const base = registroServidor(contenido, registro.datos.items)
      const activity = base && encuentroConEco(base, resueltas)
      if (!activity) {
        setError('Esta actividad no tiene todos sus ítems disponibles.')
        return
      }
      setCarga({ activity, registro: { registro: registro.datos, referencias: resueltas } })
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
