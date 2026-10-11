import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'
import { copia, fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

const carpeta = 'src/data/activities/contenidos'
const app = fixtureServidor({ api: false })
const { contenidos, contenidoPorClave } = app.load('src/data/activities/contenidos.ts')
const jsonContenido = clave => JSON.parse(readFileSync(`${carpeta}/${clave}.json`, 'utf8'))
const actividades = fixture => jsonServidor(fixture).flatMap(bloque => bloque.actividades)

test('cada JSON de contenido está registrado explícitamente y cada clave tiene su archivo', () => {
  const archivos = readdirSync(carpeta).sort()
  assert.equal(archivos.length, 13)
  assert.deepEqual(archivos, Object.keys(contenidos).map(clave => `${clave}.json`).sort())
  const fuente = readFileSync('src/data/activities/contenidos.ts', 'utf8')
  const imports = [...fuente.matchAll(/from '\.\/contenidos\/([^']+)\.json'/g)].map(match => match[1]).sort()
  assert.deepEqual(imports, Object.keys(contenidos).sort())
  assert.doesNotMatch(fuente, /import\.meta\.glob/)
  for (const clave of Object.keys(contenidos)) {
    assert.equal(contenidoPorClave(clave), contenidos[clave])
    assert.deepEqual(copia(contenidoPorClave(clave)), jsonContenido(clave))
  }
  for (const clave of ['sin_contenido_prueba', '', 'toString', '__proto__'])
    assert.equal(contenidoPorClave(clave), undefined)
})

test('todos los contenidos de plataforma existen y tienen presentación en el mapa', () => {
  for (const fixture of ['actividades-inicial', 'actividades-ciudad']) {
    const lista = actividades(fixture)
    assert.equal(lista.length, 24)
    for (const actividad of lista) {
      const contenido = contenidoPorClave(actividad.contenido)
      assert.ok(contenido, `${fixture}: ${actividad.codigo} → ${actividad.contenido}`)
      assert.ok(contenido.mapa, actividad.codigo)
    }
  }
})

test('todos los contenidos de los fixtures del apoderado existen en el registro', () => {
  for (const fixture of readdirSync('tests/fixtures/servidor')
    .filter(nombre => nombre.startsWith('apoderado-actividades-') && nombre.endsWith('.json'))) {
    for (const actividad of actividades(fixture.slice(0, -5)))
      assert.ok(contenidoPorClave(actividad.contenido), `${fixture}: ${actividad.codigo}`)
  }
})

test('el único contenido ausente de los tres momentos del piloto es sin_contenido_prueba', () => {
  for (const fixture of ['piloto-actividades-inicial', 'piloto-actividades-ciudad', 'piloto-actividades-final']) {
    const lista = actividades(fixture)
    assert.equal(lista.length, 21)
    assert.deepEqual(lista.filter(actividad => !contenidoPorClave(actividad.contenido))
      .map(actividad => [actividad.codigo, actividad.contenido]),
    [['cdd-sin-contenido', 'sin_contenido_prueba']])
  }
})

test('las nueve presentaciones del Camino conservan posición, etiqueta e ícono actuales', () => {
  const { fieldMissions } = app.load('src/data/content/adventure.ts')
  const { baseRoute } = app.load('src/data/activities/reflectionConfig.ts')
  const { getActivityType, getMissionMeta, getMissionIcon } = app.load('src/features/adventure/lib/caminoPoints.ts')
  const { iconosMapa } = app.load('src/features/adventure/lib/iconosMapa.ts')
  const camino = jsonServidor('actividades-inicial').find(bloque => bloque.codigo === 'CAMINO').actividades
  assert.equal(camino.length, 9)
  for (const actividad of camino) {
    const [id] = baseRoute.find(([, codigo]) => codigo === actividad.codigo)
    const mision = fieldMissions.find(mision => mision.id === id)
    const tipo = getActivityType(mision)
    const mapa = contenidoPorClave(actividad.contenido).mapa
    assert.deepEqual(copia(mapa), {
      x: mision.x, y: mision.y,
      etiqueta: `${tipo} · ${getMissionMeta(mision)}`,
      icono: tipo === 'Informativa' ? 'informativa' : tipo === 'Test' ? 'test' : 'registro',
    })
    assert.equal(iconosMapa[mapa.icono], getMissionIcon(mision))
  }
})

test('Mara y Elena conservan su presentación y los contenidos de apoderado no inventan un punto', () => {
  assert.deepEqual(copia(contenidoPorClave('instrumento_mara').mapa), { x: 875, y: 530, icono: 'test' })
  assert.deepEqual(copia(contenidoPorClave('encuentro_resultado_elena').mapa), {
    x: 1030, y: 610, etiqueta: 'Encuentro con Elena', icono: 'informativa',
  })
  assert.equal(contenidoPorClave('pad_01_acompanar').mapa, undefined)
  assert.equal(contenidoPorClave('pad_02_informacion').mapa, undefined)
})

test('el catálogo local conserva actividades, ajustes del piloto, apoderados y resultado sin metadatos nuevos', () => {
  const { activities, parentActivities, finalActivity, activityById, tipActivityIds, catalog } = app.load('src/data/activities/content.ts')
  const { baseRoute, additionalActivities } = app.load('src/data/activities/reflectionConfig.ts')
  const { validateActivity } = app.load('src/lib/activities/validation.ts')
  assert.deepEqual(copia(activities.map(actividad => actividad.id)), [
    'mission-welcome', 'mission-story', 'mission-future', 'mission-compass',
    'mission-expectations', 'mission-next-step', 'act-06', 'enc-mitos', 'act-tip-01', 'act-07',
    'extra-ecos', 'extra-objeto', 'extra-dudas',
  ])
  assert.deepEqual(copia(parentActivities.map(actividad => actividad.id)), ['pad-01-rol', 'pad-02-info'])
  assert.equal(finalActivity.id, 'act-tip-final')
  assert.deepEqual(copia(finalActivity.requisitos), copia(tipActivityIds))
  assert.equal(tipActivityIds.length, 14)
  assert.equal(catalog.instrumentos.filter(instrumento => instrumento.id === 'brujula-personal').length, 1)
  for (const [indice, [, id]] of baseRoute.entries()) {
    assert.equal(activityById(id).orden, indice + 1)
    assert.deepEqual(copia(activityById(id).requisitos), indice ? [baseRoute[indice - 1][1]] : [])
  }
  assert.ok(activityById('mission-story').nodos.some(nodo => nodo.id === 'story-logros'))
  assert.ok(activityById('mission-future').nodos.some(nodo => nodo.id === 'future-entorno'))
  assert.deepEqual(copia(activities.slice(-3)), copia(additionalActivities))
  for (const actividad of [...activities, ...parentActivities, finalActivity]) {
    assert.equal(Object.hasOwn(actividad, 'mapa'), false)
    validateActivity(actividad)
  }
  for (const actividad of activities) assert.equal(activityById(actividad.id), actividad)
  assert.equal(activityById('no-existe'), undefined)
})

test('el catálogo y los contenidos son iguales en modo local y api sin solicitudes al servidor', () => {
  const remoto = fixtureServidor({ api: true })
  for (const modulo of ['content', 'contenidos']) {
    const local = app.load(`src/data/activities/${modulo}.ts`)
    const api = remoto.load(`src/data/activities/${modulo}.ts`)
    for (const clave of modulo === 'content'
      ? ['activities', 'parentActivities', 'finalActivity', 'catalog', 'tipActivityIds'] : ['contenidos'])
      assert.deepEqual(copia(api[clave]), copia(local[clave]))
  }
  assert.deepEqual(app.requests, [])
  assert.deepEqual(remoto.requests, [])
})
