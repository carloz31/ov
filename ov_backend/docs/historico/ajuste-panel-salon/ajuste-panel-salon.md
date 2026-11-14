# Ajuste panel-salon · Resumen del salón para la orientadora

Texto de observaciones para `/ajuste panel-salon`, sobre `main`. Define la pantalla **Inicio** del portal de la orientadora (pestañas Seguimiento e Intereses del salón) y las dos listas completas de intereses. Cubre lo que el plan llamaba B16/F11 (capa 1 del panel) y la parte de alertas de B14.

Bocetos: `ov_backend/docs/specs/bocetos/panel-salon/` (`01-seguimiento.png`, `02-intereses.png`, `03-todas-las-areas.png`, `04-todas-las-instituciones.png`). La implementación debe quedar lo más parecida posible; los números y nombres de los bocetos son de ejemplo. Donde este texto y un boceto difieran, manda este texto (ver §8).

## 1. Para quién y para qué

La usuaria es la psicóloga escolar que hace de orientadora. No se dedica solo a esto y no está acostumbrada a leer gráficos. Al abrir el panel de un salón debe poder responder, sin interpretar nada:

1. ¿A quién tengo que buscar y por qué?
2. ¿El test de intereses está completo y es confiable para todos?
3. ¿Por dónde va el grupo y dónde se detiene?
4. ¿Qué quiere estudiar el salón, para pensar talleres, charlas o visitas?

Reglas de presentación que valen para toda la pantalla:

- Toda cifra es **«N de M estudiantes»** o un conteo de estudiantes. Sin porcentajes, promedios ni leyendas de colores que haya que descifrar.
- Todo conteo que señala a personas tiene un botón **Ver** que lleva a los nombres.
- El diario no aparece (ni conteos). Solo la nota «El diario es privado».
- Trato de usted hacia la orientadora no aplica aquí: los textos son descriptivos, sin dirigirse a ella, salvo los subtítulos de los bocetos.

## 2. Principio: nada fijo en el código

Todo lo que la pantalla muestra se genera desde la base de datos. En concreto:

| Qué | De dónde sale |
|---|---|
| Qué alertas existen, su grupo, su orden, sus textos y sus umbrales | Tablas nuevas `grupo_alerta` y `alerta` (§3) |
| Umbrales y cantidades del panel (días, bandas, tamaño del top) | Tabla nueva `parametro` (§3) |
| Nombres de los tramos | `bloque.nombre` |
| Lista de cuestionarios y su etiqueta | `instrumento`, `aplicacion`, `salon_instrumento`, actividades |
| Áreas, carreras, instituciones, tipos | `familia_carrera`, `carrera`, `institucion` |
| Textos de las complicaciones | `opcion_lista` |
| Tipos de interés | Dimensiones del instrumento |

El front no tiene listas, etiquetas de alerta ni umbrales propios: pinta lo que llega. Los únicos textos del front son los títulos y subtítulos de los bloques de la pantalla.

Límite que se acepta: una alerta **de un tipo nuevo** (una condición que ningún evaluador sabe calcular) necesita un evaluador nuevo en código. Una alerta que es variante de un evaluador existente (otro umbral, otro instrumento, otro texto, otro grupo), activarla, desactivarla o reordenarla es solo una fila. Es el mismo patrón de `regla_desbloqueo.evaluador_especial`.

## 3. Modelo de datos (cambio de modelo, sigue `/cambio-modelo`)

Propuesta a aprobar en el plan. Si el repo ya tiene una forma mejor de lo mismo, se usa esa.

**`grupo_alerta`**: `codigo` único, `nombre`, `orden`.

**`alerta`**:

| Columna | Qué es |
|---|---|
| `codigo` | Único |
| `grupo_id` | A qué grupo pertenece |
| `nombre` | Título en el panel |
| `descripcion` | Texto bajo el título; puede ser nulo. Admite `{clave}` de sus parámetros, que resuelve el servidor |
| `evaluador` | Nombre de la función registrada que la calcula |
| `parametros` | JSON `{clave: valor}` con lo que el evaluador necesita |
| `orden` | Dentro de su grupo |
| `activa` | Una alerta inactiva no se calcula ni se muestra |

**`parametro`**: `codigo` único, `valor` (texto; el servidor lo convierte), `descripcion`. Solo para los parámetros nuevos de este ajuste. **No se migran** los de `app/core/parametros.py`.

Las alertas **no se guardan por estudiante**: se calculan al consultar y desaparecen solas cuando la condición deja de cumplirse. No hay «marcar como vista».

Carga: `datos/fijos.py` (son datos fijos de la plataforma, no `DATO DE PRUEBA`), en formato declarativo.

### 3.1 Alertas iniciales

Grupos: `conversar` «Conversar pronto» (orden 1) y `atras` «Se están quedando atrás» (orden 2).

