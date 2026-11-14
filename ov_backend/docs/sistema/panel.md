# Panel del salón (orientadora)

Inicio del portal de la orientadora: pestañas Seguimiento e Intereses del salón, las listas completas de áreas e instituciones y el panel lateral «Ver». Solo lo lee la orientadora, sobre sus salones; ninguna respuesta lleva texto del diario ni de registros.

## Configuración en la base

Todo lo que el panel decide sale de tablas de catálogo que llena `datos/fijos.py`:

| Tabla | Qué guarda |
|---|---|
| `grupo_alerta` | `codigo`, `nombre` y `orden` de cada grupo de avisos («Conversar pronto», «Se están quedando atrás»). |
| `alerta` | `codigo`, `grupo_id`, `nombre`, `descripcion` (nula), `evaluador` (nombre de la función registrada que la calcula), `parametros` (JSON `{clave: valor}`), `orden` dentro del grupo y `activa`. |
| `parametro` | `codigo`, `valor` (texto; el servidor lo convierte) y `descripcion`. Solo los umbrales y cantidades del panel (`PANEL_*`); los de `app/core/parametros.py` siguen allí. |

- Las alertas no se guardan por estudiante: se calculan al consultar y desaparecen solas cuando la condición deja de cumplirse.
- Una alerta inactiva no se calcula ni se muestra. Una alerta que es variante de un evaluador existente (otro umbral, otro instrumento, otro texto, otro grupo) es solo una fila; un tipo nuevo de condición necesita un evaluador nuevo en código.

## Alcance y acceso

Todas las lecturas son `GET /cuentas/{c}/panel/...` de la propia orientadora (política por defecto) y reciben `salon` (código de uno de sus salones) o nada («Todos mis salones»). Otro rol responde 404 (`exigir_orientadora`); un salón que no es suyo, 404 «Salón no encontrado». Los días se cuentan por fecha de calendario de Lima (`obtener_ahora`, la misma hora del check-in). Todo se lee por lotes (`app/services/panel/comun.py`, `Lecturas`): el número de consultas no crece con el salón.

| Ruta | Respuesta |
|---|---|
| `/panel/seguimiento` | `SeguimientoPanel`: `fecha`, `salon`, `total_estudiantes`, `indicadores`, `avisos` (grupos y alertas con cantidad > 0, con `nombres` si caben en `PANEL_NOMBRES_VISIBLES_ALERTA`), `test` (instrumento principal: listo, por revisar con perfil plano y prisa, en curso, sin empezar, y su etiqueta), `cuestionarios` (una fila por aplicación de los demás instrumentos, en el orden del camino y luego la ciudad, con etiqueta REQUISITO, REQUISITO_ALGUNOS, CAMINO u OPCIONAL), `tramos` (SIN_EMPEZAR, cada bloque del camino, TERMINO), `detenidos` y `seguridad` (bandas con `desde`/`hasta` de los parámetros y `sin_senales`). |
| `/panel/intereses?orden_areas=&orden_instituciones=` | `InteresesPanel`: `con_planes`, `con_favoritos`, el top de `areas` e `instituciones` (con `total` y `plan_a_sin_institucion`), `formacion`, `complicaciones` y `frente_test`. |
| `/panel/areas`, `/panel/instituciones` (`orden`, `buscar`, `tipo`, `limite` 20 hasta 50, `desde`) | Página `{total, items, tipos}` de las filas con algún interesado; `tipos`, los presentes para el filtro. |
| `/panel/estudiantes?conjunto=&valor=` | `list[EstudiantePanel]` (`codigo`, `nombre`, `salon`) de un conjunto: `avisos`, `alerta`, `test`, `tramo`, `detenidos`, `seguridad_baja`, `area`, `institucion` o `plan_fuera_test`. Desconocido: 422. |

Ninguna respuesta lleva texto del diario ni de registros.

## Definiciones

- **Alertas** (`app/services/panel/alertas.py`): cada evaluador recibe las lecturas del alcance y los parámetros de la fila (completados con sus defectos) y devuelve los estudiantes que cumplen; `{clave}` se resuelve en `nombre` y `descripcion`. Una alerta activa con un evaluador desconocido se omite y se avisa en el log. Evaluadores: `respuesta_sensible`, `seguridad_baja` (los `senales` check-ins más recientes ≤ `nivel_maximo`, sin mirar fechas), `sin_ingreso` (sin INGRESO hace `dias` días o más; nunca ingresó también), `avance_bajo_salon` (tramo ≤ mediana de su propio salón − `tramos`), `instrumento_por_revisar` y `familia_pendiente`.
- **Estado del test:** «Por revisar» (`comun.por_revisar`, compartido con la alerta) es resultado vigente con perfil plano o con `avisos_velocidad` ≥ el umbral en ese intento (el bloque usa `PANEL_AVISOS_VELOCIDAD_PRISA`); plano y prisa cuenta como plano. «Listo»: vigente y no por revisar. «En curso»: respondió algún ítem o completó alguna actividad de sus aplicaciones. Rehacer el test vuelve a «Sin empezar».
- **Camino:** el tramo actual es el de `avance.tramos_del_camino`; «Sin empezar» es no haber completado ninguna actividad. «Donde más se detienen» es la siguiente requerida pendiente que comparten más estudiantes cuyo último `COMPLETA_ACTIVIDAD` fue hace `PANEL_DIAS_DETENIDO` días o más (solo si son al menos `PANEL_MINIMO_DETENIDOS`).
- **Familia:** participa si tiene vínculo activo con algún apoderado con INGRESO; «terminó su ruta» es el criterio del diploma (`familia.rutas_completas`); «conversaron», alguna `conversada_en`.
- **Intereses:** siempre estudiantes distintos, con tarjetas activas y favoritos de carrera o institución. Un área es una `familia_carrera`. «Solo en favoritos»: favorito sin tarjeta activa en esa fila. El orden (`<columna>` o `-<columna>`; `nombre`, `en_planes`, `plan_a`, `solo_favoritos`, `total`; por defecto `-en_planes`, desempate Plan A y nombre) se aplica a toda la lista antes de cortar. Con `tipo`, cada familia cuenta solo sus carreras de ese tipo. «Planes frente al test» usa las familias recomendadas y el código de interés de `instrumentos.consultas.intereses_por_cuenta` (el mismo cálculo del resultado, por lotes).
