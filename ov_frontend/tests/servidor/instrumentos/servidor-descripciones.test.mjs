import assert from 'node:assert/strict'
import test from 'node:test'
import { copia, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

test('el fixture regenerado incluye las seis descripciones y coincide con el contenido local aprobado', () => {
  const app = fixtureServidor()
  const { descripcionesLocales, ejemplosDimension } = app.load(
    'src/features/discovery/data/dimensionExamples.ts',
  )
  const resultado = jsonServidor('resultado-riasec')
  assert.equal(resultado.dimensiones.length, 6)
  assert.deepEqual(
    Object.fromEntries(resultado.dimensiones.map((d) => [d.codigo, d.descripcion])),
    copia(descripcionesLocales),
  )
  assert.ok(
    resultado.dimensiones.every(
      (d) => d.descripcion && !d.descripcion.startsWith('Dimensión de demostración:'),
    ),
  )
  assert.deepEqual(Object.keys(ejemplosDimension), [
    'R',
    'I',
    'A',
    'S',
    'E',
    'C',
    'INT-LIN',
    'INT-LOG',
    'INT-ESP',
    'INT-CIN',
    'INT-MUS',
    'INT-INTER',
    'INT-INTRA',
  ])
  assert.ok(Object.values(ejemplosDimension).every((texto) => texto.trim().length > 0))
})

test('el servicio y el adaptador preservan la descripción recibida sin generar una sustituta', async () => {
  const app = fixtureServidor()
  const resultado = jsonServidor('resultado-riasec')
  // DATO DE PRUEBA: texto distinto al catálogo local para verificar la fuente remota.
  resultado.dimensiones.find((d) => d.codigo === 'I').descripcion =
    'Descripción de la dimensión enviada por el servidor.'
  app.fetch(() => ({ body: resultado }))
  const servicio = app.load('src/services/api/instrumentos.ts')
  const respuesta = await servicio.obtenerResultado('est-ana', 'TEST-RIASEC')
  assert.equal(respuesta.tipo, 'ok')
  assert.deepEqual(copia(respuesta.datos), resultado)
  const adaptadores = app.load('src/lib/servidor/adaptadores.ts')
  const discovery = app.load('src/store/discoveryStore.ts')
  discovery.revelarPaginaApi('est-ana', resultado.calculado_en, 'intereses')
  const pagina = adaptadores.paginaInteresesServidor(
    null,
    respuesta.datos,
    discovery.getDiscovery(),
    'est-ana',
  )
  for (const area of pagina.result.areas) {
    assert.equal(area.description, resultado.dimensiones.find((d) => d.codigo === area.code).descripcion)
  }
})

test('Helena local usa descripcionesLocales tanto en el ejemplo como en un resultado real', () => {
  const app = fixtureServidor({ api: false })
  const { descripcionesLocales } = app.load('src/features/discovery/data/dimensionExamples.ts')
  const paginas = app.load('src/features/discovery/lib/helenaPages.ts')
  assert.ok(paginas.demoInterests.areas.every((a) => a.description === descripcionesLocales[a.code]))
  const contenido = app.load('src/data/activities/content.ts')
  // DATO DE PRUEBA: instrumento local completo, sin los marcadores del catálogo de muestra.
  contenido.catalog.instrumentos = [
    {
      id: 'tip',
      clave: {
        dimensiones: Object.keys(descripcionesLocales).map((id) => ({
          id,
          nombre: jsonServidor('resultado-riasec').dimensiones.find((d) => d.codigo === id).nombre,
        })),
      },
    },
  ]
  const journey = app.load('src/lib/activities/logic.ts').initialJourney()
  journey.progress = Object.fromEntries(
    Array.from({ length: 14 }, (_, i) => [
      `act-tip-${String(i + 1).padStart(2, '0')}`,
      { estado: 'completada' },
    ]),
  )
  journey.results = [
    {
      instrumentoId: 'tip',
      puntajes: Object.keys(descripcionesLocales).map((dimensionId, i) => ({ dimensionId, puntaje: i * 10 })),
    },
  ]
  const discovery = app.load('src/store/discoveryStore.ts').initialDiscoveryState()
  discovery.revealedPages = ['intereses']
  const resultado = paginas.getHelenaPages(journey, discovery)[0].result
  assert.equal(resultado.source, 'real')
  assert.ok(resultado.areas.every((a) => a.description === descripcionesLocales[a.code]))
  assert.equal(app.requests.length, 0)
})
