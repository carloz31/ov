import { useEffect, useState } from 'react'
import { actividadPorContenido } from '@/lib/servidor/contenidos'
import {
  construirInteraccionMara,
  inicioInteraccionMara,
  actividadServidor,
} from '@/lib/servidor/adaptadores'
import { mensajeErrorServidor, obtenerEstadoServidor, useEstadoServidor } from '@/store/servidor/sesion'
import { cargarResultadoRiasec } from '@/store/servidor/resultado'
import { consultarItems, consultarRespuestas } from '@/store/servidor/consultas'
import type { Actividad } from '@/types/activities'
import type { ItemPublico, RespuestaPublica } from '@/types/servidor'
import { StudentActivityPlayer } from './StudentActivityPlayer'

export type InstrumentoServidor = {
  items: ItemPublico[]
  respuestas: RespuestaPublica[]
  nodoInicialId?: string
  revision: boolean
  soloLectura: boolean
}
export function MaraInteractionPlayer({
  codigo,
  revision = false,
  onClose,
}: {
  codigo: string
  revision?: boolean
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
      const resultado = await cargarResultadoRiasec()
      if (!vigente) return
      if (resultado.tipo !== 'ok') {
        setError(mensajeErrorServidor(resultado))
        return
      }
      const revisar = revision || actividad.estado === 'COMPLETADA'
      const contenido = actividadPorContenido(obtenerEstadoServidor().actividades.datos, codigo)
      if (!contenido) return
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
      const [items, respuestas] = await Promise.all([consultarItems(codigo), consultarRespuestas(codigo)])
      if (!vigente) return
      if (items.tipo !== 'ok' || respuestas.tipo !== 'ok') {
        setError(
          mensajeErrorServidor(items.tipo !== 'ok' ? items : respuestas.tipo !== 'ok' ? respuestas : null),
        )
        return
      }
      if (!items.datos.length) {
        setError('Esta interacción no tiene ítems disponibles.')
        return
      }
      const saludo = contenido.nodos.find((n) => n.tipo === 'dialogo')
      const activity = construirInteraccionMara(
        actividad,
        items.datos,
        saludo?.tipo === 'dialogo' ? saludo.texto : '',
      )
      setCarga({
        activity,
        instrumento: {
          items: items.datos,
          respuestas: respuestas.datos.respuestas,
          nodoInicialId: inicioInteraccionMara(activity, respuestas.datos.respuestas, revisar),
          revision: revisar,
          soloLectura: !!resultado.datos,
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
      <section className="sx-glass sx-player-card" aria-live="polite">
        <h1>{error ? 'No pudimos abrir el encuentro' : 'Preparando el encuentro…'}</h1>
        {error && (
          <>
            <p role="alert">{error}</p>
            <button
              className="sx-primary-button"
              onClick={() => {
                setError('')
                setIntento((i) => i + 1)
              }}
            >
              Reintentar
            </button>
          </>
        )}
        <button className="sx-secondary-button" onClick={onClose}>
          Volver a la ciudad
        </button>
      </section>
    )
  return (
    <StudentActivityPlayer
      key={`${cuenta}/${codigo}/${revision}`}
      activity={carga.activity}
      instrumentoServidor={carga.instrumento}
      imageUrl="/images/background/afueras.png"
      onClose={onClose}
    />
  )
}
