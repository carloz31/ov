import { textoInstitucion } from '@/lib/servidor/adaptadoresPanel'
import type {
  GestionPanel,
  InstitucionPlanPerfil,
  MarcaItem,
  RegistroFila,
  TipoFormacion,
} from '@/types/servidor'

// Ajuste panel-estudiantes · Textos que comparten los bloques del perfil del estudiante (los tonos de zona y cambio se
// retiraron en el ajuste partida-llegada-liviano: ahora son `MarcaTexto`).

// «UNMSM · universidad pública».
export function textoInstitucionPerfil(institucion: InstitucionPlanPerfil) {
  const tipo = textoInstitucion(institucion.tipo as TipoFormacion, institucion.gestion as GestionPanel | null)
  return `${institucion.nombre} · ${tipo.toLocaleLowerCase('es')}`
}

// Ajuste panel-orientadora-observaciones §2: la opción elegida de un selector del perfil, resaltada con el color
// principal (el `SegmentedControl` común no pinta `aria-pressed`, y también lo usa el estudiante).
export const SELECTOR_RESALTADO =
  'flex-wrap gap-2 [&>button]:min-h-11 [&>button]:font-semibold [&>button[aria-pressed=true]]:border-primary [&>button[aria-pressed=true]]:bg-primary [&>button[aria-pressed=true]]:text-primary-foreground [&>button[aria-pressed=true]]:hover:bg-primary'

// Ajuste respuestas-orientadora §1 y §3.3: las marcas de la pestaña Respuestas. Requiere atención es la intensidad
// fuerte (punto relleno, negrita); sin contenido, la suave (anillo, peso normal). Las explicaciones son fijas por marca:
// nunca los motivos del LLM.
export type IntensidadMarca = 'fuerte' | 'suave'
export const MARCAS_ITEM: Record<MarcaItem, { intensidad: IntensidadMarca; titulo: string; explicacion: string }> = {
  REQUIERE_ATENCION: {
    intensidad: 'fuerte',
    titulo: 'Requiere atención',
    explicacion: 'Lumi la derivó a usted en lugar de seguir preguntando.',
  },
  VACIA: { intensidad: 'suave', titulo: 'Sin contenido', explicacion: 'La dejó vacía.' },
  FUERA_DE_TEMA: { intensidad: 'suave', titulo: 'Sin contenido', explicacion: 'No responde a la pregunta.' },
}
// El texto corto de una fila: «Requiere atención» o «N sin contenido».
export function textoMarcaFila(fila: RegistroFila) {
  if (fila.marca === 'REQUIERE_ATENCION') return 'Requiere atención'
  if (fila.marca === 'SIN_CONTENIDO') return `${fila.sin_contenido} sin contenido`
  return null
}
export function textoPorRevisar(cantidad: number) {
  if (!cantidad) return null
  return cantidad === 1 ? '1 registro con algo por revisar' : `${cantidad} registros con algo por revisar`
}
