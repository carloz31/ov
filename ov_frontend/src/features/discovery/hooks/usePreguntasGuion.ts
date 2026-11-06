import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  avisoMuchasPreguntas,
  numerarGuion,
  puedeTerminarGuion,
} from '@/lib/servidor/adaptadoresInvestigaciones'
import { guardarGuion, pedirSugerenciasGuion } from '@/store/servidor/investigaciones'
import { asegurarSeccion } from '@/store/servidor/secciones'
import type { InvestigacionesCuenta, PreguntaGuionEntrada, SugerenciaGuionPublica } from '@/types/servidor'
import { avisarRechazoInvestigacion } from './cierreInvestigacion'

export type EstadoSugerencias = 'cargando' | 'listas' | 'sin_sugerencias' | 'error'

// F09 (boceto 10): las preguntas del guion. La duda del paso 1 entra como pregunta (si el guion está vacío); las
// sugerencias de Lumi se piden una vez al entrar (si no están vigentes) y nunca bloquean. Agregar o descartar una
// sugerencia guarda el guion para que no vuelva; terminar lo guarda como guía lista.
export function usePreguntasGuion(
  datos: InvestigacionesCuenta | null,
  activo: boolean,
  onTerminado: () => void,
) {
  const enCurso = datos?.en_curso ?? null
  const [preguntas, setPreguntas] = useState<PreguntaGuionEntrada[]>([])
  const [usadas, setUsadas] = useState<string[]>([])
  const [estadoSugerencias, setEstadoSugerencias] = useState<EstadoSugerencias>('listas')
  const [nueva, setNueva] = useState('')
  const [terminando, setTerminando] = useState(false)
  // La sugerencia que se está guardando (agregar o descartar) o «volver», mientras guarda el guion.
  const [guardando, setGuardando] = useState<string | null>(null)
  const navegar = useNavigate()
  const avisar = (respuesta: Parameters<typeof avisarRechazoInvestigacion>[0], titulo: string) =>
    avisarRechazoInvestigacion(respuesta, titulo, (ruta) => void navegar(ruta))
  const iniciado = useRef<string | null>(null)
  const pedido = useRef(false)
  useEffect(() => {
    if (!activo || !enCurso || iniciado.current === enCurso.codigo) return
    iniciado.current = enCurso.codigo
    setPreguntas(
      enCurso.preguntas.length
        ? enCurso.preguntas.map((p) => ({ ...p }))
        : [{ origen: 'DUDA', texto: enCurso.lo_que_pienso.duda }],
    )
  }, [activo, enCurso])
  async function pedir() {
    setEstadoSugerencias('cargando')
    const respuesta = await pedirSugerenciasGuion()
    if (respuesta.tipo !== 'ok' || respuesta.datos.estado === 'ERROR') return setEstadoSugerencias('error')
    setEstadoSugerencias(respuesta.datos.estado === 'LISTAS' ? 'listas' : 'sin_sugerencias')
  }
  useEffect(() => {
    // Al salir del paso (a cambiar lo que pienso), se vuelven a pedir si dejaron de estar vigentes.
    if (!activo) pedido.current = false
    if (!activo || !enCurso || enCurso.sugerencias_vigentes || pedido.current) return
    pedido.current = true
    void pedir()
  }, [activo, enCurso])

  const pendientes: SugerenciaGuionPublica[] = (enCurso?.sugerencias ?? []).filter(
    (s) => !usadas.includes(s.codigo),
  )
  const guardar = (lista: PreguntaGuionEntrada[], descartadas: string[], terminar: boolean) =>
    guardarGuion(
      lista.filter((p) => p.texto.trim()).map((p) => ({ ...p, texto: p.texto.trim() })),
      descartadas,
      terminar,
    )
  async function usarSugerencia(sugerencia: SugerenciaGuionPublica, agregar: boolean) {
    const lista = agregar
      ? [
          ...preguntas,
          { origen: 'SUGERIDA' as const, texto: sugerencia.texto, sugerencia: sugerencia.codigo },
        ]
      : preguntas
    if (guardando || terminando) return
    setGuardando(sugerencia.codigo)
    const respuesta = await guardar(lista, agregar ? [] : [sugerencia.codigo], false)
    setGuardando(null)
    if (respuesta.tipo !== 'ok' && respuesta.tipo !== 'guardado_sin_refrescar')
      return void (await avisar(respuesta, 'No se pudo guardar tu guion'))
    setUsadas((u) => [...u, sugerencia.codigo])
    if (agregar) setPreguntas(lista)
  }
  function agregarPropia() {
    if (!nueva.trim()) return
    setPreguntas((p) => [...p, { origen: 'PROPIA', texto: nueva.trim() }])
    setNueva('')
  }
  async function terminar() {
    if (terminando || !puedeTerminarGuion(preguntas)) return
    setTerminando(true)
    const respuesta = await guardar(preguntas, [], true)
    if (respuesta.tipo === 'ok' || respuesta.tipo === 'guardado_sin_refrescar') {
      // La guía se abre con la investigación ya leída como guía lista.
      await asegurarSeccion('investigaciones')
      setTerminando(false)
      onTerminado()
      return
    }
    await avisar(respuesta, 'No se pudo terminar tu guion')
    setTerminando(false)
  }
  // Volver guarda lo escrito sin terminar (con la guía lista, solo si sigue cumpliendo el mínimo).
  async function guardarAlVolver() {
    if (enCurso?.estado === 'GUIA_LISTA' && !puedeTerminarGuion(preguntas)) return true
    setGuardando('volver')
    const respuesta = await guardar(preguntas, [], false)
    setGuardando(null)
    if (respuesta.tipo === 'ok' || respuesta.tipo === 'guardado_sin_refrescar') return true
    await avisar(respuesta, 'No se pudo guardar tu guion')
    return false
  }
  const guion = numerarGuion(datos?.preguntas_base ?? [], preguntas)
  return {
    guion,
    pendientes,
    // Sin ninguna por mostrar ni usada: «no pude armar preguntas».
    estadoSugerencias:
      estadoSugerencias === 'listas' && !pendientes.length && !usadas.length
        ? 'sin_sugerencias'
        : estadoSugerencias,
    reintentarSugerencias: () => void pedir(),
    editar: (indice: number, texto: string) =>
      setPreguntas((p) => p.map((pregunta, i) => (i === indice ? { ...pregunta, texto } : pregunta))),
    quitar: (indice: number) => setPreguntas((p) => p.filter((_, i) => i !== indice)),
    agregar: (s: SugerenciaGuionPublica) => void usarSugerencia(s, true),
    descartar: (s: SugerenciaGuionPublica) => void usarSugerencia(s, false),
    nueva,
    setNueva,
    agregarPropia,
    puedeTerminar: puedeTerminarGuion(preguntas),
    muchas: avisoMuchasPreguntas(guion.total),
    terminando,
    // Mientras guarda (una sugerencia, volver o terminar), la lista no se edita.
    guardando,
    ocupado: terminando || !!guardando,
    terminar,
    guardarAlVolver,
  }
}
export type ModeloPreguntas = ReturnType<typeof usePreguntasGuion>
