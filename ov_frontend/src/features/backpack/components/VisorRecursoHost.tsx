import { useVisorRecursoHost } from '../hooks/useVisorRecursoHost'
import { RequisitoRecurso } from './RequisitoRecurso'
import { VisorRecurso } from './VisorRecurso'

// F04d: dibuja el visor de la mochila encima de cualquier pantalla del portal del estudiante, sin navegar:
// lo abren las actividades con `abrirRecurso` y, al cerrarlo, la pantalla sigue como estaba.
export function VisorRecursoHost() {
  const { cerrar, modo, recurso, requisito } = useVisorRecursoHost()
  return (
    <>
      <VisorRecurso resource={recurso} modo={modo} onClose={cerrar} />
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
