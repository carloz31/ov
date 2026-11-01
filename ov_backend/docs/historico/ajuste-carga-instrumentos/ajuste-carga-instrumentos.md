# Ajuste · carga-instrumentos

## Contexto

Primer paso del conjunto de datos final: cargar los tres instrumentos reales (RIASEC con los 60 ítems oficiales de O*NET, inteligencias múltiples de Gardner y habilidades sociales de Burga), con el texto de autoconocimiento que el estudiante ve al revelar (`lectura` del instrumento; `ejemplos`, `fortalezas`, `desarrollo` por dimensión), y presentar todos los puntajes en 0–100 entero (`puntaje_visual`) en lugar del porcentaje con decimales. El documento de observaciones (`ajuste-carga-instrumentos.md`) es la spec: textos, ítems, escalas, códigos y nombres de campo ya están decididos y no se rediscuten. No hay spec en curso: se guarda como `ov_backend/docs/specs/ajuste-carga-instrumentos.md`. Rama: `ajuste/carga-instrumentos` (creada desde `main`).

## Qué cambia (hoy → pasará a)

**Backend**
- `app/services/instrumentos/calculo.py`: hoy `calcular_porcentaje()` (2 decimales, `round()`) y `DimensionCalculada.porcentaje`. Pasará a `puntaje_visual(valor, minimo, maximo) -> int` con `Decimal` + `ROUND_HALF_UP`; `DimensionCalculada` pierde `porcentaje`. La validación de límites que hacía `calcular_porcentaje` (finito, máximo > 0, 0 ≤ puntaje ≤ máximo) queda en un `_validar_dimension` privado que siguen usando `calcular_dimension` y `calcular_dimensiones_destacadas` (esta sigue con `Fraction`). `FACTOR_PORCENTAJE` / `DECIMALES_PORCENTAJE` salen de `parametros.py` si nadie más los usa.
- `app/core/parametros.py`: hoy `puntaje_ocupacion_porcentaje()`; desaparece. `catalogo.py:280` usa `puntaje_visual(p, PUNTAJE_OCUPACION_MINIMO, PUNTAJE_OCUPACION_MAXIMO)`. `DESCRIPCIONES_RIASEC` se mueve a `datos/fijos.py` (es contenido, no parámetro), junto con los ejemplos/fortalezas.
- `app/services/instrumentos/resultados.py:108`: hoy guarda `porcentaje` en `resultado_dimension`; deja de guardarlo.
- `app/services/instrumentos/consultas.py:238-247`: hoy expone `r.porcentaje`; pasará a calcular `puntaje_visual` al consultar. El mínimo es la suma de los mínimos de los ítems de la dimensión (se calcula junto con la `cantidades` que ya se arma para la zona, en la misma consulta agrupada, sin consultas en bucle). En COMPARACION, `puntaje_visual = None`. Expone también `ejemplos`, `fortalezas`, `desarrollo` en cada dimensión y `lectura` en el resultado.
- `app/schemas/instrumentos.py`: `DimensionResultado.porcentaje` → `puntaje_visual: int | None` + `ejemplos: str | None`, `fortalezas: list[str]`, `desarrollo: list[str]`; `DimensionPublica` igual (sin puntaje); `InstrumentoPublico.lectura: str`; `ResultadoPublico.lectura: str`. `puntaje` y `puntaje_maximo` se quedan.
- Consulta de `/comparacion` (partida y llegada): agrega `lectura` del instrumento a la respuesta (`ComparacionAutopercepcion.lectura`) para que su vista la muestre arriba de las zonas.

**Datos (`datos/fijos.py`, sin `DATO DE PRUEBA`)**
- RIASEC: `ENUNCIADOS_RIASEC` se reemplaza por los 60 ítems oficiales (k = 1…10 por dimensión, mismo `PATRON_RIASEC` e índice actual, que ya implementa `12·⌊(k−1)/2⌋ + 2·pos + ((k−1) mod 2) + 1`). `descripcion` y `lectura` nuevas del instrumento; `ejemplos` = textos de `ejemplosDimension` del front (spec), `fortalezas` según spec, `desarrollo = []`.
- Nuevo `TEST-INTELIGENCIAS` (`DESTACADAS`, `ESC-VERDAD3` 0 / 0.5 / 1, 7 dimensiones `INT-LIN`…`INT-INTER` con orden A–G, 35 ítems `INTEL-01…35`, `APL-INTELIGENCIAS` UNICA).
- Nuevo `TEST-HABILIDADES` (`DESTACADAS`, `ESC-CASI2` 0 / 1, 5 dimensiones `HS-ASE…HS-LID`, 24 ítems `HSOC-01…24` con `inverso=True` en 3, 5, 8, 20, `APL-HABILIDADES` UNICA).
- Ambos en el formato de tuplas de `ENUNCIADOS_PARTIDA_LLEGADA` (`(dimensión, enunciado, inverso)` con `numero` = posición) y una función de carga genérica `_cargar_instrumento(sesion, definicion)` que reutilizan los dos (RIASEC y partida/llegada conservan sus funciones; no se unifican de paso). `Fijos.items` y `Fijos.aplicaciones` incluyen los nuevos.
- Partida y llegada: `lectura` de la spec; dimensiones con `ejemplos = None` y listas vacías.

**Datos de prueba (`datos/ruta.py`, `DATO DE PRUEBA`)**
- Actividades `t-mision-inteligencias` (CIUDAD, CUESTIONARIO, 8 min) y `t-mision-habilidades` (CIUDAD, CUESTIONARIO, 5 min), `requerida: False` en `PROPIEDADES`, con su `DESCRIPCIONES`. `ITEMS_ACTIVIDADES` y `APLICACIONES_ACTIVIDADES` según la spec. `SALON_INSTRUMENTOS` no cambia.

**Frontend (modo api; local congelado)**
- `src/types/servidorInstrumentos.ts`, `src/services/api/instrumentos.ts`, `src/lib/servidor/adaptadores.ts` (`resultadoHelenaCompleto`: `score: d.puntaje_visual ?? 0`, más `ejemplos`, `fortalezas`, `desarrollo`), fixtures regenerados.
- `NodeRenderer.tsx:186`: hoy pinta `escala.opciones` en el orden recibido; pasará a ordenarlas por `puntaje` descendente. Sigue enviando `orden`.
- `HighlightedDimensions`: hoy `{d.score}%`; pasará a `{d.score}` sin «%», con «Suele notarse cuando…» (del servidor) y la lista «Suele venir con…» si no está vacía. Títulos según el instrumento (ver Preguntas abiertas).
- `DimensionProfile`: número y barra con el mismo `score`, sin «%»; textos por instrumento; la nota de inteligencias deja de decir «Un porcentaje bajo».
- `DimensionGuide`: las cuatro piezas con los rótulos de la spec («Suele notarse cuando…», «Suele venir con…», «Para desarrollarla»); lo vacío no se pinta (ni el rótulo).
- `HelenaResultView` (vista explicada): `lectura` como párrafo introductorio arriba de las destacadas; en partida y llegada, arriba de las zonas.
- `useResultPage.ts:77`: en api, `ejemplos` sale del servidor; `ejemplosDimension` solo para local.
- `PerfilIntereses` (detalle de ocupación) y `ResultNode.tsx:36`: entero sin «%».
- Libro de Helena (`helenaPagesApi.ts`): `paginaInteligenciasApi` y `paginaHabilidadesApi` con el mismo patrón que `paginaInteresesApi` (avance y resultado del servidor, sin `puedeReiniciar`); `paginasLibroApi` las incluye; las páginas demo de `helenaPages.ts` quedan solo para local. Constantes `APLICACION_INTELIGENCIAS` / `APLICACION_HABILIDADES` en `adaptadoresInstrumentos.ts`; `resultPages.ts`: `TEST-INT` → `TEST-INTELIGENCIAS` y se agrega `habilidades: TEST-HABILIDADES`. El store ya pide el resultado de toda aplicación revelada (`aplicacionesReveladas`), no necesita cambio.
- Contenidos nuevos: `t_mision_inteligencias.json` y `t_mision_habilidades.json` (`_dato_de_prueba: true`) como `t_mision_intereses_2.json`: diálogo de entrada, nodo `item` de plantilla con la etiqueta de la spec, diálogo de cierre y punto de mapa en la Ciudad.

