import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('staff reading colors meet AA contrast on their intended surfaces', () => {
  const css = readFileSync('src/styles/theme.css', 'utf8')
  const theme = css.match(/\.theme-staff \{([\s\S]*?)\}/)[1]
  const tokens = Object.fromEntries(
    [...theme.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi)].map(([, key, value]) => [key, value]),
  )
  const luminance = (hex) => {
    const rgb = hex
      .slice(1)
      .match(/../g)
      .map((v) => parseInt(v, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
  }
  for (const [text, surface] of [
    ['foreground', 'background'],
    ['foreground', 'card'],
    ['muted-foreground', 'card'],
    ['muted-foreground', 'muted'],
    ['text-tertiary', 'card'],
    ['text-tertiary', 'background'],
    ['sidebar-foreground', 'sidebar'],
    ['sidebar-accent-foreground', 'sidebar-accent'],
    ['primary', 'card'],
    ['primary', 'primary-soft'],
    ['primary-foreground', 'primary'],
    ['success-text', 'success-soft'],
    ['warning-text', 'warning-soft'],
    ['danger-text', 'danger-soft'],
    ['neutral-text', 'neutral-soft'],
  ]) {
    const a = luminance(tokens[text]),
      b = luminance(tokens[surface])
    const contrast = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    assert.ok(contrast >= 4.5, `${text} on ${surface}: ${contrast.toFixed(2)}:1`)
  }
})