| Código | Grupo | Nombre | Descripción | Evaluador | Parámetros |
|---|---|---|---|---|---|
| `respuesta-sensible` | conversar | Escribió algo que conviene leer | En un registro, Lumi lo derivó a la orientadora en lugar de seguir preguntando. | `respuesta_sensible` | — |
| `seguridad-baja` | conversar | Se sienten poco seguros en sus últimas señales | Sus {senales} últimas señales registradas fueron {nivel_maximo} o menos, sin importar cada cuánto ingresan. | `seguridad_baja` | `senales: 3`, `nivel_maximo: 2` |
| `sin-ingreso` | atras | No ingresan hace {dias} días o más | — | `sin_ingreso` | `dias: 7` |
| `avance-bajo` | atras | Van muy por detrás del salón | {tramos} tramos o más por debajo de la mayoría. | `avance_bajo_salon` | `tramos: 2` |
| `test-por-revisar` | atras | Test de intereses por revisar | Perfil plano o respondido con prisa. | `instrumento_por_revisar` | `instrumento: <código del test de intereses>`, `avisos_velocidad: 2` |
| `familia-pendiente` | atras | Su familia aún no se registra | — | `familia_pendiente` | — |

### 3.2 Evaluadores

Cada evaluador recibe los estudiantes de un salón y sus parámetros, y devuelve los que cumplen. Deben resolverse con consultas por salón, no una por estudiante.

- **`respuesta_sensible`**: tiene al menos una `respuesta_registro` vigente con `sensible = true`.
- **`seguridad_baja`**: tiene al menos `senales` check-ins y los `senales` más recientes (por fecha) son todos ≤ `nivel_maximo`. No mira cuántos días pasaron entre ellos ni desde el último.
- **`sin_ingreso`**: no tiene ningún evento `INGRESO` en los últimos `dias` días. Quien nunca ingresó también cuenta.
- **`avance_bajo_salon`**: el número de su tramo actual es ≤ (mediana del número de tramo actual de su salón) − `tramos`. «Sin empezar» cuenta como tramo 0 y «Terminó» como el último + 1. Siempre se compara contra **su** salón, también en la vista «Todos mis salones».
- **`instrumento_por_revisar`**: en la aplicación del `instrumento` indicado, su resultado vigente tiene `perfil_plano = true`, o su `ritmo_aplicacion.avisos_velocidad` ≥ `avisos_velocidad`. Es la misma definición del estado «Por revisar» de §4.3. Al rehacer el test (el reinicio borra la fila de ritmo y anula el resultado) deja de cumplir.
- **`familia_pendiente`**: no tiene vínculo familiar activo, o su apoderado nunca registró un `INGRESO`. Si el código ya tiene un concepto de «familia registrada», se usa ese y se anota.

### 3.3 Parámetros iniciales

| Código | Valor | Uso |
|---|---|---|
| `PANEL_DIAS_INGRESO_RECIENTE` | 7 | Indicador «Ingresaron esta semana» |
| `PANEL_INSTRUMENTO_PRINCIPAL` | código del test de intereses | Bloque propio de §4.3 e indicador |
| `PANEL_AVISOS_VELOCIDAD_PRISA` | 2 | Estado «Por revisar» por prisa |
| `PANEL_NOMBRES_VISIBLES_ALERTA` | 5 | Hasta cuántos nombres se listan dentro de una alerta |
| `PANEL_DIAS_DETENIDO` | 7 | «Donde más se detienen» |
| `PANEL_MINIMO_DETENIDOS` | 2 | Mínimo de estudiantes para mostrar esa línea |
| `PANEL_SEGURIDAD_BAJA_MAXIMO` | 2 | Banda «Poco seguros»: señal ≤ este valor |
| `PANEL_SEGURIDAD_ALTA_MINIMO` | 4 | Banda «Seguros»: señal ≥ este valor |
| `PANEL_TOP_INTERESES` | 5 | Filas de las tablas de Inicio |
| `PANEL_TOP_COMPLICACIONES` | 5 | Filas de «Lo que podría complicar sus planes» |

## 4. Pestaña Seguimiento (`01-seguimiento.png`)

Cabecera: título «Inicio», salón elegido, número de estudiantes y «datos al <fecha de hoy>»; selector de salón (cada salón asignado y «Todos mis salones») y botón «Ver lista de estudiantes». Debajo, las dos pestañas.

### 4.1 Cuatro indicadores

Cada uno: etiqueta, «N de M», barra simple y una línea de detalle.

| Indicador | N | Línea de detalle |
|---|---|---|
| Ingresaron esta semana | Estudiantes con un `INGRESO` en los últimos `PANEL_DIAS_INGRESO_RECIENTE` días | «X no entran hace 7 días o más» (M − N, con el número del parámetro) |
| Test de intereses listo | Estado «Resultado listo» de §4.3 | «X por revisar · Y sin terminar» (Y = en curso + sin empezar) |
| Con Plan A | Estudiantes con una tarjeta activa de prioridad 1 | «X ya tienen sus tres planes» (tres tarjetas activas) |
| Familias participando | Estudiantes cuyo apoderado vinculado ingresó al menos una vez | «X terminaron su ruta · Y ya conversaron» (ruta del apoderado completa; al menos una conversación marcada como conversada) |

El nombre del segundo indicador sale del nombre del instrumento principal («<nombre> listo»).

### 4.2 A quién buscar

Tarjeta en fondo crema. Subtítulo: «N de M estudiantes tienen al menos un aviso. Cada aviso desaparece solo cuando se resuelve.»

