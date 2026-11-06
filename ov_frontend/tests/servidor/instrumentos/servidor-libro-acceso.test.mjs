import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  cargarAlmacen,
  elementos,
  escenarioRuta,
  esConsultaDominio,
  esperar,
  fixtureServidor,
  jsonServidor,
  respuestaDominio,
} from '../../soporte/servidor-ayudas.mjs'

// Ajuste libro-helena-regreso: el libro es la sección LIBRO_HELENA, que se abre con el punto de partida, y su
// vista general lleva «Mi perfil».
async function iniciar(etapa) {
  const app = fixtureServidor({ ruta: '/student/profile/helena' })
  const escenario = escenarioRuta(etapa)
  app.fetch((r) => {
    if (esConsultaDominio(r)) return respuestaDominio(r, escenario)
    if (r.url.includes('/notificaciones')) return { body: { total: 0, no_vistas: 0, items: [] } }
    if (r.url.endsWith('/instrumentos')) return { body: jsonServidor('ruta/ruta-avance-instrumentos-inicial') }
    throw Error(`Solicitud no configurada: ${r.url}`)
  })
  const almacen = cargarAlmacen(app)
  almacen.publicar({ consultasHabilitadas: true })
  await almacen.refrescar()
  await almacen.asegurarSeccion('secciones')
  return { app, escenario }
}

test('el libro y sus páginas van tras la sección LIBRO_HELENA', () => {
  assert.match(readFileSync('src/routes/AppRoutes.tsx', 'utf8'), /\{rutasLibroHelena\(\)\}/)
  const rutas = readFileSync('src/routes/SubrutasLibroHelena.tsx', 'utf8')
  assert.match(rutas, /<SeccionProtegida seccion="LIBRO_HELENA">\s*<HelenaBookView \/>/)
  assert.match(rutas, /<SeccionProtegida seccion="LIBRO_HELENA">\s*<HelenaResultView \/>/)
})

test('con la sección cerrada, la entrada por URL muestra su bloqueo; abierta, la vista', async () => {
  const cerrado = await iniciar('inicial')
  const libro = cerrado.escenario.secciones.find((s) => s.codigo === 'LIBRO_HELENA')
  assert.equal(libro.estado, 'BLOQUEADA')
  const { SeccionProtegida } = cerrado.app.load('src/features/adventure/components/SeccionProtegida.tsx')
  const vista = { type: 'vista' }
  const tarjeta = cerrado.app.mount(SeccionProtegida, { seccion: 'LIBRO_HELENA', children: vista }).render()
  assert.equal(tarjeta.type.name, 'SeccionBloqueada')
  assert.equal(tarjeta.props.titulo, 'El libro de Helena')
  assert.equal(tarjeta.props.mensaje, libro.bloqueo[0].mensaje)

  const abierto = await iniciar('t1')
  const { SeccionProtegida: Protegida } = abierto.app.load('src/features/adventure/components/SeccionProtegida.tsx')
  assert.equal(abierto.app.mount(Protegida, { seccion: 'LIBRO_HELENA', children: vista }).render(), vista)
})

test('Lumi explica el libro cerrado con el adelanto y el mensaje del servidor', async () => {
  const { app, escenario } = await iniciar('inicial')
  const { useSeccionesAcceso } = app.load('src/features/adventure/hooks/useSeccionesAcceso.ts')
  const acceso = app.mount(() => useSeccionesAcceso()('LIBRO_HELENA'), {}).render()
  assert.equal(acceso.bloqueada, true)
  assert.match(acceso.pasos[0], /Helena guarda un libro/)
  assert.equal(
    acceso.pasos[1],
    `Todavía no puedes abrirlo. ${escenario.secciones.find((s) => s.codigo === 'LIBRO_HELENA').bloqueo[0].mensaje}`,
  )
})

test('capítulo II del perfil: con el libro cerrado, candado y ayuda en vez de navegar', () => {
  const app = fixtureServidor()
  const { ProfileHelena } = app.load('src/features/discovery/components/ProfileHelena.tsx')
  const enlace = (arbol) => elementos(arbol, (e) => /sx-d-action-gold/.test(e.props?.className ?? ''))[0]
  let explicado = 0
  let prevenido = 0
  const cerrado = enlace(
    ProfileHelena({ pages: [], bloqueo: 'Responde primero.', onBloqueado: () => (explicado += 1) }),
  )
  assert.equal(cerrado.props.title, 'Responde primero.')
  cerrado.props.onClick({ preventDefault: () => (prevenido += 1) })
  assert.deepEqual([explicado, prevenido], [1, 1])
  assert.equal(elementos(cerrado, (e) => e.props?.className === 'sx-quick-lock').length, 1)

  const abierto = enlace(ProfileHelena({ pages: [] }))
  assert.equal(abierto.props.onClick, undefined)
  assert.equal(abierto.props.title, undefined)
  assert.equal(elementos(abierto, (e) => e.props?.className === 'sx-quick-lock').length, 0)
})

test('la vista general del libro lleva «Mi perfil» sobre el encabezado', async () => {
  const { app } = await iniciar('t1')
  const { HelenaBookView } = app.load('src/pages/student/HelenaBookView.tsx')
  const montado = app.mount(HelenaBookView, {})
  montado.render()
  await esperar()
  const regreso = elementos(montado.render(), (e) => e.props?.className === 'sx-d-back')
  assert.equal(regreso.length, 1)
  assert.equal(regreso[0].props.to, '/student/profile')
  montado.unmount()
})
