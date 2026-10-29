import { Loader2, X } from 'lucide-react'
import { Link } from 'react-router'
import { iniciales } from '@/lib/servidor/adaptadoresInvestigaciones'
import type { FichaEntrevistaEntrada } from '@/types/servidor'
import type { ModeloPublicar } from '../../hooks/usePublicarEntrevista'

function Campo({
  m,
  campo,
  etiqueta,
  ayuda,
  error,
  placeholder,
  largo = false,
}: {
  m: ModeloPublicar
  campo: keyof FichaEntrevistaEntrada
  etiqueta: string
  ayuda?: string
  error: string
  placeholder: string
  largo?: boolean
}) {
  const invalido = !!m.errores?.[campo]
  const props = {
    className: 'sx-d-input',
    placeholder,
    value: m.ficha[campo],
    'aria-invalid': invalido || undefined,
    onChange: (e: { target: { value: string } }) => m.cambiar(campo, e.target.value),
  }
  return (
    <label className="sx-i-campo">
      <span className="sx-i-etiqueta">{etiqueta}</span>
      {largo ? <textarea rows={4} {...props} /> : <input {...props} />}
      {invalido ? (
        <small className="sx-i-error-campo">{error}</small>
      ) : (
        ayuda && <small className="sx-i-letra-chica">{ayuda}</small>
      )}
    </label>
  )
}

// F09 (boceto 04): la ficha de la entrevista, los coautores y el permiso. Al editar, los autores actuales quedan.
export function FormularioPublicar({ m }: { m: ModeloPublicar }) {
  return (
    <form
      className="sx-i-panel"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void m.enviar()
      }}
    >
      <p className="sx-i-kicker">
        {m.editar ? 'Editar ficha' : 'Publicar'} · {m.ocupacion?.titulo}
      </p>
      <h2>Comparte lo que descubriste</h2>
      <small className="sx-i-letra-chica">
        Esto es lo que verán tus compañeros en la tarjeta y en el detalle. Lo puedes editar después.
      </small>
      <fieldset className="sx-i-fieldset" data-guardando={m.enviando || undefined} disabled={m.enviando}>
        <Campo
          m={m}
          campo="titulo"
          etiqueta="Título de tu entrevista"
          placeholder="Una frase que resuma lo que más te marcó"
          ayuda="Ej.: «Objetos que hacen más fácil la vida diaria»"
          error="Escribe un título."
        />
        <div className="sx-i-dos-campos">
          <Campo
            m={m}
            campo="profesional"
            etiqueta="Profesional entrevistado"
            placeholder="Nombre y apellido o iniciales"
            error="Escribe a quién entrevistaste."
          />
          <Campo
            m={m}
            campo="duracion"
            etiqueta="Duración aproximada"
            placeholder="7 min"
            error="Escribe la duración."
          />
        </div>
        <Campo
          m={m}
          campo="enlace"
          etiqueta="Enlace del video en YouTube"
          placeholder="https://youtu.be/…"
          ayuda="Súbelo a tu YouTube como «No listado»: solo quien tenga el enlace lo ve. Validamos que sea un enlace de YouTube."
          error="Pega el enlace de un video de YouTube (youtu.be o youtube.com)."
        />
        <Campo
          m={m}
          campo="resumen"
          etiqueta="En pocas palabras"
          placeholder="Qué aprendiste, qué te sorprendió, qué le recomendarías a alguien que quiera esta ocupación."
          ayuda="Entre 2 y 5 líneas. Sin repreguntas de Lumi aquí: lo que escribas se publica tal cual."
          error="Cuenta en pocas palabras lo que descubriste."
          largo
        />
        <div className="sx-i-campo">
          <span className="sx-i-etiqueta">
            {m.editar ? 'Coautores' : '¿La hicieron en grupo? Agrega a tus compañeros'}
          </span>
          <div className="sx-i-coautores">
            {m.autoresActuales
              .filter((a) => a.codigo !== m.cuenta)
              .map((a) => (
                <span className="sx-i-chip-coautor" key={a.codigo}>
                  <span className="sx-i-avatar">{iniciales(a.nombre)}</span> {a.nombre}
                </span>
              ))}
            {m.editar && m.autoresActuales.length <= 1 && <small>Sin coautores.</small>}
            {m.coautores.map((a) => (
              <span className="sx-i-chip-coautor" key={a.codigo}>
                <span className="sx-i-avatar">{iniciales(a.nombre)}</span> {a.nombre}
                <button
                  type="button"
                  aria-label={`Quitar a ${a.nombre}`}
                  onClick={() => m.quitarCoautor(a.codigo)}
                >
                  <X aria-hidden="true" size={14} />
                </button>
              </span>
            ))}
            {!m.editar && (
              <span className="sx-i-buscar-coautor">
                <input
                  aria-label="Buscar compañero"
                  placeholder="Buscar compañero…"
                  value={m.buscar}
                  disabled={!m.hayAliados}
                  onChange={(e) => m.setBuscar(e.target.value)}
                />
                {m.buscar.trim() && (
                  <span className="sx-i-resultados">
                    {m.candidatos.length ? (
                      m.candidatos.map((a) => (
                        <button type="button" key={a.codigo} onClick={() => m.agregarCoautor(a)}>
                          {a.nombre}
                        </button>
                      ))
                    ) : (
                      <small>Nadie con ese nombre tiene una guía lista sobre esta ocupación.</small>
                    )}
                  </span>
                )}
              </span>
            )}
          </div>
          <small className="sx-i-letra-chica">
            {m.editar
              ? 'Los coautores se eligen al publicar y no cambian después.'
              : 'Solo aparecen los de tu salón que tienen guía lista para esta misma ocupación. Al publicar, su investigación en curso se cierra y la entrevista les aparece como suya. Después de publicar, los coautores ya no cambian.'}
          </small>
        </div>
        {!m.editar && (
          <label className="sx-i-permiso">
            <input type="checkbox" checked={m.permiso} onChange={(e) => m.setPermiso(e.target.checked)} />
            La persona entrevistada sabe que el video se compartirá con mi salón y dio su permiso.
          </label>
        )}
        {m.errores?.permiso && (
          <small className="sx-i-error-campo">Necesitamos que confirmes el permiso.</small>
        )}
      </fieldset>
      {m.error && (
        <p className="sx-i-aviso" role="alert">
          {m.error}
        </p>
      )}
      <div className="sx-i-acciones">
        <button
          type="submit"
          className="sx-i-boton"
          disabled={m.enviando}
          aria-busy={m.enviando || undefined}
        >
          {m.enviando && <Loader2 aria-hidden="true" size={18} className="animate-spin" />}
          {m.editar ? 'Guardar ficha' : 'Publicar entrevista'}
        </button>
        <Link className="sx-i-boton" data-tono="claro" to={m.volver}>
          Volver
        </Link>
      </div>
    </form>
  )
}
