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
