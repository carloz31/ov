// Ajuste perfil-capitulos: una casilla por sección, en el orden de la tarjeta. Son independientes porque las
// secciones no se llenan en orden. Decorativas: el texto accesible es «x de y secciones» o «Plan completo».
export function PlanSectionCells({ casillas }: { casillas: boolean[] }) {
  return (
    <span className="sx-d-plan-cells" aria-hidden="true">
      {casillas.map((lista, i) => (
        <span key={i} data-lista={lista} />
      ))}
    </span>
  )
}
