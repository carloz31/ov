# Panel del salón (orientadora)

Inicio del portal de la orientadora: pestañas Seguimiento e Intereses del salón, las listas completas de áreas e instituciones y el panel lateral «Ver». Solo lo lee la orientadora, sobre sus salones; ninguna respuesta lleva texto del diario ni de registros.

## Configuración en la base

Todo lo que el panel decide sale de tablas de catálogo que llena `datos/fijos.py`:

| Tabla | Qué guarda |
|---|---|
| `grupo_alerta` | `codigo`, `nombre`, `orden` y `en_inicio` de cada grupo de avisos («Conversar pronto», «Se están quedando atrás»; «Para conversar», con `en_inicio = false`, solo aparece en el perfil del estudiante). |
| `alerta` | `codigo`, `grupo_id`, `nombre`, `descripcion` (nula), `evaluador` (nombre de la función registrada que la calcula), `parametros` (JSON `{clave: valor}`), `orden` dentro del grupo y `activa`; para el perfil de un estudiante, `nombre_perfil` (nulo = `nombre`), `descripcion_perfil` y `destino` (`TESTS`, `PLANES`, `RESPUESTAS`, `AVANCE` o nulo). |
| `nota_orientadora` | Estado: notas privadas de una orientadora sobre un estudiante (`texto`, `creada_en`, `actualizada_en`). |
| `parametro` | `codigo`, `valor` (texto; el servidor lo convierte) y `descripcion`. Solo los umbrales y cantidades del panel (`PANEL_*`); los de `app/core/parametros.py` siguen allí. |

- Las alertas no se guardan por estudiante: se calculan al consultar y desaparecen solas cuando la condición deja de cumplirse.
- Una alerta inactiva no se calcula ni se muestra. Una alerta que es variante de un evaluador existente (otro umbral, otro instrumento, otro texto, otro grupo) es solo una fila; un tipo nuevo de condición necesita un evaluador nuevo en código.

- **Temas «Para conversar»** (`app/services/panel/temas.py`, mismo registro `EVALUADORES_ALERTA`): `plan_idea_ajena` (`origenes`, `textos_origen`), `plan_conoce_poco` (`minimo_no`; preguntas con la lista `CONOCIMIENTO_ORIENTADORA`), `plan_complicaciones`, `plan_fuera_de_areas` (el criterio de «Planes frente al test») y `dimension_por_trabajar` (la medición más reciente de partida y llegada, `textos_momento`). Las zonas de partida y llegada sin exigir las dos están en `app/services/panel/autopercepcion.py`.

## Alcance y acceso

Todas las lecturas son `GET /cuentas/{c}/panel/...` de la propia orientadora (política por defecto) y reciben `salon` (código de uno de sus salones) o nada («Todos mis salones»). Otro rol responde 404 (`exigir_orientadora`); un salón que no es suyo, 404 «Salón no encontrado». Los días se cuentan por fecha de calendario de Lima (`obtener_ahora`, la misma hora del check-in). Todo se lee por lotes (`app/services/panel/comun.py`, `Lecturas`): el número de consultas no crece con el salón.

| Ruta | Respuesta |
|---|---|
| `/panel/seguimiento` | `SeguimientoPanel`: `fecha`, `salon`, `total_estudiantes`, `indicadores`, `avisos` (grupos y alertas con cantidad > 0, con `nombres` si caben en `PANEL_NOMBRES_VISIBLES_ALERTA`), `test` (instrumento principal: listo, por revisar con perfil plano y prisa, en curso, sin empezar, y su etiqueta), `cuestionarios` (una fila por aplicación de los demás instrumentos, en el orden del camino y luego la ciudad, con etiqueta REQUISITO, REQUISITO_ALGUNOS, CAMINO u OPCIONAL), `tramos` (SIN_EMPEZAR, cada bloque del camino, TERMINO), `detenidos` y `seguridad` (bandas con `desde`/`hasta` de los parámetros y `sin_senales`). |
| `/panel/intereses?orden_areas=&orden_instituciones=` | `InteresesPanel`: `con_planes`, `con_favoritos`, el top de `areas` e `instituciones` (con `total` y `plan_a_sin_institucion`), `formacion`, `complicaciones` y `frente_test`. |
| `/panel/areas`, `/panel/instituciones` (`orden`, `buscar`, `tipo`, `limite` 20 hasta 50, `desde`) | Página `{total, items, tipos}` de las filas con algún interesado; `tipos`, los presentes para el filtro. |
| `/panel/estudiantes?conjunto=&valor=` | `list[EstudiantePanel]` (`codigo`, `nombre`, `salon`) de un conjunto: `avisos`, `alerta`, `test`, `tramo`, `detenidos`, `seguridad_baja`, `area`, `institucion` o `plan_fuera_test`. Desconocido: 422. |

