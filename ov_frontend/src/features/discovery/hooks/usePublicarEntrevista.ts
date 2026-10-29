import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { esEnlaceYoutube } from '@/lib/servidor/adaptadoresInvestigaciones'
import { appPaths } from '@/routes/paths'
import { cuentaActiva } from '@/store/servidor/cuenta'
import { useDetalleEntrevista } from '@/store/servidor/entrevistas'
import { editarEntrevista, publicarEntrevista } from '@/store/servidor/investigaciones'
import { useInvestigacionesServidorSeccion } from '@/store/servidor/secciones'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { Aliado, FichaEntrevistaEntrada } from '@/types/servidor'
import { mostrarAvisoInvestigacion } from '../store/avisoInvestigaciones'
import { avisarRechazoInvestigacion } from './cierreInvestigacion'

const VACIA: FichaEntrevistaEntrada = { titulo: '', profesional: '', duracion: '', enlace: '', resumen: '' }

// F09 (boceto 04 · HU-060 y HU-061): publicar la entrevista con la guía lista, o editar la ficha (`?editar=`). Los
// coautores son compañeros del salón con guía lista en la misma ocupación y se eligen solo al publicar: después, los
// autores no cambian.
export function usePublicarEntrevista() {
  const [params] = useSearchParams()
  const navegar = useNavigate()
  const editar = params.get('editar') ?? undefined
  const seccion = useInvestigacionesServidorSeccion(true)
  const detalle = useDetalleEntrevista('entrevista', editar)
  const datos = seccion.datos
  const entrevista = editar ? (detalle?.datos ?? null) : null
  const ocupacion = editar ? entrevista?.ocupacion : datos?.en_curso?.ocupacion
  const [ficha, setFicha] = useState<FichaEntrevistaEntrada>(VACIA)
  const [coautores, setCoautores] = useState<Aliado[]>([])
  const [buscar, setBuscar] = useState('')
  const [permiso, setPermiso] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [intento, setIntento] = useState(false)
  const iniciado = useRef(false)
  useEffect(() => {
    if (!entrevista || iniciado.current) return
    iniciado.current = true
    const { titulo, profesional, duracion, enlace, resumen } = entrevista
    setFicha({ titulo, profesional, duracion, enlace, resumen })
  }, [entrevista])

  const aliados = [...(datos?.aliados.misma_ocupacion ?? []), ...(datos?.aliados.otras ?? [])].filter(
    (a) => a.ocupacion.codigo === ocupacion?.codigo,
  )
  const candidatos = aliados.filter(
    (a) =>
      !coautores.some((c) => c.codigo === a.codigo) &&
      a.nombre.toLowerCase().includes(buscar.trim().toLowerCase()),
  )
  const errores = {
    titulo: !ficha.titulo.trim(),
    profesional: !ficha.profesional.trim(),
    duracion: !ficha.duracion.trim(),
    enlace: !esEnlaceYoutube(ficha.enlace),
    resumen: !ficha.resumen.trim(),
    permiso: !editar && !permiso,
  }
  const valido = !Object.values(errores).some(Boolean)
  const volver = editar ? appPaths.student.interview(editar) : appPaths.student.investigations

  async function enviar() {
    setIntento(true)
    if (!valido || enviando) return
    setEnviando(true)
    setError(null)
    const limpia = Object.fromEntries(
      Object.entries(ficha).map(([k, v]) => [k, v.trim()]),
    ) as FichaEntrevistaEntrada
    const respuesta = editar
      ? await editarEntrevista(editar, limpia)
      : await publicarEntrevista(
          limpia,
          coautores.map((c) => c.codigo),
          permiso,
        )
    if (respuesta.tipo !== 'ok' && respuesta.tipo !== 'guardado_sin_refrescar') {
      await avisarRechazoInvestigacion(
        respuesta,
        editar ? 'No se pudo guardar la ficha' : 'No se pudo realizar la publicación',
        (ruta) => void navegar(ruta),
      )
      setEnviando(false)
      return setError(respuesta.tipo === 'bloqueado' ? null : mensajeErrorServidor(respuesta))
    }
    setEnviando(false)
    if (editar) {
      mostrarAvisoInvestigacion('Ficha actualizada', 'Tus compañeros ya ven los cambios.')
      return void navegar(appPaths.student.interview(editar))
    }
    const codigo = respuesta.datos.eventos_registrados.find(
      (e) => e.tipo === 'PUBLICA_ENTREVISTA',
    )?.referencia
    mostrarAvisoInvestigacion('Publicaste tu entrevista', 'Tu salón y tu orientadora ya pueden verla.')
    void navegar(
      codigo ? appPaths.student.interview(codigo) : `${appPaths.student.investigations}?vista=mias`,
    )
  }
  return {
    cuenta: cuentaActiva(),
    editar,
    cargando: !datos || (!!editar && !entrevista && detalle?.estado !== 'error'),
    errorCarga: seccion.error ?? (editar ? detalle?.error : null) ?? null,
    // Publicar exige la guía lista; editar, ser autor de la entrevista.
    disponible: editar ? !!entrevista?.propia : datos?.en_curso?.estado === 'GUIA_LISTA',
    sinInvestigacion: !editar && !!datos && !datos.en_curso,
    ocupacion,
    autoresActuales: entrevista?.autores ?? [],
    ficha,
    cambiar: (campo: keyof FichaEntrevistaEntrada, valor: string) =>
      setFicha((f) => ({ ...f, [campo]: valor })),
    errores: intento ? errores : null,
    coautores,
    agregarCoautor: (a: Aliado) => {
      setCoautores((c) => [...c, a])
      setBuscar('')
    },
    quitarCoautor: (codigo: string) => setCoautores((c) => c.filter((a) => a.codigo !== codigo)),
    buscar,
    setBuscar,
    candidatos,
    hayAliados: aliados.length > 0,
    permiso,
    setPermiso,
    enviando,
    error,
    enviar,
    volver,
  }
}
export type ModeloPublicar = ReturnType<typeof usePublicarEntrevista>
