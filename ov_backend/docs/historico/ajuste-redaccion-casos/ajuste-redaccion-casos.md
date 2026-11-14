# Ajuste · redaccion-casos

## Contexto

Los seis casos de la Central tienen `detalle`, `resultado`, `aporte` y `siFalta` redactados en lenguaje de informe, difícil para un estudiante de 4.° o 5.° de secundaria. Las observaciones (`ajuste-redaccion-casos.md`) traen los textos nuevos ya decididos, caso por caso; se copian tal cual. No hay spec en curso en `ov_backend/docs/specs/` (vacía), así que el ajuste lleva la suya.

Verificado en la rama `ajuste/redaccion-casos` (desde `main` `c266c4b7`): los 170 textos de la columna «Hoy» coinciden exactamente con los JSON actuales (entre `1d0af55` y `main` los casos solo cambiaron rutas de imágenes). No hace falta avisar de discrepancias.

## Qué cambia

- `ov_frontend/src/data/cases/plataforma/*.json` (los seis): hoy `detalle`/`resultado` de 31 problemas y `aporte`/`siFalta` de 52 necesidades dicen el texto «Hoy»; pasarán a decir el texto «Queda» (166 valores). Más 4 campos de testimonios: `resumen` de `unpublished-interface` (becas), `mensaje` de `alternate-water-sources` y `mensaje` + `resumen` de `unverified-sources` (laguna).
- Cómo: un script de un solo uso (en el scratchpad, no se versiona) lee las tablas del `.md`, localiza cada valor por `id` de problema + `onet` (o fase + id de mensaje), comprueba que el valor actual es «Hoy» y lo reemplaza en crudo dentro del archivo (sin reformatear el JSON), exigiendo una sola aparición por reemplazo.

## Qué no cambia

- Estructura de los JSON, `CasoJson` (`src/types/cases.ts`), `casoDesdeJson.ts` (`detalle` → `detail`), pantallas de la Central, ocupaciones, distractores, presupuesto, puntaje, títulos, fases, intros, imágenes y los demás `mensajes`.
- Backend: no tiene copia de estos textos. Modelo de datos: sin cambios. Fixtures: no se regeneran (no contienen estos textos).
- Modo local (`forestFireCase.ts`): congelado.

## Fases

**F1 · Textos de los casos**
1. Guardar este plan como `ov_backend/docs/specs/ajuste-redaccion-casos.md`.
2. Aplicar el script.
3. Comprobación estructural (script corto): comparar cada JSON contra `main` recorriendo el árbol; solo difieren rutas que terminan en `detalle`, `resultado`, `aporte`, `siFalta`, `mensaje` o `resumen`; 170 valores en total; claves, `id` y `onet` idénticos; JSON válido.
4. `scripts/verificar_contenido_front.py` y, con el subagente `pruebas`, suites completas del front (`npm test`, `build`, `lint`, `check:estructura`) y del backend (`uv run pytest -n auto -q`).
5. Navegador (conjunto `contenido`): La laguna y Las becas, una fase completa; `detalle` más largo («Una comunidad sin respuestas», 219 car.) entero en la tarjeta en escritorio y móvil; `resultado` de «Los peces…» entero; `aporte` y `siFalta` nuevos; testimonio nuevo del representante de vecinos. Si algo se corta, se ajusta el estilo de la tarjeta, no el texto.
6. `decisiones.md` con las viñetas de §13 de las observaciones; commit `Ajuste redaccion-casos · F1: textos de los casos para secundaria`.

No hay documento de `docs/sistema/` que describa estos textos; no se toca. La spec queda en curso.

## Preguntas abiertas

Ninguna.
