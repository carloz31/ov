import { useState } from 'react'
import { Link } from 'react-router'
import { Skeleton } from '@/components/ui/Skeleton'
import { appPaths } from '@/routes/paths'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { useInvestigacionesListado } from '../../hooks/useInvestigacionesListado'
import { PieListado } from '../PieListado'
import { AvisoInvestigaciones } from './AvisoInvestigaciones'
import { ConfirmarInvestigacion } from './ConfirmarInvestigacion'
import { FiltrosInvestigaciones } from './FiltrosInvestigaciones'
import { PanelAliados } from './PanelAliados'
import { TarjetaEnCurso } from './TarjetaEnCurso'
import { TarjetaEnCursoMia } from './TarjetaEnCursoMia'
import { TarjetaEntrevista } from './TarjetaEntrevista'
import '../../styles/investigaciones.css'

function Esqueletos() {
  return (
    <>
      {[0, 1].map((n) => (
        <div className="sx-i-esqueleto" key={n} aria-hidden="true">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </>
  )
}

// F09 (api, bocetos 01–03): Investigaciones. Cabecera, la investigación en curso con sus aliados (salvo en Mis
// investigaciones, donde va como tarjeta), el selector de vistas con buscador y filtros, y la grilla paginada.
export function InvestigacionesServidor() {
  const v = useInvestigacionesListado()
  const [confirmar, setConfirmar] = useState(false)
  const datos = v.seccion.datos
  const lista = v.lista
  const ahora = new Date()
  if (!datos)
    return v.seccion.estado === 'error' ? (
      <section className="sx-i-error" role="alert">
        <p>{mensajeErrorServidor(v.seccion.error)}</p>
        <button type="button" className="sx-i-boton" onClick={v.reintentarSeccion}>
          Reintentar
        </button>
      </section>
    ) : (
      <div className="sx-i-grilla" aria-busy="true">
        <Esqueletos />
      </div>
    )
  const mias = v.vista === 'MIAS'
  const enCurso = v.enCurso
  const vacioMias =
    mias && !enCurso && lista?.estado === 'listo' && lista.items.length === 0 && !v.texto.trim()
  return (
    <>
      <header className="sx-i-cabecera" id="inicio-catalogo">
        <div>
          <h1>Investigaciones</h1>
          <p>Entrevistas a profesionales hechas por estudiantes como tú</p>
        </div>
        <Link className="sx-i-boton" to={appPaths.student.investigationGuide(v.pasoGuion)}>
          {enCurso ? 'Ver mi guion' : 'Iniciar investigación'}
        </Link>
      </header>
      {enCurso && !mias && (
        <div className="sx-i-en-curso">
          <TarjetaEnCurso
            enCurso={enCurso}
            base={datos.preguntas_base}
            onCancelar={() => setConfirmar(true)}
          />
          <PanelAliados aliados={datos.aliados} sellos={v.sellos} />
        </div>
      )}
      <FiltrosInvestigaciones
        vista={v.vista}
        conteos={datos.conteos}
        onVista={v.elegirVista}
        texto={v.texto}
        onTexto={v.buscarTexto}
        chips={v.chips}
        onChip={v.alternarChip}
        orden={v.orden}
        onOrden={v.setOrden}
      />
      <div className="sx-i-grilla" aria-busy={v.buscando || v.cargandoMas}>
        {mias && enCurso && (
          <TarjetaEnCursoMia
            enCurso={enCurso}
            base={datos.preguntas_base}
            aliados={datos.aliados}
            ahora={ahora}
          />
        )}
        {!v.buscando &&
          lista?.items.map((tarjeta) => (
            <TarjetaEntrevista
              key={tarjeta.codigo}
              tarjeta={tarjeta}
              cuenta={v.cuenta}
              mia={mias}
              tipos={datos.tipos_reaccion}
              favoritosLeyenda={lista.favoritosLeyenda || datos.favoritos_leyenda}
              pendiente={v.favoritoPendiente(tarjeta.codigo)}
              onFavorito={() => void v.alternarFavorito(tarjeta.codigo, !tarjeta.favorita)}
            />
          ))}
        {(v.buscando || v.cargandoMas) && <Esqueletos />}
        {!mias && !enCurso && !v.buscando && (
          <section className="sx-i-invitacion">
            <h2>¿Y la tuya?</h2>
            <p>
              Investiga una ocupación que te intrigue y compártela con tu salón. Las mejores llegan al Salón
              de Leyendas y ayudan a las promociones que vienen.
            </p>
          </section>
        )}
      </div>
      {lista?.estado === 'error' && (
        <section className="sx-i-error" role="alert">
          <p>{mensajeErrorServidor(lista.error)}</p>
          <button type="button" className="sx-i-boton" onClick={v.reintentar}>
            Reintentar
          </button>
        </section>
      )}
      {!mias && lista?.estado === 'listo' && lista.items.length === 0 && (
        <p className="sx-i-nota">
          {v.texto.trim() || Object.values(v.chips).some(Boolean)
            ? 'No hay entrevistas que coincidan con tu búsqueda o tus filtros.'
            : v.vista === 'LEYENDAS'
              ? 'Todavía no hay Leyendas.'
              : 'Todavía nadie de tu salón ha publicado una entrevista.'}
        </p>
      )}
      {vacioMias && (
        <section className="sx-i-vacio">
          <h2>Aún no tienes investigaciones</h2>
          <p>
            Cuando publiques una entrevista, o te agreguen como coautor, aparecerá aquí con todo lo que te
            dejen tus compañeros.
          </p>
          <Link className="sx-i-boton" to={appPaths.student.investigationGuide(1)}>
            Iniciar investigación
          </Link>
        </section>
      )}
      {lista && lista.items.length > 0 && !v.buscando && (
        <PieListado
          mostrados={lista.items.length}
          total={lista.total}
          cargando={v.cargandoMas}
          hayMas={v.hayMas}
          onMas={v.mostrarMas}
        />
      )}
      <ConfirmarInvestigacion
        abierto={confirmar}
        titulo="¿Cancelar tu investigación?"
        descripcion="Se borran tu guion y lo que pensabas de la ocupación, y dejas de aparecer como aliado. No se puede deshacer."
        confirmar="Cancelar investigación"
        ocupado={v.cancelando}
        onConfirmar={() => void v.cancelar().then((ok) => ok && setConfirmar(false))}
        onCerrar={() => setConfirmar(false)}
      />
      <AvisoInvestigaciones />
    </>
  )
}
