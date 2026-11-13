# Ajuste · coherencia-bloque4

## Contexto

Reescritura del contenido del bloque 4 (acantilado: b4-1 a b4-5, ma8), de las fichas F19, F20 y F02, del banco de la batalla b4-4 y un barrido para que ningún diálogo lleve `eco`. Los textos vienen decididos por el usuario en `ajuste-coherencia-bloque4.md` y sus anexos (Downloads): se copian tal cual, sin reescribir. No hay spec en curso: el ajuste tendrá su propia spec `ov_backend/docs/specs/ajuste-coherencia-bloque4.md`. Rama `ajuste/coherencia-bloque4` (ya creada desde `main`, que ya trae el ajuste del bloque 3).

## Qué cambia (hoy → pasará a)

**Front, JSON del bloque** (`ov_frontend/src/data/activities/contenidos/plataforma/`)
- `b4_1.json`, `b4_2.json`, `b4_3.json`, `b4_5.json`, `ma8.json`: hoy 9/4/9/5/3 nodos, con `eco` en diálogos de b4-1, b4-5 y ma8 → se reemplazan completos por los de Downloads (12/8/13/12/8 nodos; sin `eco` en diálogos; ma8 cuelga de b4-5).
- Barrido `eco`: se quita el campo de los diálogos `b3-2-02` (y su `texto` pasa al nuevo de §3.3), `b3-8-01`, `h1-02`, `h2-02`, `h3-02`, `ma3-02`. `b5_1.json` no se toca.

**Front, fuera del bloque**
- `catalogo.json`, personaje `helena`: `descripcion` nueva (§3.1).
- `src/data/content/challenges.ts`, `desafio-eco`: tercera frase de `presentacionEnemigo` («Te va a mostrar compañeros…criterio débil…» → «Te va a repetir lo que dijeron otros viajeros…razón que va sola…») y `titulo` del requisito F20 → «Cómo decides y con qué razones».

**Backend** (`ov_backend/datos/contenido.py`, solo conjunto `contenido`)
- `DESCRIPCIONES`: b4-1, b4-2, b4-3, b4-4 y ma8 (§2.1).
- `REGLAS`, `R-B4`: mensaje «…las páginas obligatorias.» (condición igual).
- `PREGUNTAS_BATALLA`: hoy b4-4-p01–p14 → las 18 tuplas de `bancos_bloque4.py`, copiadas literales.
- `FICHAS`: F19 (contenido), F20 (título, descripción y contenido), F02 (contenido completo de §2.6). El markdown se pasa a literal Python con un script de una sola vez (escapa `\`, `'` y saltos de línea como `\n`, igual que las demás fichas; `O\*NET` queda `O\\*NET`).

## Qué no cambia

- Conjunto `ruta`, sus datos y pruebas. `REFERENCIAS` (las diez siguen; `b3-2-ref-codigo` y `b3-8-ref-costos` quedan sin uso en el front), `CONFIGURACION_BATALLAS` `(5, 3, 7)`, títulos y duraciones de `ACTIVIDADES`, condiciones de las reglas, ítems de registro, tarjetas LLM y huellas.
- `b4_4.json`, `b5_1.json`, textos de h1/h2/h3/ma3/b3-8.
- El código del front que pinta el eco de un diálogo (lo usa b5-1). `scripts/verificar_contenido_front.py` solo exige que cada eco usado esté cargado, no que cada referencia tenga uso: no hay que tocarlo.
- Nombres de secciones del plan y pantalla del plan. Comprobado: los nombres citados («Mis planes», «Por qué la elijo», «Qué tanto la conozco», «Mis dudas», «Cómo llegaría», «Dónde estudiaría», «Cuánto costaría», «Cómo lo pagaría», «Mis próximos pasos», «Ocupaciones a las que lleva su familia», «Qué hacen», «Cuánto ganan sus egresados», «Dónde estudiarla», «Llévame a un lugar inesperado») existen hoy en el front.
- `contenidos.ts`: mismos archivos, sin registro nuevo.

## Modelo de datos

Sin cambios.

## Pruebas y fixtures

- No hay pruebas que comparen estos textos, cuenten las preguntas de b4-4 ni esperen el eco en los diálogos del barrido (`servidor-registro-ecos.test.mjs` prueba ecos de ítems, que no cambian). No se adapta ninguna.
- **Ida y vuelta de las fichas:** tras cargar el conjunto `contenido`, leer F19, F20 y F02 (título, descripción y contenido) y compararlas carácter por carácter con los bloques markdown del documento (§2.4–2.6). Un escape mal puesto no rompe ninguna prueba: solo se vería en pantalla.
- **Conteo del banco:** confirmar que b4-4 queda con 18 preguntas exactas (`b4-4-p01`…`p18`), iguales a `bancos_bloque4.py`, y que no sobrevive ninguna de las 14 anteriores.
- Fixtures del front: ninguno contiene los textos que cambian; se regeneran igual al cierre de F1 por si el título de F20 o las descripciones salen en algún export, y se revisa el diff.

## Fases

1. **F1 · Backend y JSON del bloque 4**: `contenido.py` (descripciones, R-B4, banco, F19/F20/F02); los cinco JSON; regenerar fixtures; comprobación de ida y vuelta de F19/F20/F02 y conteo del banco. Pruebas: `tests/integration/datos`, `tests/integration/batallas`, `tests/integration/escenarios`; `verificar_contenido_front.py`; front `tests/local/actividades`, `tests/servidor/actividades`, `tests/servidor/registro`, `npm run test:servidor`. Commit.
2. **F2 · Front fuera del bloque y barrido `eco`**: `catalogo.json`, `challenges.ts`, los seis diálogos. Pruebas: mismas carpetas del front + `test:servidor`; buscar `"eco"` en `plataforma/`: solo `b5-1-06`. Commit.
3. **F3 · Cierre**: suites completas (back `pytest -n auto -q`; front `npm test`, `build`, `lint`, `check:estructura`); revisión en navegador con el conjunto `contenido` de la lista §6 (b4-1…ma8, reingreso, «Anterior», desbloqueos, R-B4 bloqueado, fichas en pantalla angosta, b3-2/b3-8, h1–h3/ma3); `decisiones.md` con §7; `contenidos-actividades.md` (pendientes resueltos: R-B4, b4-4, RIASEC en b4-1/b4-4/F19, desfase de b4-3; nuevos de §8). Commit. La spec queda en curso.

## Preguntas abiertas

Ninguna.
