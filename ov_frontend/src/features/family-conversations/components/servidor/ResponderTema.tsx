import { useState } from 'react'
import { ArrowRight, CircleHelp, LockKeyhole } from 'lucide-react'
import { respondieron } from '@/lib/servidor/adaptadoresConversaciones'
import type { ConversacionCuenta } from '@/types/servidor'
import type { ModeloFamilia } from '../../types'
import { CajaEsperando } from './CajaEsperando'

// F08 (E5): la pregunta del rol y «Tu mirada». A la derecha, si el otro ya respondió, su mirada sellada (un párrafo
// borroso decorativo: el servidor no la entrega hasta que respondan los dos); si no, la caja de espera. Al guardar,
// el área de texto se desactiva y el botón queda ocupado; si falla, vuelve con el texto intacto.
export function ResponderTema({
  m,
  c,
  onGuardada,
}: {
  m: ModeloFamilia
  c: ConversacionCuenta
  onGuardada: () => void
}) {
  const { textos: t } = m
  const [texto, setTexto] = useState(c.mi_respuesta ?? '')
  const guardando = m.enviando === c.codigo
  const avatares = respondieron(c, m.rol)

  async function guardar() {
    const respuesta = await m.responder(c.codigo, texto)
    if (!respuesta.ok) return m.avisar({ titulo: t.noSeGuardo, descripcion: respuesta.mensaje, error: true })
    m.avisar({ titulo: t.respuestaGuardadaAviso, error: false })
    onGuardada()
  }

  return (
    <section className="fam-card fam-tema-detalle">
      {c.tema && <span className="fam-chip">{c.tema}</span>}
      {m.abrirAyuda && (
        <button aria-label="Abrir guía" className="fam-ayuda" type="button" onClick={m.abrirAyuda}>
          <CircleHelp aria-hidden="true" size={24} />
        </button>
      )}
      <p className="fam-kicker">{c.titulo}</p>
      <h2>{t.dosMiradas(c.titulo)}</h2>
      <div className="fam-grid-2">
        <div className="fam-respuesta">
          <p className="fam-pregunta">{c.pregunta}</p>
          <label className="fam-etiqueta" htmlFor={`fam-respuesta-${c.codigo}`}>
            {t.tuMirada}
          </label>
          <textarea
            disabled={guardando}
            id={`fam-respuesta-${c.codigo}`}
            placeholder={t.respuestaPlaceholder}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <div className="fam-papel-pie">
            <span className="fam-nota">{t.respuestaNota}</span>
            <button
              className="fam-btn"
              disabled={guardando || !texto.trim()}
              type="button"
              onClick={() => void guardar()}
            >
              {guardando ? t.guardando : t.guardarRespuesta}
              <ArrowRight aria-hidden="true" size={18} />
            </button>
          </div>
        </div>
        {c.estado === 'te_toca' ? (
          <div className="fam-caja-punteada">
            <LockKeyhole aria-hidden="true" className="mx-auto" size={36} />
            <h3>{t.otroRespondio}</h3>
            <p>{t.otroRespondioTexto}</p>
            <p aria-hidden="true" className="fam-borroso">
              {t.borroso}
            </p>
          </div>
        ) : (
          <CajaEsperando
            avatares={avatares}
            letra={t.letraEstudiante}
            titulo={t.esperandoTitulo}
            texto={t.esperandoTexto}
          />
        )}
      </div>
    </section>
  )
}
