import { Award } from 'lucide-react'
import type { AvanceRuta, Diploma } from '@/types/servidor'

const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })

// F08 (A7): la cabecera en dos columnas: título y descripción; a la derecha, el avance en un anillo y la fila del
// diploma: hasta completar la ruta, solo el aviso de terminar las actividades; emitido, su fecha y «Ver».
export function CabeceraMisActividades({
  avance,
  diploma,
  onVerDiploma,
}: {
  avance: AvanceRuta | null
  diploma: Diploma | null
  onVerDiploma: () => void
}) {
  const porcentaje = Math.round(avance?.porcentaje ?? 0)
  const total = avance?.total ?? 0
  return (
    <header className="pa-cabecera">
      <div className="pa-cabecera-texto">
        <span aria-hidden="true" className="pa-iniciales">
          AF
        </span>
        <div>
          <h1>Actividades para familias</h1>
          <p>
            Lecturas cortas para acompañar y conversar en casa. Cada una deja fichas que puede volver a leer
            cuando quiera.
          </p>
        </div>
      </div>
      <aside className="pa-panel">
        <div className="pa-avance">
          <span
            aria-label={`${porcentaje} %`}
            className="pa-anillo"
            role="img"
            style={{ ['--pa-avance' as string]: `${porcentaje}%` }}
          >
            {porcentaje} %
          </span>
          <div>
            <p className="pa-avance-titulo">
              {avance?.completadas ?? 0} de {total} actividades
            </p>
            <p>Progreso general de su ruta</p>
          </div>
        </div>
        <div className={`pa-diploma${diploma?.obtenido ? ' is-emitido' : ''}`}>
          <span aria-hidden="true" className="pa-diploma-icono">
            <Award size={20} />
          </span>
          {diploma?.obtenido && diploma.obtenido_en ? (
            <>
              <div>
                <p className="pa-avance-titulo">Diploma de compromiso</p>
                <p className="pa-diploma-estado">Emitido el {fechaLarga(diploma.obtenido_en)}</p>
              </div>
              <button className="pa-boton-ver" type="button" onClick={onVerDiploma}>
                Ver
              </button>
            </>
          ) : (
            <p className="pa-diploma-pendiente">Termine sus actividades para ver su diploma de compromiso.</p>
          )}
        </div>
      </aside>
    </header>
  )
}
