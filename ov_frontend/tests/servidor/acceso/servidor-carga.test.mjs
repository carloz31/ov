import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { copia, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { fixtureApoderado } from '../../soporte/apoderado-ayudas.mjs'

// F00: pantallas de carga y error, y nombre real de la sesión.
test('el ingreso del estudiante usa la pantalla de carga y, si falla, ofrece reintentar o volver a ingresar', () => {
  // StudentShell depende del contexto del router: se comprueba su composición y la acción de volver.
  const shell = readFileSync('src/pages/student/StudentShell.tsx', 'utf8')
  assert.match(shell, /<PantallaCarga/)
  assert.match(shell, /titulo="Preparando tu camino"/)
  assert.match(shell, /frase="Lumi está buscando el mapa…"/)
  assert.match(shell, /texto: 'Volver a ingresar', onClick: volverAIngresar/)
  assert.doesNotMatch(shell, /Consultando tu camino en el servidor/)
  assert.match(readFileSync('src/features/adventure/hooks/useServerSession.ts', 'utf8'), /volverAIngresar: cerrarSesion/)
  const app = fixtureServidor()
  const acceso = app.load('src/store/accesoStore.ts')
  assert.ok(acceso.sesionActual())
  acceso.cerrarSesion()
  assert.equal(acceso.sesionActual(), null)
})

test('la pantalla de carga espera ~300 ms antes de mostrarse y el error se ve de inmediato', async () => {
  const app = fixtureServidor()
  const { PantallaCarga } = app.load('src/components/student/PantallaCarga.tsx')
  const carga = app.mount(PantallaCarga, { estado: 'cargando', titulo: 'Preparando', frase: 'Un momento' })
  assert.equal(carga.render(), null)
  await new Promise((resolve) => setTimeout(resolve, 350))
  assert.match(JSON.stringify(copia(carga.render())), /Preparando/)
  const error = app.mount(PantallaCarga, {
    estado: 'error',
    titulo: 'Preparando',
    frase: 'Un momento',
    mensaje: 'DATO DE PRUEBA: fallo',
    onReintentar() {},
  })
  const tree = error.render()
  assert.equal(tree.props.role, 'alert')
  assert.match(JSON.stringify(copia(tree)), /Algo se cruzó en el camino/)
})

test('el portal del apoderado muestra carga y error iniciales y el nombre de la sesión', async () => {
  const app = fixtureApoderado({ portal: true })
  app.ingresarComo('apo-rosa')
  let falla = true
  app.fetch((r) => {
    if (r.url === '/api/acciones/ingresar') return { body: { eventos_registrados: [], nuevos_desbloqueos: [] } }
    if (r.url.endsWith('/actividades')) {
      if (falla) throw Error('DATO DE PRUEBA: sin conexión')
      return { body: [] }
    }
    if (r.url.endsWith('/familia')) return { body: jsonServidor('ruta/ruta-familia') }
    throw Error(`Solicitud no configurada: ${r.url}`)
  })
  const { useParentActivities } = app.load('src/features/parent/hooks/useParentActivities.ts')
  const fuente = app.mount(useParentActivities, {})
  assert.deepEqual(copia(fuente.render().pantallaCarga), { estado: 'cargando', mensaje: '' })
  await esperar()
  const conError = fuente.render().pantallaCarga
  assert.equal(conError.estado, 'error')
  falla = false
  fuente.render().reintentarCarga()
  await esperar()
  assert.equal(fuente.render().pantallaCarga, null)
  const { useParentProfile } = app.load('src/features/parent/hooks/useParentProfile.ts')
  const perfil = app.mount(useParentProfile, {}).render()
  assert.deepEqual([perfil.name, perfil.firstName], ['Rosa', 'Rosa'])
  const { PantallaCargaPortal } = app.load('src/components/staff/PantallaCargaPortal.tsx')
  assert.match(
    JSON.stringify(copia(PantallaCargaPortal({ estado: 'cargando', onReintentar() {}, onVolver() {} }))),
    /Un momento, estamos trayendo tu información\./,
  )
  assert.match(
    JSON.stringify(copia(PantallaCargaPortal({ estado: 'error', mensaje: 'x', onReintentar() {}, onVolver() {} }))),
    /Volver a ingresar/,
  )
})

test('las iniciales del panel salen del nombre de la cuenta', () => {
  const app = fixtureServidor()
  assert.equal(app.load('src/features/adventure/hooks/useTravelerLevel.ts').inicialesViajero('Ana'), 'AN')
})

test('el resumen del apoderado en api usa GET /familia: hijo, avances y solo el aviso de resultados', () => {
  const app = fixtureApoderado({ portal: true })
  const familia = jsonServidor('ruta/ruta-familia')
  const { ParentChildServerSummary } = app.load('src/features/parent/components/ParentChildServerSummary.tsx')
  const texto = (e) => JSON.stringify(copia(e))
  const tree = ParentChildServerSummary({ familia })
  const cabecera = tree.props.children[1]
  assert.deepEqual([cabecera.props.title, cabecera.props.initials, cabecera.props.details], ['Ana', 'AN', undefined])
  const [hijo, diploma] = cabecera.props.metrics.props.children
  assert.deepEqual([hijo.props.label, hijo.props.detail], ['Avance de Ana', '9 de 11 actividades'])
  assert.deepEqual([diploma.props.label, diploma.props.detail], ['Su avance hacia el diploma', '2 de 2 actividades'])
  assert.match(texto(tree), /Podrás ver los resultados de Ana cuando completes tus actividades\./)
  assert.doesNotMatch(texto(tree), /Cuestionarios que se compartirán|Salón/)
  assert.match(texto(ParentChildServerSummary({ familia: { ...familia, estudiante: null } })), /Todavía no tienes un hijo vinculado\./)
  const { avanceConFamilia, nombreHijo } = app.load('src/features/parent/lib/familia.ts')
  const local = { completed: 0, total: 5, percent: 0, complete: false, next: 'x' }
  assert.deepEqual(copia(avanceConFamilia(local, familia)), { completed: 2, total: 2, percent: 100, complete: true, next: 'x' })
  assert.equal(avanceConFamilia(local, null), local)
  assert.equal(nombreHijo(familia, 'Gabriela'), 'Ana')
  assert.equal(nombreHijo(null, 'Gabriela'), 'Gabriela')
})
