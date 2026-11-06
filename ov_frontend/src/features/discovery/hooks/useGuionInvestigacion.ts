import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { pasoInvestigacion } from '@/lib/servidor/adaptadoresInvestigaciones'
import { appPaths } from '@/routes/paths'
import { consultarFamiliasInvestigar, guardarLoQuePienso } from '@/store/servidor/investigaciones'
import {
  asegurarSeccion,
  reintentarSeccion,
  useInvestigacionesServidorSeccion,
} from '@/store/servidor/secciones'
import type { FamiliaBreve } from '@/types/servidor'
import { mostrarAvisoInvestigacion } from '../store/avisoInvestigaciones'
import { avisarRechazoInvestigacion } from './cierreInvestigacion'

export type PasoGuion = 1 | 2 | 3

// F09 (bocetos 09–11): el asistente del guion. El paso va en la URL (`?paso=`); sin él, el de la investigación.
// Solo se llega a las preguntas con lo que pienso guardado y a la guía con el guion terminado. `?familia=` (desde
// «Investigar esta familia») la elige; con una investigación en curso, vuelve al listado: una a la vez.
export function useGuionInvestigacion() {
  const seccion = useInvestigacionesServidorSeccion(true)
  const [params, setParams] = useSearchParams()
  const navegar = useNavigate()
  const datos = seccion.datos
  const enCurso = datos?.en_curso ?? null
  const maximo = pasoInvestigacion(enCurso)
  const pedido = Number(params.get('paso')) as PasoGuion
  const paso: PasoGuion =
    pedido >= 1 && pedido <= 3 ? (Math.min(pedido, enCurso ? 3 : 1) as PasoGuion) : maximo
  const permitido = (p: PasoGuion) =>
    p === 1 || (p === 2 && !!enCurso) || (p === 3 && enCurso?.estado === 'GUIA_LISTA')
  const irA = (p: PasoGuion) => setParams({ paso: String(p) })
  const familiaUrl = params.get('familia')

  // Paso 1: la familia y lo que pienso, iniciados con lo guardado una sola vez.
  const [familia, setFamilia] = useState<FamiliaBreve | null>(null)
  const [dia, setDia] = useState('')
  const [necesita, setNecesita] = useState('')
  const [duda, setDuda] = useState('')
  const [guardando, setGuardando] = useState(false)
  const iniciado = useRef(false)
  useEffect(() => {
    if (iniciado.current || !datos) return
    iniciado.current = true
    if (familiaUrl && enCurso) {
      mostrarAvisoInvestigacion(
        'Ya tienes una investigación en curso',
        `Investigas ${enCurso.familia.nombre}. Publícala o cancélala para empezar otra.`,
      )
      void navegar(appPaths.student.investigations, { replace: true })
      return
    }
    if (enCurso) {
      setFamilia(enCurso.familia)
      setDia(enCurso.lo_que_pienso.dia)
      setNecesita(enCurso.lo_que_pienso.necesita)
      setDuda(enCurso.lo_que_pienso.duda)
    } else if (familiaUrl)
      void consultarFamiliasInvestigar().then((r) => {
        if (r.tipo === 'ok') setFamilia(r.datos.find((f) => f.codigo === familiaUrl) ?? null)
      })
  }, [datos, enCurso, familiaUrl, navegar])
  // Un paso que todavía no corresponde (escrito a mano en la URL) vuelve al que corresponde.
  useEffect(() => {
    if (datos && pedido && !permitido(pedido)) setParams({ paso: String(maximo) }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, pedido, maximo])

  const listoPaso1 = !!familia && !!dia.trim() && !!necesita.trim() && !!duda.trim()
  async function seguir() {
    if (!familia || !listoPaso1 || guardando) return
    setGuardando(true)
    const respuesta = await guardarLoQuePienso(familia.codigo, dia.trim(), necesita.trim(), duda.trim())
    // Las preguntas se abren con la investigación ya leída (la primera vez, recién creada).
    if (respuesta.tipo === 'ok' || respuesta.tipo === 'guardado_sin_refrescar') {
      await asegurarSeccion('investigaciones')
      setGuardando(false)
      irA(2)
      return
    }
    await avisarRechazoInvestigacion(
      respuesta,
      'No se pudo guardar lo que piensas',
      (ruta) => void navegar(ruta),
    )
    setGuardando(false)
  }
  return {
    estado: seccion.estado,
    error: seccion.error,
    reintentar: () => void reintentarSeccion('investigaciones'),
    datos,
    enCurso,
    paso,
    irA,
    permitido,
    familia,
    elegirFamilia: setFamilia,
    quitarFamilia: () => setFamilia(null),
    dia,
    setDia,
    necesita,
    setNecesita,
    duda,
    setDuda,
    listoPaso1,
    guardando,
    seguir,
  }
}
export type ModeloGuion = ReturnType<typeof useGuionInvestigacion>