- Los grupos y las alertas se pintan en el orden de la base de datos, cada grupo con su nombre como encabezado.
- Cada alerta: cantidad grande a la izquierda, nombre, descripción si tiene, y botón **Ver**.
- Si la cantidad es ≤ `PANEL_NOMBRES_VISIBLES_ALERTA`, bajo el texto van los nombres como chips (nombre y primera letra del apellido, o como el repo ya abrevie nombres). Si es mayor, solo la cantidad.
- Una alerta con cantidad 0 no se muestra. Un grupo sin alertas visibles no se muestra. Si no hay ninguna: «Ningún estudiante tiene avisos por ahora.»
- Al pie, botón «Ver los N estudiantes con avisos».

### 4.3 Test de intereses (instrumento principal)

Título: nombre del instrumento, con la etiqueta de §4.4. Subtítulo fijo del front: «Es la base de tu informe. Aquí ves quién ya tiene un resultado confiable.» Una barra apilada y cuatro filas, cada una con su cantidad y **Ver**. Cada estudiante está en un solo estado:

| Estado | Definición |
|---|---|
| Resultado listo | Tiene resultado vigente y no está «por revisar» |
| Por revisar | Resultado vigente con `perfil_plano`, o `avisos_velocidad` ≥ `PANEL_AVISOS_VELOCIDAD_PRISA` en ese intento. Detalle: «X perfil plano (todas las respuestas parecidas) · Y respondidos muy rápido (estimado por tiempo)». Si cumple ambas, cuenta como perfil plano |
| En curso | Respondió algo o completó alguna de sus misiones, y aún no tiene resultado vigente (incluye a quien terminó las preguntas y no reveló). Detalle: «Les faltan partes o revelar su resultado» |
| Sin empezar | Nada de lo anterior |

«Respondido muy rápido» no invalida el resultado: solo lo señala.

### 4.4 Otros cuestionarios

Una fila por cada **aplicación** de los demás instrumentos (partida y llegada son dos filas), en el orden del camino y luego la ciudad: nombre, etiqueta y «N de M» con resultado vigente (para partida y llegada, con esa aplicación respondida completa). Sin dimensiones ni resultados agregados.

Etiqueta, por este orden de prioridad:

1. **Requisito del salón**: `salon_instrumento.es_prioritario` para ese salón.
2. **Parte del camino**: sus actividades son requeridas del camino.
3. **Opcional**: el resto.

En «Todos mis salones», la etiqueta 1 se muestra si es requisito en todos los salones; si solo en algunos, «Requisito en algunos salones».

### 4.5 Por dónde va el salón

Subtítulo: «Cuántos estudiantes están hoy en cada tramo del camino.» Una casilla por posición, con la cantidad y el nombre:

- **Sin empezar**: no completó ninguna actividad.
- Una casilla por bloque del camino del estudiante, con `bloque.nombre`: estudiantes cuyo tramo actual es ese bloque. El tramo actual se calcula igual que en `app/services/avance.py` (primer bloque con una requerida pendiente); se reutiliza esa lógica, sin duplicarla.
- **Terminó**: camino completo.

Las casillas con más estudiantes van en un tono más intenso; no hay más codificación.

Debajo, una línea: «**Donde más se detienen:** «<título de la actividad>». N estudiantes llevan más de X días ahí.» con **Ver**. Es la actividad requerida pendiente (la siguiente de su tramo actual) que comparten más estudiantes cuya última actividad completada fue hace `PANEL_DIAS_DETENIDO` días o más. Solo se muestra si N ≥ `PANEL_MINIMO_DETENIDOS`.

### 4.6 Cómo se sienten con su decisión

Subtítulo: «La última señal de seguridad que registró cada estudiante (escala de 1 a 5).» Cuatro filas con cantidad, según el **último** check-in de cada uno, sin ventana de fechas:

- **Poco seguros** (≤ `PANEL_SEGURIDAD_BAJA_MAXIMO`), con **Ver**.
- **Intermedio** (entre ambos).
- **Seguros** (≥ `PANEL_SEGURIDAD_ALTA_MINIMO`).
- **Aún sin señales**.

El texto entre paréntesis de cada banda («1 o 2», «3», «4 o 5») se arma con los parámetros. Al pie: «El diario es privado: aquí no se muestra nada de lo que escriben.»

## 5. Pestaña Intereses del salón (`02-intereses.png`)

Línea inicial: «Lo que el salón está considerando hoy: **N estudiantes ya tienen planes** y M guardaron favoritos. Todos los números cuentan estudiantes, no planes. «Solo en favoritos» son estudiantes que la guardaron pero todavía no la tienen en un plan.»

**Regla general de conteo:** siempre estudiantes distintos. Un estudiante con la misma institución en sus tres planes cuenta una vez. Solo cuentan tarjetas activas y favoritos de tipo carrera o institución.

### 5.1 Áreas que más interesan

Un área es una `familia_carrera`. Columnas:

| Columna | Definición |
|---|---|
| Área y carreras | Nombre de la familia; debajo, sus carreras con plan y cuántos estudiantes cada una («Enfermería (4) · Obstetricia (1)»). Sin planes: «Sin planes todavía» |
| En sus planes | Estudiantes con al menos una tarjeta activa de una carrera de la familia |
| Como Plan A | De ellos, los que la tienen con prioridad 1 |
| Solo en favoritos | Estudiantes con una carrera de la familia en favoritos y **ninguna** tarjeta activa en esa familia |
| (Ver) | Los estudiantes de la fila |

