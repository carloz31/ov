import { ANIO_PONTE_EN_CARRERA } from '../data/catalogoTextos'

// Ajuste catalogo-datos-reales (F6b): el pie de página único de cada detalle, con sus fuentes. Ningún panel
// lleva la suya.
export function FuentesCatalogo({ de }: { de: 'carrera' | 'institucion' | 'profesion' }) {
  if (de === 'profesion')
    return (
      <footer className="sx-c-fuentes">
        <p>
          <strong>Fuentes:</strong> descripción, tareas, conocimientos, aptitudes y personalidad: Mi Próximo Paso
          (O*NET, en español); perfil de intereses: O*NET Interest Profiler. Las carreras relacionadas son una
          selección hecha para esta plataforma.
        </p>
      </footer>
    )
  return (
    <footer className="sx-c-fuentes">
      <p>
        <strong>Fuentes:</strong>{' '}
        {de === 'carrera'
          ? 'carreras, instituciones e ingresos de egresados'
          : 'instituciones, carreras que ofrecen e ingresos de egresados'}
        : Ponte en Carrera (Ministerio de Trabajo, {ANIO_PONTE_EN_CARRERA}).
      </p>
      <p>
        {de === 'carrera'
          ? 'Los ingresos son promedios declarados por familia de carreras, no de la carrera exacta; los tuyos dependerán de muchas cosas más.'
          : 'El ingreso de cada fila es el promedio de los egresados de esta institución en esa familia de carreras; «Sin dato» significa que no hay suficientes egresados registrados.'}
      </p>
    </footer>
  )
}
