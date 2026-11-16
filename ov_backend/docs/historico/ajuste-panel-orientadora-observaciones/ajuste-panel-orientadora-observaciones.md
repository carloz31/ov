# Spec · ajuste panel-orientadora-observaciones


## Contexto
Nueve observaciones visuales y de texto sobre el portal de la orientadora (modo api). No hay spec en curso: el ajuste tendrá su propia spec `ov_backend/docs/specs/ajuste-panel-orientadora-observaciones.md`. Rama `ajuste/panel-orientadora-observaciones` (ya creada desde `main`).

## Qué cambia (hoy → pasará a)

1. **Avance del salón parejo** — `features/counselor/components/panel/CaminoPanel.tsx` (`PorDondeVa`): hoy cada casilla mide lo que su texto (`min-h-20`) y las de nombre largo crecen. Pasará a: grilla con `auto-rows-fr` y botón `h-full`, así todas las casillas tienen el alto de la más alta.

2. **Selector de planes** — `perfil/PestanaPlanes.tsx` (`PlanAbierto`): hoy «← Resumen de planes» y el selector van en la misma fila, y el plan elegido no se distingue (el `SegmentedControl` usa `variant="outline"` y nada pinta `aria-pressed`). Pasará a: el selector debajo del botón, y el plan abierto resaltado (fondo `primary`, texto blanco) con clases `[&_[aria-pressed=true]]:…` pasadas por `className` (sin tocar `components/ui/SegmentedControl.tsx`, que también usa el estudiante en `ComoMeSiento`). El mismo resaltado se aplica al selector Destacados/Todos de `PestanaRespuestas.tsx`, que tiene el mismo problema.
   **Pestañas principales** del perfil (`pages/counselor/PerfilEstudianteView.tsx`): hoy la activa es `bg-card` sobre `bg-muted`, poco contraste. Pasará a: la activa con texto `primary`, `font-semibold` y borde/sombra más marcados, por `className` en esa vista (el `Tabs` común no cambia).

3. **«Cómo lo haría realidad»** — `perfil/PlanCompletoPerfil.tsx`. **Por qué solo Matrícula:** no es un error; los costos muestran exactamente los rubros que el estudiante registró. El plan de ejemplo (siembra `scripts/sembrar_panel_ejemplo.py` → `realidad_lista()` de `tests/soporte/soporte_planes.py`) solo tiene Matrícula S/ 600 por ciclo: 2 ciclos = S/ 1 200 el primer año, 10 ciclos = S/ 6 000 toda la carrera; la línea «Matrícula.» es la lista de rubros. Cambios:
   - Organización en dos columnas: izquierda «Dónde estudiaría», «Cómo llegaría», «Cómo lo pagaría»; derecha «Cuánto costaría» (los totales y debajo «Incluye: Matrícula, …») y «Lo que podría complicarlo». Hoy el rótulo de complicaciones está dentro de un `flex-wrap` y queda desalineado; pasará a rótulo arriba y chips debajo.
   - La siembra de ejemplo pasará a registrar más rubros en ese plan (Matrícula, Materiales, Transporte), marcado `DATO DE PRUEBA`, para que el ejemplo se vea realista. `realidad_lista()` de las pruebas no cambia.

4. **Tabla de Publicaciones** — `publicaciones/TablaPublicaciones.tsx` y `EstadoPublicacionBadges.tsx`:
   - Columna «Familia y a qué se dedica» → «Familia», solo el nombre de la familia (sin `dedicacion`); anchos reajustados.
   - Favoritos: solo el número (sin «/ 3»).
   - Reportes: hoy dos insignias («N reportes» y «N comentarios reportados»). Pasará a una sola insignia «Con reportes» si hay alguno de cualquiera de los dos tipos (prop `compacto` usada solo en la tabla; el detalle conserva su aviso propio).
   - Leyenda: hoy `variant="warning"` pinta el triángulo de peligro automático de `Badge`. Pasará a llevar un ícono `Star` (al pasar un ícono como hijo, `Badge` no pinta el triángulo).

5. **Detalle de publicación** — quitar «Los reportados van primero» (`ReaccionesModeradas.tsx`) y el pie «Destacar y ocultar se pueden revertir…» (`DetallePublicacion.tsx`). El orden (reportados primero) no cambia.

6. **Ícono de Configuración** — `pages/counselor/CounselorPortalModule.tsx`: `BookOpenCheck` → `Settings` (ruedita) de lucide. Es el mismo ítem en ambos modos; cambio solo visual (se anota como excepción visual al modo local congelado).

7. **«Visible para el apoderado»** — `configuracion/CuestionariosConfiguracion.tsx` (`Visibilidad`): hoy SIEMPRE es el texto «Siempre» y NUNCA «No se comparte», desalineados con la casilla de los opcionales. Pasará a: la misma casilla con la misma etiqueta para todos; SIEMPRE marcada y NUNCA sin marcar, ambas siempre deshabilitadas (no editables), con un texto atenuado «(siempre)» / «(nunca)» junto a la etiqueta para que se entienda por qué no se edita.

8. **Alerta del apoderado** — hoy la alerta `familia-pendiente` se llama «Su familia aún no se registra» y su motivo es «No tiene un apoderado vinculado» o «Su apoderado tiene cuenta, pero no ha ingresado». Pasará a: nombre «Su apoderado aún no inicia sesión» y un mismo motivo para ambos casos, «Su apoderado aún no ha iniciado sesión en la plataforma». Solo textos en `datos/fijos.py` (`ALERTAS` y `TEXTOS_PERFIL_ALERTAS`) y los defectos de `app/services/panel/alertas.py`; el evaluador y sus casos no cambian. En el front, «Sin apoderado vinculado» (`CabeceraPerfil.tsx`) y «No tiene un apoderado vinculado.» (`PestanaAvance.tsx`) siguen, porque describen el dato, no la alerta (ver pregunta 2).

9. **Menos «»** en lo que ve la orientadora:
   - Nombres (tramos, actividades, registros, medidores, cuestionarios) → sin «», en **negrita** o *cursiva* donde el front arma el texto: `PestanaRespuestas` (Tramo *Mi historia…*), `PestanaAvance` (sigue: *Mitos…*), `CaminoPanel` (Donde más se detienen), `ConfirmarConfiguracion`, `ListaInteresCompleta`, `PestanaIntereses`, `adaptadoresPanelEstudiante.ts` (`textoConoce`, «lo que escribió antes en …»), placeholder de comentario (etiqueta Orientadora).
   - Lo que dijo alguien (relato del plan, cita de registro, «Otra» escrita, ficha de entrevista) → comillas “…”.
   - Afirmaciones de partida/llegada (`PartidaLlegadaPerfil.tsx`, `DetallePartidaLlegada.tsx`) → solo la frase, sin comillas.
   - Textos que arma el backend para el panel (texto plano; el front no puede ponerlos en negrita): en `TEXTOS_PERFIL_ALERTAS` y `temas.py`, los nombres van sin «» y lo que el estudiante marcó (nivel, «Sí»/«No») va con comillas “…”. Los textos de errores 422 de `configuracion.py` y las descripciones de `PARAMETROS` (no se muestran) no cambian.

