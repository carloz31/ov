import { useState } from 'react'
import { Link } from 'react-router'
import { Parchment } from '@/components/student/Parchment'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { textoGestion } from '@/lib/servidor/adaptadoresCatalogo'
import type { InstitucionEnCarrera } from '@/types/servidor'

const VISIBLES = 5
// Departamento con que arrancan los chips: el perfil del estudiante aún no lo tiene (pendientes-interfaz.md).
const DEPARTAMENTO_INICIAL = { codigo: 'dep-15', nombre: 'Lima' }

// Ajuste catalogo-datos-reales (F6b): las instituciones que dictan la carrera, acotadas en memoria (el detalle
// ya las trae todas): el departamento, todo el país o solo las públicas. 5 filas y «Ver las N de <lugar>».
export function DondeEstudiarla({ instituciones }: { instituciones: InstitucionEnCarrera[] }) {
  const grupos = [
    {
      id: 'lugar',
      nombre: DEPARTAMENTO_INICIAL.nombre,
      items: instituciones.filter((i) => i.ubicacion.codigo === DEPARTAMENTO_INICIAL.codigo),
    },
    { id: 'pais', nombre: 'Todo el país', items: instituciones },
    { id: 'publicas', nombre: 'Públicas', items: instituciones.filter((i) => i.gestion === 'PUBLICA') },
  ].filter((g) => g.items.length > 0)
  const [elegido, setElegido] = useState(grupos[0]?.id)
  const [todas, setTodas] = useState(false)
  const grupo = grupos.find((g) => g.id === elegido) ?? grupos[0]
  if (!grupo) return null
  const orden = [...grupo.items].sort((a, b) => Number(b.es_favorita) - Number(a.es_favorita))
  return (
    <Parchment title="Dónde estudiarla" className="sx-c-panel">
      <p className="sx-c-conteo">{instituciones.length} instituciones</p>
      <div className="sx-c-chips-claros">
        {grupos.map((g) => (
          <button
            type="button"
            key={g.id}
            aria-pressed={g.id === grupo.id}
            onClick={() => {
              setElegido(g.id)
              setTodas(false)
            }}
          >
            {g.nombre} · {g.items.length}
          </button>
        ))}
      </div>
      {(todas ? orden : orden.slice(0, VISIBLES)).map((i) => (
        <Link className="sx-d-related sx-c-institucion" key={i.codigo} to={discoveryPaths.institution(i.codigo)}>
          <strong>{i.nombre}</strong>
          {i.es_favorita && <span className="sx-c-favorita">Favorita</span>}
          <small>{[textoGestion(i.gestion), i.distrito ?? i.ubicacion.nombre].filter(Boolean).join(' · ')}</small>
        </Link>
      ))}
      {!todas && orden.length > VISIBLES && (
        <button type="button" className="sx-d-action sx-d-action-ghost sx-d-full" onClick={() => setTodas(true)}>
          Ver las {orden.length} de {grupo.id === 'lugar' ? grupo.nombre : grupo.nombre.toLowerCase()}
        </button>
      )}
    </Parchment>
  )
}
