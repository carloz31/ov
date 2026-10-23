import { useState } from 'react'
import { ArrowLeft, Compass, LockKeyhole, Signal } from 'lucide-react'
import { Link } from 'react-router'
import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { Parchment } from '@/components/student/Parchment'
import { useHistorialSenales } from '@/features/adventure/hooks/useHistorialSenales'
import { useStudentOverlays } from '@/features/adventure/context/overlayContext'
import '@/styles/student/history.css'

function StudentSignalsView() {
  const { openCheckIn } = useStudentOverlays()
  const { today, checkIns, escala, y, marcas, total, servidor, mapa } = useHistorialSenales()
  const [selectedId, setSelectedId] = useState(checkIns.at(-1)?.id)
  const selected = checkIns.find((checkIn) => checkIn.id === selectedId) ?? checkIns.at(-1)
  const points = checkIns.map((checkIn, index) => ({
    ...checkIn,
    x: checkIns.length === 1 ? 400 : 60 + (index / (checkIns.length - 1)) * 680,
    y: y(checkIn.value),
  }))

  return (
    <DiscoveryStage ambient="journal">
      <main className="sx-history sx-history-signals">
        <header className="sx-d-header">
          <div>
            <p className="sx-history-eyebrow">
              <Signal size={18} aria-hidden="true" /> Tu recorrido
            </p>
            <h1>Historial de señales</h1>
            <p>
              Observa cómo ha cambiado tu seguridad vocacional. Pulsa cualquier punto para consultar tu señal
              de ese día.
            </p>
          </div>
          <Link className="sx-d-action sx-d-action-ghost" to={mapa}>
            <ArrowLeft size={18} aria-hidden="true" /> Volver al mapa
          </Link>
        </header>

        <div className="sx-history-signal-layout">
          <aside className="sx-d-stack">
            <Parchment label="Una pausa para escucharte">
              <span className="sx-history-activity-seal" aria-hidden="true">
                <Compass size={30} />
              </span>
              <h2>Tu señal de hoy</h2>
              <p>¿Qué tan seguro te sientes hoy de tu próximo paso?</p>
              {today ? (
                <p className="sx-history-score" aria-label={`${today.value} de ${escala}`}>
                  <strong>{today.value}</strong>
                  <span>{`/${escala}`}</span>
                </p>
              ) : (
                <p className="sx-d-muted">Aún no has registrado tu señal de hoy.</p>
              )}
              <div className="sx-history-segments" aria-hidden="true">
                {Array.from({ length: escala }, (_, index) => (
                  <span key={index} data-filled={index < (today?.value ?? 0)} />
                ))}
              </div>
              {(!servidor || servidor.puedeRegistrar) && (
                <button className="sx-d-action sx-d-full" type="button" onClick={() => openCheckIn()}>
                  {servidor ? 'Registrar mi señal' : today ? 'Cambiar mi señal' : 'Registrar mi señal'}
                </button>
              )}
            </Parchment>
            <Parchment className="sx-d-dark sx-history-privacy">
              <LockKeyhole size={22} aria-hidden="true" />
              <p>Tu orientadora ve esta señal y su tendencia, nunca el texto de tu diario.</p>
            </Parchment>
          </aside>

          <Parchment
            className="sx-history-chart-card"
            label="Las huellas de tu recorrido"
            title="Seguridad vocacional en el tiempo"
          >
            <div className="sx-history-chart-meta">
              <span className="sx-history-badge">{`Escala del 1 al ${escala}`}</span>
              <span>
                {servidor?.conteo ?? (
                  <>
                    {points.length} {points.length === 1 ? 'señal registrada' : 'señales registradas'}
                    {total > 12 ? ' · Últimas 12' : ''}
                  </>
                )}
              </span>
            </div>
            {points.length ? (
              <>
                <div
                  className="sx-history-chart-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Historial desplazable de señales"
                >
                  <svg
                    aria-label={`Gráfico histórico de señales del 1 al ${escala}`}
                    role="group"
                    viewBox="0 0 800 290"
                  >
                    {marcas.map((value) => {
                      const altura = y(value)
                      return (
                        <g key={value} aria-hidden="true">
                          <line className="sx-history-chart-grid" x1="60" x2="740" y1={altura} y2={altura} />
                          <text
                            className="sx-history-chart-label"
                            fontSize="12"
                            textAnchor="end"
                            x="28"
                            y={altura + 4}
                          >
                            {value}
                          </text>
                        </g>
                      )
                    })}
                    {points.length > 1 && (
                      <polyline
                        className="sx-history-chart-trail"
                        fill="none"
                        points={points.map((point) => `${point.x},${point.y}`).join(' ')}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="4"
                      />
                    )}
                    {points.map((point) => {
                      const active = selected?.id === point.id
                      return (
                        <g key={point.id}>
                          <g
                            aria-label={`${new Date(point.createdAt).toLocaleDateString('es-PE')}: ${point.value} de ${escala}`}
                            aria-pressed={active}
                            className="sx-history-chart-point"
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedId(point.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault?.()
                                setSelectedId(point.id)
                              }
                            }}
                          >
                            <circle className="sx-history-chart-target" cx={point.x} cy={point.y} r="28" />
                            <circle
                              className="sx-history-chart-dot"
                              cx={point.x}
                              cy={point.y}
                              r={active ? 10 : 7}
                              data-active={active}
                            />
                          </g>
                          <text
                            className="sx-history-chart-label"
                            aria-hidden="true"
                            fontSize="11"
                            textAnchor="middle"
                            x={point.x}
                            y="278"
                          >
                            {new Date(point.createdAt).toLocaleDateString('es-PE', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                </div>
                <p className="sx-history-chart-hint">
                  Cada punto es una señal que registraste. Selecciónalo para ver su fecha y valor.
                </p>
              </>
            ) : (
              <div className="sx-history-empty">
                <span className="sx-history-activity-seal" aria-hidden="true">
                  <Signal size={28} />
                </span>
                <h3>El inicio de tu rastro</h3>
                <p>Registra tu primera señal para comenzar el historial.</p>
              </div>
            )}
            {selected && (
              <div className="sx-history-selected">
                <Compass size={22} aria-hidden="true" />
                <p role="status">
                  Señal seleccionada · {selected.value}
                  {`/${escala} ·`}{' '}
                  {new Date(selected.createdAt).toLocaleDateString('es-PE', { dateStyle: 'long' })}
                </p>
              </div>
            )}
          </Parchment>
        </div>
      </main>
    </DiscoveryStage>
  )
}

export { StudentSignalsView }
