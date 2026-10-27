import { obtener } from './cliente'
import type {
  CarreraDetalle,
  CarreraResumen,
  FamiliaPublica,
  GrupoPublico,
  Inesperada,
  InstitucionDetalle,
  InstitucionResumen,
  OcupacionDetalle,
  OcupacionResumen,
  Pagina,
  RespuestaServidor,
  UbicacionPublica,
} from '@/types/servidor'

// F06: las tres clases del catálogo, con el nombre de su ruta.
export type ClaseCatalogo = 'carreras' | 'ocupaciones' | 'instituciones'
export type FiltrosCatalogo = {
  buscar?: string
  tipo?: string
  area?: string
  familia?: string
  riasec?: string
  gestion?: string
  ubicacion?: string
  grupo?: string
  favoritos?: boolean
}
export type ResumenCatalogo = {
  carreras: CarreraResumen
  ocupaciones: OcupacionResumen
  instituciones: InstitucionResumen
}
export type DetalleCatalogo = {
  carreras: CarreraDetalle
  ocupaciones: OcupacionDetalle
  instituciones: InstitucionDetalle
}

const base = (cuenta: string) => `/cuentas/${encodeURIComponent(cuenta)}/catalogo`

export function buscarCatalogo<C extends ClaseCatalogo>(
  cuenta: string,
  clase: C,
  filtros: FiltrosCatalogo,
  limite: number,
  desde: number,
): Promise<RespuestaServidor<Pagina<ResumenCatalogo[C]>>> {
  const parametros = new URLSearchParams()
  for (const [nombre, valor] of Object.entries(filtros))
    if (valor !== undefined && valor !== '' && valor !== false) parametros.set(nombre, String(valor))
  parametros.set('limite', String(limite))
  parametros.set('desde', String(desde))
  return obtener(`${base(cuenta)}/${clase}?${parametros}`)
}

export function obtenerDetalleCatalogo<C extends ClaseCatalogo>(
  cuenta: string,
  clase: C,
  codigo: string,
): Promise<RespuestaServidor<DetalleCatalogo[C]>> {
  return obtener(`${base(cuenta)}/${clase}/${encodeURIComponent(codigo)}`)
}

export function obtenerOcupacion(cuenta: string, codigo: string): Promise<RespuestaServidor<OcupacionDetalle>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/catalogo/ocupaciones/${encodeURIComponent(codigo)}`)
}

export function obtenerFamilias(cuenta: string): Promise<RespuestaServidor<FamiliaPublica[]>> {
  return obtener(`${base(cuenta)}/familias`)
}

export function obtenerUbicaciones(cuenta: string): Promise<RespuestaServidor<UbicacionPublica[]>> {
  return obtener(`${base(cuenta)}/ubicaciones`)
}

export function obtenerGrupos(cuenta: string): Promise<RespuestaServidor<GrupoPublico[]>> {
  return obtener(`${base(cuenta)}/grupos`)
}

export function obtenerInesperada(
  cuenta: string,
  clase: 'carreras' | 'ocupaciones',
  excluir: string,
): Promise<RespuestaServidor<Inesperada>> {
  return obtener(`${base(cuenta)}/${clase}/inesperada?excluir=${encodeURIComponent(excluir)}`)
}
