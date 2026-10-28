import { Check, CircleDot, Clock3, LockKeyhole, Play } from 'lucide-react'
import type { FilaActividadServidor } from '../../hooks/useMisActividadesServidor'

// F08 (A7): una actividad compacta: estado, título con su pill, una línea de descripción, duración y la fila de
// fichas (un chip por ficha obtenida, «Nueva» si no se ha visto; sin completar, cuántas da). «Repasar/Comenzar»
// queda ocupado hasta abrir la actividad.
export function FilaActividad({
  fila,
  abriendo,
  onComenzar,
  onAbrirFicha,
}: {
  fila: FilaActividadServidor
  abriendo: boolean
  onComenzar: () => void
  onAbrirFicha: (codigo: string) => void
}) {
  const { actividad, estado, fichas, porObtener } = fila
  const completada = estado === 'completada'
  return (
    <article className={`pa-fila is-${estado}`}>
      <span aria-hidden="true" className="pa-fila-estado">
        {completada ? (
          <Check size={22} />
        ) : estado === 'bloqueada' ? (
          <LockKeyhole size={20} />
        ) : (
          <CircleDot size={22} />
        )}
      </span>
      <div className="pa-fila-cuerpo">
        <h3>
          {actividad.titulo}
          <span className="pa-pill">
            {completada ? '✓ Completada' : estado === 'disponible' ? 'Disponible' : fila.bloqueo}
          </span>
        </h3>
        {actividad.subtitulo && <p>{actividad.subtitulo}</p>}
        <div className="pa-fila-pie">
          <span className="pa-duracion">
            <Clock3 aria-hidden="true" size={16} />
            {actividad.duracionEstimadaMin} min
          </span>
          {fichas.map((f) => (
            <button key={f.codigo} className="pa-chip" type="button" onClick={() => onAbrirFicha(f.codigo)}>
              <span aria-hidden="true" className="pa-chip-punto" />
              Ficha · {f.titulo}
              {!f.visto && <span className="pa-chip-nueva">Nueva</span>}
            </button>
          ))}
          {porObtener > 0 && (
            <span className="pa-chip pa-chip--punteado">
              <span aria-hidden="true" className="pa-chip-punto" />
              {porObtener} {porObtener === 1 ? 'ficha' : 'fichas'} al completar
            </span>
          )}
        </div>
      </div>
      {estado !== 'bloqueada' && (
        <button
          className={`pa-boton${completada ? ' pa-boton--claro' : ''}`}
          disabled={abriendo}
          type="button"
          onClick={onComenzar}
        >
          <Play aria-hidden="true" size={18} />
          {abriendo ? 'Abriendo…' : completada ? 'Repasar' : 'Comenzar'}
        </button>
      )}
    </article>
  )
}
