import { useState } from 'react'
import { guardarConfiguracion, useConfiguracionPanel } from '@/store/servidor/panel'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { ConfiguracionColegio, CuestionarioConfiguracion } from '@/types/servidor'

type Borrador = { visibles: Set<string>; destacados: Set<string> }
export type AvisoConfiguracion = { titulo: string; descripcion?: string; error?: boolean }

const visiblesDe = (datos: ConfiguracionColegio) =>
  new Set(
    datos.cuestionarios
      .filter((c) => c.visibilidad_apoderado === 'SEGUN_COLEGIO' && c.visible)
      .map((c) => c.codigo),
  )
const destacadosDe = (datos: ConfiguracionColegio) =>
  new Set(datos.registros.flatMap((b) => b.registros.filter((r) => r.destacado).map((r) => r.codigo)))
const iguales = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x))

// Ajuste panel-entrevistas-configuracion §2.5 (api): «Configuración» de la orientadora, una sola para todos sus
// salones. Se lee; «Editar» abre un borrador; «Guardar cambios» pide confirmación (que avisa si un cuestionario pasa a
// ser visible para los apoderados) y lo guardado reemplaza lo cargado. En local sigue `PrioritiesView`.
export function useConfiguracionColegio() {
  const { carga, reintentar } = useConfiguracionPanel()
  const datos = carga?.datos ?? null
  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState<AvisoConfiguracion | null>(null)
  const visibles = borrador?.visibles ?? (datos ? visiblesDe(datos) : new Set<string>())
  const destacados = borrador?.destacados ?? (datos ? destacadosDe(datos) : new Set<string>())
  const cambiado =
    !!borrador &&
    !!datos &&
    (!iguales(borrador.visibles, visiblesDe(datos)) || !iguales(borrador.destacados, destacadosDe(datos)))
  // Los que el borrador hace visibles y hoy no lo son: la confirmación los nombra.
  const nuevosVisibles: CuestionarioConfiguracion[] =
    borrador && datos
      ? datos.cuestionarios.filter((c) => borrador.visibles.has(c.codigo) && !visiblesDe(datos).has(c.codigo))
      : []

  function cambiar(campo: keyof Borrador, codigo: string, marcado: boolean) {
    setBorrador((actual) => {
      if (!actual) return actual
      const siguiente = new Set(actual[campo])
      if (marcado) siguiente.add(codigo)
      else siguiente.delete(codigo)
      return { ...actual, [campo]: siguiente }
    })
  }

  async function guardar() {
    if (!borrador) return
    setGuardando(true)
    const respuesta = await guardarConfiguracion([...borrador.visibles], [...borrador.destacados])
    setGuardando(false)
    setConfirmando(false)
    if (respuesta.tipo === 'ok') {
      setBorrador(null)
      setAviso({ titulo: 'Cambios guardados', descripcion: 'La configuración aplica a todos sus salones.' })
    } else {
      setAviso({ titulo: 'No se pudo guardar', descripcion: mensajeErrorServidor(respuesta), error: true })
    }
  }

  return {
    carga,
    datos,
    reintentar,
    editando: borrador !== null,
    cambiado,
    editar: () => datos && setBorrador({ visibles: visiblesDe(datos), destacados: destacadosDe(datos) }),
    cancelar: () => {
      setBorrador(null)
      setConfirmando(false)
    },
    esVisible: (c: CuestionarioConfiguracion) =>
      c.visibilidad_apoderado === 'SEGUN_COLEGIO' ? visibles.has(c.codigo) : c.visible,
    cambiarVisible: (codigo: string, marcado: boolean) => cambiar('visibles', codigo, marcado),
    esDestacado: (codigo: string) => destacados.has(codigo),
    cambiarDestacado: (codigo: string, marcado: boolean) => cambiar('destacados', codigo, marcado),
    totalDestacados: destacados.size,
    nuevosVisibles,
    confirmando,
    pedirGuardar: () => setConfirmando(true),
    cerrarConfirmacion: () => !guardando && setConfirmando(false),
    guardando,
    guardar: () => void guardar(),
    aviso,
    cerrarAviso: () => setAviso(null),
  }
}
export type ModeloConfiguracion = ReturnType<typeof useConfiguracionColegio>