En Inicio se muestran las `PANEL_TOP_INTERESES` primeras y, al pie, «Las 5 primeras de N, según la columna elegida.» y el botón «Ver todas las áreas».

### 5.2 Instituciones que más consideran

Igual, por `institucion`: nombre; debajo, tipo y gestión («Universidad pública», «Instituto privado», «Fuerzas Armadas y Policía»). En Inicio, columnas **En sus planes** (tarjeta activa con esa institución) y **Solo en favoritos**. Al pie: «Las 5 primeras de N. X estudiantes con Plan A aún no eligen institución.» y «Ver todas las instituciones».

### 5.3 Orden por cabecera

- Cada cabecera es un botón. Pulsarla ordena por esa columna (números de mayor a menor; nombre de la A a la Z); pulsarla otra vez invierte. La activa muestra la flecha.
- **El orden lo aplica el servidor sobre toda la lista** y recién después se cortan las primeras. Así, al ordenar por «Solo en favoritos», el top puede ser otro.
- Orden inicial: «En sus planes» descendente. Desempate: «Como Plan A», luego nombre.

### 5.4 Listas completas (`03-…png`, `04-…png`)

Dos vistas secundarias con ruta propia, una para áreas y otra para instituciones:

- Enlace «← Volver a Intereses del salón», que regresa a Inicio con la pestaña Intereses y el mismo salón.
- Buscador por nombre y un filtro: en áreas, tipo de formación de la carrera; en instituciones, tipo de institución. Las opciones del filtro salen de los valores presentes.
- La tabla completa, con las mismas cabeceras ordenables y dos columnas más: en instituciones, **Como Plan A**; en ambas, **Total interesados** (En sus planes + Solo en favoritos).
- Solo aparecen filas con al menos un estudiante interesado. Paginada como las demás listas del portal si supera el tamaño de página del repo.
- Al entrar, hereda el orden que tenía la tabla de Inicio.

### 5.5 Qué tipo de formación buscan

Subtítulo: «Según el Plan A de N estudiantes.» Barra apilada y una fila por `carrera.tipo` del Plan A (Universitaria, Técnica, Fuerzas Armadas o Policía) con su cantidad. Bajo cada fila, el desglose por la institución elegida en ese plan: «3 en universidad pública · 3 en privada · 1 sin institución».

### 5.6 Lo que podría complicar sus planes

Subtítulo: «Lo que marcaron en su Plan A. Sirve para elegir temas de taller.» Las `PANEL_TOP_COMPLICACIONES` complicaciones más marcadas en las tarjetas Plan A, con el texto de su `opcion_lista` y cuántos estudiantes. Las escritas a mano (`texto_otro`) se agrupan en una sola fila «Otra (escrita por el estudiante)», al final, si hay alguna.

### 5.7 Planes frente al test de intereses

Subtítulo: «De los N estudiantes que tienen Plan A y resultado del test.» (resultado vigente y no plano del instrumento principal).

- **Su Plan A está entre lo sugerido por el test**: la familia de la carrera del Plan A está entre las familias recomendadas del estudiante. Se usa el mismo cálculo de familias recomendadas que ya existe (`_leer_familias_recomendadas` en `app/services/referencias.py`), sin un criterio nuevo.
- **Su Plan A no aparece en lo sugerido**, con **Ver** y la nota «No es un error: es un tema para conversar.»

Debajo, «Intereses más frecuentes del salón»: cuántos estudiantes tienen cada tipo como primero de su código de interés, de mayor a menor, y «de N resultados listos».

## 6. El botón Ver

Cada **Ver** abre un panel lateral con título (el de la fila) y la lista de estudiantes que cumplen: nombre y salón. Es una sola lectura genérica del servidor que recibe qué conjunto se pide (una alerta, un estado del test, un tramo, la banda de seguridad baja, un área, una institución, los que tienen algún aviso, etc.).

En este ajuste los nombres **no enlazan** al perfil del estudiante, porque el perfil en modo api aún no existe; ese enlace y «Ver lista de estudiantes» se conectan en el ajuste de la vista de estudiantes. Si hoy esa ruta no funciona en api, el botón de la cabecera se deja visible y deshabilitado.

## 7. Backend y front

**Backend** (rutas y nombres según las convenciones del repo; lo que importa es el contenido):

- Lectura del resumen de seguimiento de un salón o de todos (§4), en una sola respuesta.
- Lectura del resumen de intereses (§5), con parámetro de orden por tabla.
- Lecturas paginadas de la lista completa de áreas y de instituciones, con orden, búsqueda y filtro.
- Lectura de los estudiantes de un conjunto (§6).
- Todas exigen sesión de orientadora y que el salón sea suyo (política existente de `acceso`); un salón ajeno responde como hoy responde un recurso ajeno. Nunca devuelven contenido del diario ni texto de registros.
- Pruebas: cada evaluador con sus bordes (2 señales bajas no alertan y 3 sí; una señal alta en medio corta la racha; cambiar el parámetro en la BD cambia el resultado sin tocar código; una alerta inactiva no aparece; una fila nueva de `alerta` con un evaluador existente aparece sola), los cuatro estados del test, la regla de estudiantes distintos, el orden sobre la lista completa antes de cortar, y el acceso por salón.
- Datos: lo fijo en `fijos.py`. En `ruta`, solo lo mínimo para las pruebas, marcado `DATO DE PRUEBA`.

