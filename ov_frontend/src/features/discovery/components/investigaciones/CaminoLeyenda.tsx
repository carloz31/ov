import { Check, Circle, Crown } from 'lucide-react'
import { medidorLeyenda } from '@/lib/servidor/adaptadoresInvestigaciones'
import type { EntrevistaDetalle } from '@/types/servidor'

// F09 (boceto 06): el medidor de la entrevista propia con sus dos condiciones y la nota de permisos.
export function CaminoLeyenda({ entrevista }: { entrevista: EntrevistaDetalle }) {
  const medidor = medidorLeyenda({
    favoritos: entrevista.favoritos,
    favoritosLeyenda: entrevista.favoritos_leyenda,
    destacada: entrevista.destacada,
    leyenda: entrevista.leyenda,
  })
  const favoritosListos = entrevista.favoritos >= entrevista.favoritos_leyenda
  return (
    <div className="sx-i-lateral">
      <section className="sx-i-panel">
        <h2 className="sx-i-titulo-leyenda">
          <Crown aria-hidden="true" size={20} /> {entrevista.leyenda ? 'Es Leyenda' : 'Camino a Leyenda'}
        </h2>
        <div
          className="sx-i-barra"
          role="progressbar"
          aria-label="Camino a Leyenda"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={medidor.porcentaje}
        >
          <span style={{ width: `${medidor.porcentaje}%` }} />
        </div>
        <p className="sx-i-condicion">
          {entrevista.destacada ? <Check aria-hidden="true" size={18} /> : <Circle aria-hidden="true" size={18} />}
          Destacada por tu orientadora
        </p>
        <p className="sx-i-condicion">
          {favoritosListos ? <Check aria-hidden="true" size={18} /> : <Circle aria-hidden="true" size={18} />}
          Favoritos de compañeros{' '}
          <span className="sx-i-meta">
            · {medidor.favoritos} de {medidor.requeridos}
          </span>
        </p>
        <small className="sx-i-meta">
          {entrevista.leyenda
            ? 'Está en el Salón de Leyendas: la ven todos los salones y las promociones que vienen.'
            : 'Cuando se cumplan las dos, pasa al Salón de Leyendas: la verán todos los salones y las promociones que vienen. Lo sabrás con un sello en tu pasaporte.'}
        </small>
      </section>
      <section className="sx-i-panel sx-i-panel-nota">
        <h3>Autores y coautores: mismos permisos</h3>
        <p>
          Cualquiera de los autores puede editar la ficha, retirar la entrevista y reportar comentarios. Ninguno reacciona
          a la propia.
        </p>
        <p>
          Lo que pensaban antes no se muestra aquí: la primera entrevista publicada abre en la Ciudad una misión de
          registro que lo trae como eco para contrastarlo.
        </p>
      </section>
    </div>
  )
}
