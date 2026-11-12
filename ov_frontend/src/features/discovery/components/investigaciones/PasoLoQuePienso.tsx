import { Loader2 } from 'lucide-react'
import type { ModeloGuion } from '../../hooks/useGuionInvestigacion'
import { BuscadorFamilia } from './BuscadorFamilia'

// F09 (boceto 09 · HU-057 y HU-100): la familia de carreras y lo que pienso hoy de ese trabajo, en tres campos sin Lumi.
export function PasoLoQuePienso({ m }: { m: ModeloGuion }) {
  const conFamilia = !!m.familia
  return (
    <div className="sx-i-asistente">
      <section className="sx-i-panel">
        <p className="sx-i-kicker">Paso 1 de 3</p>
        <h2>Antes de la entrevista</h2>
        <fieldset className="sx-i-fieldset" data-guardando={m.guardando || undefined} disabled={m.guardando}>
          <div className="sx-i-campo">
            <span className="sx-i-etiqueta">¿En qué familia de carreras trabaja la persona que vas a entrevistar?</span>
            <BuscadorFamilia
              familia={m.familia}
              onElegir={m.elegirFamilia}
              onCambiar={m.quitarFamilia}
            />
            <small className="sx-i-letra-chica">
              Escribe y te vamos mostrando coincidencias. Solo familias del catálogo; si no está, elige la
              más parecida.
            </small>
          </div>
          <hr className="sx-i-separador" />
          <fieldset className="sx-i-fieldset" disabled={!conFamilia}>
            <legend>
              <h3>Lo que pienso hoy de este trabajo</h3>
              <small className="sx-i-letra-chica">
                Tres respuestas cortas. No hay respuestas incorrectas: después de la entrevista las vas a
                comparar con lo que descubriste. Las ve tu orientadora, no tu salón.
              </small>
            </legend>
            <label className="sx-i-campo">
              <span className="sx-i-etiqueta">¿Qué crees que hace en un día normal?</span>
              <textarea
                className="sx-d-input"
                rows={2}
                placeholder="Lo que te imaginas, aunque no estés seguro."
                value={m.dia}
                onChange={(e) => m.setDia(e.target.value)}
              />
            </label>
            <label className="sx-i-campo">
              <span className="sx-i-etiqueta">¿Qué crees que se necesita para trabajar en esto?</span>
              <textarea
                className="sx-d-input"
                rows={2}
                placeholder="Estudios, habilidades, herramientas, carácter…"
                value={m.necesita}
                onChange={(e) => m.setNecesita(e.target.value)}
              />
            </label>
            <label className="sx-i-campo">
              <span className="sx-i-etiqueta">Una duda que quieres resolver con la entrevista</span>
              <input
                className="sx-d-input"
                placeholder="Ej.: ¿se puede vivir de esto en Lima?"
                value={m.duda}
                onChange={(e) => m.setDuda(e.target.value)}
              />
              <small className="sx-i-letra-chica">
                Lumi usará lo que escribas aquí para sugerirte preguntas en el siguiente paso.
              </small>
            </label>
          </fieldset>
        </fieldset>
        <div className="sx-i-acciones">
          <button
            type="button"
            className="sx-i-boton"
            disabled={!m.listoPaso1 || m.guardando}
            aria-busy={m.guardando || undefined}
            onClick={() => void m.seguir()}
          >
            {m.guardando && <Loader2 aria-hidden="true" size={18} className="animate-spin" />}
            Seguir con las preguntas
          </button>
          <small className="sx-i-letra-chica">
            Se habilita al elegir la familia y responder las tres. Se guarda al seguir.
          </small>
        </div>
      </section>
    </div>
  )
}