**Front:**

- Solo en modo api. El modo local sigue congelado con su panel actual.
- Estado en `store/servidor/` siguiendo las reglas de datos del servidor; se revalida al abrir la vista y al cambiar de salón. Pantalla de carga del portal y manejo de error como en el resto.
- Se reemplazan, en api, los bloques actuales del dashboard (`features/counselor/components/dashboard/`) por los de §4 y §5. Los componentes que dejen de usarse en api se conservan si el modo local los usa.
- El selector de salón y la pestaña activa se conservan en la URL, como hoy.

## 8. Diferencias aceptadas con los bocetos

- La alerta «Test de intereses por revisar» lleva la descripción fija de §3.1; el desglose «1 perfil plano · 2 con prisa» va solo en el bloque del test.
- La etiqueta «Cierra el camino» de «Mi punto de llegada» pasa a «Parte del camino» (§4.4).
- El ítem del menú «Configuración del salón» no se toca en este ajuste: el menú queda como está.
- Nombres de tramos, complicaciones, áreas e instituciones: los de la base de datos.

## 9. Fuera de este ajuste

- Lista de estudiantes y perfil individual en api.
- Configuración del salón (cuestionarios requisito, registros destacados, visibilidad al apoderado).
- Informe de viaje y temas para conversar.
- Alertas de otros tipos y parámetros por salón (hoy son globales).
- Conteos del diario (HU-091): salen del resumen; queda por decidir si la HU se retira o pasa a otra vista.

## 10. Para decidir en el plan

1. Forma de `alerta.parametros` (JSON, como se propone, o tabla hija) y de la tabla `parametro`.
2. Cómo se identifica hoy una «familia registrada» y una «conversación conversada», para no crear un criterio paralelo.
3. Si `docs/specs/` tiene otra spec en curso, este ajuste va en su propia spec y no como fase de aquella.

## Plan aprobado


### Contexto

Hoy el Inicio de la orientadora (`pages/counselor/CounselorDashboardView.tsx` + `features/counselor/components/dashboard/*`, hook `useCounselorDashboard.ts`) es 100 % demo en ambos modos: lee `data/demo/studentProfiles` y `classroomSummary`. El backend no tiene ninguna lectura de un salón para la orientadora (solo publicaciones). El ajuste construye, solo en modo api, el panel de los bocetos `docs/specs/bocetos/panel-salon/01..04` con todo lo configurable en la base (alertas, grupos, parámetros) y lecturas por salón en lote.

**Spec:** hay otra en curso (`ajuste-coherencia-apoderado.md`), así que, como pide §10.3 del texto, este plan va en su propia spec `ov_backend/docs/specs/ajuste-panel-salon.md` (texto de observaciones + este plan), y sus decisiones en una sección `## Ajuste panel-salon` de `decisiones.md`.
**Rama:** la sesión obliga a trabajar en `claude/stoic-darwin-pb0llg` (equivale a `ajuste/panel-salon`, desde `main`). Commits `Ajuste panel-salon · F<n>: …`; el push a esa rama lo exige el entorno.

### Qué cambia (hoy → pasará a)

- **Inicio en api:** hoy demo → `PanelSalonView` nuevo con datos del servidor. La ruta `home` pasa a `<SegunModo api={PanelSalonView} local={CounselorDashboardView}/>` (`routes/AppRoutes.tsx`). Rutas nuevas solo api: `home/areas` y `home/instituciones` (en local redirigen a `home`).
- **`app/services/avance.py`:** el cálculo del tramo dentro de `avance_estudiante` (líneas 44-56) se extrae a una función pura `tramos_del_camino(camino, completadas)`. `avance_estudiante` la llama igual que antes y el panel la llama por lotes, con las completadas del salón leídas en una sola consulta. No hay lógica duplicada.
- **Familias recomendadas:** `_leer_familias_recomendadas` (`services/referencias.py:196`) va por cuenta (`resultado_intereses` → `representar_resultado`). Se extrae de `instrumentos/consultas.ocupaciones_y_familias` el paso que va de las coincidencias guardadas a `recomendar_familias` (ya puro, `calculo.py:268`) y se expone como `familias_recomendadas_por_cuenta(sesion, resultados)` para leerlo por lotes. `_leer_familias_recomendadas` no cambia de resultado y lo cubren sus pruebas existentes.
- **Código de interés por lotes:** se usa `calcular_codigo_interes` (`calculo.py:287`) sobre `resultado_dimension` de los resultados vigentes del salón, con el mismo criterio que `_letra_principal_resultado` (`motor/evaluadores.py:72`): primera letra y sin perfil plano.

### Qué no cambia