## Qué no cambia

- Ningún cálculo de resultado: Pearson sobre los vectores originales (0–40 / 1–7), umbrales 0.729 / 0.608, 10 coincidencias sin filtro por Job Zone, código de interés, destacadas por `Fraction`, zonas de partida y llegada (siguen con promedio, no con `puntaje_visual`).
- `orden` de las opciones y lo que envía `responder-items`; la escala `ESC-LIKERT5` y su transformación O*NET.
- Códigos, nombres y orden de las dimensiones RIASEC; `SALON_INSTRUMENTOS`; reglas del motor (las misiones nuevas no tienen reglas: quedan disponibles en la Ciudad como las de intereses).
- Los `porcentaje` de avance (`avance.py`, `tematicas.py`, `familia.py`, afinidad de logros): son otra cosa.
- El modo local del front (incluidos `QuestionnaireBars`, que solo pinta datos de demostración, y `ejemplosDimension`).

## Modelo de datos (decisión aprobada por la spec; se sigue `/cambio-modelo`)

- `instrumento.lectura: Text` (NOT NULL con `server_default ''` para la migración, se llena en `fijos`).
- `dimension.ejemplos: Text | None`; `dimension.fortalezas`, `dimension.desarrollo`: `JSON(none_as_null=True)`, `default=list`, `server_default '[]'`, `CheckConstraint(TipoJSON(...) == 'array')` como `ocupacion.tareas`.
- `resultado_dimension.porcentaje`: se elimina la columna.
- Una migración nueva, autogenerada y revisada a mano (batch para SQLite). Se actualiza `docs/sistema/instrumentos.md` (modelo, cálculo, escalas, principio de generalidad).

## Pruebas

- Adaptadas (autorizado por la spec): aserciones sobre `porcentaje` → `puntaje_visual` (`67.5` → `68`) en `tests/unit/instrumentos/test_calculo_instrumentos.py`, `test_historial_instrumentos.py`, `test_metadatos_instrumentos.py`, `test_partida_llegada.py`, soporte de escenarios y contrato; `test_descripciones_dimensiones.py` importa las descripciones desde `datos.fijos`.
- Nuevas: `puntaje_visual` (½ redondea hacia arriba: 67.5 → 68, 12.5 → 13; 0 y máximo; límites inválidos); la referencia O*NET `554525…3221` → R 27, I 24, A 18, S 17, E 23, C 18 sobre los vectores 0–40; carga de los dos instrumentos nuevos (35 y 24 ítems, inversos 3/5/8/20, cada ítem en una sola dimensión, escalas); destacadas de habilidades con un inverso (responder «Casi nunca» al 5 suma 1 a Liderazgo); resultado expone `lectura`, `ejemplos`, `fortalezas`, `desarrollo` (vacío en RIASEC); detalle de ocupación en enteros 0–100.
- Front: `NodeRenderer` ordena por puntaje y envía `orden`; tarjeta destacada y guía sin «%» y sin rótulos vacíos; páginas del libro de inteligencias y habilidades desde el servidor.

## Fases

1. **F1 · Modelo y cálculo** (`/cambio-modelo`): columnas nuevas, quitar `porcentaje`, migración, `puntaje_visual`, consultas y esquemas, `catalogo.py`, pruebas de cálculo y contrato. Pruebas: `tests/unit/instrumentos`, `tests/integration/{instrumentos,catalogo,migraciones,datos,contrato,escenarios}`.
2. **F2 · Datos de los instrumentos**: `fijos.py` (RIASEC real, inteligencias, habilidades, textos) y `ruta.py` (dos misiones de prueba). Pruebas: `tests/integration/{datos,instrumentos,escenarios}`; regenerar fixtures.
3. **F3 · Front**: tipos, adaptadores, orden de opciones, tarjetas, guía, `lectura`, libro de Helena, JSON de las misiones. Pruebas: las de `discovery` y `activities` + `npm run test:servidor`.
4. **F4 · Cierre**: suite completa de ambos (`uv run pytest -n auto -q`; `npm test`, `build`, `lint`, `check:estructura`), `decisiones.md`, `instrumentos.md` e `integracion.md` si cambia el contrato, `pendientes-interfaz.md`. La spec queda en curso.

Un commit por fase: `Ajuste carga-instrumentos · F<n>: <qué>`. Sin push.

## Pendientes de interfaz que se anotarán

- Vista de la orientadora del detalle de cuestionario (0–100 principal y «27 de 40» secundario): en api no existe todavía (`QuestionnaireBars` solo recibe datos de demostración; llega con B14). Se anota en `pendientes-interfaz.md`; el backend ya entrega `puntaje_visual`, `puntaje` y `puntaje_maximo`.

## Decisiones del usuario (resueltas al revisar el plan)

1. **Textos para `TEST-HABILIDADES`** (elegidos por código de instrumento en `HighlightedDimensions` y `DimensionProfile`): títulos «Tu habilidad social más desarrollada hoy» / «Tus habilidades sociales más desarrolladas hoy»; «Cuánto se expresó cada habilidad»; «¿Qué es cada una?»; nota «Las que quedaron abajo no son una carencia: en la guía encontrarás por dónde empezar.»; en la nota de empate, «habilidades» en lugar de «inteligencias».
2. **Conteos de la Ciudad y afinidad:** las dos misiones son del bloque CIUDAD y la afinidad se calcula sobre todas las de ese bloque, así que el denominador crece. Se adaptan solo esos números en las pruebas y se anota en `decisiones.md`.
3. **`_cargar_instrumento(sesion, definicion)`** queda como la función de carga para cualquier instrumento futuro. En `decisiones.md`: RIASEC y partida/llegada conservan sus funciones solo para no tocar lo que funciona.
4. **F1:** las pruebas de contrato corren con los enunciados provisionales del RIASEC; no se corrigen ahí, cambian en F2.
5. **Pruebas de carga:** se agrega que ningún instrumento queda con `lectura` vacía después de `fijos` (el `server_default ''` es solo para la migración).

## Anexo · documento de observaciones (textos, ítems y escalas)


Carga de los instrumentos reales (RIASEC con los 60 ítems oficiales, inteligencias múltiples y habilidades sociales), con el texto que el estudiante ve al revelar y la presentación homogénea de puntajes en 0–100, como primer paso del conjunto de datos final.

### Criterio general

