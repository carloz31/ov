import { useTravelerLevel } from '../hooks/useTravelerLevel'
import { useSeccionesAcceso, type AccesoSeccion } from '../hooks/useSeccionesAcceso'
import { Link } from 'react-router'
import {
  Backpack,
  Building2,
  MapPinned,
  BookOpen,
  ChevronRight,
  Compass,
  FolderHeart,
  HeartHandshake,
  LibraryBig,
  LockKeyhole,
  PenLine,
  Search,
  Target,
  TrendingUp,
} from 'lucide-react'
import type { AdventureState } from '@/types/adventure'
import { appPaths } from '@/routes/paths'
import { getReturnGreeting, type StudentMapPoint } from '../lib/mapPoints'
import { getListedActivities, studentActivitiesPath } from '../lib/navigation'
import type { SiguientePaso } from '../lib/siguientePaso'
import { AccesoRapido } from './AccesoRapido'
import { SiguientePasoServidor } from './SiguientePasoServidor'
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
  progress: { label: string; value: number }
  onSelect: (id: string) => void
  onCheckIn: () => void
  // Ayuda de Lumi para un acceso cerrado (api).
  onGuide?: (pasos: string[]) => void
  // Solo api: el siguiente paso de la ruta; reemplaza la recomendada y la lista de disponibles.
  siguiente?: SiguientePaso | null
  disponibles?: number
  onSiguiente?: () => void
}) {
  const { level, nombre, iniciales, progresoCiudad } = useTravelerLevel(adventure)
  const visible = getListedActivities(points, false).slice(0, 4)
  const greeting = getReturnGreeting(adventure, recommended)
  useCheckInDay()
  const signal = getTodayCheckIn(adventure)
  const seccion = useSeccionesAcceso(adventure)
  const checkIn = seccion('CHECK_IN')
  const percentage = Math.min(100, Math.max(0, progress.value))
  const zonaCiudad =
    progress.label === 'Afinidad con la ciudad' || progress.label === 'Recorrido por la ciudad'
  const circumference = 2 * Math.PI * 40
  return (
    <div className="sx-panel-content">
      <Link className="sx-panel-traveler" to={appPaths.student.profile}>
        <div className="sx-panel-user">
          <span className="sx-panel-avatar" aria-hidden="true">
            {iniciales}
          </span>
          <div>
            <span>¡Qué bueno verte!</span>
            <strong>{nombre}</strong>
          </div>
          <ChevronRight aria-hidden="true" size={18} />
        </div>
        {level && (
          <div className="sx-panel-level" aria-label={`Nivel ${level.number}: ${level.label}`}>
            <span className="sx-level-medallion" aria-hidden="true">
              <span>NIVEL</span>
              <strong>{String(level.number).padStart(2, '0')}</strong>
            </span>
            <span className="sx-level-rank">
              <strong>{level.label}</strong>
              <small>Tu título de viajero</small>
            </span>
          </div>
        )}
      </Link>
      <section className="sx-panel-progress">
        <span
          className="sx-progress-ring"
          role="progressbar"
          aria-label={progress.label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
        >
          <svg viewBox="0 0 96 96" aria-hidden="true">
            <circle cx={48} cy={48} r={40} fill="none" stroke="var(--sx-night-raised)" strokeWidth={7} />
            <circle
              cx={48}
              cy={48}
              r={40}
              fill="none"
              stroke="var(--sx-gold)"
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - percentage / 100)}
            />
          </svg>
          <strong>{Math.round(percentage)}%</strong>
        </span>
        <div>
          <span className="sx-panel-zone">
            {zonaCiudad ? (
              <Building2 size={16} aria-hidden="true" />
            ) : (
              <MapPinned size={16} aria-hidden="true" />
            )}
            {zonaCiudad ? 'Ciudad' : 'Camino'}
          </span>
          <h2>{progress.label}</h2>
          <p>Crece con cada {zonaCiudad ? progresoCiudad : 'misión del camino.'}</p>
        </div>
      </section>
      {siguiente !== undefined ? (
        <SiguientePasoServidor
          paso={siguiente}
          disponibles={disponibles}
          saludo={
            !!getReturnGreeting(adventure, siguiente && 'punto' in siguiente ? siguiente.punto : undefined)
          }
          onAbrir={onSiguiente}
        />
      ) : (
        <section className="sx-panel-section">
          {recommended ? (
            <button type="button" className="sx-next-step" onClick={() => onSelect(recommended.id)}>
              <span>
                <span className="sx-next-label">
                  <Target className="sx-next-target" size={24} aria-hidden="true" />
                  Siguiente paso
                </span>
                {greeting && <small className="sx-panel-return">¡Qué bueno verte de nuevo!</small>}
                <strong>{recommended.title}</strong>
              </span>
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          ) : (
            <>
              <h2>Siguiente paso</h2>
              <p className="sx-panel-subtitle">No hay actividades por realizar en esta zona por ahora.</p>
            </>
          )}
        </section>
      )}
      <section className="sx-panel-section sx-signal-card">
        <div className="sx-signal-heading">
          <h2>
            <Compass size={18} aria-hidden="true" />
            Tu señal de hoy
          </h2>
          {signal && (
            <p className="sx-panel-signal" aria-label={`${signal.value} de 10`}>
              <strong>{signal.value}</strong>
              <span>/10</span>
            </p>
          )}
        </div>
        {!signal && <p className="sx-panel-subtitle">¿Qué tan seguro te sientes hoy de tu próximo paso?</p>}
        <div
          className="sx-signal-segments"
          role="progressbar"
          aria-label="Señal de hoy"
          aria-valuemin={0}
          aria-valuemax={10}
          aria-valuenow={signal?.value ?? 0}
        >
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} data-filled={i < (signal?.value ?? 0)} />
          ))}
        </div>
        <div className="sx-signal-actions">
          <button
            type="button"
            className="sx-signal-edit"
            title={checkIn.bloqueada ? checkIn.mensaje : undefined}
            onClick={checkIn.pasos ? () => onGuide?.(checkIn.pasos!) : onCheckIn}
          >
            <PenLine size={14} aria-hidden="true" />
            {signal ? 'Cambiar' : 'Registrar mi señal'}
            {textoOculto(checkIn)}
            {checkIn.bloqueada && <LockKeyhole className="sx-quick-lock" size={12} aria-hidden="true" />}
          </button>
          <Link className="sx-signal-history" to={appPaths.student.signals}>
            <TrendingUp size={14} aria-hidden="true" />
            Ver evolución
          </Link>
        </div>
      </section>
      <section className="sx-panel-section">
        <h2>Accesos rápidos</h2>
        <nav className="sx-quick-links" aria-label="Accesos rápidos">
          <Link to={appPaths.student.profile}>
            <FolderHeart size={18} />
            <span>Mi perfil</span>
          </Link>
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
      {siguiente === undefined && (
        <section className="sx-panel-section">
          <h2>
            Actividades disponibles{' '}
            <span className="sx-panel-count">{getListedActivities(points, false).length}</span>
          </h2>
          {visible.length ? (
            <>
              <div className="sx-available-list">
                {visible.map((point) => (
                  <button type="button" key={point.id} onClick={() => onSelect(point.id)}>
                    <span>
                      <strong>{point.title}</strong>
                      <small>
                        {point.subtitle}
                        {point.opcional && ' · opcional'}
                      </small>
                    </span>
                    <span
                      className="sx-available-dot"
                      data-recommended={point.id === recommended?.id}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="sx-panel-subtitle">No hay actividades por realizar en esta zona por ahora.</p>
          )}
          <Link className="sx-panel-link" to={studentActivitiesPath}>
            Ver más
          </Link>
        </section>
      )}
    </div>
  )
}
