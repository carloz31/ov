# Ajuste · planes-desbloqueo-original

## Contexto

El ajuste planes-desbloqueo-completo (migración de datos 0061) hizo que, en `contenido`, las cuatro secciones del plan se abrieran con b0-4, porque en el piloto nadie llegaba a b3-2, b3-8 ni b4-5. Era temporal. Este ajuste devuelve cada sección a la actividad que la abría originalmente. La base desplegada se corrige con una migración de datos nueva, porque la 0061 ya está en `main` y no se edita. Se trabaja en `main`, sin rama, y sin commits: el usuario los hace a mano.

## Qué cambia y por qué

- **Reglas de `contenido`** ([contenido.py:1436-1440](ov_backend/datos/contenido.py:1436)). Hoy R-PLAN-CONOCIMIENTO, R-PLAN-REALIDAD y R-PLAN-PASOS piden COMPLETA_ACTIVIDAD de b0-4, con el mensaje «Completa la misión «¿Tienes una opción en mente?».». Vuelven a:
  - CONOCIMIENTO: b3-2, «Completa la misión «Mis intereses en el catálogo».»
  - REALIDAD: b3-8, «Completa la misión «Cuánto cuesta estudiar».»
  - PASOS: b4-5, «Completa la misión «Pongo a prueba mi orden».»
  
  R-PLAN-POR_QUE sigue con b0-4. El comentario del ajuste anterior pasa a nombrar este.
- **Migración de datos `0062_planes_desbloqueo_original.py`** (nueva, `down_revision = '0061'`). Hace lo mismo que el `downgrade()` de la 0061 y viceversa:
  - mismo SQL puro, con la guarda dentro de cada UPDATE (que existan b0-4, b3-2, b3-8 y b4-5);
  - idempotente;
  - sin tocar tablas de estado;
  - sin importar `datos/` ni la 0061 (códigos y mensajes van en el archivo).
- **Guía de Mis planes** ([guideTexts.ts:257](ov_frontend/src/data/content/guideTexts.ts:257)). Hoy dice «Cada tarjeta tiene cuatro secciones: …». Vuelve a «Cada tarjeta tiene cuatro secciones que se abren mientras avanzas en el camino: …», el texto anterior al ajuste.

## Qué no cambia

- **Lo que los estudiantes ya tienen abierto.** Los desbloqueos son estado de la cuenta y la migración no los quita (README de despliegue, 7.6). Quien ya completó b0-4 bajo la 0061 conserva las cuatro secciones; quien no, las abrirá de a una.
- **`ruta`.** Siempre tuvo el desbloqueo progresivo (`t-inicio`, `t-valores`, `t-explorar`, `t-comparar`).
- **El cierre que agrupa las secciones** (`finishSummary.ts`, «Nuevas secciones en tus planes: …»). Es genérico y, con una sola sección, muestra el texto de siempre; su prueba `servidor-cierre.test.mjs` no se toca.
- **El motor, R-SEC-PLANES, la siembra de ejemplos y el modelo.** `sembrar_panel_ejemplo.py` ya guarda cada sección después de su actividad (b3-8 → REALIDAD, b4-5 → PASOS), así que sirve con las reglas originales.
- **Los fixtures del front**, que son solo `ruta-*`.

## Modelo de datos

Sin cambios: es una migración solo de datos sobre `regla_desbloqueo` y `condicion_desbloqueo`.

## Backend: pruebas

- **`tests/integration/datos/test_reglas_contenido.py`.** La prueba `test_las_cuatro_secciones_del_plan_se_abren_con_planes` se reemplaza por `test_cada_seccion_del_plan_se_abre_con_su_actividad`: POR_QUE con b0-4, CONOCIMIENTO con b3-2, REALIDAD con b3-8, PASOS con b4-5, cada una con su mensaje. Adaptarla está autorizado porque el pedido es revertir.
- **`tests/integration/migraciones/test_migracion_planes_desbloqueo.py`.**
  - Las pruebas de la 0061 suben a `'0061'` en vez de `'head'`, para seguir probando esa migración. `_base_en_0060` sigue igual: estampa head y baja a 0060, pasando por el downgrade de la 0062.
  - Se agregan, en el mismo archivo para reutilizar sus ayudas (ninguna prueba importa otro `test_*.py`), las pruebas de la 0062 sobre una base bajada a 0061, como la desplegada hoy:
    - subir deja las reglas y los mensajes originales;
    - quien completó b0-4 bajo 0061 conserva las cuatro secciones abiertas y su plan intacto;
    - quien no la completó abre solo POR_QUE con b0-4, ve CONOCIMIENTO bloqueada con «Mis intereses en el catálogo» y la abre con b3-2 (evento crudo, como ya hace el fixture `piloto`);
    - no toca tablas de estado, es idempotente y bajar a 0061 vuelve a b0-4;
    - en `ruta` no hace nada.

## Documentos

- [planes.md:34](ov_backend/docs/sistema/planes.md:34): «En `contenido` POR_QUE se abre con b0-4, junto con PLANES; CONOCIMIENTO con b3-2, REALIDAD con b3-8 y PASOS con b4-5 (ajuste planes-desbloqueo-original, migración 0062, que deshace la 0061)».
- La entrada «Planes de carrera» de `ov_frontend/AGENTS.md`: la frase del ajuste anterior queda así: el cierre agrupa las secciones que se abren juntas, y la guía de Mis planes vuelve a decir que se abren al avanzar.
- `ov_backend/docs/decisiones.md`: las decisiones de este ajuste.
- Spec `ov_backend/docs/specs/ajuste-planes-desbloqueo-original.md` con este plan. En F3 se cierra según «Documentación» del `AGENTS.md` raíz: lo vigente pasa a `docs/sistema/` y al `AGENTS.md` correspondiente; la spec y `decisiones.md` van a `docs/historico/ajuste-planes-desbloqueo-original/`, y `decisiones.md` vuelve a quedar solo con su encabezado.

## Fases

0. **Antes de F1:** listar los archivos que tocaron los commits del ajuste planes-desbloqueo-completo (75be2d8e, 861ba5fb, 069ad19f, más cualquier otro con ese nombre) y confirmar, uno por uno, si se revierte o se deja a propósito. Si aparece uno fuera del plan, aviso antes de seguir.
1. **F1 · Backend:** los títulos de los tres mensajes de la 0062 se comprueban contra `ACTIVIDADES` de `contenido.py` (b3-2, b3-8 y b4-5), no solo contra el downgrade de la 0061. `contenido.py`, `contenido.py`, la migración 0062 y las pruebas. Carpetas: `tests/integration/migraciones`, `tests/integration/datos` y `tests/integration/escenarios`. Comprobar que `uv run alembic heads` muestra solo 0062.
2. **F2 · Front:** `guideTexts.ts`. Carpetas: `npm run test:servidor` y `tests/local/aventura`.
3. **F3 · Cierre:** documentos, `decisiones.md`, el cierre de la spec (arriba, «Documentos») y la suite completa de ambos repos con el subagente `pruebas` (`uv run pytest -n auto -q`; `npm test`, `build`, `lint`, `check:estructura`).

Sin commits entre fases: al terminar cada una, me detengo y resumo.

## Verificación

- Las pruebas de arriba, en verde, con el subagente `pruebas`.
- `uv run alembic heads` muestra un solo head (0062).
- La 0062 se genera también como SQL sin conexión (`alembic upgrade 0061:0062 --sql`), como se exigió a la 0061.
- En el despliegue: un push normal; `actualizar.sh` respalda y corre la migración, sin recargar.
