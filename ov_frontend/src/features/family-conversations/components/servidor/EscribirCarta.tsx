import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, CircleHelp, Heart, Sparkles } from 'lucide-react'
import { cartaEditable } from '@/lib/servidor/adaptadoresConversaciones'
import { contarPalabras } from '../../lib/familiaServidor'
import type { EstadoNavegacionFamilia, ModeloFamilia } from '../../types'
import { CabeceraFamilia } from './CabeceraFamilia'

// F08 (E3/A3): el papel de la carta y, al lado, Lumi con sus ideas (no se insertan en el texto). Al guardar, el
// área de texto queda en solo lectura y el botón ocupado; si falla, vuelve a habilitarse con el texto intacto.
// Entregada (todas conversadas), la carta se lee y no se guarda más.
export function EscribirCarta({ m }: { m: ModeloFamilia }) {
  const { textos: t, datos } = m
  const navigate = useNavigate()
  const [texto, setTexto] = useState(datos?.carta_propia ?? '')
  if (!datos) return null
  const editable = cartaEditable(datos)
  const guardando = m.enviando === 'carta'

  async function guardar() {
    const respuesta = await m.guardarCarta(texto)
    if (!respuesta.ok) return m.avisar({ titulo: t.noSeGuardo, descripcion: respuesta.mensaje, error: true })
    const estado: EstadoNavegacionFamilia = { aviso: { titulo: t.cartaGuardadaAviso, error: false } }
    navigate(m.rutas.lista, { state: estado })
  }

  return (
    <div className="fam-container">
      <Link className="fam-back" to={m.rutas.lista}>
        <ArrowLeft aria-hidden="true" size={18} />
        {t.cartaVolver}
      </Link>
      <CabeceraFamilia kicker={t.cartaKicker} titulo={t.cartaTitulo} subtitulo={t.cartaSubtitulo} />
      <div className="fam-carta-layout">
        <section className="fam-papel">
          <h2 className="fam-caligrafia" id="fam-saludo">
            {t.saludo()}
          </h2>
          <textarea
            aria-labelledby="fam-saludo"
            disabled={guardando}
            placeholder={t.cartaPlaceholder}
            readOnly={!editable}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <div className="fam-papel-pie">
            <span className="fam-nota">
              {editable ? t.cartaContador(contarPalabras(texto)) : t.cartaEntregada}
            </span>
            {editable && (
              <button
                className="fam-btn"
                disabled={guardando || !texto.trim()}
                type="button"
                onClick={() => void guardar()}
              >
                <Heart aria-hidden="true" size={20} />
                {guardando ? t.guardando : t.guardarCarta}
              </button>
            )}
          </div>
        </section>
        <aside className="fam-lateral">
          <section className="fam-card">
            <div className="fam-lumi">
              <span className="fam-lumi-icono">
                <Sparkles aria-hidden="true" size={24} />
              </span>
              <p>
                <strong>{t.cartaLumiNombre}</strong> {t.cartaLumi}
              </p>
            </div>
            <button className="fam-btn fam-btn--claro" type="button" onClick={m.abrirIdeas}>
              <CircleHelp aria-hidden="true" size={20} />
              {t.cartaIdeasBoton}
            </button>
          </section>
          <section className="fam-panel">
            <h3>{t.cartaGuardadaTitulo}</h3>
            <p>{t.cartaGuardadaTexto}</p>
            {t.cartaNota && <p>{t.cartaNota}</p>}
          </section>
        </aside>
      </div>
    </div>
  )
}
