# Decisiones de la spec en curso

Spec: `docs/specs/ajuste-pasaporte-perfil.md`.

## Modelo

- Tabla `grupo_insignia` (catálogo) e `insignia.grupo_id` obligatorio, `insignia.orden` y `insignia.pista`: las páginas del pasaporte y la pista de Lumi pasan al servidor. Se usa `grupo_id` (no `id_grupo` del texto) por la convención de FK del repo (`bloque_id`, `familia_id`).
- `nivel.descripcion` y `condicion_desbloqueo.texto`, ambos nulos: el texto del nivel y lo que pide cada condición se muestran tal cual llegan; el front no redacta.
- Tabla de estado `insignia_vitrina` (PK cuenta + insignia, `orden` 1–3 único por cuenta), en `TABLAS_DE_ESTADO`: la vitrina deja de vivir en `localStorage`.
- `obtenida_en` no lleva columna: es la menor `desbloqueo.fecha_hora` entre las reglas de la insignia (una consulta agrupada en `/logros`, más una para la vitrina; ninguna por insignia).
- La migración `0028` pone las insignias existentes en un grupo `GENERAL` sin consultar antes (compila en modo offline), y su downgrade se detiene si hay grupos, como las anteriores que perderían catálogo.

## Contrato

- La vitrina se guarda con `POST /acciones/vitrina` (`cuenta`, `codigos`), no con PUT (corrección del usuario al texto): el front usa `enviar` y `cliente.ts` no gana método.
- Errores de la vitrina según la convención del repo, no 400: 422 con más de 3 códigos, repetidos o inexistentes; 409 si alguna no está obtenida o la cuenta no es estudiante.
- `texto` va en `ProgresoCondicion`, así que también aparece (nulo o con valor) en `bloqueo.condiciones_faltantes` y `nuevos_desbloqueos`; ninguna vista lo pinta ahí en este ajuste.
- `NivelActual` gana `descripcion` también en `/familia` (esquema compartido con el resumen).
- `vitrina` va siempre en `/logros`; vacía para apoderado y orientadora.

## Datos

- Los textos de condición se declaran aparte, en `TEXTOS_CONDICIONES = {regla: (texto, …)}`, en vez de alargar la tupla de cada condición: no cambia la forma de `REGLAS` que leen el cargador y las pruebas. Igual con `PAGINAS_INSIGNIAS` y `PISTAS_INSIGNIAS` frente a `INSIGNIAS`.
- Nivel 3 «Cartógrafo de posibilidades» (`R-NIV-3`: cerrar T0 y `VISTA_CARRERA` con `REFERENCIAS_DISTINTAS` ≥ 3). La ruta corta ve una sola carrera: los escenarios siguen terminando en el nivel 2 y `ruta-progreso-nivel-3` prueba la lista de dos condiciones.

## Pruebas adaptadas (autorizadas por el texto)

- Conteos de tablas (80 → 82), filas de la semilla y forma exacta de `/logros`, `/resumen`, `/avance`, `/familia` y de las condiciones de bloqueo (`texto`) en contrato, migraciones, datos, actividades, avance, familia y escenarios.
- El downgrade completo de la base con `ruta` ahora se detiene en `0028` (grupos de insignia) en lugar de `0027`.
- El reinicio de desarrollo guarda una vitrina antes de comprobar que todas las tablas de estado tienen filas.
- `soporte_datos_ports.insignia_por_evento` asigna la primera página a la insignia que crea.
- `tests/unit/arquitectura/test_clasificacion_tablas.py` clasifica `grupo_insignia` como catálogo e `insignia_vitrina` como estado.

## Frontend · pasaporte

- Una secreta no obtenida llega como `???`; el adaptador le da un código local `???-<grupo>-<posición>` para elegirla en la grilla sin exponer el real.
- Una condición lleva barra solo si `requerido > 1` (conteo). El resumen «x de y» es el de la regla con mayor proporción cumplida.
- Sin texto en la condición, la fila muestra el `requisito` de la insignia o, en niveles, el `mensaje_bloqueo` de la regla (el tipo `ProgresoObjetivo` del front gana `mensaje_bloqueo`).
- La vitrina en api sale de `logros.vitrina` (`vitrinaPasaporte`); `getProfileBadges`/`toggleProfileBadge` quedan solo para local. `profileBadgesApi` se conserva en el almacén sin la validación `/^I\d+$/`.
- El ícono de una insignia sin presentación local es `sparkles` (genérico).
- Los escenarios Mara de las pruebas (fixtures de la raíz, congelados) toman insignias y vitrina de `ruta-logros-final`: así no se editan fixtures generados.
- Pruebas adaptadas: `tests/servidor/logros/servidor-logros.test.mjs` reescrita con `ruta-*`; la de insignias de `tests/servidor/perfil`; la del código de insignia en `tests/servidor/diario/servidor-senal.test.mjs`; dos de `tests/local/aventura` por textos del rediseño (excepción nº 16).

## Frontend · perfil

- `RouteLine` (en `components/student/`, solo props) pinta un hito al final de cada tramo y el marcador azul dentro del tramo actual, en proporción a sus requeridas. En local hay un solo tramo, «Misiones de campo», con los conteos de `getZoneProgress('missions')`.
- La tira de sellos ordena las obtenidas por `obtenida_en` descendente (en local, en su orden, sin fecha) y luego las pendientes; con más de 5, el quinto círculo dice «+k».
- «Siguiente título» en el capítulo I usa la regla más avanzada (`mejor` en el modelo de condiciones) para los puntos y la primera condición pendiente para «te falta…», con la primera letra en minúscula.
- «Descifrada · la llegada se escribe al final» se muestra en la página de partida y llegada revelada mientras no hay comparación (no existe aún la llegada revelada).
- Los chips de favoritos enlazan a la sección de favoritos de Mis planes (`/student/profile/decisions#sx-favorites`), la única vista de favoritos.
- «% armado» de un plan = secciones completas de `getPlanCompleteness` sobre 4.
- Pruebas adaptadas: perfil (`tests/servidor/perfil`: página destacada, ruta, planes con «% armado» y favoritos en chips), afinidad (el perfil ya no la muestra) y la de capítulos de `tests/local/aventura` (excepción nº 16).

## Cierre

- Excepción nº 16 al modo local congelado anotada en `ov_frontend/AGENTS.md`; `origen-de-datos.md` describe el pasaporte, los títulos y la vitrina en api.
- Nuevo pendiente de interfaz: el `texto` de las condiciones en bloqueos y desbloqueos, sin vista fuera del pasaporte. «Avance por temática» (B09) sigue sin vista.
- La spec queda en curso: cerrarla es decisión del usuario.
