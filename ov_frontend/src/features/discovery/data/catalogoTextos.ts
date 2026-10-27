// Ajuste catalogo-datos-reales (F6b): textos fijos de los detalles del catálogo del servidor.

// Año de los ingresos de egresados de Ponte en Carrera que muestra el pie de página (texto del front).
export const ANIO_PONTE_EN_CARRERA = 2025

// Preparación que pide cada nivel de O*NET (`job_zone`, de 1 a 5), como la publica Mi Próximo Paso.
export const preparacionJobZone: Record<number, string> = {
  1: 'poca o ninguna',
  2: 'algo de preparación',
  3: 'media',
  4: 'considerable',
  5: 'extensa',
}

// «Comparado con tu resultado» en el detalle de una profesión, según las letras que comparten.
export const textosComparacion = {
  principal: (nombre: string) => `Comparten el interés principal, ${nombre}.`,
  alguna: (nombres: string) => `Comparten ${nombres}, aunque no el interés principal.`,
  ninguna: 'No comparten ninguna letra: tus intereses van por otro lado, aunque eso no la descarta.',
}
