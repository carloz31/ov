import type { ForestFireProfessional } from '@/types/cases'
import { useHojaDeVida } from '@/features/cases/hooks/useHojaDeVida'
export function ProfessionalResume({ professional }: { professional: ForestFireProfessional }) {
  const estado = useHojaDeVida(professional)
  const hoja = estado?.tipo === 'lista' ? estado.hoja : undefined
  return (
    <article className="ff-resume">
      <p className="ff-eyebrow">Hoja de vida · Contacto</p>
      <div className="ff-contact-heading">
        <span className="ff-initial">{professional.personName.charAt(0)}</span>
        <div>
          <h2>{professional.personName}</h2>
          <p>{hoja?.ocupacion ?? professional.name}</p>
        </div>
      </div>
      {hoja ? (
        <>
          {hoja.preparando && <p className="ff-preparing">Ficha en preparación</p>}
          {hoja.queHacen && (
            <>
              <h3>Qué hacen</h3>
              <p>{hoja.queHacen}</p>
            </>
          )}
          {hoja.conocimientos.length > 0 && (
            <>
              <h3>Conocimientos que usan</h3>
              <ul className="ff-tags">
                {hoja.conocimientos.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
          {hoja.habilidades.length > 0 && (
            <>
              <h3>Habilidades que necesitan</h3>
              <ul className="ff-tags">
                {hoja.habilidades.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : estado?.tipo === 'error' ? (
        <p className="ff-preparing" role="alert">
          {estado.mensaje}
        </p>
      ) : (
        !estado && <p className="ff-preparing">Ficha en preparación</p>
      )}
    </article>
  )
}