Ninguna respuesta lleva texto del diario ni de registros.

### Lista y perfil del estudiante (ajuste panel-estudiantes)

Todas las rutas del perfil pasan por `perfil_acceso.estudiante_de_orientadora` (orientadora y `es_de_su_salon`; si no, 404 «Estudiante no encontrado»). Cada vista pide solo lo que muestra.

| Ruta | Respuesta |
|---|---|
| `/panel/lista-estudiantes?salon&buscar&aviso&test&acceso&orden&limite&desde` | `PaginaEstudiantes`: `accesos` (todos, con avisos, los grupos del Inicio de orden 1, sin avisos), `avisos` del filtro e `items` con solo las columnas. Orden por defecto: aviso más importante (grupo y alerta), cantidad de avisos y nombre; `limite` por defecto `PANEL_FILAS_ESTUDIANTES`. |
| `/panel/estudiantes/{e}` | `PerfilEstudiante`: cabecera y Resumen (avisos con textos de perfil, temas, intereses, planes, partida, `respuestas` sobre los destacados del salón o, sin destacados, los requeridos, y notas). |
| `/panel/estudiantes/{e}/tests`, `…/tests/partida-llegada`, `…/tests/{aplicacion}/resultado` | Test de intereses, partida y llegada (zonas y afirmaciones agrupadas; nunca puntajes), otros cuestionarios; todas las afirmaciones; resultado completo con textos de orientadora (partida y llegada no: 404). |
| `/panel/estudiantes/{e}/planes`, `…/planes/{prioridad}` | «De un vistazo» y «Antes de sus planes»; plan completo (secciones bloqueadas sin contenido, sin sugerencias). |
| `/panel/estudiantes/{e}/respuestas`, `…/respuestas/{actividad}` | Registros sin ítems (salvo «Para leer primero»); ítems de un registro con los valores con que respondió. |
| `/panel/estudiantes/{e}/avance` | Camino, señales (`PANEL_SENALES_PERFIL`), conteo del diario y familia, sin cartas. |
| `POST /acciones/escribir-nota`, `editar-nota`, `borrar-nota` | Notas privadas de la orientadora (`numero` por orientadora; tope `PANEL_MAXIMO_CARACTERES_NOTA`; sin eventos). |

- Afirmaciones: una respuesta es «baja» si su puntaje con el inverso aplicado está entre las `PANEL_OPCIONES_BAJAS` opciones inferiores de su escala. Solo partida: las bajas. Con llegada: bajaron, siguen bajas y mejoraron, hasta `PANEL_AFIRMACIONES_POR_GRUPO` por grupo, por tamaño del cambio.
- Respuestas: etiquetas `REQUIERE_ATENCION` (`sensible`), `SIN_CONTENIDO` (`tipo_final` vacío o fuera de tema) y `AUN_NO_LO_SABE` (estado ABIERTO). Los ecos y preguntas salen de `valores_contexto`; con `eco_cambiado`, el ítem trae también los de hoy; sin valores guardados, se muestran los de hoy marcados como tales. Las piezas guardan su `origen` y `grupo` desde este ajuste.
- Estudiantes de ejemplo: `scripts/sembrar_panel_ejemplo.py --desarrollo` (ocho casos `est-panel-*` en 5A, sobre `contenido`); el exportador lo corre en una base temporal y exporta `contenido-panel-*` de los casos 1, 5 y 7.

## Definiciones

