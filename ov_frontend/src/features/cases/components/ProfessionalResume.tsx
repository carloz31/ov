import type { ForestFireProfessional } from '@/types/cases'
import { getOccupation } from '@/features/discovery/lib/catalogSelectors'
import { discoveryPaths } from '@/routes/discoveryPaths'
export function ProfessionalResume({ professional }: { professional: ForestFireProfessional }) {
  const occupation = getOccupation(professional.occupationId)
  return (
    <article className="ff-resume">
      <p className="ff-eyebrow">Hoja de vida · Contacto</p>
      <div className="ff-contact-heading">
        <span className="ff-initial">{professional.personName.charAt(0)}</span>
        <div>
          <h2>{professional.personName}</h2>
          <p>{occupation?.name ?? professional.name}</p>
        </div>
      </div>
      {occupation ? (
        <>
          {occupation.contentStatus === 'pending' && <p className="ff-preparing">Ficha en preparación</p>}
          <h3>Qué hacen</h3>
          <p>{occupation.whatTheyDo}</p>
          <h3>Conocimientos que usan</h3>
          <ul className="ff-tags">
            {occupation.knowledge.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h3>Habilidades que necesitan</h3>
          <ul className="ff-tags">
            {occupation.skills.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <footer>
            <p>Datos del catálogo de ocupaciones</p>
            <p>{occupation.onetCode ? `O*NET ${occupation.onetCode}` : 'O*NET por completar'}</p>
            <a href={discoveryPaths.occupation(occupation.id)} target="_blank" rel="noopener noreferrer">
              Ver la ficha completa<span className="sr-only"> (abre otra pestaña)</span>
            </a>
          </footer>
        </>
      ) : (
        <p className="ff-preparing">Ficha en preparación</p>
      )}
    </article>
  )
}
