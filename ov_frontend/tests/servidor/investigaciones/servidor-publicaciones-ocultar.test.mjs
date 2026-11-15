import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { copia, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { fixtureApoderado } from '../../soporte/apoderado-ayudas.mjs'

// Ajuste panel-entrevistas-configuracion §3: la orientadora oculta una entrevista y la vuelve a mostrar; la tabla la
// trae con su insignia y el filtro «Ocultas», y el salón de cada autor se nombra con `nombreSalon`. Los modelos de
// las vistas se arman a mano con los fixtures ruta-publicaciones y ruta-publicacion-detalle. DATO DE PRUEBA.
const PUBLICACIONES = jsonServidor('ruta/ruta-publicaciones')
const DETALLE = jsonServidor('ruta/ruta-publicacion-detalle')
const texto = (marcado) => marcado.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const html = (Component, props) =>
  renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)))
const portal = () => fixtureApoderado({ cuenta: 'ori-carmen', ruta: '/counselor/publications' })

function modeloTabla(app, items) {
  const { nombreSalonAutor } = app.load('src/features/counselor/hooks/usePublicacionesServidor.ts')
  const lista = { estado: 'listo', items, total: items.length, favoritos_leyenda: 3, error: null }
  return {
    salones: [{ codigo: '5A', promocion: 2026, seccion: 'A', es_principal: true, nombre: 'Quinto A' }],
    salon: '',
    elegirSalon() {},
    texto: '',
    buscarTexto() {},
    estado: '',
    setEstado() {},
    conReportes: false,
    setConReportes() {},
    reportadas: 0,
    lista,
    cargando: false,
    cargandoMas: false,
    hayMas: false,
    mostrarMas() {},
    reintentar() {},
    nombreSalonAutor,
  }
}

function modeloDetalle(datos, extra = {}) {
  return {
    codigo: datos.codigo,
    volver: '/counselor/publications',
    estado: 'listo',
    error: null,
    reintentar() {},
    datos,
    destacada: datos.estado === 'DESTACADA' || datos.estado === 'LEYENDA',
    oculta: datos.estado === 'OCULTA',
    puedeActuar: datos.de_sus_salones,
    ocupado: null,
    destacar() {},
    ocultandoEntrevista: false,
    setOcultandoEntrevista() {},
    ocultarEntrevista() {},
    mostrar() {},
    eliminandoComentario: null,
    pedirEliminarComentario() {},
    eliminarComentario() {},
    descartar() {},
    comentario: '',
    setComentario() {},
    editando: null,
    editar() {},
    comentar() {},
    ...extra,
  }
}

test('la tabla trae la insignia «Oculta», el filtro «Ocultas» y el salón del autor por su promoción', () => {
  const app = portal()
  const [fila] = PUBLICACIONES.items
  const oculta = {
    ...copia(fila),
    codigo: 'ENT-OCULTA',
    estado: 'OCULTA',
    reportes_pendientes: 0,
    comentarios_reportados: 0,
  }
  // Una Leyenda de un salón que ya egresó: «Promoción 2024 A», sin «Promoción anterior».
  const egresada = {
    ...copia(fila),
    codigo: 'ENT-EGRESADA',
    estado: 'LEYENDA',
    de_sus_salones: false,
    autores: [
      { codigo: 'est-x', nombre: 'Xime', salon: { codigo: '2024-A', promocion: 2024, seccion: 'A' } },
    ],
  }
  const { TablaPublicaciones } = app.load(
    'src/features/counselor/components/publicaciones/TablaPublicaciones.tsx',
  )
  const marcado = texto(html(TablaPublicaciones, { m: modeloTabla(app, [oculta, egresada]) }))
  assert.match(marcado, /Oculta/)
  assert.match(marcado, new RegExp(`Promoción ${2024} A`))
  assert.doesNotMatch(marcado, /Promoción anterior/)
  const { EstadoPublicacionBadges } = app.load(
    'src/features/counselor/components/publicaciones/EstadoPublicacionBadges.tsx',
  )
  assert.match(
    html(EstadoPublicacionBadges, { estado: 'OCULTA', reportes: 0, comentarios: 0 }),
    /data-variant="neutral"[^>]*>Oculta</,
  )
  // El selector de estado ofrece «Ocultas» (el menú del Select no se pinta en el render estático).
  const fuente = readFileSync(
    'src/features/counselor/components/publicaciones/TablaPublicaciones.tsx',
    'utf8',
  )
  assert.match(fuente, /\['OCULTA', 'Ocultas'\]/)
})

test('el detalle de una oculta: aviso, «Volver a mostrar» y destacar y comentar desactivados', () => {
  const app = portal()
  const { DetallePublicacion } = app.load(
    'src/features/counselor/components/publicaciones/DetallePublicacion.tsx',
  )
  const { nombreSalonAutor } = app.load('src/features/counselor/hooks/usePublicacionesServidor.ts')
  const datos = { ...copia(DETALLE), estado: 'OCULTA', reportes: [] }
  const marcado = html(DetallePublicacion, { m: modeloDetalle(datos), nombreSalon: nombreSalonAutor })
  const plano = texto(marcado)
  assert.match(plano, /Oculta: los estudiantes no la ven/)
  assert.match(plano, /Volver a mostrar/)
  assert.doesNotMatch(plano, /Ocultar entrevista|Eliminar entrevista/)
  assert.match(marcado, /<button[^>]*disabled=""[^>]*>(<svg[^>]*>.*?<\/svg>)?\s*Destacar/)
  assert.match(marcado, /<textarea[^>]*disabled=""/)
  assert.match(plano, /Destacar y ocultar se pueden revertir\. Eliminar un comentario pide confirmación/)
})

test('el detalle de una publicada ofrece «Ocultar entrevista» y no «Volver a mostrar»', () => {
  const app = portal()
  const { DetallePublicacion } = app.load(
    'src/features/counselor/components/publicaciones/DetallePublicacion.tsx',
  )
  const { nombreSalonAutor } = app.load('src/features/counselor/hooks/usePublicacionesServidor.ts')
  const plano = texto(
    html(DetallePublicacion, { m: modeloDetalle(copia(DETALLE)), nombreSalon: nombreSalonAutor }),
  )
  assert.match(plano, /Ocultar entrevista/)
  assert.doesNotMatch(plano, /Volver a mostrar|los estudiantes no la ven/)
})

test('ocultar y volver a mostrar llaman a sus acciones y vencen las entrevistas', async () => {
  const app = portal()
  app.fetch(() => ({ body: { eventos_registrados: [], nuevos_desbloqueos: [] } }))
  const s = app.load('src/store/servidor/investigaciones.ts')
  assert.equal((await s.ocultarEntrevista('ENT-1')).tipo, 'ok')
  assert.equal((await s.mostrarEntrevista('ENT-1')).tipo, 'ok')
  assert.deepEqual(
    app.requests.map((r) => [r.url.replace(/^.*\/acciones\//, ''), r.body.entrevista]),
    [
      ['ocultar-entrevista', 'ENT-1'],
      ['mostrar-entrevista', 'ENT-1'],
    ],
  )
})
