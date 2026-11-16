import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { copia, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { fixtureApoderado } from '../../soporte/apoderado-ayudas.mjs'

// Ajuste panel-entrevistas-configuracion §2.5: la configuración del colegio de la orientadora en api, con el fixture
// ruta-panel-configuracion (TEST-HABILIDADES y TEST-INTELIGENCIAS se marcan; t-expectativas está destacado).
const CONFIGURACION = jsonServidor('ruta/ruta-panel-configuracion')
const texto = (marcado) => marcado.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const textoArbol = (n) =>
  Array.isArray(n)
    ? n.map(textoArbol).join('')
    : typeof n === 'string' || typeof n === 'number'
      ? String(n)
      : n?.props
        ? textoArbol(n.props.children)
        : ''
const html = (Component, props) =>
  renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)))

function guardada(cuerpo) {
  const datos = copia(CONFIGURACION)
  for (const c of datos.cuestionarios)
    if (c.visibilidad_apoderado === 'SEGUN_COLEGIO') c.visible = cuerpo.visibles.includes(c.codigo)
  for (const b of datos.registros)
    for (const r of b.registros) r.destacado = cuerpo.destacados.includes(r.codigo)
  return datos
}

// El entorno de los portales (`fixtureApoderado`) carga features/ y pages/ de la orientadora, pero no corre efectos:
// la configuración se precarga en el almacén. El almacén solo se prueba con el entorno base (`fixtureServidor`).
function orientadora({ falla = false, fixture = fixtureApoderado } = {}) {
  const app = fixture({ cuenta: 'ori-carmen', ruta: '/counselor/priorities' })
  app.fetch((req) => {
    if (req.url.endsWith('/panel/configuracion')) return { body: CONFIGURACION }
    if (req.url.endsWith('/acciones/configurar-colegio'))
      return falla
        ? {
            status: 422,
            body: { detail: { mensaje: 'La visibilidad de «Test de intereses» no se puede cambiar' } },
          }
        : { body: guardada(req.body) }
    throw Error(`Solicitud no configurada: ${req.url}`)
  })
  return app
}

const portal = () => orientadora()

async function precargar(app) {
  const panel = app.load('src/store/servidor/panel.ts')
  const sesion = app.load('src/store/servidor/sesion.ts')
  const api = app.load('src/services/api/panel.ts')
  await panel.cargarPanel(`${sesion.sesionServidor()}:${panel.llaveConfiguracion}`, (c) =>
    api.obtenerConfiguracion(c),
  )
}

async function modelo(app) {
  await precargar(app)
  const { useConfiguracionColegio } = app.load('src/features/counselor/hooks/useConfiguracionColegio.ts')
  const vista = app.mount(() => useConfiguracionColegio())
  vista.render()
  await esperar()
  return vista
}

test('en lectura: obligatorios y opcionales, visibilidad fija o por colegio y los registros por tramo', async () => {
  const app = orientadora()
  const vista = await modelo(app)
  const m = vista.render()
  const { CuestionariosConfiguracion } = app.load(
    'src/features/counselor/components/configuracion/CuestionariosConfiguracion.tsx',
  )
  const cuestionarios = texto(html(CuestionariosConfiguracion, { m }))
  assert.match(cuestionarios, /Punto de partida y de llegada .* Obligatorio Visible para el apoderado \(nunca\)/)
  assert.match(cuestionarios, /Test de intereses .* Obligatorio Visible para el apoderado \(siempre\)/)
  assert.match(cuestionarios, /Opcional/)
  assert.match(cuestionarios, /el apoderado ve el resultado de su hijo en su portal/)
  const marcado = html(CuestionariosConfiguracion, { m })
  assert.match(
    marcado,
    /disabled=""[^>]*id="visible-TEST-INTELIGENCIAS" aria-label="Visible para el apoderado: Test de las inteligencias múltiples"/,
  )
  const { RegistrosDestacados } = app.load(
    'src/features/counselor/components/configuracion/RegistrosDestacados.tsx',
  )
  const registros = texto(html(RegistrosDestacados, { m }))
  assert.match(registros, /Registros destacados 1 destacado/)
  assert.match(registros, /Requerido/)
  assert.match(registros, /Sin destacados, el perfil muestra los registros requeridos del camino\./)
  assert.equal(m.editando, false)
  vista.unmount()
})

