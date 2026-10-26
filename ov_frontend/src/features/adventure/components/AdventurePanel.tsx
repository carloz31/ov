import { useTravelerLevel } from '../hooks/useTravelerLevel'
import { useSeccionesAcceso, type AccesoSeccion } from '../hooks/useSeccionesAcceso'
import { Link } from 'react-router'
import { Backpack, BookOpen, ChevronRight, HeartHandshake, LibraryBig, Search, Signpost } from 'lucide-react'
import type { AdventureState } from '@/types/adventure'
import { appPaths } from '@/routes/paths'
import { getReturnGreeting, type StudentMapPoint, type ZoneProgress } from '../lib/mapPoints'
import { getListedActivities } from '../lib/navigation'
import type { SiguientePaso } from '../lib/siguientePaso'
import { AccesoRapido } from './AccesoRapido'
import { SiguientePasoServidor } from './SiguientePasoServidor'
import { SenalHoy } from './SenalHoy'
import { useSenalServidor } from '@/features/adventure/hooks/useSenalServidor'
import { getTodayCheckIn, useCheckInDay } from '../lib/checkIn'

const textoOculto = (acceso: AccesoSeccion) =>
  acceso.bloqueada && <small className="sr-only">{acceso.mensaje}</small>

export function AdventurePanel({
  adventure,
  points,
  recommended,
  progress,
  onSelect,
  onCheckIn,
  onGuide,
  siguiente,
  disponibles = 0,
  onSiguiente,
}: {
  adventure: AdventureState
  points: StudentMapPoint[]
  recommended?: StudentMapPoint
  progress: ZoneProgress
  onSelect: (id: string) => void
  onCheckIn: () => void
  // Ayuda de Lumi para un acceso cerrado (api).
  onGuide?: (pasos: string[]) => void
  // Solo api: el siguiente paso de la ruta; reemplaza la recomendada y el conteo local de disponibles.
  siguiente?: SiguientePaso | null
  disponibles?: number
  onSiguiente?: () => void
}) {
  const { level, nombre, iniciales } = useTravelerLevel(adventure)
  useCheckInDay()
  // F05: en api, la señal de hoy y su escala (1–5) son del servidor; una por día, editable ese día.
  const senal = useSenalServidor()
  const signal = senal.activo ? senal.hoy : getTodayCheckIn(adventure),
    escala = senal.activo ? senal.escala : 10
  const seccion = useSeccionesAcceso(adventure)
  // Ajuste del panel (F05): en local, el siguiente paso es la recomendada y cuenta las disponibles del mapa.
  const paso: SiguientePaso | null =
    siguiente !== undefined
      ? siguiente
      : recommended
        ? { estado: 'disponible', punto: recommended }
        : { estado: 'completado' }
  const punto = paso && 'punto' in paso ? paso.punto : undefined
  return (
    <div className="sx-panel-content">
      <Link className="sx-panel-traveler" to={appPaths.student.profile}>
        <span className="sx-panel-avatar" aria-hidden="true">
          {iniciales}
        </span>
        <span className="sx-panel-user">
          <strong>{nombre}</strong>
          {level && (
            <span className="sx-panel-level" aria-label={`Nivel ${level.number}: ${level.label}`}>
              <span className="sx-level-badge">Nivel {level.number}</span>
              <span className="sx-level-rank">{level.label}</span>
            </span>
          )}
        </span>
        <ChevronRight aria-hidden="true" size={18} />
      </Link>
      <ProgresoZona progress={progress} />
      <SiguientePasoServidor
        paso={paso}
        disponibles={siguiente !== undefined ? disponibles : getListedActivities(points, false).length}
        saludo={!!getReturnGreeting(adventure, punto)}
        onAbrir={siguiente !== undefined ? onSiguiente : () => recommended && onSelect(recommended.id)}
      />
      <SenalHoy
        valor={signal?.value}
        escala={escala}
        acceso={seccion('CHECK_IN')}
        onRegistrar={onCheckIn}
        onGuide={onGuide}
      />
      <section className="sx-panel-section">
        <h2>Accesos rápidos</h2>
        <nav className="sx-quick-links" aria-label="Accesos rápidos">
          <AccesoRapido to={appPaths.student.decisions} acceso={seccion('PLANES')} onGuide={onGuide}>
            <Signpost size={18} />
            <span>
              Mis planes
              {textoOculto(seccion('PLANES'))}
            </span>
          </AccesoRapido>
          <AccesoRapido to={appPaths.student.journal} acceso={seccion('DIARIO')} onGuide={onGuide}>
            <BookOpen size={18} />
            <span>
              Mi diario
              {textoOculto(seccion('DIARIO'))}
            </span>
          </AccesoRapido>
          <AccesoRapido to={appPaths.student.conversations} acceso={seccion('FAMILIA')} onGuide={onGuide}>
            <HeartHandshake size={18} />
            <span>
              En familia
              {textoOculto(seccion('FAMILIA'))}
            </span>
          </AccesoRapido>
          <Link to={appPaths.student.resources}>
            <Backpack size={18} />
            <span>Recursos</span>
          </Link>
          <Link to="/student/investigations">
            <Search size={18} />
            <span>Investigaciones</span>
          </Link>
          <AccesoRapido
            to={appPaths.student.catalog.professions}
            acceso={seccion('CATALOGO')}
            onGuide={onGuide}
          >
            <LibraryBig size={18} />
            <span>
              Información
              {textoOculto(seccion('CATALOGO'))}
            </span>
          </AccesoRapido>
        </nav>
      </section>
    </div>
  )
}

// Ajuste del panel (F05): el avance de la zona en una tarjeta con un solo anillo (porcentaje global) y el tramo
// actual en texto. Sin datos (falló `/avance`), el anillo queda vacío y solo se ve el rótulo.
function ProgresoZona({ progress }: { progress: ZoneProgress }) {
  const ciudad = progress.label === 'Afinidad con la ciudad'
  const percentage = progress.porcentaje === null ? null : Math.min(100, Math.max(0, progress.porcentaje))
  const circumference = 2 * Math.PI * 40
  const linea =
    percentage === null
      ? null
      : ciudad
        ? `${Math.round(percentage)}% de afinidad`
        : progress.tramo
          ? `Tramo ${progress.tramo.numero} · ${progress.tramo.completadas} de ${progress.tramo.total} misiones`
          : progress.total !== undefined
            ? `${progress.completadas} de ${progress.total} misiones`
            : progress.caminoCompleto
              ? 'Camino completo'
              : null
  return (
    <section className="sx-panel-section sx-signal-card sx-panel-progress" data-zona={ciudad ? 'ciudad' : 'camino'}>
      <span
        className="sx-progress-ring"
        role="progressbar"
        aria-label={progress.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage ?? undefined}
      >
        <svg viewBox="0 0 96 96" aria-hidden="true">
          <circle cx={48} cy={48} r={40} fill="none" stroke="var(--sx-night)" strokeWidth={9} />
          <circle
            className="sx-progress-ring-value"
            cx={48}
            cy={48}
            r={40}
            fill="none"
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - (percentage ?? 0) / 100)}
          />
        </svg>
        {percentage !== null && <strong>{Math.round(percentage)}%</strong>}
      </span>
      <div>
        <span className="sx-progress-label">{ciudad ? 'Ciudad' : 'Camino'}</span>
        {linea && <strong className="sx-progress-line">{linea}</strong>}
        {!ciudad && progress.tramo && <span className="sx-progress-tramo">{progress.tramo.nombre}</span>}
      </div>
    </section>
  )
}
