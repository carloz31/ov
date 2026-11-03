# Ajuste resultados-intereses

## Contexto

Hoy el resultado del test de intereses guarda las 10 ocupaciones con mayor r. Las «carreras recomendadas» salen de `carrera_ocupacion`, una relación provisional llenada al azar (`datos/catalogo.py::_relacionar_provisional`). El ajuste reorganiza el resultado, el catálogo y los detalles alrededor de las **familias de carreras** (campo detallado CINE), usando la curaduría real: `ocupaciones_curadas.csv`, `ocupacion_familia_v2.csv` y `campo_detallado_con_descripcion.csv`, ya en `datos/archivos/catalogo/`. También agrega textos por audiencia en cada instrumento y una guía de dimensiones común a los tres tests.

- No hay spec en curso. Este plan se guarda como `ov_backend/docs/specs/ajuste-resultados-intereses.md`.
- Rama: `ajuste/resultados-intereses` (ya creada).
- Bocetos: `ov_backend/docs/specs/bocetos/resultado-intereses/`. Los nombres de archivo son los títulos de los artboards (01–06 en el texto de observaciones). Cada vista se abre junto a su PNG y se replica lo más fiel posible.

Lo que decidiste en la ronda de preguntas:

- Las 5 ocupaciones con slug y `en_catalogo = 0` se cargan ocultas.
- Los textos por audiencia se reescriben (propuesta abajo): dicen cómo leer el resultado y qué precauciones tomar, no cómo es el test.
- La vista de resultados de la orientadora queda para B14.

## Qué cambia (hoy → pasará a)

1. **Ocupaciones del catálogo.**
   - Hoy: `_leer_ocupaciones` carga las 923 filas con `flag_en_mpp = 1` de `ocupaciones_mpp_completo.csv`.
   - Pasará a: se cargan solo las 245 con `en_catalogo = 1` en `ocupaciones_curadas.csv` (los datos siguen saliendo de `mpp_completo`, también para las 10 militares sin flag), más las 5 con slug de `fijos.OCUPACIONES` como ocultas.
   - `titulo` pasa a ser `titulo_pe` (o `titulo_es` si viene vacío). `titulo_es` se agrega a `busqueda`.
   - `descripcion_corta` reutiliza `resumen`.
2. **Ocupación → familia.**
   - Hoy: `carrera_ocupacion` relaciona carreras con ocupaciones al azar, y en `ruta.py` (`OCUPACIONES_CARRERA`) para 6 carreras.
   - Pasará a: la tabla `ocupacion_familia(ocupacion, familia, es_principal, orden)` (una principal y 0–2 secundarias). `carrera_ocupacion`, `_relacionar_provisional` y `OCUPACIONES_CARRERA` se eliminan.
3. **Área.**
   - Hoy: `familia_carrera.area_codigo/area_nombre` es el campo de educación (1 cifra).
   - Pasará a: el campo específico (2 cifras: «22 Artes»). La familia gana `descripcion`.
4. **Cálculo del resultado** (`services/instrumentos/calculo.py::calcular_coincidencias`).
   - Hoy: guarda las 10 mejores con `ajuste` BEST/GREAT/GOOD.
   - Pasará a: guarda todas las de r ≥ 0 entre las ocupaciones `en_test`, ordenadas por r y sin tope. `ajuste` desaparece.
5. **Lectura del resultado** (`consultas.py::representar_resultado`).
   - Hoy: devuelve `coincidencias` y `carreras_recomendadas` con `es_favorita`.
   - Pasará a: devuelve `ocupaciones` (con `parecido` y `banda`), `perfil_poco_marcado`, `por_area` y `familias` (5), sin favoritos ni planes. Las reglas viven en una función pura nueva de `calculo.py`.
6. **Textos del instrumento.**
   - Hoy: `lectura`, un solo texto para el estudiante.
   - Pasará a: `lectura_*` y `mensaje_*` por audiencia, más `guia_abierta`. El resultado entrega solo los textos de quien consulta, con `{nombre}` resuelto en el back.