- El modo local: conserva `CounselorDashboardView` y sus componentes demo, y el menú queda igual.
- `GET /cuentas/{c}/avance` y la respuesta de `referencias` dan exactamente lo mismo.
- `app/core/parametros.py` no se migra a la tabla nueva (`MAX_AVISOS_VELOCIDAD`, `INSTRUMENTO_INTERESES` siguen ahí).
- Los evaluadores del motor (`EVALUADORES`, `regla_desbloqueo.evaluador_especial`): el panel tiene su propio registro con el mismo patrón y no lo unifica.
- Publicaciones, la lista de estudiantes y el perfil del estudiante: «Ver lista de estudiantes» queda visible y deshabilitado en api, y los nombres del panel lateral no enlazan.

### Modelo de datos (decisión de diseño a aprobar · sigue `/cambio-modelo`)

`app/models/panel.py`, migración `0056_panel_salon`. Las tres tablas son de **catálogo**: se clasifican en `tests/unit/arquitectura/test_clasificacion_tablas.py` y no entran en `TABLAS_DE_ESTADO`.

- `grupo_alerta`: `id`, `codigo` único, `nombre`, `orden`.
- `alerta`: `id`, `codigo` único, `grupo_id` (FK), `nombre`, `descripcion` (nula), `evaluador` (str), `parametros` (`sa.JSON`, `{clave: valor}`, por defecto `{}`), `orden`, `activa` (bool, `server_default=sa.true()`).
- `parametro`: `id`, `codigo` único, `valor` (texto), `descripcion`.

**§10.1:** `alerta.parametros` va como JSON y no como tabla hija, porque es lo más simple y SQLAlchemy lo trata igual en SQLite y en PG. `parametro.valor` se guarda como texto y lo convierte `leer_parametro_entero/texto` (`services/panel/parametros.py`). Si falta un parámetro, la lectura falla con 500 (dato fijo ausente).

**Datos:**
- `datos/fijos.py` recibe las tuplas declarativas `GRUPOS_ALERTA`, `ALERTAS` y `PARAMETROS_PANEL` con los valores de §3.1 y §3.3; `instrumento` y `PANEL_INSTRUMENTO_PRINCIPAL` valen `TEST-RIASEC`. Las carga `_cargar_panel` en `fijos.cargar`. Como `datos` no importa `app.services`, una prueba de `tests/integration/datos` verifica que cada alerta de `fijos.py` nombra un evaluador registrado y trae todas las claves que ese evaluador declara.
- `datos/ruta.py` no cambia: las pruebas crean su estado con acciones y `sesion`.

### Backend

Dominio nuevo `panel`, que nace como carpeta: `app/services/panel/` con `comun.py` (salones y estudiantes, parámetros, tramo por lotes, estado del test por lotes), `alertas.py` (registro `EVALUADORES_ALERTA` y los seis evaluadores), `seguimiento.py`, `intereses.py` y `estudiantes.py` (conjuntos para «Ver»). Además `app/schemas/panel.py` y `app/api/panel.py`.

**Acceso:** son rutas `/cuentas/{c}/…` con la política por defecto (`es_propia`). El servicio reutiliza `exigir_orientadora` (`services/investigaciones/acciones.py:314`): otro rol responde 404. `salon` es el código de uno de sus salones, o se omite para «Todos mis salones»; un salón que no es suyo responde 404 «Salón no encontrado», como hoy un recurso ajeno. Ninguna respuesta lleva texto del diario ni de registros.

| Ruta | Respuesta |
|---|---|
| `GET /cuentas/{c}/panel/seguimiento?salon=` | `SeguimientoPanel`: `fecha`, `salon` (código y nombre, o nulo), `total_estudiantes`, `indicadores` (4, cada uno con `n` y los números de su detalle, incluidos `dias_ingreso`), `avisos` (`con_avisos` y `grupos[]` con `codigo`, `nombre` y `alertas[]`: `codigo`, `nombre`, `descripcion` resuelta, `cantidad` y `nombres` si cantidad ≤ `PANEL_NOMBRES_VISIBLES_ALERTA`; solo cantidades > 0), `test` (`instrumento`, `nombre`, `etiqueta` y los estados `LISTO`, `POR_REVISAR` con `perfil_plano`/`prisa`, `EN_CURSO` y `SIN_EMPEZAR`), `cuestionarios[]` (`aplicacion`, `nombre`, `etiqueta` REQUISITO/REQUISITO_ALGUNOS/CAMINO/OPCIONAL, `n`), `tramos[]` (`codigo`, `nombre` y `cantidad`, desde SIN_EMPEZAR hasta TERMINO), `detenidos` (`actividad`, `titulo`, `cantidad` y `dias`, o nulo) y `seguridad` (bandas con `codigo`, `desde`, `hasta` y `cantidad`, más `sin_senales`) |
| `GET /cuentas/{c}/panel/intereses?salon=&orden_areas=&orden_instituciones=` | `InteresesPanel`: `con_planes`, `con_favoritos`; `areas` y `instituciones` (`filas` del top ya ordenadas, `total`, y en instituciones `plan_a_sin_institucion`); `formacion` (`con_plan_a`, filas por `carrera.tipo` con desglose `{tipo, gestion, cantidad}` y sin institución); `complicaciones` (top y fila «otra»); `frente_test` (`base`, `coinciden`, `no_coinciden`, `codigos[]` con letra, nombre de la dimensión y cantidad, y `resultados_listos`) |
| `GET /cuentas/{c}/panel/areas?salon=&orden=&buscar=&tipo=&limite=&desde=` | Página `{total, items, tipos}` (`tipos`: los valores presentes para el filtro) |
| `GET /cuentas/{c}/panel/instituciones?…` (mismos parámetros) | Igual, con `tipo` de institución |
| `GET /cuentas/{c}/panel/estudiantes?salon=&conjunto=&valor=` | `list[EstudiantePanel]` (`codigo`, `nombre` y `salon`), por nombre |