## Qué no cambia
- El cálculo de costos, el modelo y los endpoints: ningún esquema ni respuesta cambia de forma.
- Las vistas del estudiante y del apoderado (incluido `SegmentedControl` y `Tabs` comunes) y los contenidos de actividades (JSON y fichas, que usan «» como estilo narrativo).
- El modo local, salvo el ícono del menú.

## Modelo de datos
Sin cambios.

## Backend
- `datos/fijos.py`: textos de `familia-pendiente` y de `TEXTOS_PERFIL_ALERTAS` sin «»; `app/services/panel/alertas.py` y `temas.py`, los mismos textos por defecto. Las filas de alertas se recargan con el cargador de `datos/`.
- `scripts/sembrar_panel_ejemplo.py`: más rubros en el plan de ejemplo.
- Pruebas adaptadas (autorizadas por la observación 8 y 9): `tests/integration/panel/test_panel_temas.py`, `test_panel_alertas.py` y las que comparen textos con «».
- Regenerar fixtures del front.

## Frontend
Los archivos de los puntos 1–9; pruebas de `tests/servidor/panel` que comparen marcado o textos se adaptan.

## Fases
- **F1 · Backend:** textos de alertas y temas, siembra de ejemplo, pruebas, `docs/sistema/panel.md`, fixtures. Pruebas: `tests/integration/panel` + `escenarios`.
- **F2 · Front panel y perfil:** puntos 1, 2, 3, 7, 8 (sin cambios de front) y 9. Pruebas: `tests/local/portales`, `tests/local/perfil`, `tests/servidor/familia`, `tests/servidor/panel`, `test:servidor`.
- **F3 · Front publicaciones y menú:** puntos 4, 5 y 6. Mismas pruebas.
- **Cierre:** suite completa de ambos, `build`, `lint`, `check:estructura`; `decisiones.md`, `AGENTS.md` del front (excepción visual del ícono) y revisión visual en el navegador.

## Preguntas resueltas
1. Punto 3: sin monto por rubro; basta «Incluye: …» con los rubros del presupuesto.
2. Punto 8: solo cambia la alerta; cabecera y «Avance y familia» quedan igual.

## Ajuste · respuestas-orientadora


### Contexto
La pestaña «Respuestas» del perfil del estudiante (ajuste panel-estudiantes §9) se ve cargada: chips de colores, leyenda, encabezados internos, diálogos de Lumi y ecos que repiten lo de arriba. El texto de observaciones (`ajuste-respuestas-orientadora.md`, bocetos 17 y 18) pide que se vea de un vistazo qué registros tienen algo por revisar y, al abrir uno, qué pregunta. No cambia qué se guarda ni cómo decide el LLM.

- Spec en curso: `ajuste-panel-orientadora-observaciones.md` (sin integrar a `main`). Este ajuste se agrega como sección `## Ajuste · respuestas-orientadora`.
- Rama `ajuste/respuestas-orientadora`, creada desde la punta de `ajuste/panel-orientadora-observaciones` (no desde `main`), porque esa rama ya tiene cambios en `PestanaRespuestas.tsx` y la spec en curso. `ajuste/pendientes-orientadora` ya está en `main`.
- Bocetos guardados en `ov_backend/docs/specs/bocetos/respuestas-orientadora/` (17 y 18).

### Cómo funciona hoy
- **Backend** (`app/services/panel/perfil_respuestas.py`): ya son dos lecturas, la lista `GET …/panel/estudiantes/{e}/respuestas` (`respuestas()`: filas `RegistroFila` con `etiquetas` por conteo y `cambio_despues`, más `leer_primero` con el detalle de los registros sensibles) y el detalle `GET …/respuestas/{actividad}` (`registro()`). Cada `ItemLectura` trae `nombre`, `etiquetas`, `dialogo`, `ecos` y `ecos_hoy` en bruto y `ecos_de_hoy`. Las etiquetas salen de `etiquetas()` en `respuestas_resumen.py`.
- **Front:** `PestanaRespuestas.tsx` filtra por destacados, separa «Para leer primero», camino y ciudad, y cada registro es una `Card` con chips y botón «Ver respuestas». `ItemRegistroLectura.tsx` pinta encabezado en mayúsculas, chips, diálogo, ecos con `lineaEco` (`adaptadoresPanelEstudiante.ts`) y respuestas en caja gris.
- **Enlaces:** el aviso `respuesta-sensible` y «Ver respuesta» de «Para conversar» solo llevan a la pestaña (`irADestino('RESPUESTAS')` → `?tab=respuestas`). El aviso no sabe qué registro ni qué ítem.

### §9.3 Causa del error («hoy: lo que escribió antes en …»)
Son dos fallas que se suman:
1. **Qué se considera cambiado.** `cambio` del ítem usa `eco_cambiado()` (`registro/contexto.py`), que compara los **marcadores y las líneas que fueron al LLM** (`ecos_llm`), no lo que se mostró. En b1-3, la pregunta 3 tiene como ecos las preguntas 1 y 2 del mismo registro. Si la 1 queda `sensible` después de responder la 3 (la siembra de ejemplo la marca a mano en `est-panel-6`, línea 324; en uso real pasa si la evaluación llega tarde), hoy ya no se cita (`referenciable()`), las líneas al LLM difieren y el ítem se marca cambiado, aunque el estudiante no cambió nada.
2. **Qué se muestra como «hoy».** El front pinta `lineaEco(eco_hoy).texto`, que es el descriptor («lo que escribió antes en …»), no el valor.

**Corrección:** para el panel, el «cambió» se decide **por eco mostrado y por valor**: se compara cada eco guardado con el de hoy del mismo `codigo` (cita, elección, carrera de cada plan). Los ecos del mismo registro nunca se marcan cambiados (su contenido está arriba). Un eco que hoy ya no se puede mostrar no cuenta como cambio. El «hoy» lo arma el servidor con el valor que cambió. `eco_cambiado()` del estudiante no cambia. Prueba nueva con este caso.

### Modelo de datos
Sin cambios.

### Backend (contrato nuevo)
Decisión §9.1: se queda la forma actual, **lista liviana + detalle al abrir**, y se conserva `leer_primero` (detalle ya incluido de los registros que requieren atención) para que se abran solos sin otra petición. Se miden las consultas y el tamaño de las dos rutas antes y después, con los ejemplos de `contenido` (casos 5, 6 y 7), y se informan al cerrar.

`RespuestasEstudiante`: `hay_destacados`, `total_destacados` (filas visibles en Destacados), `por_revisar_destacados`, `por_revisar_todos`, `registros`, `leer_primero`.

