import { useMemo, useState } from 'react'
import { resultadoHelenaCompleto } from '@/lib/servidor/adaptadores'
import type { ResultadoPublico } from '@/types/servidor'
import { resumirResultado } from '../lib/resultPage'
import { filtroInicial, type FiltroPreparacion, type VistaOcupaciones } from '../lib/resultadoIntereses'

// Ajuste resultados-intereses: el resultado de intereses del hijo en el portal del apoderado (boceto 02), con los
// textos de su audiencia. Solo estado de la vista: las reglas y los textos vienen del servidor.
export function useResultadoPortal(remoto: ResultadoPublico) {
  const resumen = useMemo(
    () =>
      resumirResultado('COINCIDENCIAS', resultadoHelenaCompleto(remoto, 'COINCIDENCIAS'), {
        perfilPlano: remoto.perfil_plano,
        hayEmpate: remoto.codigo_interes?.hay_empate,
        puntajeVisual: true,
        pagina: 'intereses',
      }),
    [remoto],
  )
  const [vista, setVista] = useState<VistaOcupaciones>('lista')
  const [filtro, setFiltro] = useState<FiltroPreparacion | null>(null)
  const [todas, setTodas] = useState(false)
  const [guia, setGuia] = useState(remoto.guia_abierta)
  const [resaltada, setResaltada] = useState<string | null>(null)
  return {
    resumen,
    codigo: remoto.codigo_interes?.codigo ?? '',
    ocupaciones: remoto.ocupaciones ?? [],
    porArea: remoto.por_area ?? [],
    familias: remoto.familias ?? [],
    pocoMarcado: !!remoto.perfil_poco_marcado,
    vista,
    elegirVista: setVista,
    filtro: filtro ?? filtroInicial(remoto.ocupaciones ?? []),
    filtrar: (nuevo: FiltroPreparacion) => {
      setFiltro(nuevo)
      setTodas(false)
    },
    todas,
    mostrarTodas: () => setTodas(true),
    guia,
    resaltada,
    abrirGuia: (codigo?: string) => {
      setGuia(true)
      setResaltada(codigo ?? null)
    },
    alternarGuia: () => setGuia((g) => !g),
    cerrarGuia: () => setGuia(false),
  }
}