- Los instrumentos son fijos (valen para cualquier ruta): van en `datos/fijos.py` en el mismo formato de tuplas de `ENUNCIADOS_RIASEC` / `ENUNCIADOS_PARTIDA_LLEGADA`, sin `DATO DE PRUEBA`.
- Inteligencias y habilidades usan `TipoResultado.DESTACADAS`, que ya existe (dimensiones de mayor proporción `puntaje / máximo`; si empatan, todas). RIASEC sigue en COINCIDENCIAS. No cambia ningún cálculo de resultado.
- Cada instrumento responde una pregunta distinta y solo el RIASEC recomienda ocupaciones y carreras: intereses = qué te atrae hacer → catálogo; inteligencias = cómo aprendes y resuelves; habilidades sociales = cómo te relacionas. Las dimensiones **no** llevan perfiles profesionales.
- El texto sirve al autoconocimiento (ACT-10 del proceso base; cierre de las sesiones de tutoría: todos tenemos todas, se desarrollan). Debe permitir al estudiante reconocerse («sí, ese soy yo»), descubrir algo que el test no le preguntó, y llevarse algo también de las que no destacan. La ficha es insumo: la orientación ocurre en el registro de contraste que sigue (pendiente, otro ajuste).
- Como `validar_distribucion_items` exige que cada aplicación presente todos sus ítems, `ruta` agrega una actividad `CUESTIONARIO` por instrumento nuevo (en CIUDAD, como las misiones de intereses) y el front su JSON mínimo con el nodo `item` de plantilla. Ambos marcados `DATO DE PRUEBA`. Ninguno se marca prioritario en `SALON_INSTRUMENTOS` (sigue solo RIASEC).
- El resto del contenido real (actividades con la numeración de la ruta base, ítems de registro, fichas, testimonios, reglas, logros, prioritarios) irá en un conjunto nuevo `contenido` (`datos/contenido.py`, registrado en `CONJUNTOS` de `datos/cargar.py`), en ajustes posteriores. `ruta` se mantiene para las pruebas.

#### Principio de generalidad (va a `instrumentos.md`)

Un instrumento nuevo es datos: ítems, escala, dimensiones y textos; el puntaje por dimensión es siempre la suma de los puntajes de opción (con inverso = máx + mín − puntaje) y el 0–100 es la misma fórmula mín/máx para cualquier escala; `tipo_resultado` decide qué se calcula encima. Un instrumento con coincidencias necesita además puntajes de ocupación por dimensión (`puntaje_ocupacion`, clavado por `dimension_id`, ya lo permite). El código de interés de tres letras, el filtro `riasec` y los *high points* son del modelo de Holland, no del test, y los hereda cualquier instrumento con los seis tipos. Los umbrales 0.729 / 0.608 son de O*NET y están en `parametros.py`; se convertirán en datos del instrumento el día que haya un segundo instrumento de coincidencias, no antes. `calculo.py` debe recibir siempre el número de dimensiones del instrumento (`orden_canonico_riasec()` queda solo por compatibilidad).

### Cambio de modelo (vía `/cambio-modelo`)

Nombres de campo aprobados: `instrumento.lectura`, `dimension.ejemplos`, `dimension.fortalezas`, `dimension.desarrollo`, `puntaje_visual` (esquemas).

#### Puntaje visual 0–100 (estudiante y ocupaciones)

Verificado contra O*NET: el patrón `RRIIAASSEECC` de `fijos.py` reproduce exactamente la referencia del API (`554525…3221` → R 27, I 24, A 18, S 17, E 23, C 18) con `calculo.py`; Pearson va sobre los vectores originales (0–40 del estudiante, 1–7 de la ocupación) y los umbrales son los oficiales. **Lo que se corrige es la presentación:** el front muestra el 0–100 con signo «%».

- Una sola función pura en `calculo.py`: `puntaje_visual(valor, minimo, maximo) -> int` = `(valor − mín) / (máx − mín) · 100`, redondeado a entero con `ROUND_HALF_UP` (no `round()`, que redondea al par). El estudiante la usa con mínimo = suma de mínimos de sus ítems y máximo = suma de máximos; la ocupación con 1 y 7. `puntaje_ocupacion_porcentaje` de `parametros.py` desaparece.
- Derivado, no guardado: `resultado_dimension` conserva `puntaje` y `puntaje_maximo` y **pierde la columna `porcentaje`**; el 0–100 se calcula al consultar. Las destacadas siguen comparando la proporción exacta con `Fraction`, nunca el entero redondeado. La zona de partida y llegada no cambia.
- Esquemas: `DimensionResultado.porcentaje` → `puntaje_visual: int | None` (nulo en COMPARACION); `puntajes` del detalle de ocupación también en entero 0–100 bajo la misma regla. `puntaje` y `puntaje_maximo` siguen en `DimensionResultado`: el estudiante no los pinta; la orientadora los ve como dato secundario.
- **Front (api):** `HighlightedDimensions` (círculo) y `DimensionProfile` (barra y número) muestran `puntaje_visual` como entero **sin «%»**; la barra usa el mismo valor para su largo. `PerfilIntereses` del detalle de ocupación, igual. En ninguna pantalla se llama porcentaje ni probabilidad. Vista de la orientadora (`QuestionnaireBars` / detalle de cuestionario): principal el 0–100, secundario «27 de 40». Local sigue igual.
- Decisión propia que queda escrita: se guardan las 10 mejores coincidencias por r descendente, sin filtro por Job Zone; las carreras recomendadas salen de esas 10.
- Pruebas: las aserciones existentes sobre `porcentaje` (p. ej. `67.5`) se adaptan a `puntaje_visual` (`68`); este documento lo autoriza. Fixtures regenerados.
- Fuera de este ajuste: superponer el perfil del estudiante sobre las barras de la ocupación (pendiente).

#### Orden visual de las opciones al responder (solo front)

Hoy el backend entrega las opciones por `orden` (1 = la menor, p. ej. «Me disgusta mucho») y `NodeRenderer.tsx` las pinta en ese orden de arriba abajo, al revés de la convención. **No cambian los datos:** `orden` es el orden semántico de la escala, es el que O*NET usa (por eso la referencia se reproduce) y es lo que el estudiante envía en `responder-items`. Regla de presentación, para todas las escalas:

- En lista vertical (la vista actual) las opciones se muestran **de mayor a menor `puntaje`**, la más positiva arriba: Me gusta mucho … Me disgusta mucho; Verdadero / No estoy seguro / Falso; Casi siempre / Casi nunca; Muy de acuerdo … Nada de acuerdo. Se ordena por `puntaje`, no por `orden` invertido, para que valga con cualquier escala futura.
- Si alguna vez una escala se pinta en horizontal, va de menor (izquierda) a mayor (derecha), convención de O*NET y de las escalas impresas. Hoy no existe esa vista.
- El valor enviado sigue siendo `orden`. Cambio en `NodeRenderer` (modo api); el modo local no cambia.

#### `instrumento.lectura` — cómo leer tu resultado

El front no tiene hoy un texto introductorio del instrumento en la vista de resultado: arranca directo en las dimensiones. Se agrega `lectura: Text` a `instrumento` (qué mide, qué sacas de aquí, cómo leerlo), expuesta en `InstrumentoPublico` y en `ResultadoPublico` (`lectura: str`). **Front (api):** la vista explicada del resultado (la de «Ver resultado completo») muestra `lectura` como párrafo introductorio arriba de las dimensiones destacadas, en todos los instrumentos; partida y llegada también lo recibe (su vista de comparación lo muestra arriba de las zonas). Vista nueva autorizada aquí. `descripcion` sigue siendo la frase corta de presentación (antes de responder).

