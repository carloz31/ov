import { paginasReveladasApi } from '@/store/discoveryStore'
import { modoApi } from '@/config/env'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { cargarResultadoRiasec } from '@/store/servidor/resultado'
import { coincidenciasRiasec, textoAjuste } from '@/lib/servidor/adaptadores'

import { occupationDetails } from '@/features/discovery/lib/catalogDetails'
import { isAffine } from '@/features/discovery/lib/catalogSelectors'

import type { StudentDiscoveryState } from '@/types/discovery'
import type { CoincidenciaPublica } from '@/types/servidor'
export function useCatalogAffinity(discovery: StudentDiscoveryState, soloAfines = false) {
  const servidor = useEstadoServidor()
  const revelado =
    modoApi &&
    paginasReveladasApi(
      discovery,
      servidor.resumen.datos?.cuenta.codigo,
      servidor.resultadoRiasec?.calculado_en,
    ).includes('intereses')
  const afinidadApi = modoApi ? { resultado: servidor.resultadoRiasec, revelado } : undefined
  const coincidencias = modoApi && revelado ? coincidenciasRiasec(servidor.resultadoRiasec) : []

  const coincidenciasAdicionales =
    modoApi && soloAfines
      ? coincidencias.filter((c) => !occupationDetails.some((o) => o.id === c.codigo))
      : []
  function ordenarOcupaciones(
    a: { occupation?: (typeof occupationDetails)[number]; match?: CoincidenciaPublica },
    b: { occupation?: (typeof occupationDetails)[number]; match?: CoincidenciaPublica },
  ) {
    return !soloAfines
      ? 0
      : modoApi
        ? (a.match?.posicion ?? Infinity) - (b.match?.posicion ?? Infinity)
        : Number(!!isAffine(b.occupation!.id, discovery.revealedPages)) -
          Number(!!isAffine(a.occupation!.id, discovery.revealedPages))
  }
  return {
    coincidencias,
    coincidenciasAdicionales,
    ordenarOcupaciones,
    afinidadPara: (id: string) => isAffine(id, discovery.revealedPages, afinidadApi),
    coincidenciaPara: (id: string) => coincidencias.find((c) => c.codigo === id),
    textoAfinidad: (match?: CoincidenciaPublica) =>
      modoApi && match
        ? `Afín a tu perfil · ${textoAjuste(match.ajuste)} · posición ${match.posicion} · correlación ${match.correlacion}`
        : 'Afín a tu perfil · Demostración',
    errorAfinidad: modoApi && soloAfines ? servidor.errorResultado : null,
    perfilPlano: modoApi && soloAfines && servidor.resultadoRiasec?.perfil_plano,
    necesitaRevelar: modoApi && soloAfines && !revelado && !servidor.errorResultado,
    reintentarAfinidad: cargarResultadoRiasec,
  }
}