`RegistroFila` (reemplaza `etiquetas` y `cambio_despues`):
- `actividad`, `titulo`, `tramo`, `tramo_numero` (nulo en la ciudad), `ciudad`, `destacado`, `en_destacados` (destacado **o** con alguna sensible, §2.4, en el servidor), `estado`, `fecha`.
- `grupo`: `TRAMO` | `OPCIONALES` | `AUN_NO_LLEGA`; `marca`: `REQUIERE_ATENCION` | `SIN_CONTENIDO` | nulo; `sin_contenido`: cantidad.
- **Orden ya armado por el servidor (§9.2 de la agrupación):** tramos por número, luego opcionales iniciadas, luego «Aún no llega» (requeridos y opcionales no iniciados); dentro de cada grupo, requiere atención → sin contenido → resto, y en cada grupo de esos el orden del camino. El front solo agrupa filas seguidas con el mismo `grupo` + `tramo_numero`, sin contar ni clasificar.

`ItemLectura` (quita `nombre`, `etiquetas`, `dialogo`, `ecos`, `ecos_hoy`, `ecos_de_hoy`):
- `numero`, `codigo`, `marca`: `REQUIERE_ATENCION` | `VACIA` | `FUERA_DE_TEMA` | nulo (prima la sensible), `aun_no_lo_sabe`, y lo de hoy: preguntas con `valores_contexto`, `eleccion`, `elegidas`, `primera_respuesta`, `repregunta`, `segunda_respuesta`, `respondido`.
- `ecos: list[EcoLinea]` resueltos por el servidor (§9.2: se decide en `perfil_respuestas.py`; un eco `ITEM` es del **mismo registro** si su ítem pertenece a la misma actividad, por la caché de definiciones, sin consultas):
  - `MISMO_REGISTRO` → `numeros` (todos los del mismo registro en una sola línea).
  - `TEXTO` / `ELECCION` de otra actividad → `actividad` (título), `cita` u `opciones`.
  - `PLANES` (formas `plan_a_b` y `hoy`) → `planes: [{letra, carrera, institucion}]`.
  - `OTRO` (pasos, proyecto, señal, carrera y demás) → `eco` en bruto, como hoy, y el front reusa `lineaEco`.
  - `hoy`: el valor que cambió (`cita`, `opciones` o `planes` con solo los que cambiaron), o nulo. Sin valores guardados: los de hoy y `hoy` nulo.
- Ni motivos del LLM ni intentos anteriores (prueba de contrato).

`AvisoPerfil` y `TemaPerfil` (§9.4): campo nuevo `respuesta: {actividad, item} | null`. Lo llenan los evaluadores con destino RESPUESTAS: `respuesta_sensible` (la sensible más reciente, que ya busca) y `eleccion_registro` (su `item`). Sin consultas nuevas: la de `respuesta_sensible` agrega dos columnas.

`RespuestasResumen` («Sus respuestas» del Resumen) no cambia de forma.

Pruebas: adaptar `test_panel_respuestas.py` y el contrato (autorizado por las observaciones); nuevas por cada caso de §7 (marcas, agrupación, orden, `por_revisar` singular/plural/cero, sensible no destacado en Destacados, sin contenido no destacado fuera, ecos de cada tipo, eco no cambiado sin «hoy», eco sin valor guardado, enlace con `respuesta`). Presupuesto: `test_panel_presupuestos.py` para lista, detalle y perfil, sin recalibrar a la baja.

### Datos
- `scripts/sembrar_panel_ejemplo.py`: agregar lo que falte a los casos 5, 6 y 7 para cubrir §7: una respuesta `fuera_de_tema` y una sensible en un registro **no destacado** (`DATO DE PRUEBA`).
- Exportador de fixtures: agregar `contenido-panel-6-respuestas` y `-6-registro`; regenerar.

### Frontend
- `types/servidorPanelEstudiante.ts`: tipos nuevos copiados del esquema.
- `features/counselor/components/perfil/MarcaRespuesta.tsx` (nuevo): punto relleno o anillo (`aria-hidden`) + texto, intensidad fuerte o suave. `ChipPerfil` gana el tono `aviso-suave` para el texto suave. Lo usan la fila, el recuadro de la pregunta y «Sus respuestas».
- `PestanaRespuestas.tsx`: selector como hoy; sin leyenda; línea «N registros con algo por revisar» (texto del front, número del servidor); tarjetas por grupo con encabezado «Tramo N · nombre» en versalitas grises, «Misiones opcionales» y «Aún no llega» (filas grises que no se abren, con su tramo o «Misión opcional»). Cada fila es un `<button aria-expanded>` de al menos 44 px: marca, título, «Requiere atención» o «N sin contenido», fecha o «En curso», flecha › / ⌄. Sin «Para leer primero» como sección: las que requieren atención abren solas con el detalle de `leer_primero`.
- `ItemRegistroLectura.tsx`: número en columna gris; pregunta gris; elección en negrita separada por « · »; podio numerado; pieza en negrita con su origen en gris; «Otra» con «(lo escribió el estudiante)»; texto sin caja; repregunta «Lumi le preguntó: …»; aún no lo sabe y «No lo respondió» en gris cursiva. Sin encabezado en mayúsculas, sin chips, sin diálogo. Recuadro: crema y borde ámbar (los de la tarjeta de Avisos) para requiere atención; blanco con borde ámbar punteado para sin contenido; primera línea con la marca y el texto fijo (§9.5: constantes del front junto a la marca, «Lumi la derivó a usted en lugar de seguir preguntando.», «La dejó vacía.», «No responde a la pregunta.»; el texto de la alerta lleva `{registro}` y otra redacción, así que no se reutiliza).
- Línea de eco (`adaptadoresPanelEstudiante.ts`, función nueva que arma las piezas): «Respondió viendo sus respuestas 1 y 2.», «… lo que escribió en {actividad}: “cita”.», «… lo que eligió en {actividad}: …», «Respondió viendo: Plan A **carrera** · …», y al final, en gris más oscuro, «Hoy su Plan B es **X**.» / «Hoy dice: “…”.». Actividades en cursiva y citas con “…” (criterio del ajuste anterior, en lugar de las «» del texto de observaciones).
- Enlace (§3.1): `irADestino` acepta `respuesta`; la URL lleva `?tab=respuestas&registro=b1-3&item=b1-3-voz`. La pestaña abre ese registro (pide su detalle si no está en `leer_primero`) y desplaza hasta el ítem (`id` por código y `scrollIntoView`).
- «Sus respuestas» (`RespuestasYNotas.tsx`): las filas de requiere atención y sin contenido con la marca fuerte y la suave; aún no lo sabe en gris.
- Estilos del recuadro y de la línea de eco con clases del portal (sin estilos en línea).
- Pruebas de render con los fixtures de los casos 5, 6 y 7; `textosEtiqueta` y lo que quede sin uso se quita.

### Qué no cambia
Qué marca el LLM y sus motivos, el histórico de intentos, la configuración de destacados, el `eco_cambiado()` y lo que ve el estudiante, el control de acceso, el modo local.

