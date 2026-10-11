import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

function explorationAssetsWithDeploymentBase() {
  const config = ts.createSourceFile(
    'vite.config.ts',
    readFileSync('vite.config.ts', 'utf8'),
    ts.ScriptTarget.Latest,
  )
  let base
  function visit(node) {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(config) === 'base' &&
      ts.isStringLiteral(node.initializer)
    ) {
      base = node.initializer.text
    }
    ts.forEachChild(node, visit)
  }
  visit(config)
  assert.equal(typeof base, 'string', 'The deployment base must be defined in Vite')
  const source = readFileSync(
    'src/lib/explorationAssets.ts',
    'utf8',
  ).replaceAll('import.meta.env.BASE_URL', JSON.stringify(base))
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const exports = {}
  vm.runInNewContext(outputText, { exports })
  return exports.getExplorationImagePath
}

test('deployed case images resolve from the public root on nested student routes', () => {
  const getImagePath = explorationAssetsWithDeploymentBase()
  const pages = [
    'https://example.test/student/cases/forest-fire',
    'https://example.test/student/cases/forest-fire/',
    'https://example.test/student/exploration?punto=forest-fire',
  ]
  const images = [
    'forest-fire-case-background.png',
    'forest-fire-stabilization-background-v2.png?v=2',
    'forest-fire-recovery-background-v2.png?v=2',
  ]
  for (const page of pages) {
    for (const image of images) {
      const resource = new URL(getImagePath(image), page)
      const expected = new URL(`/images/${image}`, page)
      assert.equal(
        resource.href,
        expected.href,
        `Image must be independent of the route: ${image} at ${page}`,
      )
      assert.ok(
        existsSync(path.resolve('public', resource.pathname.slice(1))),
        `Missing public image: ${resource.pathname}`,
      )
    }
  }
})
