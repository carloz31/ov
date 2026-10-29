import { appPaths } from '@/routes/paths'
import { asegurarSeccion } from '@/store/servidor/secciones'
import { mensajeErrorServidor, obtenerEstadoServidor } from '@/store/servidor/sesion'
import type { ErrorServidor } from '@/types/servidor'
import { mostrarAvisoInvestigacion } from '../store/avisoInvestigaciones'

// F09: una acción sobre la investigación en curso que el servidor rechazó. Si la investigación ya no está (un
// compañero publicó la entrevista con este estudiante como coautor, o la canceló en otra pestaña), lo dice y
// lleva a Mis investigaciones; si no, muestra el motivo del servidor.
export async function avisarRechazoInvestigacion(
  error: ErrorServidor,
  titulo: string,
  navegar: (ruta: string) => void,
) {
  if (error.tipo === 'bloqueado') {
    await asegurarSeccion('investigaciones')
    const datos = obtenerEstadoServidor().investigaciones.datos
    if (datos && !datos.en_curso) {
      mostrarAvisoInvestigacion(
        titulo,
        datos.conteos.mias
          ? 'Ya eres coautor de la entrevista que publicó un compañero.'
          : 'Ya no tienes una investigación en curso.',
        true,
      )
      navegar(`${appPaths.student.investigations}?vista=mias`)
      return
    }
  }
  mostrarAvisoInvestigacion(titulo, mensajeErrorServidor(error), true)
}