test('editar, confirmar (avisa si un cuestionario se hace visible) y guardar reemplaza lo cargado', async () => {
  const app = orientadora()
  const vista = await modelo(app)
  vista.render().editar()
  let m = vista.render()
  assert.equal(m.editando, true)
  assert.equal(m.cambiado, false)
  m.cambiarVisible('TEST-INTELIGENCIAS', true)
  m = vista.render()
  m.cambiarDestacado('t-expectativas', false)
  m = vista.render()
  assert.equal(m.cambiado, true)
  assert.equal(m.totalDestacados, 0)
  assert.deepEqual(
    m.nuevosVisibles.map((c) => c.codigo),
    ['TEST-INTELIGENCIAS'],
  )
  m.pedirGuardar()
  m = vista.render()
  assert.equal(m.confirmando, true)
  m.guardar()
  await esperar()
  m = vista.render()
  const envio = app.requests.find((r) => r.url.endsWith('/acciones/configurar-colegio'))
  assert.deepEqual(envio.body, { cuenta: 'ori-carmen', visibles: ['TEST-INTELIGENCIAS'], destacados: [] })
  assert.equal(m.editando, false)
  assert.equal(m.aviso.titulo, 'Cambios guardados')
  assert.equal(m.totalDestacados, 0)
  assert.equal(m.datos.cuestionarios.find((c) => c.codigo === 'TEST-INTELIGENCIAS').visible, true)
  // Lo guardado reemplaza lo cargado: no se vuelve a pedir la configuración.
  assert.equal(app.requests.filter((r) => r.url.endsWith('/panel/configuracion')).length, 1)
  vista.unmount()
})

test('el almacén revalida la configuración al montarla y guardar deja lo que respondió el servidor', async () => {
  const app = orientadora({ fixture: fixtureServidor })
  const panel = app.load('src/store/servidor/panel.ts')
  const vista = () => app.mount(() => panel.useConfiguracionPanel().carga)
  const primera = vista()
  primera.render()
  assert.equal(primera.render().estado, 'cargando')
  await esperar()
  assert.equal(primera.render().datos.cuestionarios.length, 4)
  primera.unmount()
  const respuesta = await panel.guardarConfiguracion(['TEST-HABILIDADES'], ['t-valores'])
  assert.equal(respuesta.tipo, 'ok')
  const segunda = vista()
  const guardado = segunda.render()
  assert.equal(guardado.datos.cuestionarios.find((c) => c.codigo === 'TEST-HABILIDADES').visible, true)
  await esperar()
  // Al volver a abrirla se revalida (la puede cambiar otra orientadora del colegio).
  assert.equal(app.requests.filter((r) => r.url.endsWith('/panel/configuracion')).length, 2)
  segunda.unmount()
})

test('la confirmación nombra el cuestionario que pasa a ser visible', async () => {
  const { ConfirmarConfiguracion } = portal().load(
    'src/features/counselor/components/configuracion/ConfirmarConfiguracion.tsx',
  )
  const nombre = CONFIGURACION.cuestionarios.find((c) => c.codigo === 'TEST-HABILIDADES').nombre
  const base = { confirmando: true, guardando: false, cerrarConfirmacion() {}, guardar() {} }
  // El Dialog va en un portal, que el render estático no pinta: se lee el árbol de elementos.
  const con = textoArbol(ConfirmarConfiguracion({ m: { ...base, nuevosVisibles: [{ nombre }] } }))
  const sin = textoArbol(ConfirmarConfiguracion({ m: { ...base, nuevosVisibles: [] } }))
  assert.match(con, /¿Guardar la configuración\?/)
  assert.match(con, new RegExp(`podrán ver en su portal el resultado de ${nombre} de su hijo`))
  assert.doesNotMatch(sin, /podrán ver en su portal/)
  assert.match(sin, /Confirmar y guardar/)
})

test('un error al guardar avisa y conserva el borrador', async () => {
  const app = orientadora({ falla: true })
  const vista = await modelo(app)
  vista.render().editar()
  vista.render().cambiarDestacado('t-valores', true)
  vista.render().pedirGuardar()
  vista.render().guardar()
  await esperar()
  const m = vista.render()
  assert.equal(m.aviso.error, true)
  assert.match(m.aviso.descripcion, /no se puede cambiar/)
  assert.equal(m.editando, true)
  assert.equal(m.esDestacado('t-valores'), true)
  vista.unmount()
})

test('la vista arma la cabecera de usted; espera la configuración y después ofrece «Editar»', async () => {
  const app = portal()
  const { ConfiguracionServidorView } = app.load('src/pages/counselor/ConfiguracionServidorView.tsx')
  const esperando = texto(html(ConfiguracionServidorView, {}))
  assert.match(
    esperando,
    /Configuración Aplica a todos sus salones\. Sus estudiantes siguen realizando todas las actividades\./,
  )
  assert.doesNotMatch(esperando, /Editar/)
  await precargar(app)
  const lista = texto(html(ConfiguracionServidorView, {}))
  assert.match(lista, /Editar/)
  assert.match(lista, /Cuestionarios .* Registros destacados/)
})
