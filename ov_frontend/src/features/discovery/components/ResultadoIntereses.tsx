import type { ReactNode } from 'react'
import type { AreaOcupaciones, FamiliaRecomendadaPublica, OcupacionAfinPublica } from '@/types/servidor'
import type { FiltroBanda, VistaOcupaciones } from '../lib/resultadoIntereses'
import { FamiliasRecomendadas } from './FamiliasRecomendadas'
import { OcupacionesAfines } from './OcupacionesAfines'

export type ModeloIntereses = {
  codigo: string
  ocupaciones: OcupacionAfinPublica[]
  porArea: AreaOcupaciones[]
  familias: FamiliaRecomendadaPublica[]
  pocoMarcado: boolean
  vista: VistaOcupaciones
  elegirVista: (vista: VistaOcupaciones) => void
  filtro: FiltroBanda
  filtrar: (filtro: FiltroBanda) => void
  todas: boolean
  mostrarTodas: () => void
}

// Ajuste resultados-intereses (api): el resultado de intereses del estudiante (boceto 01). Las anclas, el código
// y las barras (`perfil`), la guía (`guia`), las ocupaciones afines y las familias recomendadas.
export function ResultadoIntereses({
  modelo,
  perfil,
  guia,
  rutas,
}: {
  modelo: ModeloIntereses
  perfil: ReactNode
  guia: ReactNode
  rutas: { ocupacion: (codigo: string) => string; carreras: string; profesiones: string }
}) {
  return (
    <>
      <nav className="sx-r-anclas" aria-label="En esta página">
        <a href="#codigo">Tu código</a>
        <a href="#ocupaciones-afines">Ocupaciones afines · {modelo.ocupaciones.length}</a>
        {!!modelo.familias.length && <a href="#familias">Familias de carreras · {modelo.familias.length}</a>}
      </nav>
      <div id="codigo" className="sx-r-ancla">
        {perfil}
      </div>
      {guia}
      <OcupacionesAfines
        ocupaciones={modelo.ocupaciones}
        porArea={modelo.porArea}
        codigo={modelo.codigo}
        pocoMarcado={modelo.pocoMarcado}
        vista={modelo.vista}
        elegirVista={modelo.elegirVista}
        filtro={modelo.filtro}
        filtrar={modelo.filtrar}
        todas={modelo.todas}
        mostrarTodas={modelo.mostrarTodas}
        href={rutas.ocupacion}
      />
      {!!modelo.familias.length && (
        <FamiliasRecomendadas
          familias={modelo.familias}
          catalogo={{ carreras: rutas.carreras, profesiones: rutas.profesiones }}
        />
      )}
    </>
  )
}