7. **Catálogo** (`services/catalogo.py`).
   - Filtros de área (2 cifras) y familia en carreras y ocupaciones. Se retiran el filtro `grupo` y `GET …/catalogo/grupos`.
   - Ficha de familia nueva.
   - Los detalles de ocupación y de carrera pasan a relacionarse por familia.
8. **Front.**
   - Resultado del estudiante (boceto 01), resultado del apoderado (02), `DimensionGuide` común (03), catálogo con ficha de familia (04), detalle de ocupación (05) y detalle de carrera (06).

## Qué no cambia

- El puntaje por dimensión, el puntaje visual, el código de interés, el perfil plano y el reinicio.
- Los resultados DESTACADAS y COMPARACION (solo cambian sus textos y se agrega la guía).
- El motor, las fichas, las insignias y los eventos de vista del catálogo.
- Favoritos y planes en el catálogo y en el detalle de carrera del estudiante (siguen). Solo salen del **resultado**.
- `grupo` y `grupo_ocupacional` se quedan en el modelo: `IconoProfesion` los usa para el ícono.
- La numeración del libro de Helena: en el código, intereses es la «Página I». El boceto dice «II»; se conserva la del código.
- El modo `local` del front sigue congelado: todo lo nuevo es solo api.
- La orientadora no recibe ruta de resultados (B14). Su catálogo (`CatalogoPortal`) sí recibe los cambios del catálogo.

## Modelo de datos (decisión de diseño a aprobar; se sigue `/cambio-modelo`, migración `0041`)

| Tabla | Cambio |
|---|---|
| `ocupacion` | `+ en_test` bool; `+ en_catalogo` bool (false solo en las 5 ocultas); `+ programas_cine` JSON (lista de códigos CINE de 6 cifras de `carreras_cine_referencia`). `titulo` guarda `titulo_pe`. Se quita la relación `carreras`. |
| `ocupacion_familia` | Nueva: `ocupacion_id`, `familia_id`, `es_principal`, `orden` (0 la principal, 1–2 las secundarias). PK (ocupacion, familia). Índice único parcial: una sola principal por ocupación. |
| `carrera_ocupacion` | Se elimina (y `Carrera.ocupaciones`). |
| `familia_carrera` | `area_codigo` y `area_nombre` pasan a ser el campo específico; `+ descripcion` (Text, nula). |
| `instrumento` | `lectura` → `lectura_estudiante`; `+ lectura_apoderado`, `lectura_orientadora`, `mensaje_estudiante`, `mensaje_apoderado`, `mensaje_orientadora` (Text, `''` por defecto); `+ guia_abierta` bool (Intereses false; Inteligencias y Habilidades true; Partida y llegada false). `descripcion` (la frase antes de responder) no cambia. Se usa el nombre `lectura_*` porque `descripcion` ya tiene otro significado. |
| `dimension` | Sin cambios: `ejemplos`, `fortalezas` y `desarrollo` ya son «se nota cuando», «viene con» y «para desarrollarla». |
| `coincidencia` | Se quitan `ajuste`, el check de posición ≤ 10 y el check por umbrales. Se agrega un check `correlacion >= 0`. Se elimina `NivelAjuste`. Se guardan todas las de r ≥ 0 (hasta 234 filas por resultado), para recalcular las familias si cambia la curaduría. La PK (`resultado_id`, `ocupacion_id`) ya indexa la lectura por resultado. Las demás ocupaciones y familias se leen en lote, sin consultas por ocupación, y una prueba de presupuesto compara pocas ocupaciones contra muchas. |
| `ocupacion.programas_cine` | Solo sirve para `programa_ejemplo` y para los nombres de «También puedes llegar desde». No es una relación de negocio: ningún filtro, cálculo ni conteo lo usa. |

