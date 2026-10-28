import { Award, BookOpen, MessagesSquare, Play } from 'lucide-react'
import '../../styles/mis-actividades.css'
import type { DesbloqueoNuevo, Diploma } from '@/types/servidor'

type Fila = {
  clave: string
  icono: typeof Award
  tipo: string
  titulo: string
  accion: string
  onClick: () => void
}

// F08: el cierre de una actividad del apoderado en api, como el del estudiante: lo que abrió completarla en el
// servidor (fichas, la siguiente actividad, Conversaciones) y, con la ruta completa, el diploma.
export function SeAbrioParaUsted({
  desbloqueos,
  diploma,
  onAbrirFicha,
  onAbrirActividad,
  onConversaciones,
  onDiploma,
}: {
  desbloqueos: DesbloqueoNuevo[]
  diploma: Diploma | null
  onAbrirFicha: (codigo: string) => void
  onAbrirActividad: (codigo: string) => void
  onConversaciones: () => void
  onDiploma: () => void
}) {
  const filas: Fila[] = []
  for (const d of desbloqueos) {
    if (d.tipo_objetivo === 'FICHA')
      filas.push({
        clave: d.regla,
        icono: BookOpen,
        tipo: 'Ficha',
        titulo: d.objetivo.nombre,
        accion: 'Leer ficha',
        onClick: () => onAbrirFicha(d.objetivo.codigo),
      })
    if (d.tipo_objetivo === 'ACTIVIDAD')
      filas.push({
        clave: d.regla,
        icono: Play,
        tipo: 'Siguiente actividad',
        titulo: d.objetivo.nombre,
        accion: 'Empezar',
        onClick: () => onAbrirActividad(d.objetivo.codigo),
      })
    if (d.tipo_objetivo === 'SECCION' && d.objetivo.codigo === 'CONVERSACIONES')
      filas.push({
        clave: d.regla,
        icono: MessagesSquare,
        tipo: 'Se abrió una sección',
        titulo: 'Conversaciones en familia',
        accion: 'Ir a Conversaciones',
        onClick: onConversaciones,
      })
  }
  if (diploma?.obtenido)
    filas.push({
      clave: 'diploma',
      icono: Award,
      tipo: 'Ruta completada',
      titulo: 'Su diploma de compromiso',
      accion: 'Ver diploma',
      onClick: onDiploma,
    })
  if (!filas.length) return null
  return (
    <section aria-labelledby="pa-se-abrio" className="pa-se-abrio">
      <h3 id="pa-se-abrio">Se abrió para usted</h3>
      <ul>
        {filas.map(({ clave, icono: Icono, tipo, titulo, accion, onClick }) => (
          <li key={clave}>
            <span aria-hidden="true" className="pa-se-abrio-icono">
              <Icono size={20} />
            </span>
            <div>
              <p className="pa-se-abrio-tipo">{tipo}</p>
              <p className="pa-se-abrio-titulo">{titulo}</p>
            </div>
            <button className="pa-boton pa-boton--claro" type="button" onClick={onClick}>
              {accion}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
