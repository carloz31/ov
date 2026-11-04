import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, elementos, esperar, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'
import { abrir, iniciar } from '../../soporte/servidor-registro-ayudas.mjs'

// Ajuste carga-actividades: las mecánicas que el contenido real necesita, probadas sobre la ruta.
const REFERENCIAS = {
  disponible: jsonServidor('ruta/ruta-referencias-t-eco-disponible'),
  sinDato: jsonServidor('ruta/ruta-referencias-t-eco-sin-dato'),
}
const contenido = (app, clave) => app.load('src/data/activities/contenidos.ts').contenidoPorClave(clave)

test('el fondo sale del escenario del contenido; sin escenario, del respaldo de la pantalla', () => {
  const app = fixtureServidor()
  const { fondoEscenario } = app.load('src/lib/activities/escenario.ts')
  assert.equal(fondoEscenario('bosque_volcan', '/images/background/bosque.png'), '/images/background/bosque_volcan.png')
  assert.equal(fondoEscenario(undefined, '/images/background/bosque.png'), '/images/background/bosque.png')
  assert.equal(fondoEscenario(undefined), undefined)
  assert.equal(contenido(app, 't_valores').escenario, 'bosque')
})

test('un registro admite diapositivas: t-valores la valida y la muestra antes de sus consignas', () => {
  const app = fixtureServidor()
  const { NODOS_PERMITIDOS } = app.load('src/types/activities.ts')
  const { validateActivity } = app.load('src/lib/activities/validation.ts')
  assert.ok(NODOS_PERMITIDOS.registro.includes('diapositiva'))
  const valores = contenido(app, 't_valores')
  assert.doesNotThrow(() => validateActivity(valores))
  assert.deepEqual(
    valores.nodos.slice(0, 2).map((n) => n.tipo),
    ['dialogo', 'diapositiva'],
  )
})

test('un diálogo cita cada referencia de su lista en orden; las sin dato se omiten', () => {
  const app = fixtureServidor()
  const { encuentroConEco, conEcoEncuentro } = app.load('src/lib/servidor/contenidos.ts')
  const eco = contenido(app, 't_eco')
  const recuerdo = (referencias) =>
    encuentroConEco(eco, referencias).nodos.find((n) => n.id === 't-eco-recuerdo').texto
  const conDatos = recuerdo(REFERENCIAS.disponible.referencias)
  assert.match(conDatos, /^Esto me contaste la vez pasada\. «DATO DE PRUEBA: no lo sé/)
  assert.ok(conDatos.indexOf('confían en mí') < conDatos.indexOf('«Estudiar en una universidad»'))
  const soloRuta = REFERENCIAS.disponible.referencias.filter((r) => r.codigo === 't-ref-rutas')
  assert.equal(recuerdo(soloRuta), 'Esto me contaste la vez pasada. «Estudiar en una universidad»')
  assert.equal(recuerdo(REFERENCIAS.sinDato.referencias), 'Esto me contaste la vez pasada.')
  // Un registro no se abre como encuentro: sus diálogos se completan en su propio reproductor.
  assert.equal(conEcoEncuentro(eco), false)
})

test('el registro completa sus diálogos con eco con las referencias que ya pidió, sin otra petición', async () => {
  const { app } = await iniciar({ actividad: 't-eco', referencias: REFERENCIAS.disponible })
  const player = await abrir(app, 't-eco')
  const dialogo = () => elementos(player.render(), (e) => e.type?.name === 'DialogueBox')[0]
  dialogo().props.onContinue()
  await esperar()
  assert.match(dialogo().props.text, /«Estudiar en una universidad»$/)
  assert.equal(app.requests.filter((r) => r.url.endsWith('/actividades/t-eco/referencias')).length, 1)
  player.unmount()
})

test('las informativas con eco siguen citando como antes', () => {
  const app = fixtureServidor()
  const { encuentroConEco } = app.load('src/lib/servidor/contenidos.ts')
  const lee = contenido(app, 't_lee_cuestionario')
  const sinCambios = encuentroConEco(lee, [])
  assert.deepEqual(copia(sinCambios.nodos), copia(lee.nodos))
})