| Instrumento | `descripcion` | `lectura` |
|---|---|---|
| `TEST-RIASEC` | Descubre qué tipo de actividades te atraen y qué ocupaciones se parecen a ti. (reemplaza «Versión de prueba para la iteración 1.») | Este test mide qué tipo de actividades te atraen, en seis tipos de interés. No mide capacidad ni talento: mide gusto. Cada tipo va de 0 a 100, la misma escala con la que se describe cada ocupación, para que puedas compararte con ella. De aquí salen tu código de interés, las ocupaciones que se parecen a lo que te gusta y las carreras que llevan a ellas. Tómalo como punto de partida para explorar, no como una lista cerrada. |
| `TEST-INTELIGENCIAS` | Descubre cuáles de las siete inteligencias usas más hoy y cómo aprendes y resuelves mejor. | Este test muestra qué inteligencias usas más en tu día a día, según el modelo de Howard Gardner. Todos tenemos las siete, unas más desarrolladas que otras; aquí ves cuáles tienes más a mano hoy. No mide cuánto vales ni qué carrera te toca: te dice cómo aprendes y resuelves mejor, y eso sirve para estudiar a tu manera y para saber qué te va a costar más en lo que elijas. Cada inteligencia se puede desarrollar. |
| `TEST-HABILIDADES` | Descubre cómo te relacionas con los demás y qué habilidades sociales tienes más a mano hoy. | Este inventario muestra cómo te relacionas con los demás, en cinco habilidades sociales. Son conductas aprendidas: nadie nace con ellas y todas se pueden desarrollar. Las que salen arriba son tus recursos de hoy. Pero fíjate sobre todo en las que quedaron abajo: ahí está lo que puedes trabajar, y en cada una encontrarás por dónde empezar. |
| `TEST-PARTIDA-LLEGADA` | (sin cambio) | Estas son las mismas afirmaciones que respondiste al empezar y al terminar el camino. No hay puntajes: cada dimensión te dice en qué zona estás y qué cambió entre el inicio y el final. Lo que sigue por trabajar no es una falla: es lo que viene después del colegio. |

#### `dimension.ejemplos`, `fortalezas`, `desarrollo` — cuatro piezas por dimensión

Hoy `Dimension` tiene solo `descripcion`, y el front agrega «Suele notarse cuando …» desde un mapa fijo en código (`features/discovery/data/dimensionExamples.ts`, `ejemplosDimension`). El contenido real debe ser dato, no código.

| Pieza | Responde | Campo | Formato |
|---|---|---|---|
| Descripción | ¿Qué es? | `descripcion` (existe) | 1 frase, 2.ª persona |
| Ejemplos | ¿Cómo se nota en mi día? Rótulo «Suele notarse cuando …» | `ejemplos: Text \| None` | 1 frase en minúscula que continúa el rótulo; situaciones que los ítems no preguntan |
| Fortalezas | ¿Qué suele acompañarla? Rótulo «Suele venir con …» (condicional: el test mide autopercepción o gusto, no capacidad) | `fortalezas: list[str]` (JSON) | 3–4 viñetas cortas |
| Desarrollo | ¿Cómo la trabajo? Rótulo «Para desarrollarla» | `desarrollo: list[str]` (JSON) | 2–3 acciones concretas; **vacío en RIASEC** (un interés no se «desarrolla») |

- Tres columnas nuevas en `dimension`: `ejemplos` (Text, nullable) y `fortalezas`, `desarrollo` (JSON de lista, `default=list`, `server_default '[]'`, `CheckConstraint` de lista como `ocupacion.tareas`). Se exponen en `DimensionResultado` y `DimensionPublica`. Partida y llegada: nulo y listas vacías. Migración nueva, fixtures regenerados.
- **Front (api):** la tarjeta destacada muestra descripción, «Suele notarse cuando …» y la lista «Suele venir con …»; la guía de todas las dimensiones muestra las cuatro piezas. `ejemplos` se lee del servidor en lugar del mapa fijo. Lista vacía o `ejemplos` nulo: no se pinta nada (ni el rótulo). En local todo sigue igual (el mapa fijo se conserva solo para local).

### 1. Test de intereses (O*NET Interest Profiler Short Form, 60 ítems)

#### Instrumento

`TEST-RIASEC` (sin cambio de código) · «Test de intereses» · `COINCIDENCIAS` · aplicación `APL-RIASEC` («Intereses», `UNICA`). `descripcion` y `lectura`: tabla de arriba.

#### Escala `ESC-LIKERT5` (sin cambio)

`Me disgusta mucho (0) · Me disgusta (1) · No estoy seguro (2) · Me gusta (3) · Me gusta mucho (4)`; coincide con O*NET (*Strongly dislike … Strongly like*, *Unsure* al centro). Ningún ítem es inverso. En pantalla se muestra de mayor a menor (ver «Orden visual de las opciones»).

#### Dimensiones

Sin cambio de códigos, nombres ni orden (R, I, A, S, E, C). Descripción y ejemplos: los textos vigentes del front (`DESCRIPCIONES_RIASEC` y `ejemplosDimension`), que pasan a datos. «Suele venir con»: lectura «Orientaciones de la personalidad y tipo de trabajo preferido» de la cartilla, en positivo (los rasgos en negativo de la lectura no se muestran al estudiante), complementada con las descripciones de intereses de O*NET / My Next Move. `desarrollo` vacío.

**R · Realista** — Lectura: manipulan objetos y herramientas, emplean fuerza física; prefieren trabajos individuales, no destacar ni dirigir; prácticos y persistentes; reparan máquinas, atienden animales; campo, ingeniería, veterinaria.
- Descripción: Te atraen las actividades prácticas: trabajar con las manos, usar herramientas o máquinas y estar al aire libre.
- Suele notarse cuando: reparar o armar objetos, cultivar, construir, manejar equipos o trabajar al aire libre.
- Suele venir con: ser práctico y persistente: resolver con hechos, no con palabras · preferir trabajar por tu cuenta, sin tener que dirigir ni destacar · manejar herramientas, máquinas, materiales o animales · sentirte a gusto en el campo, el taller, la obra o la cancha más que en una oficina.

**I · Investigativa** — Lectura: pensar más que actuar; observación y análisis; ideas, palabras y símbolos; creativos; investigación científica; laboratorios, bibliotecas, centros de investigación.
- Descripción: Te atrae observar, preguntar y analizar para entender cómo y por qué funcionan las cosas.
- Suele notarse cuando: hacer experimentos, resolver acertijos, investigar un tema o entender cómo funciona algo.
- Suele venir con: preferir pensar antes que actuar: observar, analizar, comprobar · trabajar con ideas, datos y símbolos · ser curioso y creativo para resolver problemas · rendir mejor en un laboratorio, una biblioteca o un centro de investigación que dirigiendo gente.

**A · Artística** — Lectura: expresarse por medio de sentimientos, emociones o imaginación; se relacionan a través de sus creaciones; creación y reflexión; diversos medios, de la palabra a los medios plásticos y los instrumentos.
- Descripción: Te atrae crear, imaginar y expresarte con libertad, sin reglas rígidas.
- Suele notarse cuando: dibujar, escribir, actuar, componer, diseñar o crear contenido.
- Suele venir con: expresar sentimientos, emociones e imaginación en lo que haces · usar muchos medios: la palabra, la imagen, el sonido, el cuerpo · relacionarte con los demás a través de tus creaciones · preferir el tiempo de crear y reflexionar antes que las rutinas y las reglas fijas.

**S · Social** — Lectura: trabajar con personas; sociables y líderes; enseñar; manejan y dirigen grupos; actividades de discusión; escuelas, consultorios, servicios.
- Descripción: Te atrae ayudar, enseñar, cuidar o acompañar a otras personas.
- Suele notarse cuando: enseñar a alguien, cuidar, escuchar, hacer voluntariado o trabajar en equipo.
- Suele venir con: disfrutar el trabajo con personas · enseñar, orientar y acompañar · manejar grupos: conversar, debatir, escuchar · sentirte a gusto en colegios, consultorios y servicios a la comunidad.

**E · Emprendedora** — Lectura: actividades que puedan controlar; se relacionan y expresan sus ideas con facilidad; lo económico importa; organizan y dirigen grupos; líderes que gustan de sobresalir; poca teoría; empresas, bancos, dirección, publicidad, Estado, política.
- Descripción: Te atrae liderar, convencer, organizar proyectos y tomar decisiones.
- Suele notarse cuando: dirigir un grupo, convencer, vender una idea u organizar un evento.
- Suele venir con: expresar tus ideas con facilidad y convencer · organizar y dirigir grupos, y sobresalir · preferir la acción y los resultados antes que la teoría · interesarte por los negocios, lo económico y las metas ambiciosas.