- **`orden`** tiene la forma `<columna>` o `-<columna>` (`nombre`, `en_planes`, `plan_a`, `solo_favoritos`, `total`) y por defecto es `-en_planes`. Desempata por plan A descendente y después por nombre. El servidor ordena toda la lista y recién después corta el top (`PANEL_TOP_INTERESES`) o la página (`limite` 20, tope 50, como el catálogo).
- **`conjunto`**: `avisos`, `alerta` (valor = código), `test` (estado), `tramo` (código, `SIN_EMPEZAR` o `TERMINO`), `detenidos`, `seguridad_baja`, `area` (familia), `institucion` y `plan_fuera_test`. Un conjunto o valor desconocido responde 422.
- **Evaluadores:** cada uno recibe `(sesion, estudiantes del salón, parametros)` y devuelve un `set[int]`. Se resuelven con consultas agrupadas sobre todo el salón, sin bucles con consultas. Las alertas se leen activas, por `grupo.orden` y `orden`. **(Obs. 1)** Una alerta activa cuyo evaluador no está en el registro se omite y se escribe un aviso en el log (`logging`), sin hacer fallar la lectura. **(Obs. 2)** Cada evaluador se registra con las claves que usa y su valor por defecto (`EvaluadorAlerta(funcion, defectos={'senales': 3, 'nivel_maximo': 2})`), y a una fila que no trae una clave se le aplica el defecto. **(Obs. 3)** Los `{clave}` se resuelven en `nombre` y en `descripcion` con los parámetros ya completados («No ingresan hace {dias} días o más»). **(Obs. 5)** El estado «Por revisar» del bloque del test y el evaluador `instrumento_por_revisar` usan una sola función, `por_revisar(sesion, estudiantes, aplicacion, avisos_velocidad) -> dict[cuenta_id, 'PLANO'|'PRISA']`, en `comun.py`: el bloque le pasa `PANEL_AVISOS_VELOCIDAD_PRISA` y el evaluador su parámetro `avisos_velocidad`.
- **(Obs. 4) Fechas:** todo cálculo por días (`sin_ingreso`, «Ingresaron esta semana», «Donde más se detienen») y la `fecha` de «datos al …» parten de `Ahora`/`obtener_ahora` (`app/dependencies.py:101`), la misma hora de Lima sin zona con la que la ruta de check-ins arma el `hoy` que pasa a `check_ins_cuenta`. La ruta la inyecta y el servicio recibe `ahora`, de modo que las pruebas la pueden fijar. No se usa UTC.
- **Definiciones de §4 y §5** tal cual el texto. Además:
  - «Familia registrada / participando» es un vínculo activo cuyo apoderado tiene `INGRESO` (hoy no existe ese concepto).
  - «Terminó su ruta» usa el mismo criterio que `_diploma` (`services/familia.py:42`), extraído para leerlo por lotes.
  - «Conversaron» es tener `conversacion_vinculo.conversada_en` no nulo.
  - «Detenidos» solo cuenta a quien completó alguna actividad.
- **Pruebas** (`tests/integration/panel/` y, para los evaluadores puros, `tests/unit/panel/`):
  - Bordes de cada evaluador: 2 señales bajas no alertan y 3 sí; una alta en medio corta la racha; con un parámetro de la BD cambiado cambia el resultado; una alerta inactiva no aparece; una fila nueva con un evaluador existente aparece sola.
  - Los cuatro estados del test, incluido rehacerlo, y perfil plano más prisa contado como plano.
  - Estudiantes distintos (la misma institución en tres planes cuenta una vez).
  - Orden sobre toda la lista antes de cortar.
  - Acceso: salón ajeno, otro rol y «Todos mis salones».
  - Presupuesto de consultas: pocas contra muchas cuentas, constante.
  - Contrato y fixtures (`exportar_fixtures_front.py` exporta `ruta-panel-seguimiento`, `ruta-panel-intereses`, `ruta-panel-areas`, `ruta-panel-instituciones` y `ruta-panel-estudiantes` de `ori-carmen`, con algo de estado sembrado en el exportador).

### Frontend (solo api)

- **Datos:**
  - `types/servidorPanel.ts` (aparte para no pasar de 400 líneas en `servidor.ts`).
  - `services/api/panel.ts`.
  - `store/servidor/panel.ts`, con una caché por (salón, orden), revalidación al montar y al cambiar de salón, siguiendo el patrón de `entrevistas.ts`; las listas completas se paginan con «Mostrar más».
  - `lib/servidor/adaptadoresPanel.ts`, con funciones puras: nombre corto, texto de las bandas («1 o 2», «3», «4 o 5»), «Universidad pública» a partir de los nombres de `adaptadoresCatalogo.ts`, fecha «viernes 13 de noviembre», etiquetas de los cuestionarios y orden para la URL.