- Las bases con datos se vacían y se recargan, como con 0033. La migración no recalcula resultados viejos.
- Parámetros nuevos en `core/parametros.py`:
  - `UMBRAL_AFIN = 0.5`, `MAXIMO_OCUPACIONES_AFINES = 30`, `MINIMO_OCUPACIONES_AFINES = 10`.
  - `UMBRAL_MUY_AFIN = 70` (sobre el parecido).
  - `FAMILIAS_RECOMENDADAS = 5`, `RELLENO_SEGUNDA_OCUPACION = 0.5`.
  - Se retiran `UMBRAL_BEST_FIT`, `UMBRAL_GREAT_FIT` y `LIMITE_COINCIDENCIAS`.

## Backend

**Carga** (`datos/catalogo.py`):

- Lee los tres CSV nuevos y valida:
  - una sola principal por ocupación;
  - que toda familia exista en `campo_detallado`;
  - que toda ocupación de `ocupacion_familia_v2` exista en el catálogo.
- Permite sin familia solo a Joyero y Tripulante de cabina (sin familia principal en el CSV).
- Al terminar, registra con `registro.info`:
  - ocupaciones por familia;
  - familias sin ocupación principal;
  - ocupaciones del test sin RIASEC;
  - familias sin descripción.
- `fijos.py`: los textos nuevos y `guia_abierta`.
- `ruta.py`: se quita `OCUPACIONES_CARRERA`.

**Resultado** (`GET /cuentas/{c}/instrumentos/{i}/resultado`, la ruta que ya usa el front; no se crea `/resultados/intereses`):

- Comunes a todos los tipos: `mensaje`, `lectura` (de la audiencia) y `guia_abierta`.
- COINCIDENCIAS:
  - `perfil_poco_marcado`.
  - `ocupaciones[]`: `{posicion, codigo, titulo, resumen, riasec[], parecido, banda, familia_principal{codigo, nombre, area_codigo, area_nombre} | null}`.
    - Se muestran las de r ≥ 0,5, de 10 a 30. Si menos de 10 pasan 0,5, se completan hasta 10 y se marca `perfil_poco_marcado`.
    - `banda`: MUY_AFIN si el parecido es ≥ 70; AFIN si va de 50 a 69; CERCANA si es menor de 50.
  - `por_area[]`: `{area_codigo, area_nombre, ocupaciones[codigo]}`.
    - El área es el **campo específico de 2 cifras** de la familia principal (la redefinida en el cambio 3), nunca el campo de educación de 1 cifra. Una prueba lo verifica con un código de 2 cifras.
    - Las ocupaciones sin familia van en un grupo «Sin familia» al final.
    - Tripulante de cabina tiene `en_test = 1` y RIASEC, pero no tiene familia: entra en las ocupaciones afines y no aporta a ninguna familia. Por eso el test usa 234 ocupaciones y no 233. Se anota en `decisiones.md`.
  - `familias[]` (5, sin puntaje): `{posicion, codigo, nombre, area_nombre, descripcion, tipos[] (niveles con carreras), total_carreras, total_ocupaciones (principales), ocupaciones[{codigo, titulo, parecido}], unica_ocupacion}`.
    - La afinidad de una familia es la media de los 2 mayores r entre las mostradas cuya familia principal es esa. Si solo tiene una, el segundo cupo vale 0,5.
    - El orden de las familias se desempata por código.
- Se van `coincidencias`, `carreras_recomendadas` y `es_favorita` del resultado.
- `referencias.py` (opciones COINCIDENCIAS) pasa a usar las `ocupaciones` mostradas.
- Apoderado: `familia/resultados` entrega los textos de apoderado con el nombre del hijo y deja fuera las aplicaciones COMPARACION, aunque el salón las marque visibles.
  - La exclusión vive solo en `services/familia.py` (en `_aplicaciones_visibles`, así también lo cubren los cuestionarios de `consultar_familia`). El front no filtra.
- `/instrumentos` y `/comparacion` entregan `mensaje`, `lectura` y `guia_abierta` del estudiante.