**C · Convencional** — Lectura: cumplir normas y costumbres; ordenados, conservadores y eficientes; organizados y responsables; oficinas, fábricas, comercio.
- Descripción: Te atrae ordenar información, seguir procedimientos claros y trabajar con datos de forma precisa.
- Suele notarse cuando: ordenar información, llevar registros, planificar con detalle o trabajar con números.
- Suele venir con: ser ordenado, eficiente y responsable · cumplir normas y procedimientos con precisión · trabajar con datos, registros y números · sentirte a gusto en oficinas, administración y comercio, donde se valora la exactitud.

#### Ítems

Reemplazan por completo a los 60 enunciados provisionales de `ENUNCIADOS_RIASEC`. El patrón de posiciones no cambia: `PATRON_RIASEC = 'RRIIAASSEECC'`, es decir, el ítem k-ésimo de cada dimensión ocupa `numero = 12·⌊(k−1)/2⌋ + 2·pos(dim) + ((k−1) mod 2) + 1` (pos R=0 … C=5); así los ítems 1–2 son R, 3–4 I, … 11–12 C, 13–14 R, etc. Códigos `RIASEC-01` … `RIASEC-60` por `numero`. El orden dentro de cada dimensión es el del formulario en papel de O*NET (la lista de abajo). Traducción del usuario con cuatro ajustes mínimos de comprensión para un estudiante peruano, marcados con ★.

| dim | k | enunciado |
|---|---|---|
| R | 1 | Construir gabinetes de cocina |
| R | 2 | Conducir un camión para entregar paquetes a oficinas y casas |
| R | 3 | Colocar ladrillos o baldosas |
| R | 4 | Probar la calidad de piezas antes del envío |
| R | 5 | Reparar electrodomésticos del hogar |
| R | 6 | Reparar e instalar cerraduras |
| R | 7 | Criar peces en un criadero |
| R | 8 | Instalar y operar máquinas para fabricar productos |
| R | 9 | Ensamblar piezas electrónicas ★ (era «partes») |
| R | 10 | Apagar incendios forestales |
| I | 1 | Desarrollar un nuevo medicamento |
| I | 2 | Investigar la causa de un incendio |
| I | 3 | Estudiar formas de reducir la contaminación del agua |
| I | 4 | Desarrollar un método para predecir mejor el clima |
| I | 5 | Realizar experimentos químicos |
| I | 6 | Trabajar en un laboratorio de biología |
| I | 7 | Estudiar el movimiento de los planetas |
| I | 8 | Inventar un reemplazo para el azúcar |
| I | 9 | Examinar muestras de sangre con un microscopio |
| I | 10 | Hacer pruebas de laboratorio para identificar enfermedades |
| A | 1 | Escribir libros u obras de teatro |
| A | 2 | Pintar la escenografía de una obra de teatro ★ (era «Pintar escenarios para obras») |
| A | 3 | Tocar un instrumento musical |
| A | 4 | Escribir guiones para películas o programas de televisión |
| A | 5 | Componer o arreglar música |
| A | 6 | Bailar jazz o tap |
| A | 7 | Dibujar ★ (era «Dibujar cuadros») |
| A | 8 | Cantar en una banda |
| A | 9 | Crear efectos especiales para películas |
| A | 10 | Editar películas |
| S | 1 | Enseñar a una persona una rutina de ejercicios |
| S | 2 | Enseñar a los niños a practicar deportes |
| S | 3 | Ayudar a personas con problemas personales o emocionales |
| S | 4 | Enseñar lengua de señas a personas sordas |
| S | 5 | Dar orientación vocacional a las personas |
| S | 6 | Ayudar a conducir una sesión de terapia grupal |
| S | 7 | Realizar terapia de rehabilitación |
| S | 8 | Cuidar niños en una guardería |
| S | 9 | Hacer trabajo voluntario en una organización sin fines de lucro |
| S | 10 | Enseñar en una clase de secundaria |
| E | 1 | Comprar y vender acciones y bonos |
| E | 2 | Negociar contratos comerciales |
| E | 3 | Administrar una tienda minorista |
| E | 4 | Representar a un cliente en un juicio |
| E | 5 | Dirigir un salón de belleza o barbería |
| E | 6 | Comercializar una nueva línea de ropa |
| E | 7 | Administrar un departamento dentro de una empresa grande |
| E | 8 | Vender productos en una tienda por departamentos |
| E | 9 | Iniciar tu propio negocio |
| E | 10 | Administrar una tienda de ropa |
| C | 1 | Desarrollar una hoja de cálculo usando software de computadora |
| C | 2 | Calcular los salarios de los empleados |
| C | 3 | Revisar registros o formularios |
| C | 4 | Hacer inventario con un dispositivo portátil ★ (era «con una computadora de mano») |
| C | 5 | Instalar software en una red de computadoras |
| C | 6 | Registrar pagos de alquiler |
| C | 7 | Usar una calculadora |
| C | 8 | Mantener registros de inventario |
| C | 9 | Llevar registros de envíos y recepciones |
| C | 10 | Clasificar, ordenar y distribuir correspondencia en una organización |

#### Datos de prueba en `ruta`

Sin cambios: `t-mision-intereses` (1–30) y `t-mision-intereses-2` (31–60) siguen presentando `APL-RIASEC`.

### 2. Test de las inteligencias múltiples (H. Gardner, versión de 35 ítems)

Fuente: «Test de las inteligencias múltiples (H. Gardner)», 35 afirmaciones V/F, hoja de corrección de 7 categorías de 5 ítems, definiciones de las siete inteligencias y ejercicios por inteligencia.

#### Instrumento

`TEST-INTELIGENCIAS` · «Test de las inteligencias múltiples» · `DESTACADAS` · aplicación `APL-INTELIGENCIAS` («Inteligencias», `UNICA`). `descripcion` y `lectura`: tabla de arriba.

#### Escala `ESC-VERDAD3` («Verdadero, falso o no estoy seguro»)

El original admite V, F o dejar en blanco si «a veces es verdadera y a veces falsa», y la corrección cuenta solo las V. En la plataforma la duda se responde explícita y vale medio punto (adaptación aprobada: respeta la duda como respuesta legítima y reduce empates sin cambiar la lógica de conteo; anotar en la tesis). La etiqueta debe sonar a respuesta válida, no a «no sé responder». Ningún ítem es inverso.

| orden | etiqueta | puntaje |
|---|---|---|
| 1 | Falso | 0 |
| 2 | No estoy seguro | 0.5 |
| 3 | Verdadero | 1 |

#### Dimensiones

7 dimensiones de 5 ítems; máximo 5. El umbral «4 verdaderos = habilidad que resalta» de la hoja de corrección no se usa: las destacadas salen por proporción. El `orden` sigue las letras de la hoja de corrección (A–G). Códigos: los que el front ya conoce de la demo. Definiciones: sección «Las siete inteligencias según Howard Gardner» de la fuente; ejercicios: sección «Ejercicios de inteligencia múltiple».

