import { useEffect, useState } from 'react'
import {
  actividadPorContenido,
  cuestionarioServidor,
  plantillaCuestionario,
} from '@/lib/servidor/contenidos'
import {
  construirInteraccionMara,
  inicioInteraccionMara,
  actividadServidor,
} from '@/lib/servidor/adaptadores'
import { mensajeErrorServidor, obtenerEstadoServidor, useEstadoServidor } from '@/store/servidor/sesion'
import { cargarResultadoRiasec } from '@/store/servidor/resultado'
import {
  consultarAvanceInstrumentos,
  consultarCatalogoInstrumentos,
  consultarItems,
  consultarRespuestas,
} from '@/store/servidor/consultas'
import { admiteCambios } from '@/lib/servidor/adaptadoresInstrumentos'
import type { Actividad } from '@/types/activities'
import type { ItemPublico, RespuestaPublica } from '@/types/servidor'
import { StudentActivityPlayer } from './StudentActivityPlayer'
import { PantallaCarga } from '@/components/student/PantallaCarga'

export type InstrumentoServidor = {
  items: ItemPublico[]
  respuestas: RespuestaPublica[]
  nodoInicialId?: string
  revision: boolean
  soloLectura: boolean
  // Ajuste de F03: al re-entrar a un completado, si el servidor todavía admite cambiar las respuestas.
  puedeCambiar?: boolean
}
export function MaraInteractionPlayer({
  codigo,
  revision = false,
  imageUrl = '/images/background/afueras.png',
  onClose,
}: {
  codigo: string
  revision?: boolean
  imageUrl?: string
  onClose: () => void
}) {
  const servidor = useEstadoServidor()
  const [carga, setCarga] = useState<{ activity: Actividad; instrumento: InstrumentoServidor }>()
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  const cuenta = servidor.resumen.datos?.cuenta.codigo
  useEffect(() => {
    let vigente = true
    void (async () => {
      const actividad = actividadServidor(obtenerEstadoServidor().actividades.datos, codigo)
      if (!actividad || actividad.estado === 'BLOQUEADA') return
      const contenido = actividadPorContenido(obtenerEstadoServidor().actividades.datos, codigo)
      if (!contenido) return
      // Solo los encuentros RIASEC dependen de su resultado; los cuestionarios con plantilla, no.
      const plantilla = !!plantillaCuestionario(contenido)
      const resultado = plantilla ? { tipo: 'ok' as const, datos: null } : await cargarResultadoRiasec()
      if (!vigente) return
      if (resultado.tipo !== 'ok') {
        setError(mensajeErrorServidor(resultado))
        return
      }
      const revisar = revision || actividad.estado === 'COMPLETADA'
      if (contenido.nodos.some((n) => n.tipo === 'resultado')) {
        if (!resultado.datos) {
          setError('El resultado todavía no está disponible.')
          return
        }
        setCarga({
          activity: {
            ...contenido,
            titulo: actividad.titulo,
            nodos: contenido.nodos.map((n) =>
              n.tipo === 'resultado' ? { ...n, instrumentoId: 'TEST-RIASEC' } : n,
            ),
          },
          instrumento: {
            items: [],
            respuestas: [],
            nodoInicialId: contenido.nodos[0].id,
            revision: revisar,
            soloLectura: true,
          },
        })
        return
      }
      const [items, respuestas, avance, catalogo] = await Promise.all([
        consultarItems(codigo),
        consultarRespuestas(codigo),
        // Ajuste de F03: al re-entrar, el avance y el tipo del instrumento dicen si se admiten cambios.
        revisar ? consultarAvanceInstrumentos() : null,
        revisar ? consultarCatalogoInstrumentos() : null,
      ])
      if (!vigente) return
      const fallo = [items, respuestas, avance, catalogo].find((r) => r && r.tipo !== 'ok')
      if (fallo && fallo.tipo !== 'ok') {
        setError(mensajeErrorServidor(fallo))
        return
      }
      if (items.tipo !== 'ok' || respuestas.tipo !== 'ok') return
      if (!items.datos.length) {
        setError('Esta interacción no tiene ítems disponibles.')
        return
      }
      const saludo = contenido.nodos.find((n) => n.tipo === 'dialogo')
      const activity = plantilla
        ? cuestionarioServidor(contenido, items.datos)
        : construirInteraccionMara(actividad, items.datos, saludo?.tipo === 'dialogo' ? saludo.texto : '')
      setCarga({
        activity,
        instrumento: {
          items: items.datos,
          respuestas: respuestas.datos.respuestas,
          nodoInicialId: inicioInteraccionMara(activity, respuestas.datos.respuestas, revisar),
          revision: revisar,
          soloLectura: !!resultado.datos,
          puedeCambiar:
            avance?.tipo === 'ok' &&
            catalogo?.tipo === 'ok' &&
            admiteCambios(items.datos[0]?.instrumento, avance.datos, catalogo.datos),
        },
      })
      setError('')
    })()
    return () => {
      vigente = false
    }
  }, [codigo, revision, intento, cuenta])
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
      key={`${cuenta}/${codigo}/${revision}`}
      activity={carga.activity}
      instrumentoServidor={carga.instrumento}
      imageUrl={imageUrl}
      onClose={onClose}
    />
  )
}
