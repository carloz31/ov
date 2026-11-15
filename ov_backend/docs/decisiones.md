# Decisiones de la spec en curso

## Ajuste recorte-volcan

- `b2-1` pasa a (800, 330) y `b2-2` a (640, 335): en su lugar anterior `b2-1` quedaba sobre la nueva línea `b1-7 → b2-3`. Quedan a 92–94 de `b2-3` y cumplen las reglas de `servidor-posiciones-mapa.test.mjs`.
- Pruebas adaptadas (autorizadas por el ajuste, §4): las primeras del camino incluyen `b2-3` en vez de `b2-1`; `b2-1` y `b2-2` entran a las opcionales de la carga; el camino de `contenido` tiene 36 requeridas, no 38 (back y `tests/servidor/mapa`); la prueba de `h1` completa `b2-1` tras llegar a `b2-3`.
- `R-F08` y `R-F09` siguen colgando de `b2-1` y `b2-2`, como dice el ajuste: esas fichas solo le llegan a quien haga la opcional.
- Mensaje de `R-b2-1` y `R-b2-2`: «Se abre al completar «Lo que valoro en un trabajo», cuando ordenas lo que valoras con Rosa.» El del ajuste no nombraba la misión entre «», como exige la regla vigente de mensajes (lumi-mensajes); lo decidió el usuario.
- `sembrar_panel_ejemplo.py` (caso 8) y `tests/llm/corrida_flujo.py` completan `b2-1` (y `b2-2` en el caso 8) antes de responder habilidades o inteligencias: esas páginas ya no se abren por el camino requerido. `corrida_flujo.py` no se corrió (llama al LLM real).

## Ajuste recorte-puerto

- Se trabaja en `ajuste/recorte-puerto`, creada desde `ajuste/recorte-volcan` (la spec en curso aún no está en `main`), y se agrega como sección de la misma spec.
- `b3-7` pasa a (380, 590): con el camino nuevo `b3-5 → b3-8`, la línea pasaba a ~28 de su marcador. `b3-6` y `b3-9` se quedan donde estaban; las tres cumplen las reglas de `servidor-posiciones-mapa.test.mjs`.
- Las batallas del Feriante y de Clotilde, ahora opcionales, mandan a «el puerto» al ganarse, como las otras revanchas; la de Doña Cifra, a «la caseta de Clotilde».
- Pruebas adaptadas (autorizadas por el ajuste, §5): `b3-6`, `b3-7` y `b3-9` entran a las opcionales de la carga y el camino de `contenido` tiene 33 requeridas (back y `tests/servidor/mapa`). `sembrar_panel_ejemplo.py` (caso 4) llega a `b3-5` y completa `b3-6` y `b3-7`, para dejar el mismo avance.
- Siguen colgando de `b3-6` las fichas F14 y F15, `b3-7` y la feria: solo le llegan a quien haga el desvío (costo aceptado para la prueba).
- La sección REALIDAD del plan se llama «Cómo lo haría realidad» también en `fijos.py` (antes «Qué tan real es»), para que el desbloqueo que muestra el cierre de `b3-8` diga lo mismo que Lumi y que el plan. Lo pidió el usuario tras la prueba en el navegador. Una base ya cargada lo toma al recargar los datos. PASOS sigue con nombres distintos (pendiente en `contenidos-actividades.md`).
- PASOS también se llama igual en `fijos.py` y en el front: «Mis próximos pasos» (antes «Mis pasos» en la base). Lo pidió el usuario. El rótulo «Mis pasos» de la lista dentro de `SeccionPasos` no es el título de la sección y no cambia. POR_QUE sigue con «Por qué» en la base y «Por qué la elijo» en el front.
- POR_QUE también se llama igual en `fijos.py` y en el front: «Por qué la elijo» (antes «Por qué» en la base). Lo pidió el usuario. Con esto las cuatro secciones del plan tienen un solo nombre; los mensajes de regla ya decían «Por qué la elijo». La prueba de cierre del front que usaba «Por qué» como nombre de ejemplo se adaptó.