**1 (A) · `INT-LIN` · Verbal-lingüística** — Fuente: emplear efectivamente las palabras en forma oral y escrita; conversación, poner pensamientos por escrito, poemas, una carta; traducir en palabras adecuadas, pertinentes y exactas lo que se piensa.
- Descripción: Usas las palabras con eficacia, al hablar y al escribir: traduces lo que piensas en palabras precisas, sea en una conversación, un debate o una carta.
- Suele notarse cuando: te fijas en cómo están dichas las cosas y no solo en qué dicen, te sale fácil redactar un trabajo o un mensaje delicado, recuerdas frases exactas de lo que leíste o escuchaste o prefieres explicar algo con palabras antes que mostrarlo.
- Suele venir con: expresar con precisión lo que piensas · entender rápido lo que lees y escuchas · argumentar y convencer con palabras · disfrutar escribir y contar.
- Para desarrollarla (fuente, ej. 1): elige una palabra del diccionario al azar y úsala en situaciones normales · propicia un debate amistoso sobre un tema: pregunta, discute, escucha · prepara una presentación oral sobre algo que te interese: un hobby, un libro, alguien que conoces.

**2 (B) · `INT-LOG` · Lógico-matemática** — Fuente: utilizar los números en forma efectiva y razonar en forma lógica; pensamiento científico; patrones abstractos (contar de 2 en 2, saber si el vuelto está correcto); encontrar conexiones entre trozos de información.
- Descripción: Usas los números con eficacia y razonas con lógica: encuentras patrones y conexiones entre datos, como en el pensamiento científico.
- Suele notarse cuando: detectas cuando un argumento no cierra, resuelves un problema por pasos antes de pedir ayuda, sabes al toque si el vuelto está bien o te gusta ordenar las cosas con un criterio.
- Suele venir con: calcular y estimar con rapidez · detectar patrones y relaciones · razonar paso a paso y comprobar · encontrar conexiones entre datos sueltos.
- Para desarrollarla (fuente, ej. 2): toma doce objetos al azar y crea un criterio para clasificarlos (color, forma, tamaño, uso) · prepara un argumento lógico y convincente para algo ridículo · inventa una secuencia de números con un patrón escondido y ve si otro lo descubre.

**3 (C) · `INT-ESP` · Visual-espacial** — Fuente: percibir el mundo visual-espacial adecuadamente; un dibujo para expresar pensamientos o emociones, decorar una pieza, jugar ajedrez; formarse un modelo mental de un espacio y operar con él.
- Descripción: Percibes el mundo visual y espacial con precisión y te formas un modelo mental de él: imaginas, dibujas, decoras y te mueves en el espacio con ese mapa en la cabeza.
- Suele notarse cuando: recuerdas lugares y caras mejor que nombres, notas cuando algo está desalineado o mal combinado, armas un rompecabezas o un mueble con facilidad o imaginas cómo quedaría un cuarto antes de mover nada.
- Suele venir con: imaginar objetos y lugares en tres dimensiones · captar color, forma y proporción · orientarte y leer mapas y planos · expresar ideas con dibujos y esquemas.
- Para desarrollarla (fuente, ej. 3): mira las nubes con amigos y busca animales o caras escondidas · imagina con detalle que vives en otra época o conversas con un personaje histórico · organiza una búsqueda del tesoro y dibuja el mapa para que otros lo sigan.

**4 (D) · `INT-CIN` · Corporal-cinestésica** — Fuente: utilizar el cuerpo entero para expresar ideas y sentimientos; teclear, andar en bicicleta, mantener el equilibrio; resolver problemas o elaborar productos empleando el cuerpo o parte de él.
- Descripción: Usas el cuerpo para expresar ideas y sentimientos y para resolver problemas o crear cosas: equilibrio, coordinación y destreza con las manos.
- Suele notarse cuando: aprendes un movimiento con verlo una vez, pruebas las cosas con las manos antes de leer cómo se hacen, te cuesta quedarte quieto cuando piensas o imitas gestos y posturas sin esfuerzo.
- Suele venir con: coordinación, equilibrio y velocidad · aprender haciendo más que escuchando · habilidad manual para armar, reparar o crear · expresar emociones con el cuerpo.
- Para desarrollarla (fuente, ej. 5): camina, baila o trota según tu estado de ánimo, y prueba a cambiarlo con el movimiento · usa la mano que no sueles usar para lavarte los dientes o abotonarte · representa con mímica una idea, una opinión o un sentimiento.

**5 (E) · `INT-MUS` · Musical-rítmica** — Fuente: formas musicales: percibir, discriminar, juzgar, transformar y expresar; tocar música para calmarse o estimularse; repetir una música en la mente todo el día; aprecio por la música, el canto, un instrumento.
- Descripción: Percibes, distingues y expresas formas musicales: la música te calma o te activa, se te queda en la cabeza y la usas para expresarte.
- Suele notarse cuando: reconoces una canción con los primeros segundos, te molesta cuando alguien desafina, te concentras mejor con música o inventas ritmos con lo que tengas a mano.
- Suele venir con: captar ritmo, melodía y tono con facilidad · memorizar mejor lo que tiene sonido o ritmo · distinguir matices de voz y sonido · expresarte a través de la música.
- Para desarrollarla (fuente, ej. 6): escucha unos minutos de cada tipo de música que tengas y anota qué sentimientos, imágenes o recuerdos te trae · expresa un sentimiento (miedo, alegría, rabia) solo con la voz, cambiando volumen, tono y timbre · lee una historia y ponle efectos de sonido, como en los antiguos programas de radio.

**6 (F) · `INT-INTRA` · Intrapersonal** — Fuente: comprenderse a uno mismo y actuar en forma autorreflexiva; «introspectiva»; conocer los aspectos internos: sentimientos, proceso pensante, intuición; saber cuáles son los lados brillantes y cuáles los opacos de la propia personalidad.
- Descripción: Te comprendes a ti mismo y actúas a partir de eso: reconoces tus sentimientos y tu forma de pensar, y sabes cuáles son tus lados brillantes y cuáles los opacos.
- Suele notarse cuando: te das cuenta de cuándo necesitas parar, decides sin dejarte arrastrar por el grupo, tienes claro qué es importante para ti aunque otros no lo compartan o prefieres entender un error tuyo antes que taparlo.
- Suele venir con: saber cómo te sientes y por qué · conocer tus virtudes y tus límites · ponerte metas propias y sostenerlas · aprender de lo que te pasa.
- Para desarrollarla (fuente, ej. 4 y 7): dibuja la curva de tu ánimo durante un día, con sus puntos altos, bajos y medios, y anota qué pasó en cada uno · anota los hechos importantes del día y expresa lo que sentiste con pintura, música o un poema · obsérvate como si fueras otra persona: qué patrón aparece cuando te enojas, te distraes o te pones nervioso.

**7 (G) · `INT-INTER` · Interpersonal** — Fuente: captar y evaluar en forma rápida los estados de ánimo, intenciones, motivaciones y sentimientos de los demás; trabajo en equipo; empatía; mantener la identidad individual; entender a las otras personas.
- Descripción: Captas con rapidez los estados de ánimo, intenciones y sentimientos de los demás y respondes a ellos: empatía y trabajo en equipo, sin perder lo tuyo.
- Suele notarse cuando: calmas una discusión entre amigos, sabes a quién pedirle qué en un trabajo en grupo, la gente nueva se te acerca con facilidad o te buscan para contarte sus cosas.
- Suele venir con: leer el ánimo y las intenciones de los demás · escuchar y responder con empatía · trabajar en equipo y llegar a acuerdos · convencer e influir en positivo.
- Para desarrollarla (propuestos: los ejercicios «7. Interpersonal» de la fuente son en realidad intrapersonales y se usaron arriba): pregunta y escucha antes de opinar · súmate a un equipo, un voluntariado o la organización de algo · fíjate en gestos y tono de voz, no solo en palabras.

#### Ítems

Códigos `INTEL-01` … `INTEL-35`, `numero` = numeración original (ya viene intercalada entre inteligencias; se respeta). Hoja de corrección verificada: cada ítem cae en exactamente una categoría.

