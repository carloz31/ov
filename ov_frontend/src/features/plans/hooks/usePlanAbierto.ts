import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { dimensionNames } from '@/features/discovery/lib/catalogDetails'
import { encajeRiasec, seccionSiguiente } from '@/lib/servidor/adaptadoresPlanes'
import { appPaths } from '@/routes/paths'
import { useDetalleCatalogo } from '@/store/servidor/catalogo'
import { cargarResultadoRiasec } from '@/store/servidor/resultado'
import { useEstadoServidor } from '@/store/servidor/sesion'
import type { CodigoSeccionPlan } from '@/types/servidor'
import type { AvisoPlan, EstadoNavegacionPlan } from './useAccionesPlanes'
import { usePlanesServidor } from './usePlanesServidor'
import { useSeccionPlan } from './useSeccionPlan'

const SECCIONES: CodigoSeccionPlan[] = ['POR_QUE', 'CONOCIMIENTO', 'REALIDAD', 'PASOS']
const esSeccion = (valor: string | null): valor is CodigoSeccionPlan =>
  SECCIONES.includes(valor as CodigoSeccionPlan)

// F07a (F07b-pantallas §4): un plan abierto, con una sola sección a la vista. Sin `?seccion=`, abre la que indica
// el botón de su tarjeta (la primera abierta no lista, o la 1) y la conserva aunque al guardar cambie la
// siguiente. Si la carrera no tiene plan (eliminado o enlace viejo), vuelve a Mis planes con un aviso.
export function usePlanAbierto(
  carrera: string,
  seccionUrl: string | null,
  avisoInicial?: Omit<AvisoPlan, 'id'>,
) {
  const servidor = usePlanesServidor()
  const navigate = useNavigate()
  const almacen = useEstadoServidor()
  const [aviso, setAviso] = useState<AvisoPlan | null>(() =>
    avisoInicial ? { ...avisoInicial, id: 0 } : null,
  )
  const avisar = (a: Omit<AvisoPlan, 'id'>) => setAviso({ ...a, id: Date.now() })
  const plan = servidor.datos?.planes.find((p) => p.carrera.codigo === carrera) ?? null
  const noExiste = !!servidor.datos && !plan
  const [elegida, setElegida] = useState<CodigoSeccionPlan | null>(esSeccion(seccionUrl) ? seccionUrl : null)
  const edicion = useSeccionPlan(plan, servidor.datos?.opciones ?? null, avisar)

  useEffect(() => {
    if (plan && !elegida) setElegida(seccionSiguiente(plan))
  }, [plan, elegida])
  useEffect(() => {
    if (!noExiste) return
    const estado: EstadoNavegacionPlan = {
      aviso: {
        titulo: 'No se pudo abrir el plan',
        descripcion: 'Ese plan ya no está entre los tuyos.',
        error: true,
      },
    }
    navigate(appPaths.student.decisions, { replace: true, state: estado })
  }, [noExiste, navigate])
  // «Cómo encaja contigo» usa el resultado RIASEC revelado, si lo hay.
  useEffect(() => {
    if (servidor.usaTarjetaV4 && almacen.estadoResultado === 'sin_cargar') void cargarResultadoRiasec()
  }, [servidor.usaTarjetaV4, almacen.estadoResultado])

  // F07b: REALIDAD en edición elige entre las instituciones que ofrecen la carrera (favoritas primero) y enlaza a
  // la página de la elegida; los detalles se piden solo mientras se edita.
  const enRealidad = edicion.editando === 'REALIDAD'
  const carreraDetalle = useDetalleCatalogo('carreras', enRealidad ? carrera : undefined)
  const institucionDetalle = useDetalleCatalogo(
    'instituciones',
    enRealidad ? (edicion.realidad?.institucion ?? undefined) : undefined,
  )
  const instituciones = [...(carreraDetalle?.datos?.instituciones ?? [])].sort(
    (a, b) => Number(b.es_favorita) - Number(a.es_favorita),
  )

  const seccion = elegida ?? (plan ? seccionSiguiente(plan) : 'POR_QUE')
  return {
    ...servidor,
    plan,
    seccion,
    estadoSeccion: plan?.secciones.find((s) => s.codigo === seccion) ?? null,
    elegir: (codigo: CodigoSeccionPlan) => {
      edicion.cancelar()
      setElegida(codigo)
    },
    edicion,
    instituciones,
    paginaInstitucion: institucionDetalle?.datos?.pagina_web ?? null,
    encaje: plan ? encajeRiasec(plan.carrera.riasec, almacen.resultadoRiasec, dimensionNames) : null,
    aviso,
    cerrarAviso: () => setAviso(null),
  }
}