**Catálogo** (`/cuentas/{c}/catalogo/...`):

- `carreras?area=` usa 2 cifras.
- `ocupaciones?area=&familia=&riasec=&buscar=&favoritos=`:
  - solo `en_catalogo`;
  - `area` toma el área de la familia principal;
  - `familia` devuelve las que la tienen como principal o como secundaria, con `via_familia: PRINCIPAL|SECUNDARIA` (nulo sin filtro) y primero las principales.
- El resumen de ocupación gana `familia_principal`.
- `familias`: gana `descripcion`; el área pasa a ser el campo específico.
- Nuevo `GET familias/{codigo}`:
  - `{codigo, nombre, area_codigo, area_nombre, descripcion, carreras_por_tipo{UNIVERSIDAD, INSTITUTO, FFAA_POLICIA}, total_carreras, ocupaciones_principales, ocupaciones_secundarias, ingresos[{tipo, promedio_jovenes}] (nacional), vecinas[{codigo, nombre}] (misma área), recomendada_posicion}`;
  - `recomendada_posicion` es solo para el estudiante con resultado: 1–5 o nulo.
- Detalle de ocupación:
  - Se va `carreras`.
  - Entran `familia_principal` (la ficha resumida: descripción, tipos y total de carreras), `programa_ejemplo` y `familias_secundarias[{codigo, nombre, total_carreras, programas[]}]`.
    - `programa_ejemplo`: `{nombre, tipo, duracion}` de la primera carrera de la familia principal cuyo `codigo_cine` esté en `programas_cine`.
    - `programas[]`: nombres de carreras con un `codigo_cine` referenciado en esa familia.
  - También entran `otras_ocupaciones_de_la_familia[]` (principales de su familia, menos ella), `total_ocupaciones_familia` y `afinidad{parecido, banda} | null` (solo el estudiante, si está entre sus afines).
- Detalle de carrera:
  - Se va `ocupaciones`.
  - Entra `ocupaciones_de_la_familia{principales[], secundarias[]}`: resumen con `riasec` y, para el estudiante, `parecido` y `banda` si es afín.
- La lista `ocupaciones_inesperada` excluye las ocultas. Se elimina `GET …/catalogo/grupos`.

**Pruebas backend:**

- Unitarias de la función de lectura del resultado:
  - umbral, mínimo con `perfil_poco_marcado`, tope de 30 y bandas;
  - familias por media de 2, con el relleno y `unica_ocupacion`; las secundarias no puntúan;
  - desempates.
- Integración:
  - carga y validaciones de los CSV;
  - ficha de familia;
  - filtros de área y familia (principal o secundaria);
  - detalles;
  - resultado del apoderado (textos con nombre, sin COMPARACION);
  - presupuesto de consultas de la ficha y de los detalles.
- Las pruebas existentes que leen `coincidencias`, `ajuste`, `carreras_recomendadas`, `grupo=` o `carrera_ocupacion` se adaptan, porque la observación cambia ese contrato. Cada adaptación se anota en `decisiones.md`.

## Textos por audiencia (propuesta, como datos en `fijos.py`)

Para el estudiante: cómo leerlo, en segunda persona. Para el apoderado: precauciones, en usted, con `{nombre}` y sin género. Para la orientadora: el alcance técnico y qué hacer en tutoría.