### Fases
- **F1 · Backend:** esquemas, `perfil_respuestas.py`, `respuesta` en avisos y temas, pruebas, presupuestos con números antes y después, siembra y fixtures, `panel.md`.
- **F2 · Front:** tipos, marca, lista, ítem, eco, enlace y «Sus respuestas»; pruebas de render. Pruebas de impacto + `test:servidor`.
- **Cierre:** suite completa, `decisiones.md`, `origen-de-datos.md` y `AGENTS.md` del front; revisión en el navegador si hay backend levantado.

### Preguntas abiertas
Ninguna: las cinco del texto se resuelven arriba (lectura §Backend, tipo de eco §Backend, causa §9.3, enlace §Frontend, textos fijos §Frontend).

### Anexo: texto de observaciones

### Ajuste respuestas-orientadora · Pestaña «Respuestas» del perfil, más liviana

Texto de observaciones para `/ajuste respuestas-orientadora`, sobre `main` con panel-estudiantes integrado. Solo modo api. Si la rama `ajuste/pendientes-orientadora` aún no está en `main` y toca los mismos archivos del perfil, avisa antes de empezar.

Rediseña la presentación de la pestaña «Respuestas» del perfil del estudiante (§9 de panel-estudiantes). Hoy la vista se ve cargada: cada dato es una etiqueta de color, hay leyenda, encabezados internos, diálogos de Lumi y ecos que repiten lo que está justo arriba. La orientadora debe ver de un vistazo **qué registros tienen algo por revisar** y, al abrir uno, **qué pregunta**.

No cambia qué se guarda ni cómo decide el LLM. Cambia qué se muestra y cómo. Este documento es autosuficiente; si el repo difiere de lo que aquí se describe, se reporta y no se corrige en silencio.

Bocetos: `ov_backend/docs/specs/bocetos/respuestas-orientadora/`

| Archivo | Pantalla |
|---|---|
| `17-respuestas-lista.png` | Lista (Destacados), todo plegado |
| `18-respuestas-registros.png` | Registros abiertos: uno sensible, uno con «sin contenido», uno con eco que cambió |

Los datos de los bocetos son de ejemplo. Donde este texto y un boceto difieran, manda este texto.

#### 1. Principio: un solo color con dos intensidades

El color solo dice **«revise esto»**. Todo lo demás va en texto gris o negro, sin chip.

| Marca | Cuándo | Cómo se ve |
|---|---|---|
| **Requiere atención** | `sensible` | Ámbar fuerte: punto relleno y texto en negrita. Es el tono `aviso` de `ChipPerfil` |
| **Sin contenido** | `tipo_final` es `vacio` o `fuera_de_tema` | Ámbar suave: anillo vacío y texto en peso normal. Es menos grave: el estudiante puede responder cualquier cosa y no se le fuerza |
| Aún no lo sabe | estado ABIERTO | Sin color: texto gris en cursiva |
| Completado, fecha, en curso, aún no llega, cambió después | — | Sin color: texto gris |

- Las dos intensidades se distinguen también por forma (relleno frente a anillo) y por peso del texto, no solo por tono.
- Si `ChipPerfil` no tiene un tono suave, se agrega como variante (`aviso-suave` o similar). No van colores en línea.
- Se quita el verde de «Completado».

#### 2. Lista (`17…`)

##### 2.1 Encima de la lista

- Selector «Destacados · N» y «Todos · M», como hoy. Si el salón no tiene destacados, no hay selector.
- **Se quita la leyenda «Etiquetas: …».**
- Si hay registros con alguna marca en la vista elegida, una línea en ámbar fuerte: «N registros con algo por revisar» (singular: «1 registro con algo por revisar»). Si no hay ninguno, no se muestra nada.
- **Se quita «Para leer primero»** como sección aparte. Lo reemplazan el orden de §2.3 y la apertura automática de §3.1.

##### 2.2 Agrupación

Una tarjeta por tramo, en el orden del camino. El encabezado es «Tramo N · {nombre}», en mayúsculas pequeñas y gris. El tramo **ya no se repite** en cada registro.

Después de los tramos van dos tarjetas más:

- **«Misiones opcionales»**, con las de la ciudad ya iniciadas o completadas.
- **«Aún no llega»**, con todos los registros no disponibles o no iniciados (requeridos y opcionales). Van en gris y no se abren. A la derecha llevan su tramo («Tramo 6 · Mi proyecto») o «Misión opcional».

Una tarjeta sin filas no se muestra.

##### 2.3 Cada registro: una fila

La fila completa es un botón que se abre y se pliega (`aria-expanded`). **No hay botón «Ver respuestas».** De izquierda a derecha:

1. La marca: punto relleno, anillo o nada.
2. El título.
3. Si tiene alguna marca, un texto corto: «Requiere atención» (si tiene al menos una sensible) o «N sin contenido» (si solo tiene de esas). Si tiene de los dos tipos, va «Requiere atención» y la de sin contenido se ve al abrir.
4. La fecha de completado («30 oct.») o «En curso».
5. Una flecha (› plegado, ⌄ abierto).

Lo que **ya no va en la fila**: «Completado», «Aún no lo sabe» y «Lo que tenía a la vista cambió después». Todo eso se ve dentro del registro.

**Orden dentro de cada tarjeta:** primero los que requieren atención, luego los de sin contenido, luego el resto. Dentro de cada grupo, el orden del camino.

##### 2.4 Destacados y respuestas sensibles

En la vista «Destacados», un registro con una respuesta sensible **aparece aunque no sea destacado**, en su tramo y con su marca. Una respuesta sensible nunca queda oculta por la configuración. «Sin contenido» no tiene esta excepción.

#### 3. Registro abierto (`18…`)

##### 3.1 Apertura

- Los registros que requieren atención **se muestran abiertos** al entrar a la pestaña. Los demás, plegados.
- Al entrar desde un enlace (el aviso `respuesta-sensible` del Resumen, o «Ver respuesta» de «Para conversar»), la pestaña abre ese registro y **se desplaza hasta la pregunta marcada**. Indica en el plan cómo llega hoy ese destino; si solo llega a la pestaña, se agrega el registro (y el ítem) en la URL.
- Se muestran **todas las preguntas** del registro, con la marcada resaltada (§3.3).

##### 3.2 Cada pregunta

Una columna estrecha con el número («1», «2», gris) y, al lado, el contenido:

| Pieza | Cómo se muestra |
|---|---|
| Pregunta | Texto gris, peso normal |
| Respuesta de elección | Texto oscuro en **negrita**, sin chip. Varias opciones: separadas por « · » |
| Podio (`eleccion_ordenada`) | Lista numerada 1, 2, 3, texto oscuro |
| Piezas | La pieza en negrita y, en gris, de dónde sale («de lo que dijo que se le da bien») |
| «Otra» | Su texto en negrita y, en gris, «(lo escribió el estudiante)» |
| Respuesta de texto | Texto oscuro, peso normal, **sin caja gris** |
| Repregunta | Debajo, una línea gris «Lumi le preguntó: {repregunta}» y la segunda respuesta en texto oscuro |
| Aún no lo sabe | Si hay texto: el texto y, debajo, en gris «Marcó que aún no lo sabe». Si no hay texto: «Aún no lo sabe» en gris cursiva como respuesta |
| No obligatoria sin responder | «No lo respondió», en gris cursiva |