| nº | dim | enunciado |
|---|---|---|
| 1 | ESP | Prefiero hacer un mapa que explicarle a alguien cómo tiene que llegar a un lugar determinado. |
| 2 | INTRA | Si estoy enojado o contento, generalmente sé la razón exacta de por qué es así. |
| 3 | MUS | Sé tocar, o antes sabía, un instrumento musical. |
| 4 | MUS | Asocio la música con mis estados de ánimo. |
| 5 | LOG | Puedo sumar o multiplicar mentalmente con mucha rapidez. |
| 6 | INTRA | Puedo ayudar a un amigo/a a manejar y controlar sus sentimientos, porque yo lo pude hacer antes con sentimientos parecidos. |
| 7 | LOG | Me gusta trabajar con calculadora y computadoras. |
| 8 | CIN | Aprendo rápidamente a bailar un baile nuevo. |
| 9 | LIN | No me es difícil decir lo que pienso durante una discusión o debate. |
| 10 | LIN | Disfruto de una buena charla o exposición. |
| 11 | ESP | Siempre distingo el norte del sur, esté donde esté. |
| 12 | INTER | Me gusta reunir grupos de personas en una fiesta o evento especial. |
| 13 | MUS | Realmente la vida me parece vacía sin música. |
| 14 | ESP | Siempre entiendo los gráficos que vienen en las instrucciones de equipos o instrumentos. |
| 15 | LOG | Me gusta resolver puzzles y entretenerme con juegos electrónicos. |
| 16 | CIN | Me fue fácil aprender a andar en bicicleta o patines. |
| 17 | LIN | Me enojo cuando escucho una discusión o una afirmación que me parece ilógica o absurda. |
| 18 | INTER | Soy capaz de convencer a otros de que sigan mis planes o ideas. |
| 19 | CIN | Tengo buen sentido del equilibrio y de la coordinación. |
| 20 | LOG | A menudo puedo captar relaciones entre números con mayor rapidez y facilidad que algunos de mis compañeros. |
| 21 | CIN | Me gusta construir modelos, maquetas o hacer esculturas. |
| 22 | LIN | Soy bueno para encontrar el significado preciso de las palabras. |
| 23 | ESP | Puedo mirar un objeto de una manera y con la misma facilidad verlo dado vuelta o al revés. |
| 24 | MUS | Con frecuencia establezco la relación que puede haber entre una música o canción y algo que haya ocurrido en mi vida. |
| 25 | LOG | Me gusta trabajar con números y figuras. |
| 26 | INTRA | Me gusta sentarme muy callado y pensar, reflexionar sobre mis sentimientos más íntimos. |
| 27 | ESP | Solo con mirar las formas de las construcciones y estructuras me siento a gusto. |
| 28 | MUS | Cuando estoy en la ducha, o cuando estoy solo, me gusta tararear, cantar o silbar. |
| 29 | CIN | Soy bueno para el atletismo. |
| 30 | LIN | Me gusta escribir cartas largas a mis amigos. |
| 31 | INTRA | Generalmente me doy cuenta de la expresión o los gestos que tengo en la cara. |
| 32 | INTER | Muchas veces me doy cuenta de las expresiones o gestos en la cara de las otras personas. |
| 33 | INTRA | Reconozco mis estados de ánimo, no me cuesta identificarlos. |
| 34 | INTER | Me doy cuenta de los estados de ánimo de las personas con quienes me encuentro. |
| 35 | INTER | Me doy cuenta bastante bien de lo que los otros piensan de mí. |

Transcripción: 1 «como» → «cómo»; 6 «amigo(a)» → «amigo/a», «en relación a» → «con»; 10 «charla, prédica o sermón» → «charla o exposición» (origen en colegio religioso); 18 «convencer a otros que» → «convencer a otros de que»; 19 «y de coordinación» → «y de la coordinación»; 27 «Solamente» → «Solo»; puntuación y tildes normalizadas.

#### Datos de prueba en `ruta` (DATO DE PRUEBA)

- Actividad `t-mision-inteligencias`, bloque CIUDAD, tipo CUESTIONARIO, 8 min, `contenido = t_mision_inteligencias`, no requerida.
- `ITEMS_ACTIVIDADES`: `('t-mision-inteligencias', 'TEST-INTELIGENCIAS', 1, 35)`; `APLICACIONES_ACTIVIDADES`: `('APL-INTELIGENCIAS', 't-mision-inteligencias')`.
- Front: `t_mision_inteligencias.json` con diálogo de entrada, nodo `item` de plantilla (`instrumentoId: TEST-INTELIGENCIAS`, etiqueta «¿Es verdad para ti?») y diálogo de cierre.
- Libro de Helena: la página «Tus formas de ser inteligente» deja de ser demo (`helenaPages.ts`) y lee el avance y el resultado del servidor como la de intereses; `resultPages.ts` pasa de `TEST-INT` a `TEST-INTELIGENCIAS`.

### 3. Inventario de habilidades sociales «Mi comportamiento con los demás» (Burga, 2000)

#### Instrumento

`TEST-HABILIDADES` · «Mi comportamiento con los demás» · `DESTACADAS` · aplicación `APL-HABILIDADES` («Habilidades sociales», `UNICA`). `descripcion` y `lectura`: tabla de arriba.

#### Escala `ESC-CASI2` («Casi siempre o casi nunca»)

| orden | etiqueta | puntaje |
|---|---|---|
| 1 | Casi nunca | 0 |
| 2 | Casi siempre | 1 |

**Ítems inversos (confirmado):** la corrección original cuenta solo los «Casi siempre», pero los ítems 3 y 8 (esconder los sentimientos) y 5 y 20 (no sentirse líder, rara vez tomar el liderazgo) están redactados al revés de su habilidad. Se cargan con `inverso=True` (puntaje = 1 − respuesta). Anotar en la tesis como adaptación de la corrección.

Con escala binaria y 4–5 ítems los empates al 100 serán frecuentes; el cálculo ya muestra todas las empatadas. Se asume. Lo que importa en este instrumento son las que quedan abajo: lo dice la `lectura`, y la guía de todas las dimensiones con «Para desarrollarla» es donde el estudiante encuentra por dónde empezar.

#### Dimensiones

Máximo 5 (Resolución de problemas: 4); las destacadas se comparan por proporción, así que el máximo desigual no afecta. Convivencia y Comunicación aparecen en la lectura pero el inventario no las mide: no son dimensiones. Fuente: lectura «Las principales habilidades sociales» (Anexo 4.1).

**1 · `HS-ASE` · Asertividad** — Lectura: defender los propios derechos; exponer opiniones sin ofender; decir «no»; expresar quejas con tranquilidad; escuchar cuando sea necesario.
- Descripción: Defiendes tus derechos y dices lo que piensas sin ofender: puedes decir «no», expresar una queja con calma y escuchar cuando toca.
- Suele notarse cuando: pides que te expliquen una nota que te parece injusta, dices que no a un plan sin inventar excusas, pones un límite cuando alguien se pasa contigo o escuchas una crítica sin ponerte a la defensiva.
- Suele venir con: decir lo que piensas sin ofender · decir «no» cuando no estás de acuerdo · reclamar con calma cuando algo es injusto · hacerte respetar sin pasar sobre nadie.
- Para desarrollarla: practica decir «no» en cosas pequeñas · habla en primera persona: «yo pienso», «a mí me molesta» · antes de reclamar, respira y di solo el hecho y lo que pides.