**Intereses**
- Estudiante · «Es una pista para explorar, no un veredicto». «Tu código son los tres tipos de actividad que más te atrajeron, y las barras muestran cuánto resonó cada uno, de 0 a 100. Habla de gusto, no de talento: un tipo bajo no es algo que hagas mal. Las ocupaciones afines tienen un perfil de intereses parecido al tuyo y las familias de carreras son las que llevan a ellas. Explora también lo que no salió arriba: tus gustos cambian con lo que vas conociendo.»
- Apoderado · «Úselo para conversar con {nombre}, no para decidir por su hijo o hija». «El código resume los tres tipos de actividad que más le atraen hoy a {nombre}, y las barras, cuánto le atrajo cada uno, de 0 a 100. Muestra gusto, no capacidad ni rendimiento: un puntaje bajo no cierra ninguna puerta y uno alto no obliga a nada. Las ocupaciones y familias de carreras son puntos de partida para explorar juntos, no una indicación de qué estudiar. Antes de opinar, pregúntele qué le sorprendió y qué no le representa, y evite descartar opciones solo por ingreso o prestigio sin conversarlas.»
- Orientadora · «Resultado exploratorio: insumo para la tutoría, no diagnóstico». «Perfil de intereses RIASEC (Holland) en seis tipos, de 0 a 100. Las ocupaciones afines salen de comparar el perfil del estudiante con el de cada ocupación (porcentaje de parecido) y las familias de carreras, de las ocupaciones más afines. Es preferencia, no aptitud. Un perfil poco marcado o plano es información (intereses aún en formación), no un resultado fallido: conviene proponer experiencias antes que recomendar. Contrástelo con sus registros y con el cuestionario de partida y llegada.»

**Inteligencias múltiples**
- Estudiante · «Es una foto de hoy: todas se desarrollan». «Las inteligencias que salen arriba son las formas de pensar y aprender en las que hoy te sientes más cómodo; las de abajo son las que usas menos, no las que te faltan. Ninguna vale más que otra. Úsalo para estudiar a tu manera y para saber qué te costará más en lo que elijas. Cada inteligencia trae ideas para practicarla.»
- Apoderado · «No mide la inteligencia de {nombre}: muestra cómo prefiere aprender». «Muestra en qué formas de pensar y aprender se siente más cómodo hoy {nombre}, según cómo se ve. No es una medida de coeficiente intelectual ni de rendimiento escolar, y no conviene compararlo con las notas ni con hermanos o compañeros. Un puntaje bajo no es un defecto: todas se desarrollan con práctica. Sirve para entender cómo estudia mejor y acompañarle en casa; evite usarlo como etiqueta («no es de números»).»
- Orientadora · «Autopercepción de preferencias de aprendizaje; sin valor diagnóstico». «Autopercepción basada en las inteligencias múltiples de Gardner. Las destacadas indican formas de aprender preferidas, no aptitudes medidas. Útil para sugerir estrategias de estudio y para contrastar con el test de intereses, que mide gusto. Cada dimensión trae actividades de desarrollo que pueden proponerse en tutoría.»

**Habilidades sociales** (las cinco dimensiones que se nombran son las cargadas en `fijos.py::HABILIDADES`: `HS-ASE` Asertividad, `HS-EMP` Empatía, `HS-EXP` Expresión de sentimientos, `HS-RES` Resolución de problemas y `HS-LID` Liderazgo; lo verifiqué. Al cargar, el texto se arma con los nombres de esas dimensiones para que no se desalinee.)
- Estudiante · «Se entrenan, como cualquier otra habilidad». «Las habilidades que salen arriba son tus recursos de hoy para relacionarte con los demás; las de abajo, lo que puedes practicar. Es cómo te ves tú, no una nota sobre tu forma de ser, y cambia con las experiencias. Fíjate sobre todo en las de abajo: cada una trae por dónde empezar.»
- Apoderado · «Es cómo se ve {nombre} con los demás, no una evaluación de su conducta». «Muestra cómo se percibe {nombre} al relacionarse con otras personas en cinco habilidades: asertividad, empatía, expresión de sentimientos, resolución de problemas y liderazgo. Es su propia mirada, no un juicio sobre su carácter ni sobre cómo se porta en casa o en el colegio. Un puntaje bajo señala algo que puede practicar, no un problema. Lo más útil es preguntarle en qué situaciones se reconoce y acompañar sin corregir el resultado.»
- Orientadora · «Autoinforme: interprételo con el contexto del estudiante». «Autopercepción del desempeño social en cinco habilidades. Es sensible a la deseabilidad social y al momento que vive el estudiante, y no reemplaza la conducta observada. No es tamizaje clínico: un puntaje bajo señala un área de trabajo en tutoría, no un problema. Cada dimensión trae actividades de desarrollo.»

