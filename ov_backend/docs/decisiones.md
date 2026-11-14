# Decisiones de la spec en curso

Spec: `docs/specs/auditoria-panel.md` (correcciones aprobadas H1–H5, H8, F1–F7; no se hacen H6, H7 ni H2 (b)).

## Fase 1

- H2: `intereses_por_cuenta` (solo la usa el panel) lee columnas en lugar de entidades y, de cada resultado, solo las coincidencias con `posicion ≤ max(MAXIMO_OCUPACIONES_AFINES, MINIMO_OCUPACIONES_AFINES)`. Las posiciones son contiguas desde 1 por r descendente, así que `seleccionar_afines` elige lo mismo. Tiene su propia caché por resultado en el contexto de la petición: no usa la de `representar_resultado`, que necesita las ocupaciones completas.
- H2: `frente_test` pide las familias solo de quienes tienen Plan A. El código de interés se sigue calculando para todos, porque el conteo de letras de los resultados listos lo usa.
- H4: `estudiante_de_orientadora` comprueba «de su salón» con los salones que ya leyó `exigir_orientadora`, que es la misma condición que `es_de_su_salon`, y arma el alcance solo con el salón del estudiante (`alcance_de_salones`). `Acceso.salon.salones` sigue trayendo todos los salones de la orientadora.
- H5: `Lecturas.una_vez` guarda por petición `por_revisar`, `estados_test`, el Plan A de los temas y las mediciones de partida y llegada; `Lecturas.parametros` lee los parámetros una vez. `intereses_vigentes` se guarda por cuenta en el contexto de la petición, porque `perfil_planes` no usa `Lecturas`.
- H8: `intereses` se pide una vez por salón al montar la pestaña, con los órdenes de la URL en ese momento. Reordenar una tabla pide `areas` o `instituciones` con `limite` igual al número de filas del top ya recibido (`PANEL_TOP_INTERESES`, o menos si no hay tantas) y `desde=0`. Mientras llega, la tabla conserva sus filas en lugar de mostrar la carga de toda la pestaña; si falla, sale el aviso de error que ya existía.
- F1: el buscador de la lista guarda el texto en el hook y lo pasa a la URL (`?q=`) tras 300 ms sin escribir, como las listas de intereses.

## Fase 2

- H1: `panel/contexto_lectura.py` (`LecturaContexto`) arma el contexto de hoy de los ítems para la pestaña Respuestas. Lee una vez por petición las respuestas vigentes de la cuenta, sus planes, todas las referencias de los ecos (`resolver`) y las piezas; cada ítem se arma una sola vez. `resolver_contexto`, el flujo del registro y sus pruebas no cambian. Las reglas de marcadores y ecos están repetidas sobre lo ya leído, y las piezas puras de `registro/contexto.py` se reutilizan importándolas.
- H1: los ecos al LLM se siguen calculando, aunque se aprobó «sin ecos_llm». `eco_cambiado` compara los ecos al LLM guardados con los de hoy: sin ellos, «Cambió después» saldría distinto, y las respuestas no serían idénticas. La auditoría decía, por error, que el panel no los usaba. Se calculan sobre lo ya leído, sin consultas.
- H1: las opciones de lista de los ítems que no son de piezas no se arman, porque ni la lectura ni `eco_cambiado` las usan. Las piezas se leen al empezar si algún ítem del alcance las usa. La variante «menos» de las piezas del perfil sale de la misma lectura: es la lista con las piezas `CUESTA-*` delante.
- H1: `test_panel_contexto_lectura.py` (antes `test_panel_respuestas_identicas.py`) siembra los ocho estudiantes de ejemplo y compara, por cada ítem de registro, lo que arma `LecturaContexto` con `resolver_contexto` en vivo, en lugar de una copia guardada: así un cambio en las reglas del registro que no llegue al panel hace fallar la prueba. Durante el cambio también se comprobó que `respuestas` y cada `respuestas/{actividad}` (152 registros) salían idénticas a las de antes. Tarda unos 40 s, por la siembra con acciones reales.

## Fase 3

- F2: mientras llega la primera página de un filtro, orden o salón nuevos, la lista guarda en `anterior` la última página que mostró (no bajo la llave vieja) y la vista la pinta con `aria-busy`. El selector devuelve esa espera, estable por referencia, incluso antes de que el efecto pida la llave nueva.
- F3: al revalidar una lista ya ampliada con «Mostrar más», se piden de una vez sus filas desde 0: en la lista de estudiantes con `limite` (hasta 100, solo si ya se amplió), y en áreas e instituciones con `limite` = las filas cargadas (entre 20 y 50, el máximo del catálogo).
- F4: una lectura que ya está en camino con la misma llave no se vuelve a pedir; «Reintentar» la fuerza. Sin `AbortController`.
- F5: los almacenes de `panel.ts` (cargas y listas) guardan a lo más `MAXIMO_LLAVES` = 30 llaves cada uno. Se podan primero las que hace más tiempo no se guardan y nunca una que una vista montada esté leyendo (conteo por llave en el efecto) o que esté en camino.
- F7: el envío y el error de las notas viven en `useNotasPerfil`, que usa `MisNotas`; el borrador de la nota nueva queda en la visita del perfil (`borrador` del almacén, sin avisar a nadie al escribir), así sobrevive al cambio de pestaña y se descarta al guardarla o al salir del perfil. Los bloques del Inicio van con `memo` en la vista de ruta, sin cambiar sus exportaciones.
- Presupuestos: `test_panel_presupuestos.py` cuenta cada ruta del panel (con `ruta`) tres veces: con los cinco estudiantes poblados, con doce más y con el doble de planes, dudas, pasos, complicaciones, señales, diario y cuestionarios con resultado; las tres cuentas deben ser iguales. Las diferencias que quedan son de presencia (por ejemplo, sin ningún cuestionario o sin planes se salta una lectura), no de cantidad. Los registros de `contenido` se miden en `test_panel_contexto_lectura.py`.
- El arnés de portales (`apoderado-ayudas.mjs`) registra en `cambiosQuery` cada cambio de URL de `useSearchParams`, sin aplicarlo, para la prueba de la espera del buscador.