**Lo que se quita:**

- El encabezado «PREGUNTA N · {NOMBRE DEL ÍTEM}» en mayúsculas. Queda solo el número.
- La etiqueta al lado del encabezado. Se reemplaza por el resaltado de §3.3.
- El `dialogo` de contexto en cursiva («Ahora tu voz.», «Pongamos las dos voces juntas.»).
- Las cajas grises de las respuestas y los chips de las elecciones.

Las preguntas siguen mostrándose con los valores con que el estudiante respondió (`valores_contexto`), como hoy.

##### 3.3 Pregunta con marca

Todo el bloque de la pregunta (número, pregunta y respuestas) va en un recuadro:

| Marca | Recuadro | Primera línea del recuadro |
|---|---|---|
| Requiere atención | Fondo crema y borde ámbar, los mismos de la tarjeta de avisos del Resumen | Punto relleno · **Requiere atención** · «Lumi la derivó a usted en lugar de seguir preguntando.» |
| Sin contenido | Fondo blanco y borde ámbar punteado | Anillo · Sin contenido · «La dejó vacía.» (`vacio`) o «No responde a la pregunta.» (`fuera_de_tema`) |

Esas explicaciones son **textos fijos por tipo de marca**. No se muestran los motivos del LLM (sigue valiendo lo de panel-estudiantes). Si el repo ya guarda esos textos en algún lado (p. ej. junto a la alerta `respuesta-sensible`), se toman de ahí. Si no, van como constantes del front junto a la definición de las marcas.

Si una pregunta tiene los dos tipos de marca, prima «Requiere atención».

##### 3.4 Ecos: una línea, y solo cuando aportan

El eco pasa a ser **una línea gris encima de la pregunta**, con lo que la orientadora necesita para entender la respuesta:

| Qué tenía a la vista | Línea |
|---|---|
| Respuestas del **mismo registro** | «Respondió viendo sus respuestas 1 y 2.» (o «su respuesta 1.»). No se repite el contenido: está arriba |
| Texto de **otra actividad** | «Respondió viendo lo que escribió en «{actividad}»: «{cita}».» |
| Elección de otra actividad | «Respondió viendo lo que eligió en «{actividad}»: {opciones}.» |
| Un plan | «Respondió viendo: Plan A **{carrera}** · {institución}.» |
| Dos planes | «Respondió viendo: Plan A **{carrera}** · Plan B **{carrera}**.» |
| Pasos, proyecto o señal | Una línea con lo mismo que vio el estudiante, como hoy |

**Si lo que tenía a la vista cambió después**, se agrega al final de la misma línea, en un gris más oscuro, solo el dato que cambió: «Hoy su Plan B es **Psicología**.» o «Hoy dice: «{texto de hoy}».» La etiqueta «Lo que tenía a la vista cambió después» **desaparece de la cabecera del registro**.

Si un eco mostrado no se guardó con su valor de entonces, se muestra con el de hoy y no se dice que cambió (sigue valiendo lo de panel-estudiantes).

**Error a corregir.** Hoy, en «Las voces y la mía», la pregunta 3 muestra «(cuando respondió; hoy: lo que escribió antes en «Lo que tú quieres»)». Repite la descripción del eco en lugar del valor de hoy y, además, marca como cambiado un eco que no cambió. Revisa en el plan:

1. cómo se decide que un eco cambió, que debe comparar valores y no descriptores;
2. qué se muestra como valor de hoy.

Agrega una prueba para este caso.

#### 4. Pestaña Resumen (ajuste menor)

En la tarjeta «Sus respuestas», las filas de conteo usan la misma marca e intensidad: «1 requiere atención» en ámbar fuerte y «1 respuesta sin contenido» en ámbar suave. Su botón abre la pestaña Respuestas.

#### 5. Backend y rendimiento (criterios de la auditoría)

- La lista de §2 necesita, por registro: tramo, estado, fecha, si es destacado, si tiene alguna respuesta sensible y cuántas sin contenido. Si la lectura actual de la pestaña ya trae todos los ítems de todos los registros, indica en el plan si conviene:
  - **(a)** dejarla así, o
  - **(b)** separar una lectura liviana de la lista y otra del detalle de un registro al abrirlo.

  Con pocos registros, (a) puede bastar. Se informan las consultas y el tamaño de la respuesta, antes y después.
- Los conteos y marcas se calculan en el servidor. El front no cuenta ni clasifica.
- La regla de §2.4 (sensibles visibles en Destacados) vive en el servidor.
- El orden de §2.3 y la agrupación de §2.2 los devuelve el servidor ya armados, o el front los arma solo a partir de campos que el servidor entrega. Se dice cuál en el plan.
- El tipo de eco (mismo registro, otra actividad, plan, etc.), su texto de cita y el «hoy» del cambio los resuelve el servidor. El front solo pinta la línea.
- Ninguna ruta suma consultas por registro ni por ítem: nada de N+1 al armar marcas, ecos o el «hoy». Se actualizan las pruebas de presupuesto de las rutas tocadas (`tests/integration/panel/test_panel_presupuestos.py`).
- Mismo control de acceso de hoy.

#### 6. Front

- Se toca el componente de la pestaña Respuestas en `features/counselor/components/perfil/` y el ítem de registro en lectura del portal. No se reutiliza el reproductor del estudiante.
- Las marcas son un componente pequeño reutilizable (punto o anillo con su texto), usado en la lista, en el recuadro de la pregunta y en la tarjeta del Resumen.
- El recuadro de pregunta con marca y la línea de eco son estilos del portal, no estilos en línea.
- Accesibilidad: cada fila es un `<button>` con `aria-expanded`. El punto y el anillo son decorativos (`aria-hidden`), porque la marca siempre va acompañada de su texto. Las áreas de toque miden al menos 44 px de alto.
- Tipos, adaptadores, fixtures y pruebas de render actualizados.

#### 7. Pruebas

- **Marcas:** sensible; `vacio`; `fuera_de_tema`; un registro con los dos tipos (prima «Requiere atención» en la fila y en el ítem); ABIERTO con texto y sin texto; ítem no obligatorio sin responder.
- **Lista:**
  - agrupación por tramo, «Misiones opcionales» y «Aún no llega»;
  - orden dentro del tramo;
  - línea «N registros con algo por revisar» en singular, en plural y ausente;
  - un registro sensible no destacado que aparece en «Destacados»;
  - un registro con «sin contenido» no destacado que no aparece.
- **Apertura:** los sensibles abiertos al entrar; la entrada por enlace abre el registro y se desplaza al ítem.
- **Ecos:** cada tipo de §3.4; eco del mismo registro sin repetir el contenido; eco cambiado con su «hoy»; eco no cambiado sin «hoy» (el error de §3.4); eco sin valor guardado.
- **Contrato:** no viajan motivos del LLM ni histórico de intentos.
- **Presupuesto:** §5.
- **Front:** render de la lista y de un registro de cada caso, con los casos 5, 6 y 7 de `scripts/sembrar_panel_ejemplo.py`. Si a algún caso le falta algo de §7 (p. ej. un sensible fuera de destacados o un `fuera_de_tema`), se agrega al script.

