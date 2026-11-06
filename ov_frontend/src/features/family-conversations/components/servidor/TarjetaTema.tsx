import { Link } from 'react-router'
import { ArrowRight, Info, LockKeyhole } from 'lucide-react'
import { lineaEstado, puedeAdelantar, respondieron } from '@/lib/servidor/adaptadoresConversaciones'
import type { ConversacionCuenta } from '@/types/servidor'
import type { ModeloFamilia } from '../../types'
import { ParAvatares } from './ParAvatares'

// F08 (E4/A4, spec §2): un tema con su bloque, el tema, la pregunta del rol, los avatares y la línea de estado.
// Por abrir (estudiante): sin pregunta, con el mensaje del servidor y el enlace al mapa. El apoderado ve punteado lo
// que su hijo aún no abrió y puede adelantar su respuesta.
export function TarjetaTema({ m, c }: { m: ModeloFamilia; c: ConversacionCuenta }) {
  const { textos: t } = m
  if (c.estado === 'bloqueada')
    return (
      <article className="fam-card fam-tema fam-tema--bloqueada">
        {c.tema && <span className="fam-chip">{c.tema}</span>}
        <p className="fam-kicker">{c.titulo}</p>
        <h3>{t.porAbrirTitulo}</h3>
        <p className="fam-bloqueo">
          <LockKeyhole aria-hidden="true" size={18} />
          <span>
            {c.bloqueo_mensaje}{' '}
            {m.rutas.mapa && (
              <Link className="fam-link" to={m.rutas.mapa}>
                {t.irAlMapa}
              </Link>
            )}
          </span>
        </p>
      </article>
    )
  const adelantar = puedeAdelantar(c)
  const responde = c.estado === 'sin_responder' || c.estado === 'te_toca'
  const avatares = respondieron(c, m.rol)
  return (
    <article className={`fam-card fam-tema${adelantar ? ' fam-tema--adelantar' : ''}`}>
      {c.estado === 'te_toca' && <span className="fam-tema-nueva">{t.nueva}</span>}
      {c.tema && <span className="fam-chip">{c.tema}</span>}
      <p className="fam-kicker">{c.titulo}</p>
      <h3>{c.pregunta}</h3>
      {adelantar && t.adelantarNota && (
        <p className="fam-bloqueo">
          <Info aria-hidden="true" size={18} />
          {t.adelantarNota(t.otro)}
        </p>
      )}
      <div className="fam-tema-pie">
        <ParAvatares
          estudiante={avatares.estudiante}
          familia={avatares.familia}
          letra={t.letraEstudiante}
          texto={adelantar && t.temaNoAbierto ? t.temaNoAbierto : lineaEstado(c, t.otro)}
        />
        <Link className={`fam-btn${adelantar ? ' fam-btn--claro' : ''}`} to={m.rutas.conversacion(c.codigo)}>
          {adelantar ? t.adelantar : responde ? t.responder : t.ver}
          {!adelantar && <ArrowRight aria-hidden="true" size={18} />}
        </Link>
      </div>
    </article>
  )
}
