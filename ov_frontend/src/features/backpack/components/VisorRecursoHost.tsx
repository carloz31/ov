import { useVisorRecursoHost } from '../hooks/useVisorRecursoHost'
import { FichaModal } from './FichaModal'
import { RequisitoRecurso } from './RequisitoRecurso'

// F04d: dibuja el modal de ficha encima de cualquier pantalla del portal del estudiante, sin navegar: lo
// abren las actividades con `abrirRecurso` y, al cerrarlo, la pantalla sigue como estaba. Dentro de una
// actividad el nombre de la actividad de origen no es enlace (ajuste mochila).
export function VisorRecursoHost() {
  const { abierto, cargando, cerrar, recurso, requisito } = useVisorRecursoHost()
  return (
    <>
      <FichaModal abierto={abierto} resource={recurso} cargando={cargando} onClose={cerrar} />
      <RequisitoRecurso
        abierto={requisito.abierto}
        titulo={requisito.titulo}
        texto={requisito.texto}
        pendiente={requisito.pendiente}
        error={requisito.error}
        onReintentar={requisito.reintentar}
        onClose={cerrar}
      />
    </>
  )
}