#### 8. Fuera de este ajuste

- Qué marca el LLM como sensible o sin contenido, y sus motivos.
- El histórico de intentos.
- La configuración de destacados.
- Imprimir la ficha.

#### 9. Para decidir en el plan

1. Lectura única o lista liviana más detalle al abrir (§5), con sus números.
2. Dónde se decide el tipo de eco y cómo se detecta que una respuesta del mismo registro es la fuente.
3. Causa del error de §3.4 y su corrección.
4. Cómo llega hoy el destino del aviso `respuesta-sensible` y de «Ver respuesta», y qué se agrega a la URL.
5. De dónde salen los textos fijos de §3.3.

## Ajuste · partida-llegada-liviano


### Contexto
En el perfil del estudiante de la orientadora, cada zona, respuesta y cambio de partida y llegada es un chip de color, y una fila llega a tener dos o tres chips que dicen lo mismo. El texto de observaciones (`ajuste-partida-llegada-liviano.md`, bocetos 19 a 22) pide el mismo principio de respuestas-orientadora: zonas y respuestas en texto plano y **solo el cambio o lo que pide atención con color**, como texto con un marcador (flecha o punto), sin chip; como máximo una marca por fila. La vista del estudiante y la del apoderado no se tocan.

- Requisitos del texto: respuestas-orientadora terminado (sus fases y la suite completa están en verde en esta rama), color-partida-llegada y panel-estudiantes integrados (ya en `main`). Se sigue en la misma rama, `ajuste/respuestas-orientadora`, como sección `## Ajuste · partida-llegada-liviano` de la spec en curso, a pedido del usuario.
- Bocetos guardados en `ov_backend/docs/specs/bocetos/partida-llegada-liviano/` (el 20 llegó como `.webp`).

### Cómo funciona hoy
- **Tests · bloque** (`perfil/PartidaLlegadaPerfil.tsx`): tabla con `ChipPerfil` por zona y cambio; con solo partida, la columna Llegada repite «Aún no responde»; filas de afirmaciones con chips «partida → llegada». Las dimensiones llegan en el orden del cuestionario (`perfil_tests.py`, `PartidaLlegada.resumen`): **no** vienen ordenadas por atención.
- **Detalle** (`perfil/DetallePartidaLlegada.tsx`): conteo y leyenda como chips; cabecera de dimensión y celdas con chips. El servidor ya ordena dimensiones y filas (`_prioridad_dimension`, `_afirmaciones_detalle`) y clasifica las afirmaciones (`BAJO`, `SIGUE_BAJA`, `MEJORO`, `IGUAL`).
- **Conteo:** con llegada, `ConteoDetalle` cuenta por `BAJO`, `SUBIO` e `IGUAL`; «Sigue por trabajar» queda dentro de `IGUAL`. Para la dimensión, «sigue por trabajar» no viaja: el front lo deduce de las zonas en `gruposComoEmpezo` (Resumen).
- **Resumen** (`TarjetasResumen.tsx`, «Cómo empezó» / «De la partida a la llegada»): chips con el tono del grupo.
- **Etiqueta del instrumento** («Requisito del salón»): `EtiquetaPanel` dentro de `BloquePanel` (`panel/PanelComun.tsx`), un chip gris.

### Decisiones del texto (§10)
1. **Etiqueta compartida:** `EtiquetaPanel` la usan todos los `BloquePanel` con `etiqueta`: el bloque y el detalle de partida y llegada y «Cuestionarios» del Inicio del panel (`CuestionariosPanel`). Pasa a texto gris sin fondo en todos ellos.
2. **Resumen:** sí usa chips de zona; pasan a texto (§5 del texto).
3. **Datos que faltan:** el conteo con llegada no separa «sigue por trabajar» y el bloque de Tests no llega ordenado. Se agregan en el servidor (abajo), sin consultas nuevas.

### Backend
- `DimensionPartida` y `DimensionDetalle` ganan `clase`: `BAJO` | `SIGUE_POR_TRABAJAR` | `SUBIO` | `IGUAL` con llegada, nulo con solo partida (ahí manda `zona_partida`). Se calcula donde se arma cada una (`perfil.py` con `ComparacionDimension.sigue_por_trabajar`, ya existente, y `perfil_tests.py`).
- `ConteoDetalle.codigo` con llegada: `BAJO`, `SIGUE_POR_TRABAJAR`, `SUBIO`, `IGUAL` (este último ya sin los que siguen por trabajar), en ese orden; solo partida, igual que hoy.
- El bloque de Tests (`PartidaLlegada.resumen.dimensiones`) sale ordenado como el detalle (`_prioridad_dimension`: con llegada Bajó → Sigue por trabajar → Subió → Igual; solo partida Por trabajar → En camino → Fuerte; desempate por el cuestionario). El Resumen del perfil no cambia de orden (agrupa).
- Pruebas: `clase`, el conteo nuevo y el orden del bloque; presupuesto: `test_presupuesto_de_las_lecturas_de_partida_y_llegada` y el del perfil sin cambios (mismo número de consultas, se informan antes y después). Contrato: tipos, fixtures regenerados.

