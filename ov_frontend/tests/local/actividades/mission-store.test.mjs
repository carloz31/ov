import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

function fixture(saved = null) {
  let persisted = saved
  let fail = false
  let storageEvent
  const cache = new Map()
  const context = vm.createContext({
    Date,
    Set,
    localStorage: {
      getItem: () => persisted,
      setItem: (_, value) => {
        if (fail) throw Error('Quota exceeded')
        persisted = value
      },
    },
    window: {
      addEventListener: (_, handler) => {
        storageEvent = handler
      },
    },
  })
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    const exports = {}
    cache.set(file, exports)
    const code = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
    }).outputText
    vm.runInContext(`(function(require, exports) { ${code}\n })`, context)(
      (specifier) => {
        if (specifier === 'react') return { useSyncExternalStore: (_, snapshot) => snapshot() }
        const base = specifier.startsWith('@/')
          ? path.resolve('src', specifier.slice(2))
          : path.resolve(path.dirname(file), specifier)
        return load([base, `${base}.ts`, `${base}.tsx`].find(existsSync))
      },
      exports,
    )
    return exports
  }
  return {
    store: load(path.resolve('src/store/journeyStore.ts')),
    persisted: () => persisted,
    fail: (value) => {
      fail = value
    },
    external: (value) => {
      persisted = value
      storageEvent({ key: 'ov.missions.v2' })
    },
  }
}
test('saved next node, responses and drafts survive a new session', () => {
  const app = fixture()
  app.store.updateJourney((state) => ({
    ...state,
    progress: {
      'act-tip-01': {
        estudianteId: 'est-prototipo',
        actividadId: 'act-tip-01',
        estado: 'en_curso',
        nodoActualId: 'm07',
      },
    },
    items: [{ instrumentoId: 'tip', itemId: 'tip-001', aplicacion: 'unica', valor: 'no' }],
    drafts: { 'act-06/g-identidad': 'Mi borrador sin terminar' },
  }))
  const reloaded = fixture(app.persisted()).store.useJourney()
  assert.equal(reloaded.progress['act-tip-01'].nodoActualId, 'm07')
  assert.equal(reloaded.items[0].valor, 'no')
  assert.equal(reloaded.drafts['act-06/g-identidad'], 'Mi borrador sin terminar')
})
test('failed writes do not advance or award a completion and can be retried', () => {
  const app = fixture()
  const before = app.store.useJourney()
  app.fail(true)
  assert.equal(
    app.store.updateJourney((state) => ({ ...state, pieces: ['pieza-plaza'] })),
    false,
  )
  assert.equal(app.store.useJourney(), before)
  assert.match(app.store.useJourneyError(), /No se pudo guardar/)
  app.fail(false)
  assert.equal(
    app.store.updateJourney((state) => ({ ...state, pieces: ['pieza-plaza'] })),
    true,
  )
  assert.equal(app.store.useJourneyError(), '')
})
test('invalid storage recovers and another tab refreshes mission progress', () => {
  for (const saved of ['{broken', 'null', '{"version":1}', '{"version":2,"items":null}'])
    assert.equal(fixture(saved).store.useJourney().version, 2)
  const app = fixture()
  const updated = { ...app.store.useJourney(), resources: ['ficha-mitos'] }
  app.external(JSON.stringify(updated))
  assert.equal(app.store.useJourney().resources[0], 'ficha-mitos')
})