**Partida y llegada**
- Estudiante · «Lo que cambió entre las dos páginas es tuyo». «Cada dimensión te muestra en qué zona estabas al empezar la ruta y en cuál estás al terminarla, en palabras y sin puntajes. No dice si decides bien o mal: muestra cómo cambió tu forma de verlo. Lo que sigue por trabajar no es una falla; es lo que viene después del colegio.»
- Apoderado: `mensaje_apoderado` y `lectura_apoderado` quedan vacíos (`''`), porque nunca se muestran.
- Orientadora · «Medida antes y después: su valor está en el cambio». «Mismas afirmaciones al inicio y al cierre de la ruta sobre claridad, conocimiento de sí, de las opciones, decisión propia y confianza. Lea el cambio entre las dos aplicaciones más que la zona aislada. Incluye la presión percibida del entorno, también de la familia: úselo en tutoría con criterio y sin exponer al estudiante frente a su familia.»

## Frontend (solo modo api)

- **Contrato:**
  - `types/servidorInstrumentos.ts`, `types/servidorCatalogo.ts`;
  - `services/api/catalogo.ts` (+ `obtenerFamilia`, − `obtenerGrupos`);
  - `lib/servidor/adaptadores*.ts`;
  - `store/servidor/catalogo.ts` (`useFichaFamilia`, con su loader propio);
  - `store/servidor/favoritos.ts` (deja de reescribir el resultado).
  - Se regeneran los fixtures.
- **Guía de dimensiones (03):**
  - Se rehace `features/discovery/components/DimensionGuide.tsx`:
    - fila cerrada A con letras y «Abrir la guía»;
    - estado B con una grilla de 3, 2 o 1 columnas;
    - la tarjeta con cabecera de letra de 40 px, nombre de 17 px y posición·puntaje de 12 px, y borde dorado en la más fuerte;
    - «Qué es» en 14 px; los rótulos en versalitas de 11 px y la prosa en 13,5 px;
    - viñeta dorada sin sangría;
    - la caja «Para desarrollarla» con `margin-top:auto`;
    - el mismo alto por fila.
  - Estado inicial según `guia_abierta`. Pulsar una letra del código o una barra abre la guía con esa tarjeta resaltada.
  - Se quita el botón «¿Qué significa cada tipo?» de `DimensionProfile`.
  - Se usa en las tres páginas de tests. `HighlightedDimensions` se alinea a los mismos tamaños.
- **Resultado del estudiante (01):**
  - Se rehace la página de intereses de `HelenaResultView`:
    - cabecera con `mensaje` en cursiva y el bloque «Cómo leer este resultado» (`lectura`);
    - chips ancla;
    - código y barras;
    - la guía cerrada.
  - Paso 1, `AffineOccupations` reescrito:
    - Lista / Por área y Todas / Muy afín / Afín, con conteos;
    - tarjetas con banda·%, «n de N», `resumen`, letras compartidas, familia y «Ver ocupación»;
    - 6 visibles y «Mostrar N más»;
    - el pie con la fuente y el aviso de `perfil_poco_marcado`.
  - Paso 2: `RecommendedCareers` se reemplaza por `FamiliasRecomendadas`:
    - tarjetas numeradas;
    - «Explorar sus carreras» (catálogo `?familia=`) y «Ver sus N ocupaciones» (profesiones `?familia=`);
    - la frase de `unica_ocupacion`.
  - Cierre «¿Y después?».
  - Sin favoritos ni plan en el resultado.
  - Inteligencias, Habilidades y Partida y llegada: `mensaje` y `lectura` reemplazan a `lectura`.