- **Vista:**
  - `pages/counselor/PanelSalonView.tsx`, `PanelAreasView.tsx` y `PanelInstitucionesView.tsx`.
  - El hook `features/counselor/hooks/usePanelSalon.ts`, con el salón de `datosSesion().salones` más «Todos mis salones», `?salon=`, `?section=tracking|interests` y `?orden_areas` / `?orden_instituciones` en la URL; las listas heredan el orden por la URL.
  - Los componentes van en `features/counselor/components/panel/`:
    - pestaña Seguimiento: `IndicadoresPanel`, `AQuienBuscar`, `BloqueTest`, `OtrosCuestionarios`, `PorDondeVa` y `ComoSeSienten`;
    - pestaña Intereses: `TablaInteres` (cabeceras ordenables, reutilizada en Inicio y en las listas completas), `TipoFormacion`, `Complicaciones` y `PlanesFrenteTest`;
    - comunes: `PanelVerEstudiantes` (sobre `components/ui/Sheet`).
  - Se reutilizan `StaffEntityHeader`, `Tabs`, `Card`, `Progress`, `SegmentBar`/`StateBar`, `PantallaCargaPortal` y `Skeleton`.
- **Textos y orden:** los textos fijos del front son solo títulos y subtítulos de bloque; todo lo demás llega del servidor. **(Obs. 6 y 8)** El trato hacia la orientadora es de usted en todo el panel, también en los subtítulos que en el boceto tutean: «Es la base de su informe. Aquí ve quién ya tiene un resultado confiable.»
- **Pruebas:** en `tests/servidor/panel/`, el contrato del store (peticiones y revalidación al cambiar de salón), el render de las dos pestañas con los fixtures, el orden y la herencia de orden, el panel «Ver» y que en local siga la vista actual. En `ov_frontend/AGENTS.md`, la fila de impacto de `features/counselor/` suma `tests/servidor/panel`.

### Fases

1. **F1 · Modelo y datos:** `models/panel.py`, migración 0056, tuplas en `fijos.py` con su carga, clasificación de las tablas, `docs/sistema/panel.md` nuevo (registrado en la tabla de `ov_backend/AGENTS.md`) y prueba de que todo evaluador cargado existe. Pruebas: `migraciones`, `datos`, `unit/arquitectura` y `escenarios`.
2. **F2 · Backend Seguimiento y «Ver»:** extraer `tramos_del_camino`; `comun.py`, `alertas.py`, `seguimiento.py`, `estudiantes.py`, la API y las pruebas. Pruebas: `panel`, `avance`/`actividades`, `acceso` y `escenarios`.
3. **F3 · Backend Intereses y listas:** familias recomendadas por lotes, `intereses.py`, áreas e instituciones, contrato, fixtures exportados e `integracion.md`. Pruebas: `panel`, `referencias`, `instrumentos` y `contrato`.
4. **F4 · Front datos y Seguimiento:** tipos, API, store, adaptadores, rutas, cabecera, pestaña Seguimiento y panel «Ver». Pruebas: `test:servidor` y `tests/local/portales`.
5. **F5 · Front Intereses y listas completas.** Pruebas: igual que F4.
6. **F6 · Cierre:** `decisiones.md`; **(Obs. 7)** una nota en `docs/plan-iteraciones.md` de que la capa 1 del panel (B16/F11) y las alertas de B14 quedan cubiertas por este ajuste; documentos vigentes y suites completas de ambos lados (`pytest -n auto`, `npm test`, `build`, `lint` y `check:estructura`), y, si el entorno lo permite, revisión visual con Playwright contra los bocetos.

### Decisiones que tomo (se anotan en `decisiones.md`; corríjanme si no)

- **§10.2:** no existe ningún concepto de «familia registrada». Se define como vínculo activo más un `INGRESO` del apoderado, y «conversada» como `conversada_en` no nulo.
- **Nombre corto:** `cuenta.nombre` es un solo campo. Se muestra la primera palabra más la inicial de la segunda («Camila R.»), o el nombre entero si es una sola palabra (como «Ana» en `ruta`).
- **Filtro por tipo de formación en áreas:** con el filtro, cada familia cuenta solo sus carreras de ese tipo.
- **Etiquetas de tipo y gestión:** los textos («Universidad pública», «Técnica») los arma el front con los nombres que ya usa el catálogo (`adaptadoresCatalogo.ts`); el servidor manda los códigos de la BD.

### Verificación

- Backend: subagente `pruebas` por fase, con las carpetas de arriba; al cierre, `uv run pytest -n auto -q` y `uv run alembic heads` con un solo head.
- Front: `npm run test:servidor`, `npm test`, `npm run build`, `npm run lint` y `npm run check:estructura`.
- Manual: cargar `ruta`, levantar el backend y el front en api e ingresar como `ori-carmen`; revisar las dos pestañas, el «Ver», el cambio de salón y las listas completas contra los bocetos (captura con Playwright).