- **Alertas** (`app/services/panel/alertas.py`): cada evaluador recibe las lecturas del alcance y los parámetros de la fila (completados con sus defectos) y devuelve, por estudiante que cumple, los datos para sus textos de perfil; `{clave}` se resuelve en `nombre` y `descripcion` con los parámetros y en `nombre_perfil` y `descripcion_perfil` con los datos del estudiante y los parámetros. El Inicio y «Ver» solo calculan los grupos con `en_inicio`. Los textos que dependen de un código (motivo de «Por revisar», de familia pendiente, nombres de «Sin empezar»/«Terminó», «nunca») están en los `parametros` de la fila. Una alerta activa con un evaluador desconocido se omite y se avisa en el log. Evaluadores: `respuesta_sensible`, `seguridad_baja` (los `senales` check-ins más recientes ≤ `nivel_maximo`, sin mirar fechas), `sin_ingreso` (sin INGRESO hace `dias` días o más; nunca ingresó también), `avance_bajo_salon` (tramo ≤ mediana de su propio salón − `tramos`), `instrumento_por_revisar` y `familia_pendiente`.
- **Estado del test:** «Por revisar» (`comun.por_revisar`, compartido con la alerta) es resultado vigente con perfil plano o con `avisos_velocidad` ≥ el umbral en ese intento (el bloque usa `PANEL_AVISOS_VELOCIDAD_PRISA`); plano y prisa cuenta como plano. «Listo»: vigente y no por revisar. «En curso»: respondió algún ítem o completó alguna actividad de sus aplicaciones. Rehacer el test vuelve a «Sin empezar».
- **Camino:** el tramo actual es el de `avance.tramos_del_camino`; «Sin empezar» es no haber completado ninguna actividad. «Donde más se detienen» es la siguiente requerida pendiente que comparten más estudiantes cuyo último `COMPLETA_ACTIVIDAD` fue hace `PANEL_DIAS_DETENIDO` días o más (solo si son al menos `PANEL_MINIMO_DETENIDOS`).
- **Familia:** participa si tiene vínculo activo con algún apoderado con INGRESO; «terminó su ruta» es el criterio del diploma (`familia.rutas_completas`); «conversaron», alguna `conversada_en`.
- **Intereses:** siempre estudiantes distintos, con tarjetas activas y favoritos de carrera o institución. Un área es una `familia_carrera`. «Solo en favoritos»: favorito sin tarjeta activa en esa fila. El orden (`<columna>` o `-<columna>`; `nombre`, `en_planes`, `plan_a`, `solo_favoritos`, `total`; por defecto `-en_planes`, desempate Plan A y nombre) se aplica a toda la lista antes de cortar. Con `tipo`, cada familia cuenta solo sus carreras de ese tipo. «Planes frente al test» usa las familias recomendadas y el código de interés de `instrumentos.consultas.intereses_por_cuenta` (el mismo cálculo del resultado, por lotes).

## Datos, pruebas y front

- Las alertas, grupos y parámetros iniciales están en `datos/fijos.py` (`GRUPOS_ALERTA`, `ALERTAS`, `PARAMETROS_PANEL`); `ruta` no agrega nada. Una prueba de `tests/integration/datos` exige que cada alerta fija nombre un evaluador registrado y traiga todas sus claves. Las tres tablas son de catálogo (el reinicio no las vacía).
- Las pruebas (`tests/integration/panel`) siembran el estado directo en la base con la hora fija de `soporte_panel.AHORA`, recorren el flujo real del registro para la respuesta sensible y miden que el número de consultas no crezca con el salón. El exportador de fixtures pide el panel de ori-carmen sobre 5A con la hora de Lima fija en 2026-10-20 (`ruta-panel-*`).
- El front solo pinta lo que llega: sus textos propios son los títulos y subtítulos de los bloques, de usted, y los nombres de tipo y gestión de institución; el servidor manda los códigos (`ov_frontend/docs/origen-de-datos.md`, «Panel del salón»). En el menú, «Configuración del salón» es la vista que antes se llamaba «Prioritarios».
- Siguen pendientes fuera del panel: la configuración del salón editable, el informe de viaje, afinar las reglas de «Para conversar», los parámetros por salón y los conteos del diario (HU-091).