- **Resultado del apoderado (02):**
  - En la rama api de `QuestionnaireDetailContent`, el intereses estilo portal:
    - cabecera (nombre y fecha);
    - «Qué mide este test y cómo leerlo»;
    - código y barras, con el **enlace de texto** subrayado «Qué significa cada tipo» al final del párrafo, como en el boceto, que abre la guía (estado B) debajo. No es el botón que se quita de `DimensionProfile`: en el portal no hay fila de guía cerrada;
    - tabla de ocupaciones (8 visibles y «Mostrar las restantes», Lista / Por área);
    - familias en 2 columnas con «Ver en el catálogo» (catálogo del portal `?familia=`);
    - tarjeta «Para conversar en casa».
  - Los otros tests del apoderado: `mensaje` y `lectura` del apoderado en «Qué mide / Cómo leer».
  - Las piezas compartidas con el estudiante van en `features/discovery` y se pintan con `variante="portal"`, como `CatalogoPortal`.
- **Catálogo (04):**
  - `FiltrosCatalogo`:
    - Carreras: Tipo, Área y Familia (la familia se acota al área), Intereses y «Solo mis favoritas» (estudiante).
    - Profesiones: Área, Familia e Intereses; sale Grupo.
  - Con familia elegida, `FichaFamilia` antes de la lista:
    - descripción, chips (carreras, universitarias, técnicas, egresados jóvenes) y «Ver sus N ocupaciones»;
    - vecinas;
    - la etiqueta «Recomendada por tu test · n.ª de 5» (solo el estudiante).
  - Profesiones filtradas por familia marcan «vía alternativa» en las secundarias.
  - Portal: sin corazones, planes ni etiqueta.
- **Detalle de ocupación (05):**
  - Chips Área, Familia (enlace) y Preparación, más «Muy afín a tu perfil · 91 %». El boceto dice «0,91»; manda el texto de las observaciones.
  - Aside:
    - «Cómo se llega aquí» (familia principal y «Ver sus carreras»);
    - «Programa de ejemplo»;
    - «También puedes llegar desde»;
    - «Otras ocupaciones de esta familia».
  - Reemplaza «Carreras que llevan aquí». `DetalleOcupacionServidor` se divide si pasa de 300 líneas.
- **Detalle de carrera (06):**
  - Chips Tipo, Área y Familia (enlace).
  - «Guardar» y «Hacer mi plan» van a la cabecera, como en el boceto. Hoy el plan está en el aside (`BloquePlanCarrera`); se reutiliza su lógica.
    - Se conserva la regla de F07a: un plan solo se crea desde una carrera favorita (el back responde 409; el front mantiene el aviso o el estado que ya muestra `BloquePlanCarrera`). Una prueba del front lo cubre en la nueva ubicación.
  - «Ocupaciones a las que lleva su familia»: vía principal en tarjetas con letras y «Muy afín a ti», vía alternativa en chips y «Ver estas N ocupaciones en el catálogo».
  - «Carreras parecidas» se mantiene.
- **Loaders:**
  - en «Mostrar más», la ficha de familia, «Hacer mi plan» y «Guardar»;
  - patrón `Loader2 animate-spin` + `aria-busy` + `disabled`.
- **Fuera de alcance:** la vista de resultado de la orientadora se anota en `pendientes-interfaz.md` como B14.

## Fases (cada una cierra en verde con commit `Ajuste resultados-intereses · F<n>: …`)

