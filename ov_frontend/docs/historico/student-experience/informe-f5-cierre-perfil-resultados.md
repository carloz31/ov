# Iteración 1 · Anexo F5 · Verificación final

Fecha: 9 de octubre de 2026. Autorización: «procede con F5». Alcance: F5, puntos 1–5, de `ov_backend/docs/iteraciones/spec-iteracion-1-cierre-perfil-resultados.md`. Se detiene el trabajo al cerrar esta fase, sin push.

## Resumen por fase

| Fase | Resultado y archivos principales | Pendientes |
|---|---|---|
| F0 | Lectura completa, comparación con main y línea base, registradas en `plan.md` y decisiones del backend. | Fallas previas del frontend, comparadas abajo. |
| F1 | Perfil común API/local: `pages/student/StudentProfileView.tsx`, `features/discovery/hooks/useStudentProfile.ts` y componentes del perfil. Nombre, nivel, progreso, insignias y páginas reales en API; planes y favoritos locales. | Integraciones futuras permanecen fuera del alcance. |
| F2 | Descripciones remotas en `types/servidor.ts`, `services/api/instrumentos.ts`, `lib/servidor/adaptadores.ts`, `features/discovery/data/dimensionExamples.ts` y fixtures. Backend: parámetros, cargadores de plataforma/demo y representación de dimensiones/resultados. | TEST-INT y TEST-HAB reales todavía no forman parte de plataforma. |
| F3 | `features/activities/components/FinishScreen.tsx`, componentes de cierre, `hooks/useActivityFinish.ts` y `lib/finishSummary.ts`: recursos, diario, extras y repetición; selección de ficha por URL. | Metadatos/contenido de testimonios y conservación del recibo al volver desde una ficha. |
| F4 | `pages/student/HelenaResultView.tsx`, `features/discovery/components/ResultOverview.tsx` y componentes de resultado; hooks, lógica y estilos de discovery; `lib/studentViews.ts` y `components/student/StudentModuleLayout.tsx`. Plantilla por tipo, guía, afinidades, planes y scroll del módulo. Corrección posterior: fragmentos exactos y duración literal del catálogo. | Catálogo incompleto, íconos de la Central y recarga directa API detectada en F5. |
| F4b | `HelenaBookPages`, `HelenaPageCard`, `HelenaPageSummary`, `DimensionSummaryRow`, `HelenaPageContents` y `resumenPagina`: resumen común sin porcentajes, anuncios y enlaces al detalle/guía. Paleta del portal en libro y resultados. | Se mantienen los pendientes anteriores. |
| F5 | Suites completas, revisión con BD y modo local, actualización de origen de datos, pendientes, plan y decisiones compartidas. Adaptación de dos expectativas antiguas en `tests/adventure-rendering.test.mjs` y `tests/servidor-resultados.test.mjs`. | No se corrigen problemas ajenos ni se inicia otra fase. |

Las entradas individuales de `plan.md` conservan la autorización del anexo y las instrucciones posteriores del usuario. F4b, líneas 9–18 y 71–87 de `spec-f4b-libro-helena-resumen.md`, sustituye expresamente el resumen anterior del libro; por eso las dos expectativas antiguas pasan a comprobar el nuevo marcado renderizado, descripciones y conteos, ausencia de porcentajes/listados de carreras y enlaces al resultado y a la guía. Se mantienen las comprobaciones de disponibilidad, misiones, revelación y datos originales.

## Verificaciones

| Comprobación | F0 | F5 |
|---|---|---|
| Frontend, suite completa | 413 pruebas: 398 aprobadas, 15 fallas | 463 pruebas: 449 aprobadas, 14 fallas; cero omitidas/canceladas |
| Backend, suite completa | 1091 aprobadas, cuatro omitidas, cero fallas | 1095 aprobadas, cuatro omitidas, cero fallas y dos advertencias previas |
| Frontend, resultados dirigidos | — | 37 aprobadas, cero fallas |
| Build / lint | Correctos | Correctos; permanece el aviso del bundle mayor de 500 kB |
| Estructura | Correcta | 565 archivos, cero infracciones y cero excepciones |

Respecto de la última suite completa de F4 (455 pruebas, 441 aprobadas y 14 fallas), F5 añade ocho aprobadas y conserva exactamente los nombres y diagnósticos de las 14 fallas, excluyendo duraciones y ubicaciones de pila. Frente a F0 hay 51 aprobadas más y una falla menos, resuelta en F3. La suite inicial de F5 encontró además dos expectativas obsoletas de F4b; tras adaptarlas se volvió a ejecutar la suite completa. No se omiten pruebas ni se alteran las 14 fallas previas.

Comandos: `npm run build`, `npm run lint`, `npm run check:estructura`, `npm test`; ejecución dirigida de los archivos de resultados. Backend: `EVALUADOR=falso`, `uv run --no-sync --offline python -m pytest -q -rs -p no:cacheprovider`, con `--basetemp` externo. TestClient requiere ejecutarse fuera del aislamiento, como en las verificaciones anteriores. No hay llamadas a Gemini ni nuevas dependencias.

