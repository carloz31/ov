import type { InstrumentPageId } from '@/types/discovery'
import type { TipoResultadoHelena } from '@/types/profile'

// Respaldo de presentación: store/servidor todavía no carga GET /instrumentos.
export const resultPages: Partial<
  Record<InstrumentPageId, { instrumento: string; tipoResultado: TipoResultadoHelena }>
> = {
  intereses: { instrumento: 'TEST-RIASEC', tipoResultado: 'COINCIDENCIAS' },
  inteligencias: { instrumento: 'TEST-INT', tipoResultado: 'DESTACADAS' },
}