1. **F1 · Modelo y carga.** Migración 0041, `catalogo.py` (CSV nuevos, validaciones, reporte), `fijos.py` (textos y `guia_abierta`), `ruta.py`, `docs/sistema` del modelo. Pruebas: migraciones, datos y escenarios.
2. **F2 · Resultado.** `calculo.py`, `consultas.py`, `resultados.py`, `schemas/instrumentos.py`, `familia.py` (textos de apoderado, sin COMPARACION) y `referencias.py`. Pruebas: instrumentos, referencias, familia y escenarios.
3. **F3 · Catálogo.** Filtros, ficha de familia y detalles en `services/catalogo.py`, `api/catalogo.py` y `schemas/catalogo.py`. Pruebas: catálogo, favoritos y contrato.
4. **F4 · Contrato front.** Fixtures regenerados; tipos, servicios, adaptadores y store; `npm run test:servidor` en verde con las vistas mínimas adaptadas.
5. **F5 · Guía y resultado del estudiante** (03 y 01), más los textos en los otros tests. Antes de cada pantalla se abre su PNG con Read. Al final, revisión visual en el navegador contra el PNG.
6. **F6 · Resultado del apoderado** (02). Se abre el PNG antes de empezar.
7. **F7 · Catálogo y detalles** (04, 05 y 06), en el tema del estudiante y en el portal. Se abre cada PNG antes de su pantalla.
8. **F8 · Cierre.**
   - Suite completa (`uv run pytest -n auto -q`; `npm test`, `build`, `lint` y `check:estructura`).
   - `uv run alembic heads` con un solo head.
   - `instrumentos.md` e `integracion.md` al día, `decisiones.md` y `pendientes-interfaz.md`.
   - La spec queda en curso.

## Verificación

- Las pruebas, con el subagente `pruebas`, por fase según las tablas de impacto.
- Revisión en el navegador (api con back local y `ruta` cargada):
  - est-ana ve el resultado, la guía, el catálogo con familia, los dos detalles y el apoderado de Ana;
  - cada vista se compara a la par con su PNG, a 1280 px y en móvil.
- Se revisa a mano el reporte de carga: Agroindustria aparece sin principal, y van 234 ocupaciones al test (Tripulante de cabina incluido, sin familia).
- Presupuesto de consultas probado en el resultado de intereses, en la ficha de familia y en los dos detalles.

## Corrección · filtro de preparación en las ocupaciones afines

Bocetos: «Paso 1 · filtro de preparación (estudiante)» y «Ocupaciones afines · filtro de preparación (apoderado y orientadora)».

**Backend**

- Cada ocupación de `ocupaciones[]` en el resultado COINCIDENCIAS agrega `preparacion`: `AMPLIA` (job_zone 4–5) o `INTERMEDIA` (job_zone 2–3), calculada en el back a partir de `job_zone`. Sin `job_zone`, va `null` y solo aparece en «Todas».
- Los cortes van en `core/parametros.py` (`ZONAS_PREPARACION_AMPLIA = (4, 5)`).
- No cambia nada más: el corte de ocupaciones afines (r ≥ 0,5, de 10 a 30) se sigue calculando sobre todas, y las familias del Paso 2 también.
- Una prueba de la clasificación.

**Front (estudiante y portal)**

- El filtro «Todas / Muy afín / Afín» se reemplaza por «Amplia · N / Intermedia · N / Todas · N». Es solo del front y se aplica sobre las ocupaciones ya devueltas, también en la vista Por área. Por defecto, Amplia; si Amplia tiene 0, se abre en Todas.
- Cada control lleva su rótulo encima, en texto pequeño: «Cómo verlas» (Lista / Por área) y «Preparación que suele pedir el trabajo» (Amplia / Intermedia / Todas). No van textos explicativos junto a los controles.
- Sin chip de preparación en las tarjetas ni columna en la tabla del portal. La posición («n de 30», «#») sigue siendo la del orden global.
- No hay fila ni botón hacia el otro nivel.
- El pie es un solo párrafo, junto a «Mostrar más»: «Afinidad: cuánto se parece el perfil de intereses de la ocupación al tuyo («muy afín» desde 70 %). Preparación amplia: suele pedir grado universitario o posgrado; intermedia: formación técnica, capacitación o experiencia práctica. Es una referencia internacional; en el Perú la ruta exacta está en su familia de carreras. Fuente: O*NET Interest Profiler, adaptado a ocupaciones con formación en el Perú.» En el portal, «al suyo».
- El Paso 2 (familias) no cambia.