**2 · `HS-EMP` · Empatía** — Lectura: ponerse en el lugar del otro y comprender sus sentimientos; componente emocional y cognoscitivo; saber cuándo un compañero está triste y apoyarlo sin cuestionarlo.
- Descripción: Te pones en el lugar del otro y comprendes lo que siente, tanto con la emoción como con la cabeza.
- Suele notarse cuando: te das cuenta de que un compañero anda mal aunque no lo diga, entiendes por qué alguien reaccionó así aunque no estés de acuerdo, te afecta lo que les pasa a otros o te quedas a acompañar a quien lo necesita.
- Suele venir con: notar cuando alguien está triste o preocupado · comprender antes de juzgar · inspirar confianza: la gente te cuenta sus cosas · ayudar sin que te lo pidan.
- Para desarrollarla: pregunta «¿cómo te sientes?» y escucha sin interrumpir · intenta explicar la postura del otro con tus palabras · fíjate en lo no verbal: gestos, silencios.

**3 · `HS-EXP` · Expresión de sentimientos** — Lectura: informar al interlocutor el propio estado de ánimo; autoanalizarse para reconocer la emoción; identificar sus causas; escoger el momento, el lugar y la persona para explicarlo.
- Descripción: Reconoces lo que sientes, identificas de dónde viene y eliges el momento para decirlo a la persona indicada.
- Suele notarse cuando: puedes decir «estoy molesto» sin estallar, sabes explicar qué te puso así, eliges el momento para hablar en vez de soltarlo en caliente o la gente sabe cómo estás sin tener que adivinarlo.
- Suele venir con: reconocer qué emoción sientes · identificar de dónde viene · elegir el momento y la persona para decirlo · ser honesto con lo que sientes.
- Para desarrollarla: ponle nombre a lo que sientes: alegría, fastidio, miedo · escríbelo antes de decirlo · dilo a tiempo, con calma y a quien corresponde.

**4 · `HS-RES` · Resolución de problemas** — Lectura: analizar la situación conflictiva para resolverla positivamente con creatividad; identificar y aplicar los medios más adecuados.
- Descripción: Analizas una situación difícil, identificas sus causas y buscas con creatividad la mejor salida.
- Suele notarse cuando: cuando algo sale mal buscas qué pasó en vez de a quién culpar, propones una salida cuando el grupo se traba, piensas en qué podría fallar antes de empezar o sigues probando alternativas hasta que funciona.
- Suele venir con: analizar el problema antes de actuar · identificar causas y consecuencias · buscar alternativas con creatividad · no soltar hasta resolverlo.
- Para desarrollarla: escribe el problema en una frase y sus posibles causas · lista tres salidas antes de elegir una · revisa después qué funcionó y qué no.

**5 · `HS-LID` · Liderazgo** — Lectura: actuar en representación de otros y dirigir grupos; planificar y orientar acciones; manejar las fricciones de la interacción grupal; guiar con creatividad y positivismo ante lo nuevo.
- Descripción: Actúas en representación de otros y diriges grupos: planificas, orientas y guías con creatividad ante lo nuevo.
- Suele notarse cuando: te eligen para hablar por el grupo, organizas quién hace qué en un trabajo, mantienes al grupo animado cuando algo se complica o pones orden cuando una discusión se desvía.
- Suele venir con: tomar la iniciativa · planificar y orientar al grupo · convencer con ideas, no con imposición · manejar las fricciones del grupo.
- Para desarrollarla: ofrécete a coordinar algo pequeño: un trabajo, una actividad · reparte tareas y pregunta cómo va cada uno · ante un desacuerdo, busca lo que une al grupo.

#### Ítems

Códigos `HSOC-01` … `HSOC-24`, `numero` = numeración original (ya viene intercalada entre habilidades, se respeta).

| nº | dim | inverso | enunciado |
|---|---|---|---|
| 1 | ASE | | Digo siempre lo que pienso en la mayoría de situaciones. |
| 2 | EMP | | Por ningún motivo está bien causarle daño a otra persona. |
| 3 | EXP | sí | La mayoría de personas no se da cuenta cuando me hiere, porque escondo mis verdaderos sentimientos. |
| 4 | EXP | | Me gusta ayudar a mis amigos/as para que tomen decisiones. |
| 5 | LID | sí | No estoy seguro/a de que pueda ser un buen líder. |
| 6 | RES | | Participo en actividades que involucran la resolución de problemas. |
| 7 | EMP | | Si un amigo/a es incapaz de cumplir con lo que me promete, seguramente lo comprendería en vez de enojarme. |
| 8 | EXP | sí | Cuando alguien cercano y respetado me molesta, generalmente escondo mis sentimientos. |
| 9 | LID | | Disfruto participando en una buena discusión. |
| 10 | ASE | | Me aseguro de que la gente sepa cuál es mi posición frente a una injusticia. |
| 11 | EMP | | Creo que uno puede salir adelante en la vida sin tener que pasar sobre los demás. |
| 12 | EXP | | Le digo a una persona cuando me parece que ha sido injusta. |
| 13 | RES | | Me adelanto a las consecuencias cuando surgen problemas. |
| 14 | LID | | Puedo convencer a otros/as de que mis ideas son correctas. |
| 15 | ASE | | Es muy importante para mí ser capaz de decir lo que pienso. |
| 16 | EMP | | Mis amigos/as me buscan para contarme sus cosas. |
| 17 | RES | | No me quedo tranquilo/a hasta resolver un problema. |
| 18 | LID | | En la mayoría de las situaciones, prefiero participar antes que escuchar solamente. |
| 19 | ASE | | Si después de salir de una tienda me doy cuenta de que me han dado menos vuelto, vuelvo y pido el dinero que falta. |
| 20 | LID | sí | Rara vez tomo el liderazgo en la organización de un proyecto. |
| 21 | ASE | | Doy a conocer mi punto de vista, aun si alguien a quien respeto dijera algo distinto. |
| 22 | EMP | | Me resulta fácil ayudar a mis amigos/as. |
| 23 | EXP | | Trato de ser honesto/a acerca de mis verdaderos sentimientos. |
| 24 | RES | | Identifico las causas de algún problema. |

Transcripción: 5 «seguro/a que» → «seguro/a de que»; 21 «aún si» → «aun si».

#### Datos de prueba en `ruta` (DATO DE PRUEBA)

- Actividad `t-mision-habilidades`, bloque CIUDAD, tipo CUESTIONARIO, 5 min, `contenido = t_mision_habilidades`, no requerida.
- `ITEMS_ACTIVIDADES`: `('t-mision-habilidades', 'TEST-HABILIDADES', 1, 24)`; `APLICACIONES_ACTIVIDADES`: `('APL-HABILIDADES', 't-mision-habilidades')`.
- Front: `t_mision_habilidades.json` con el nodo `item` de plantilla (etiqueta «¿Te describe?») y diálogos mínimos. La página «Cómo te relacionas» del libro de Helena deja de ser demo.

### Pendientes para los ajustes de contenido (no en este)

- Superponer el perfil del estudiante sobre las barras de la ocupación en su detalle (misma escala 0–100).
- Registro de contraste por instrumento (cita `RESULTADO` de `APL-INTELIGENCIAS` / `APL-HABILIDADES`): dónde se nota en su semana y si coincide con lo que dijo su test de intereses, no «¿estás de acuerdo?». Es donde ocurre la orientación; el instrumento no está completo sin él.
- ACT-10: conversación con la familia para contrastar el resultado con lo que ellos perciben, y registro de lo aprendido.
- Habilidades sociales, «después de la hora de tutoría»: identificar las menos desarrolladas y proponerse actividades (registro de contraste de ese instrumento, apoyado en «Para desarrollarla»).
- Informe final: cruce intereses × inteligencias × habilidades, con alerta en tono tranquilo cuando no coinciden.
- Decidir en `contenido` qué instrumentos van prioritarios por defecto (propuesta: solo RIASEC; inteligencias y habilidades opcionales).

### Preguntas abiertas

Ninguna. Documento listo para `/ajuste carga-instrumentos`.
