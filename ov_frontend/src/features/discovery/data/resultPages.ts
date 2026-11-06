import type { InstrumentPageId } from '@/types/discovery'
import type { TipoResultadoHelena } from '@/types/profile'
import type { IconoPagina } from '../types'

// Respaldo de presentación: store/servidor todavía no carga GET /instrumentos.
// `icono` es opcional: sin él, el sello del perfil toma el del tipo de resultado (`iconoPagina`).
export const resultPages: Partial<
  Record<InstrumentPageId, { instrumento: string; tipoResultado: TipoResultadoHelena; icono?: IconoPagina }>
> = {
  'partida-llegada': { instrumento: 'TEST-PARTIDA-LLEGADA', tipoResultado: 'COMPARACION', icono: 'Flag' },
  intereses: { instrumento: 'TEST-RIASEC', tipoResultado: 'COINCIDENCIAS', icono: 'Compass' },
  inteligencias: { instrumento: 'TEST-INTELIGENCIAS', tipoResultado: 'DESTACADAS', icono: 'Brain' },
  habilidades: { instrumento: 'TEST-HABILIDADES', tipoResultado: 'DESTACADAS', icono: 'Users' },
}