### Frontend
- **`perfil/MarcaTexto.tsx`** (nuevo, un componente con variantes por clase): `BAJO` «↓ Bajó» ámbar negrita; `SIGUE_BAJA` «• Sigue baja» y `SIGUE_POR_TRABAJAR` «• Sigue por trabajar» ámbar peso medio; `SUBIO` «↑ Subió» y `MEJORO` «↑ Mejoró» verde seminegrita; `IGUAL` «= Igual» gris; `POR_TRABAJAR` «• Por trabajar» y `BAJA` «• {etiqueta}» ámbar peso medio. Flecha o punto con `aria-hidden`; la palabra siempre va. Colores `text-warning-text` y `text-success-text` del tema del portal (#5a3b00 y #256b4c: ya pasan 4.5:1 sobre blanco, no hace falta oscurecerlos).
- **Frase del conteo:** función pura `fraseConteo(estado, conteo)` en `adaptadoresPanelEstudiante.ts` que devuelve piezas con su clase: «1 dimensión bajó, 1 sigue por trabajar y 3 subieron.», «2 dimensiones por trabajar, 2 en camino y 1 fuerte.», «Las 5 dimensiones subieron.» / «… están en camino.»; ceros omitidos, singular y plural, comas e «y». El front no cuenta: usa `conteo` del servidor.
- **`PartidaLlegadaPerfil.tsx`** (§3): con llegada, tabla Dimensión · Partida · Llegada · Cambio con zonas en texto y `MarcaTexto`; grupos de afirmaciones con título del color de su cambio y filas «partida → **llegada**» sin chips. Solo partida: sin columna Llegada; el subtítulo suma «Medida antes y después: su valor está en el cambio. Partida respondida el {fecha}; aún no responde la llegada.» (la primera frase es el `mensaje` del servidor; la segunda, del front); Por trabajar con marcador; grupo «Respuestas bajas» en ámbar con «• {etiqueta}»; sin bajas, «No tiene respuestas bajas en la partida.» sin título.
- **`DetallePartidaLlegada.tsx`** (§4): frase del conteo en lugar de chips; sin leyenda de chips y, en su lugar, la línea gris solo si hace falta (con llegada, alguna `SIGUE_BAJA`; solo partida, alguna `partida_baja`, con «• Respuesta baja:» y `textoRespuestaBaja`). Cabecera de dimensión: «{zona} → {zona} · marcador» o la zona con marcador si es Por trabajar. Celdas en texto (partida gris oscuro, llegada oscuro peso medio), cambio con marcador, «Sin responder» en gris con Cambio vacío. Una columna con llegada; dos con solo partida (como hoy).
- **`TarjetasResumen.tsx`** (§5): nombres en texto, título de grupo con el color del cambio (o ámbar solo en Por trabajar), «{nombre}: {zona} → {zona}» con llegada. `gruposComoEmpezo` agrupa por `clase` en lugar de deducirla de las zonas.
- `EtiquetaPanel` (`PanelComun.tsx`) a texto gris. Se quitan de estas vistas los usos de `ChipPerfil` para zonas, respuestas y cambios, y las constantes de tono que queden sin uso (`TONO_ZONA`, `TONO_CAMBIO`, `TONO_CAMBIO_AFIRMACION`). `ChipPerfil` sigue para lo demás.
- Tipos (`servidorPanelEstudiante.ts`), fixtures y pruebas de render.

### Qué no cambia
La vista del estudiante y la del apoderado (sus chips de zona), el cálculo de zonas, la clasificación y los umbrales, el orden del detalle, las vistas de intereses, habilidades e inteligencias, el modo local.

### Pruebas (§8)
`MarcaTexto` por clase (palabra, marcador oculto, estilo); `fraseConteo` en los dos estados (todas en un grupo, uno de cada uno, ceros, singular y plural); bloque de Tests con llegada (orden, grupos con título coloreado, filas sin chips) y solo partida (sin Llegada, frase en el subtítulo, Por trabajar primero con marcador, bajas con marcador y sin bajas); detalle (cabecera en los dos estados, línea presente y ausente, «Sin responder»); Resumen sin chips en los dos estados; la prueba existente de la vista del estudiante sin cambios; presupuesto igual.

### Fases
- **F1 · Backend:** `clase`, conteo, orden del bloque, pruebas, `panel.md`, fixtures.
- **F2 · Front:** `MarcaTexto`, `fraseConteo`, bloque, detalle, Resumen y etiqueta; pruebas de render. Pruebas de impacto + `test:servidor`.
- **Cierre:** suite completa de ambos, `decisiones.md` y documentos vigentes.

### Anexo: texto de observaciones

### Ajuste partida-llegada-liviano · Partida y llegada sin chips en el panel de la orientadora

Texto de observaciones para `/ajuste partida-llegada-liviano`, para correr **cuando esté cerrada la spec de respuestas-orientadora**, sobre la misma rama o sobre `main` con ella integrada. También deben estar integrados color-partida-llegada (el detalle por dimensión y la clasificación del cambio) y panel-estudiantes. Si alguno falta, detente y avisa.

Solo vistas de la **orientadora**, en modo api. **La vista del estudiante no se toca**: sus colores por zona se quedan como los dejó color-partida-llegada.

Este documento es autosuficiente; si el repo difiere de lo que aquí se describe, se reporta y no se corrige en silencio.

Bocetos: `ov_backend/docs/specs/bocetos/partida-llegada-liviano/`

| Archivo | Pantalla |
|---|---|
| `19-tests-partida-llegada.png` | Pestaña Tests · bloque de partida y llegada, con llegada |
| `20-detalle-por-dimension.png` | Detalle por dimensión, con llegada |
| `21-tests-solo-partida.png` | Pestaña Tests · bloque de partida y llegada, solo partida |
| `22-detalle-solo-partida.png` | Detalle por dimensión, solo partida |

Los datos de los bocetos son de ejemplo. Los de detalle muestran parte de las dimensiones: en la vista real van todas. Donde este texto y un boceto difieran, manda este texto.

#### 1. Problema y principio

Hoy cada zona, cada respuesta y cada cambio es un chip de color. Por eso una fila lleva dos o tres chips que dicen lo mismo: «Fuerte → Por trabajar» más «Bajó», con la respuesta de llegada y el cambio en el mismo ámbar. La leyenda de chips, además, se confunde con los conteos.

**Principio, el mismo de respuestas-orientadora:** zonas y respuestas van en **texto plano**. **Lo único con color es lo que pide atención o el cambio**, escrito como texto con un marcador (flecha o punto) y sin fondo ni chip. Como máximo, una marca de color por fila.

#### 2. Marcadores

| Qué | Texto | Estilo |
|---|---|---|
| Bajó (dimensión o afirmación) | ↓ Bajó | Ámbar, negrita |
| Sigue baja (afirmación) | • Sigue baja | Ámbar, peso medio |
| Sigue por trabajar (dimensión, por trabajar en ambas) | • Sigue por trabajar | Ámbar, peso medio |
| Subió (dimensión) | ↑ Subió | Verde, seminegrita |
| Mejoró (afirmación) | ↑ Mejoró | Verde, seminegrita |
| Igual | = Igual | Gris |
| **Solo partida:** respuesta baja | • {etiqueta que marcó} | Ámbar, peso medio |
| **Solo partida:** zona Por trabajar | • Por trabajar | Ámbar, peso medio |

- La flecha y el punto son decorativos (`aria-hidden`). La palabra siempre va, así que el color nunca es la única señal.
- Ámbar y verde son los tonos de texto de `aviso` y `exito` del panel. Necesitan un contraste de 4.5:1 sobre blanco; si el tono actual no lo cumple como texto, se oscurece la variante de texto, no el chip.
- Queda **un componente** para esto, p. ej. `MarcaTexto`, usado en todas las piezas de §3 a §5. Las clases (`BAJO`, `SIGUE_BAJA`, `MEJORO`, `IGUAL`, las de dimensión, la marca de baja y la zona) ya vienen del backend. El front no las calcula.
- Lo demás va en texto plano oscuro, sin chip y sin color: las zonas En camino y Fuerte, y toda respuesta que no sea baja ni cambie.

#### 3. Pestaña Tests · bloque de partida y llegada

La etiqueta del instrumento («Requisito del salón») pasa de chip a texto gris al lado del título. Si el componente de etiqueta se comparte con los otros cuestionarios de la pestaña, el cambio aplica a todos y se dice en el plan.

##### 3.1 Con llegada (`19…`)

- **Tabla de dimensiones:** columnas Dimensión, Partida · fecha, Llegada · fecha y Cambio.
  - Las zonas van en texto.
  - Cambio va con su marcador.
  - **Orden por atención**, el mismo del detalle: Bajó → Sigue por trabajar → Subió → Igual; desempate por el orden del cuestionario.
- **Afirmaciones para conversar:**
  - El título de cada grupo («Bajaron», «Siguen bajas», «Mejoraron») toma el color de su cambio: ámbar los dos primeros y verde el tercero.
  - Cada fila lleva la afirmación y, a la derecha, «{partida} → **{llegada}**» en texto, con la llegada en negrita oscura. Sin chips y sin color en la fila.

##### 3.2 Solo partida (`21…`)

- **Sin columna Llegada.** Hoy la columna repite «Aún no responde» en cada fila. En su lugar, el subtítulo suma una frase: «Medida antes y después: su valor está en el cambio. Partida respondida el {fecha}; aún no responde la llegada.»
- **Tabla de dimensiones:** columnas Dimensión y Partida · fecha.
  - La zona va en texto; Por trabajar lleva su marcador (§2).
  - Orden: Por trabajar → En camino → Fuerte; desempate por el orden del cuestionario.
- **Afirmaciones para conversar:**
  - El subtítulo de hoy se queda: «Sus respuestas más bajas en la partida. Cuando responda la llegada, aquí irán primero las que bajaron.»
  - Un título de grupo «Respuestas bajas» en ámbar.
  - Cada fila lleva la afirmación y, a la derecha, el marcador de respuesta baja («• Bastante de acuerdo»).
  - Sin respuestas bajas: «No tiene respuestas bajas en la partida.» en gris, sin título de grupo.

El botón «Ver detalle por dimensión» no cambia en ninguno de los dos estados.

#### 4. Detalle por dimensión

##### 4.1 Cabecera (los dos estados)

- La etiqueta del instrumento va en texto gris, igual que en §3.
- La línea de fechas y la caja con la lectura de la orientadora no cambian.
- **El conteo pasa a una frase**, con los ceros omitidos y singular y plural correctos:
  - con llegada: «1 dimensión bajó, 1 sigue por trabajar y 3 subieron.», con cada parte coloreada como su cambio;
  - solo partida: «2 dimensiones por trabajar, 2 en camino y 1 fuerte.», con «por trabajar» en ámbar y lo demás en texto normal;
  - si todas están en el mismo grupo: «Las 5 dimensiones están en camino.» o «Las 5 dimensiones subieron.»
- **Se quita la leyenda de chips.** En su lugar va una sola línea gris, que aparece solo si hace falta:
  - con llegada, si alguna afirmación es «Sigue baja»: «Sigue baja: subió, pero sigue entre las respuestas más bajas.»;
  - solo partida, si hay alguna respuesta baja: «• Respuesta baja: una de las {N} opciones menos favorables, con las afirmaciones en sentido contrario ya consideradas.», con el marcador en ámbar y N tomado del parámetro (`PANEL_OPCIONES_BAJAS`).

##### 4.2 Con llegada (`20…`)

- **Cabecera de cada dimensión:** el nombre a la izquierda y, a la derecha, «{zona de partida} → {zona de llegada} · {marcador del cambio}».
- **Tabla:** columnas Afirmación, Partida · fecha, Llegada · fecha y Cambio.
  - Partida en texto gris oscuro y llegada en texto oscuro de peso medio, las dos sin chip.
  - Cambio con su marcador.
  - Sin respuesta: «Sin responder» en gris, con la columna Cambio vacía.
- Una columna de bloques.

##### 4.3 Solo partida (`22…`)

- **Cabecera de cada dimensión:** el nombre a la izquierda y, a la derecha, la zona en texto, con marcador si es Por trabajar.
- **Tabla:** columnas Afirmación y Partida. La respuesta baja va con su marcador («• Bastante de acuerdo»); las demás, en texto oscuro sin chip.
- La rejilla de dos columnas se mantiene.

El orden de dimensiones y filas no cambia en ninguno de los dos estados: es el de color-partida-llegada.

#### 5. Resumen del perfil

La tarjeta «Cómo empezó / De la partida a la llegada» del Resumen sigue el mismo principio:

- los nombres de las dimensiones van en texto, agrupados como hoy;
- cada grupo lleva su título con el color del cambio (con llegada) o de la zona (solo partida: ámbar solo Por trabajar);
- cada dimensión con llegada va como «{nombre}: {zona de partida} → {zona de llegada}», en texto.

Si hoy usa chips, se cambian a texto. Ya no van chips de zona en ninguna vista de la orientadora.

#### 6. Backend

No debería cambiar nada: clasificación, orden, marca de baja y conteos ya salen del servidor (color-partida-llegada). Revisa en el plan estos dos puntos:

- Si a la frase del conteo le falta algún dato (p. ej. el conteo de «sigue por trabajar» en dimensiones), se agrega a la misma lectura sin consultas nuevas.
- Si el bloque de la pestaña Tests ya recibe ordenadas las dimensiones de solo partida (Por trabajar primero), o si hay que agregar ese orden en el servidor.

Se informa el número de consultas, antes y después: debe ser el mismo.

#### 7. Front

- Componente `MarcaTexto` (§2) en `features/counselor/components/perfil/`, con variantes por clase. Sin estilos en línea.
- Se retiran de estas vistas los usos de `ChipPerfil` para zonas, respuestas y cambios. `ChipPerfil` sigue existiendo para lo que no es parte de este ajuste.
- La frase del conteo se arma con una función pequeña y probada (singular, plural, ceros, «todas en el mismo grupo», unión con comas e «y»).
- Tipos, fixtures y pruebas de render actualizados.

#### 8. Pruebas

- **`MarcaTexto`:** cada clase muestra su palabra, su marcador oculto al lector de pantalla y su estilo.
- **Frase del conteo:** todo en un grupo («Las 5…»); uno de cada tipo; ceros omitidos; singular y plural; los dos estados.
- **Tests, con llegada:** tabla ordenada por atención; grupos de afirmaciones con título coloreado y filas sin chips.
- **Tests, solo partida:** sin columna Llegada y con la frase en el subtítulo; Por trabajar primero y con marcador; respuestas bajas con marcador; sin respuestas bajas.
- **Detalle:** cabecera de dimensión en los dos estados; línea de explicación presente y ausente en cada estado; «Sin responder».
- **Resumen:** la tarjeta sin chips en los dos estados.
- **Que no se tocó:** la vista del estudiante sigue con sus chips de zona (prueba de render existente sin cambios).
- **Presupuesto de consultas:** igual al de antes.

#### 9. Fuera de este ajuste

- La vista del estudiante y la del apoderado.
- El cálculo de zonas, la clasificación del cambio y los umbrales.
- Las vistas de resultado de intereses, habilidades sociales e inteligencias.

#### 10. Para decidir en el plan

1. Si la etiqueta del instrumento («Requisito del salón») es un componente compartido y a qué otras tarjetas alcanza el cambio a texto.
2. Si la tarjeta del Resumen usa hoy chips de zona y qué se cambia.
3. Si la frase del conteo o el orden de solo partida necesitan algún dato que hoy no llega.