El backend termina en 1174,21 segundos con el mismo resultado de F2: cuatro aprobadas más que F0. Las cuatro omisiones son PostgreSQL por ausencia de `TEST_POSTGRES_URL`; las dos advertencias previas corresponden a Starlette/httpx y Google GenAI. No se modifica código ni pruebas del backend en F5.

## Recorrido manual con aplicación completa

Se montan `App`, las rutas, el shell y el módulo reales. Entrada temporal externa para seleccionar modo y omitir únicamente introducciones de interfaz; no se sustituyen respuestas API. Vite en 5190 y API en 8003. La API usa una SQLite nueva fuera de ambos repos, creada con Alembic y la semilla plataforma, con evaluador falso. La base del usuario permanece intacta.

**API:** bienvenida completa desde el mapa, cierre con ficha `first-steps`, insignia y siguiente actividad confirmadas por la API; apertura del visor de esa ficha desde el cierre. Repetición íntegra con «Repaso completado» y sin nuevos desbloqueos; los eventos de la BD confirman ambas finalizaciones. Para alcanzar el resultado se completan las ocho actividades restantes del Camino y se responden/completan los catorce encuentros mediante peticiones explícitas a la API desechable: esto es preparación de datos, no recorrido manual de esas actividades. Resultado IRA (100/75/50), diez coincidencias y tres carreras. Perfil completo con Ana, nivel 3, recorrido 100 %, afinidad 93 %, insignias y páginas. Revelación en el libro y entrada al resultado de intereses; guía de seis dimensiones, filtro Mejor ajuste, favorito Geólogo/a y plan A Ingeniería Civil. Se abre la demostración de inteligencias con ambas destacadas y su guía de siete dimensiones.

**Local:** bienvenida y recorrido completo de los 24 pasos de La plaza de los rumores. Esta última entrega `ficha-mitos` y pieza de llave; el enlace del cierre abre su contenido real. Repetición completa de la plaza sin nuevos recursos. Perfil completo con Alex, progreso y sus tres capítulos. Se completa la primera interacción de Mara desde la aplicación, que habilita el ejemplo de intereses según el comportamiento local existente; no se fuerza un resultado personal ni se completa el resto mediante fixtures. Revelación de intereses e inteligencias, guía, filtro Gran ajuste, favorito Paramédico/a y plan B Periodismo. Los planes/favoritos son el estado local vigente en ambos modos, tal como prescribe F1; no se presentan como persistencia del backend.

**Scroll y tamaños:** escritorio 1280 × 720 y teléfono 390 × 844. En ambos modos se llega al último aviso dentro de `.sx-module-content` y el documento permanece en `scrollTop = 0`. Teléfono: ancho del documento y `scrollWidth` iguales a 390 px. Módulo local: 4488 px de contenido, 788 px visibles y posición final 3700; API: 5119 px de contenido y posición final aproximadamente 4331. Las carreras apilan sus acciones. Entrada/retorno desde el libro y guías comprobados. Una destacada y perfil plano ya tienen las pruebas y evidencias con shell real de F4/F4b; esta fase revisa los datos disponibles contra la BD y no los presenta como casos reales de plataforma.

## Hallazgos y límites

- Confirmado en API y local: volver por historial desde una ficha no conserva el recibo original de cierre. Los recursos permanecen obtenidos. Sigue el pendiente explícito de F5.3.
- Detectado y reproducido: recargar directamente `/student/profile/helena/intereses` en API redirige al libro durante la carga inicial, aunque el resultado ya esté revelado. Entrar desde el libro funciona. Se registra aparte para corrección; no se debilita el control de acceso ni se agrega una interfaz de carga en F5.
- Duración: resuelta para la presentación aprobada con `careerCatalog.duration`; sigue sin existir en el contrato remoto. Se conserva el texto «5 años aproximadamente» y se omiten códigos desconocidos.
- Testimonios sin contenido/persona, ocupaciones con catálogo incompleto e íconos obtenidos en la Central mantienen sus pendientes; no se inventan datos.
- La consola de desarrollo emite avisos de React por claves vacías duplicadas durante la primera interacción local de Mara. La interacción se completa y habilita el ejemplo, pero el aviso queda registrado para diagnóstico; no se atribuye a F5 ni se declara corregido.

Evidencia externa: `C:/Users/mauri/.codex/visualizations/2026/10/09/01a11f28-d280-71b3-9c02-5de9f3b17c38/f5-*`. Incluye logs, comparación de las fallas, eventos/preparación API y capturas de cierres, fichas, perfiles, inteligencias, planes y avisos finales en escritorio/teléfono. Ninguna BD, log ni composición temporal se versiona.
