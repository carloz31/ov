import { Crown, Loader2, Star } from 'lucide-react'
import { Link } from 'react-router'
import {
  desglosePorTipo,
  fechaCorta,
  lineaConteos,
  ordenarAutores,
  textoReacciones,
} from '@/lib/servidor/adaptadoresInvestigaciones'
import { appPaths } from '@/routes/paths'
import type { TarjetaEntrevista as Tarjeta, TipoReaccionPublico } from '@/types/servidor'
import { AutorEntrevista } from './AutorEntrevista'
import { MedidorLeyenda } from './MedidorLeyenda'

// F09 (bocetos 01 y 02): la tarjeta de una entrevista. En el salón y las Leyendas, la estrella de favorito (nunca
// en las propias), autores, «N reacciones · Favoritos N» y «Nueva»/«Vista»; en Mis investigaciones, la fecha, los
// coautores, el medidor «Camino a Leyenda» y el desglose por tipo.
export function TarjetaEntrevista({
  tarjeta,
  cuenta,
  mia = false,
  tipos,
  favoritosLeyenda,
  pendiente,
  onFavorito,
}: {
  tarjeta: Tarjeta
  cuenta: string | null
  mia?: boolean
  tipos: TipoReaccionPublico[]
  favoritosLeyenda: number
  pendiente: boolean
  onFavorito: () => void
}) {
  const coautores = tarjeta.autores.filter((a) => a.codigo !== cuenta)
  return (
    <article className="sx-i-tarjeta">
      <div className="sx-i-banda" data-tono={tarjeta.leyenda ? 'leyenda' : undefined}>
        <span>
          {tarjeta.leyenda ? (
            <span className="sx-i-insignia" data-tono="oscuro">
              <Crown aria-hidden="true" size={14} /> Leyenda
            </span>
          ) : (
            tarjeta.destacada && (
              <span className="sx-i-insignia">
                <Star aria-hidden="true" size={14} /> Destacada por tu orientadora
              </span>
            )
          )}
        </span>
        {mia ? (
          <small>Publicada el {fechaCorta(tarjeta.fecha_hora)}</small>
        ) : (
          !tarjeta.propia && (
            <button
              type="button"
              className="sx-i-estrella"
              aria-pressed={tarjeta.favorita}
              aria-label={tarjeta.favorita ? 'Quitar de favoritas' : 'Guardar en favoritas'}
              aria-busy={pendiente || undefined}
              onClick={onFavorito}
            >
              {pendiente ? <Loader2 className="animate-spin" size={18} /> : <Star size={18} />}
            </button>
          )
        )}
      </div>
      <div className="sx-i-cuerpo">
        <p className="sx-i-kicker">Entrevista · {tarjeta.ocupacion.titulo}</p>
        <h2>{tarjeta.titulo}</h2>
        <p className="sx-i-meta">
          {tarjeta.profesional} · {tarjeta.duracion}
        </p>
        {!mia && <p className="sx-i-resumen">{tarjeta.resumen}</p>}
        {mia ? (
          coautores.length > 0 && (
            <div className="sx-i-autores">
              <span>Con</span>
              {coautores.map((a) => (
                <AutorEntrevista key={a.codigo} autor={a} />
              ))}
              <span className="sx-i-meta">(en coautoría)</span>
            </div>
          )
        ) : (
          <div className="sx-i-autores">
            <span>Por</span>
            {ordenarAutores(tarjeta.autores, cuenta).map((a) => (
              <AutorEntrevista key={a.codigo} autor={a} propio={a.codigo === cuenta} />
            ))}
          </div>
        )}
        {mia ? (
          <MedidorLeyenda
            favoritos={tarjeta.favoritos}
            favoritosLeyenda={favoritosLeyenda}
            destacada={tarjeta.destacada}
            leyenda={tarjeta.leyenda}
            detalle={[
              textoReacciones(tarjeta.reacciones),
              ...desglosePorTipo(tarjeta.reacciones_por_tipo, tipos),
            ].join(' · ')}
          />
        ) : (
          <div className="sx-i-pie">
            <span>{lineaConteos(tarjeta.reacciones, tarjeta.favoritos)}</span>
            {!tarjeta.propia &&
              (tarjeta.vista ? <span>Vista</span> : <span className="sx-i-nueva">Nueva</span>)}
          </div>
        )}
        <Link
          className="sx-i-boton"
          data-tono="azul"
          data-ancho="lleno"
          to={`${appPaths.student.interview(tarjeta.codigo)}${mia ? '?desde=mias' : ''}`}
        >
          {mia ? 'Ver mi entrevista y lo que dicen' : 'Ver la entrevista'}
        </Link>
      </div>
    </article>
  )
}
