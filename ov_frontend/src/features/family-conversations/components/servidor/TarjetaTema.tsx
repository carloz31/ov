import { Link } from 'react-router'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import {
  etiquetaTramo,
  lineaEstado,
  puedeAdelantar,
  respondieron,
} from '@/lib/servidor/adaptadoresConversaciones'
import type { ConversacionCuenta } from '@/types/servidor'
import type { ModeloFamilia } from '../../types'
import { ParAvatares } from './ParAvatares'

// F08 (E4/A4, spec §2): un tema con su bloque, el tema, la pregunta del rol, los avatares y la línea de estado.
// Por abrir (estudiante): sin pregunta, con el mensaje del servidor y el enlace al mapa. El apoderado ve punteado lo
// que su hijo aún no abrió y puede adelantar su respuesta.
export function TarjetaTema({ m, c }: { m: ModeloFamilia; c: ConversacionCuenta }) {
  const { textos: t } = m
  const tramo = etiquetaTramo(c)
  if (c.estado === 'bloqueada')
    return (
      <article className="fam-card fam-tema fam-tema--bloqueada">
        {tramo && <span className="fam-chip">{tramo}</span>}
        <p className="fam-kicker">{c.tema}</p>
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
      {tramo && <span className="fam-chip">{tramo}</span>}
      <p className="fam-kicker">{c.tema}</p>
      <h3>{c.pregunta}</h3>
      {adelantar && t.adelantarNota && <p className="fam-nota">{t.adelantarNota(t.otro)}</p>}
      <div className="fam-tema-pie">
        <ParAvatares
          estudiante={avatares.estudiante}
          familia={avatares.familia}
          texto={lineaEstado(c, t.otro)}
        />
        <Link className="fam-btn" to={m.rutas.conversacion(c.codigo)}>
          {adelantar ? t.adelantar : responde ? t.responder : t.ver}
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </div>
    </article>
  )
}
