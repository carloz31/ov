# Ajuste catalogo-datos-reales

Texto de observaciones del usuario (lote F06, fases F5a/F5b/F7/F6), seguido del plan aprobado. Las marcas **[OBSOLETO: …]** señalan lo que el plan aprobado reemplaza; prevalece el plan.

---

## Lote F06 · Datos reales del catálogo (carreras, instituciones, ingresos)

Observaciones para Claude Code. Continúa el lote F06 (ya cerrado en `docs/historico/F06/`): se reabre como fases **F5a/F5b (backend y contrato)**, **F6 (pantallas)** y, cuando esté el scraper ampliado, **F7 (ocupaciones reales)** de la misma spec. Es **M** (cambia el modelo).

## Contexto

El catálogo corre sobre datos de prueba (`fijos.py`/`ruta.py`: 7 carreras, 3 ubicaciones, ingresos inventados). Ya existen los datos reales, derivados de Ponte en Carrera (MTPE): 608 carreras **[OBSOLETO: quedan 603 tras fusionar 5 pares duplicados por tilde]**, 716 instituciones, 3 597 relaciones institución–carrera, ingresos por campo detallado y departamento (753 filas) e ingresos por institución (1 117 filas), más el clasificador CINE-Perú. Las ocupaciones **no** cambian en esta fase: siguen el O*NET actual hasta que esté el dataset de Mi Próximo Paso y la tabla carrera → ocupaciones (fase posterior).

Archivos de entrada, en `datos/archivos/catalogo/`:

| Archivo | Filas | Columnas |
|---|---|---|
| `carreras_mtpe.csv` | 608 | `id, carrera_nombre, tipo_institucion_id, codigo_cine, carrera_descripcion, duracion, ambito_laboral` |
| `carreras_riasec.csv` | 608 | `id, codigo_1, codigo_2, codigo_3` (letras RIASEC por `id` MTPE; `codigo_2` y `codigo_3` pueden ir vacíos). Con las tres se arma `codigo_riasec` (`RIS`) y las filas de `tipo_carrera` en posiciones 1–3, igual que `_letras` hace hoy con `TIPOS_CARRERA` |
| `campo_educacion.csv` | 9 | `codigo, nombre` |
| `campo_detallado.csv` | 90 | `codigo, nombre, cod_campo_especifico` |
| `campo_especifico.csv` | 30 | `codigo, nombre, cod_campo_educacion` (solo para resolver detallado → educación) |
| `instituciones.csv` | 716 | `id, tipo_institucion_id, institucion_nombre, departamento, provincia, distrito, tipo_gestion_nombre, direccion, pagina_web` |
| `instituciones_carreras.csv` | 3 597 | `institucion_id, carrera_id` |
| `departamentos.csv` | 27 | `codigo_departamento, departamento_nombre` (0 = NACIONAL) |
| `carreras_salarios_por_departamento.csv` | 753 | `tipo_institucion_id, departamento_id, familia_cod_interno, ing_prom_adultos, ing_prom_jovenes, min_max_adultos, min_max_jovenes, codigo_cine_familia` |
| `instituciones_salarios_por_familia.csv` | 1 117 | `tipo_institucion_id, familia_cod_interno, codigo_cine_familia, institucion_id, ing_promedio, min_max` |

No se usan: `cine_carreras.csv`, `nivel_estudio.csv`, `tipos_instituciones.csv` (el enum ya los cubre; el tipo 4 «Centros de Formación» no tiene instituciones y no entra).

## Modelo de datos

### `FamiliaCarrera` = campo detallado CINE
- `codigo`: el código CINE de 3 cifras (`331`), `nombre` del campo detallado.
- Nuevas columnas `area_codigo` (1 cifra) y `area_nombre`: el campo de educación (9), desnormalizado. Es el filtro grueso del catálogo. El campo específico no se guarda.
- Se cargan los 90 campos (no solo los 83 con carreras), para que los ingresos por institución de campos sin carrera no fallen y para la tabla campo → grupos SOC de la fase de ocupaciones.

### `Carrera`
- `codigo` = `mtpe-<id>` (el CINE **no** sirve de código: 56 se repiten entre carreras).
- Nuevas columnas:
  - `tipo: TipoInstitucion` (UNIVERSIDAD / INSTITUTO / FFAA_POLICIA), desde `tipo_institucion_id` (1/2/3). Obligatoria. Las 23 carreras con nombre repetido se distinguen por esto.
  - `codigo_cine: str` (6 cifras), no única.
  - `ambito_laboral: Text | None` (607 de 608 lo traen).
- `descripcion` y `duracion` como hoy. `codigo_riasec` y `tipo_carrera` desde `carreras_riasec.csv`.
- `familia_id` = campo detallado = las 3 primeras cifras de `codigo_cine`.

### `Institucion`
- `codigo` = `inst-<id>`.
- `tipo` desde `tipo_institucion_id`; `gestion` desde `tipo_gestion_nombre` («Público» → PUBLICA; «Privado» y «Privada» → PRIVADA).
- Nuevas columnas `distrito: str | None` y `direccion: str | None`. `provincia` no se guarda. `descripcion` queda nula en todas: ninguna pantalla puede depender de ella.
- `ubicacion_id` = departamento.

### `Ubicacion` = departamento
- `codigo` = `dep-<codigo_departamento>`, nombre del archivo, **sin** la fila 0 (NACIONAL) y unificando Lima: `instituciones.csv` solo dice «Lima» (no distingue Metropolitana de Provincias), así que el departamento 15 se nombra «Lima» y el 26 (Lima Provincias) no se carga como ubicación de instituciones; los ingresos del 26 sí se cargan con su propia `Ubicacion` para no perderlos. Resultado: 26 ubicaciones.

### `InstitucionCarrera`
- `duracion_ciclos` se deriva de la `duracion` de la carrera: años × 2 (se toma el primer número del texto; «5 años\nOtros: 5 años y medio» → 10). Si no hay número, nulo.

### Ingresos: se reemplazan `ingreso_carrera` y `rango_ingreso` por dos tablas
1. **`ingreso_familia`** (ingreso de egresados por tipo × campo × departamento; fuente del bloque de ingresos del detalle de carrera):
   - `tipo: TipoInstitucion`, `familia_id`, `ubicacion_id | None` (nulo = nacional), únicos los tres;
   - `promedio_jovenes`, `minimo_jovenes`, `maximo_jovenes`, `promedio_adultos`, `minimo_adultos`, `maximo_adultos` (enteros, soles, ≥ 0; `minimo ≤ maximo`).
2. **`ingreso_institucion`** (ingreso de egresados de una institución en un campo; fila de carrera del detalle de institución):
   - `institucion_id`, `familia_id`, únicos los dos;
   - `promedio`, `minimo`, `maximo`.

`fuente` no va por fila: es una constante en `app/core/parametros.py` (`FUENTE_INGRESOS = "Ponte en Carrera (MTPE)"`) que el servicio pone en la respuesta y que **siempre se muestra**. El año **sale del contrato** (`anio` desaparece de `IngresoPublico`): lo pone el front como texto propio, y se ajustará en la revisión de pantallas (F6).

Migración de Alembic en el mismo commit que el modelo (borra las dos tablas viejas, crea las dos nuevas y las columnas de `carrera`, `institucion`, `familia_carrera`).

## Carga (`datos/`)

- Los datos reales son de la plataforma sea cual sea la ruta: se cargan desde **`fijos.py`** (nuevo módulo `datos/catalogo.py` que lee los CSV, al estilo de `ocupaciones.py`, y `fijos._cargar_catalogo` lo llama). `ruta.py` deja de definir `UBICACIONES`, `INSTITUCIONES`, `INSTITUCION_CARRERA`, `INGRESOS` y `TIPOS_CARRERA`; `fijos.py` deja de definir `CARRERAS` (los nombres y familias de prueba) y `DETALLE_CARRERAS`.
- **Las 7 carreras de prueba de `ruta.py` se mapean a carreras reales** por una tabla `CARRERAS_RUTA = {'psychology': 'mtpe-<id>', ...}` en `ruta.py`, y todo lo que hoy referencia esos slugs (casos, testimonios, planes, escenarios, fixtures) pasa por ese mapa. Claude Code elige la carrera real de cada slug por nombre (Psicología universitaria, Ingeniería Civil, Enfermería, Periodismo, Ingeniería Ambiental, Medicina Veterinaria, …) y la anota en `decisiones.md`. Las relaciones `carrera_ocupacion` de prueba se conservan sobre esas carreras mapeadas (son las únicas con ocupaciones hasta la fase de O*NET).
- Reglas de limpieza en el lector (y pruebas unitarias en `tests/integration/datos/`):
  - `ambito_laboral`: el carácter «¿» con que empieza cada línea es un bullet mal codificado; se guarda como líneas separadas por `\n` sin el «¿» (el front lo pinta como lista).
  - `duracion`: se guarda el texto limpio de la primera línea («5 años»).
  - `min_max`: «De S/ 2 987 a S/ 40 050» → dos enteros (quitar espacios de miles).
  - Instituciones sin carreras (10) no se cargan; carreras sin institución (6) sí.
  - Ingresos por departamento: 105 filas nacionales dan 100 pares tipo × campo y las departamentales 716 ternas de 753; cuando varias filas caen en el mismo campo CINE (dos `familia_cod_interno` distintos), se **toma la primera** en el orden del archivo y se descartan las demás (decisión del 27 oct; el lector lo registra en el log de carga con el conteo de descartadas).
  - Ingresos por institución: 81 filas no corresponden a ningún par institución–carrera cargado; se cargan igual (la clave es institución × campo, y el campo existe).
  - Encabezados y filas validados como en `leer_ocupaciones`: error claro con número de fila.
- `datos/archivos/catalogo/` entra al repo con los CSV (≈ 700 KB en total).
- `cargar.py`: `TABLAS_PRINCIPALES` agrega `carrera` e `institucion`.

## Servicio y contrato (`services/catalogo.py`, `schemas/catalogo.py`)

- **`CarreraResumen`**: agrega `tipo: TipoInstitucion`. `familia` pasa a `FamiliaPublica { codigo, nombre, area_codigo, area_nombre }`.
- **`CarreraDetalle`**: agrega `ambito_laboral: list[str]` (líneas; vacío si nulo) y reemplaza `ingreso` por:
  ```
  ingreso: IngresoCarreraPublico | None
  IngresoCarreraPublico { fuente, nacional: IngresoFamiliaPublico, departamentos: list[IngresoFamiliaPublico] }
  IngresoFamiliaPublico { ubicacion: UbicacionPublica | None, jovenes: Tramo, adultos: Tramo }
  Tramo { promedio, minimo, maximo }
  ```
  `nacional` es la fila con ubicación nula para (`carrera.tipo`, `carrera.familia`); `departamentos` ordenados por nombre. `ingreso` es nulo si no hay fila nacional (FFAA/Policía y 47 carreras más). Si el modelo lo permite, lista de departamentos sin N+1 (una consulta).
- **`InstitucionResumen`**: agrega `distrito: str | None`. **`InstitucionDetalle`**: agrega `direccion` y sus `carreras` pasan a `CarreraEnInstitucion = CarreraResumen + ingreso: Tramo | None` (de `ingreso_institucion` por la familia de la carrera; nulo si no hay).
- **Filtros de `catalogo/carreras`**: se agrega `tipo` (enum, como el de instituciones) y `area` (código de campo de educación); `familia` sigue existiendo. `GET catalogo/familias` devuelve solo los campos **con al menos una carrera** (83) con su área, ordenados por área y nombre, y el front deriva las 9 áreas de ahí (sin ruta nueva).
- **`GET catalogo/ubicaciones`** devuelve solo los departamentos **con al menos una institución** (25): la ubicación «Lima Provincias» existe solo para `ingreso_familia` y no debe aparecer como filtro de instituciones. Lo «nacional» no es una `Ubicacion` (es `ubicacion_id` nulo en `ingreso_familia`), así que no toca el filtro ni `listar_ubicaciones`; el único tratamiento especial de «Nacional» que hay hoy está en el front local (`CareerDetailView` pestañas Lima/Nacional, `catalogDetails.ts`), que queda congelado y no se toca.
- `buscar` sigue sobre `busqueda` (sin tildes) de `nombre`; con 608 carreras y 716 instituciones basta el `LIKE` actual, pero se comprueba el presupuesto de consultas del listado (solo `familia` en carreras, solo `ubicacion` en instituciones).
- **Filtro `gestion`** (PUBLICA / PRIVADA) en `catalogo/instituciones`, combinable con los demás.
- **`CarreraDetalle.instituciones`** pasa a `InstitucionEnCarrera = InstitucionResumen + ingreso: Tramo | None` (de `ingreso_institucion` por la familia de la carrera), para la pestaña «Por institución» del panel de ingresos.
- **`OcupacionDetalle`** gana `puntajes: dict[str, float]` (las seis dimensiones de `puntaje_ocupacion`, R I A S E C) para las barras del perfil de intereses.
- **Nombres de carrera:** el cargador pasa `carrera_nombre` (en mayúsculas) a formato de título, conservando en minúscula conectores (de, del, la, en, y, e, con, para, por) y siglas conocidas (PNP, FAP). El nombre CINE no se guarda aparte: el detalle lo lee del catálogo `cine_carreras.csv` cargado a una tabla mínima `programa_cine(codigo, nombre)` **[OBSOLETO: columna `Carrera.nombre_cine`, sin tabla]** solo cuando difiere del título (campo `nombre_cine: str | None` en `CarreraDetalle`).
- Favoritos, acciones `ver-*` e inesperada no cambian (la inesperada ahora elige entre 608).

## Qué se rompe y hay que revisar

- `tests/integration/escenarios/ruta/`, `tests/integration/datos` y los presupuestos de `test_catalogo.py` que cuentan carreras, familias, ubicaciones o instituciones (p. ej. la insignia `t-ins-instituciones` y `t-ins-familias`, el `R-t-ins-instituciones`). Se ajustan solo los conteos y se anota en `decisiones.md`.
- Sugerencias y tarjeta de planes (B11): comprobar si `services/planes/` lee `IngresoCarrera`; si lo hace, pasa a leer la fila nacional de `ingreso_familia` (jóvenes).
- `scripts/exportar_fixtures_front.py` y los `ruta-catalogo-*`, `ruta-ver-carrera`: se regeneran con la forma nueva. Los fixtures crecen; si pesan de más, el exportador limita las listas a su primera página (ya son paginadas).
- Front en api (`servidorCatalogo.ts`, `adaptadoresCatalogo.ts`, `IngresoCarrera.tsx`, `DetalleCarreraServidor.tsx`): el contrato cambia, así que F5 deja el front compilando con los campos nuevos tipados y el bloque de ingresos adaptado de forma básica (nacional, jóvenes/adultos, sin selector); el diseño final es F6.

## Documentación

- `docs/sistema/integracion.md`: contrato nuevo del catálogo, archivos de `datos/archivos/catalogo/` y que `fijos` carga el catálogo real.
- `docs/sistema/instrumentos.md`: la relación carrera ↔ ocupación queda solo para las carreras mapeadas de `ruta` hasta la fase de O*NET.
- `pendientes-interfaz.md`: cierra «ingresos por región y edad» y «dirección, distrito y provincia» (provincia se descarta); abre «ocupaciones reales por carrera».
- `decisiones.md`: el mapa `CARRERAS_RUTA`, la regla de promediar duplicados **[OBSOLETO: se toma la primera fila]**, Lima unificada, provincia descartada, instituciones sin carreras no cargadas.

## Fases y verificación

- **F5a · Modelo y carga**: modelo + migración, `datos/catalogo.py`, CSV en el repo, `CARRERAS_RUTA`, pruebas de lectura y de carga (`uv run python -m datos.cargar ruta --vaciar` termina con 608 carreras **[OBSOLETO: 603]** y 706 instituciones). Commit `Lote F06 · F5a: …`.
- **F5b · Servicio y contrato**: schemas, filtros `tipo` y `area`, ingresos en los dos detalles, planes, exportador y fixtures, front compilando en api con adaptación básica. Commit `Lote F06 · F5b: …`.
- Por fase: `tests/integration/catalogo`, `datos`, `escenarios`, `contrato`, `planes`; al cerrar F5b además `npm run test:servidor`, `npm run build`, `npm run lint`, `check:estructura`.
- Manual: buscar «admin» (debe salir Administración universitaria y técnica distinguibles), filtrar por área «Ingeniería» y tipo INSTITUTO, abrir Psicología (ingresos nacional y Lima), abrir la PUCP y ver el ingreso de sus carreras.

## F6 · Pantallas (solo api; local congelado)

Bocetos en el lienzo de diseño «Catálogo · rediseño» (seis artboards: tres listados y tres detalles). Criterio de los lotes F: sin rediseño de fondo; cambios ligeros sobre los componentes actuales, acabado en la revisión estética. Decisiones:

### Listados (los tres comparten estructura)
- Pestañas, cabecera con el total real del dominio, buscador + chip «Mis favoritos», una o dos filas de filtros, contador «N resultados» a la derecha, grilla de 3 tarjetas.
- **Paginado por acumulación**, como ya definía F06: «Mostrar 20 más» agrega la siguiente página debajo; el pie muestra «Mostrando N de M», una barra de avance y «Volver arriba» (ancla al inicio). Cambiar búsqueda o filtro vuelve a `desde=0`. No hay paginador numerado.
- «Llévame a un lugar inesperado» va al pie de los listados de carreras y profesiones (no de instituciones) y sale de los detalles.
- **Carreras:** filtros Tipo (chips: Todas / Universitaria / Técnica / FF. AA. y Policía → `tipo`), Área (select, 9 → `area`), Familia (select dependiente del área → `familia`), letras RIASEC en orden de pulsación (→ `riasec`, ya existe) y chip «Afines a mi resultado». Tarjeta: etiqueta de tipo, nombre, familia, sellos RIASEC y duración; **sin descripción**. Carrera sin código RIASEC: tres círculos punteados y «Sin perfil», la fila ocupa el mismo alto.
- **Profesiones:** letras RIASEC + chip «Afines a mi resultado» (`?afines=1` deja de ser un modo aparte: es un filtro más, excluyente con «Mis favoritos») + select **Grupo** (grupo mayor O*NET → `grupo`). Tarjeta: ícono (ver abajo), título, sellos y `resumen` en una o dos líneas; se quita «Perfil de intereses de demostración». El contador de cabecera pasa a «N de M íconos revelados».
- **Instituciones:** Tipo (chips), Gestión (chips: Todas / Pública / Privada → `gestion`) y Departamento (select con «Todo el país» → `ubicacion`). Tarjeta: etiquetas de tipo y gestión, nombre, «Departamento · Distrito». Sin conteo de carreras.

### Detalle de carrera
- Cabecera oscura: etiquetas de tipo, área y familia; nombre; duración; «Se registra como <nombre CINE>» solo cuando difiere; sellos con sus nombres; favorito; «Es tu Plan A/B/C» cuando aplica.
- Columna principal: **De qué trata** (descripción) → **Dónde podrías trabajar** (`ambito_laboral` en viñetas a dos columnas) → **Cuánto ganan sus egresados** → **Profesiones a las que conduce** (filas con sellos; si no hay, el panel no se pinta).
- Panel de ingresos: subtítulo que aclara que son promedios de la **familia** y el **tipo**, no de la carrera; dos pestañas:
  - **Por lugar**: select de departamento con «Todo el país» por defecto (solo los que tienen dato para esa familia y tipo); dos tarjetas, **Jóvenes** (destacada, «recién egresados») y **Adultos** («con experiencia»), con promedio grande, barra mín–máx y los extremos en texto.
  - **Por institución · N**: lista compacta de las instituciones que la dictan y tienen `ingreso`, ordenada por promedio descendente, con promedio y rango, 4 visibles y «Ver las N restantes»; sin corte por edad.
  - Si no hay fila nacional, el panel no se pinta. Opcional para la revisión estética: una línea «Entre las N familias universitarias, esta está en el tercio de mayores ingresos» (tercio, nunca puesto), calculada sobre `ingreso_familia` nacional. **No hay vista de ranking.**
- Lateral, **primero**, el bloque de plan, que es la acción central de la pantalla: panel oscuro con borde dorado y botón primario. Tres estados: (a) la carrera no está en ningún plan y hay espacio → «¿Te ves aquí? Arma un plan» con «Te queda N de 3 espacios» y el botón «Armar un plan con esta carrera», que abre la creación de plan con la carrera precargada; (b) ya es un plan → «Es tu Plan A» en la cabecera y el panel dice «Ya es tu Plan A» con «Ver mi tarjeta»; (c) los tres planes están ocupados por otras carreras → sin botón primario: texto «Tus tres planes ya tienen carrera (A: …, B: …, C: …). Para usar esta, reemplaza uno desde Mis planes», con el enlace. El estado sale de los favoritos/planes que la pantalla ya pide (sin consulta nueva).
- Después: **Dónde estudiarla** (chips para acotar: departamento del estudiante o Lima / todo el país / públicas; 5 filas con tipo·gestión·distrito y «Favorita» cuando lo es; «Ver las N de <lugar>» despliega el resto; todo sobre la lista completa que ya trae el detalle, sin consultas nuevas) → **En tus planes** → **Carreras parecidas** (conteo y tres nombres de la misma familia, botón al listado filtrado por `familia`) → lugar inesperado. «Explorando familias» ya no existe.
- Pie de página único con las fuentes (ver abajo).

### Detalle de profesión
- Cabecera: ícono grande (revelado o por revelar), etiquetas «Grupo: <grupo mayor>» y «Preparación: <texto> (<job_zone> de 5)», título, «También se le llama …» (`tambien_llamado`), sellos con nombres, favorito. La etiqueta de revelado dice en qué caso se obtuvo.
- Columna principal: **Qué hacen** → **Dónde trabajan** (`lugares_trabajo`; si está vacío, no se pinta) → **Perfil de intereses** (seis barras ordenadas de mayor a menor con porcentaje; las tres del código en color fuerte; debajo, solo si el estudiante tiene resultado RIASEC, el bloque **«Comparado con tu resultado»** con dos filas etiquetadas, *Esta profesión* con sellos azules y *Tú* con sellos dorados, nombres completos y una frase sobre lo que comparten) → **A qué tipo de persona le suele atraer** (sección aparte: frase de `personalidad` + «Les va bien a quienes son…» con `estilos_trabajo`) → **Conocimientos** y **Habilidades** lado a lado. Lo que aún no tenga dato no se pinta.
- Lateral: **Carreras que llevan aquí** (filas con duración y etiqueta de tipo) → **Entrevistas de tu salón** (F09, como hoy) → lugar inesperado.

### Detalle de institución
- Cabecera: etiquetas de tipo y gestión, nombre, «Distrito, Departamento», «N carreras» (largo de `carreras`), botón «Página web» y favorito. Sin «Sobre la institución».
- Principal: **Carreras que ofrece** como tabla de filas-enlace (cada fila lleva al detalle de la carrera; **sin corazón**): nombre + duración (con etiqueta dorada «Favorita» cuando lo es; favoritas primero), familia, y «Promedio de egresados de la familia» con promedio y rango («de S/ mín a S/ máx») o «Sin dato»; buscador interno y chips por área cuando hay muchas; «Mostrar las N restantes». El subtítulo deja explícito que el ingreso es el promedio de los egresados de **esta institución** en **esa familia**, no de la carrera exacta.
- Lateral: **Dónde queda** (dirección, distrito, departamento) → **Costos y admisión** (texto de hoy, «Ir a su página web», «Usarla en un presupuesto») → **En tus planes** cuando aplica.

### Fuentes
Ningún panel lleva su fuente. Cada detalle termina con un **pie de página** único: carrera e institución → «Ponte en Carrera (Ministerio de Trabajo, <año>)» más la aclaración de que los ingresos son promedios por familia; profesión → «Mi Próximo Paso (O*NET, en español)» y la nota de que las carreras relacionadas son una selección de la plataforma. El año es texto del front.

### Íconos de profesión (reemplaza el badge «Ícono obtenido»)
- Cada profesión tiene un ícono circular: **revelado** = pictograma a color sobre fondo dorado con anillo; **por revelar** = círculo punteado gris con candado. Va en la tarjeta del listado y en la cabecera del detalle.
- El pictograma y el color se asignan por **grupo mayor O*NET** (`Ocupacion.grupo`, 22 grupos), con una tabla front grupo → pictograma/color; no hace falta un dibujo por ocupación. Más adelante pueden dibujarse íconos propios solo para las ocupaciones de los casos.
- El revelado sigue ocurriendo en la Central de Casos: en el cierre, cada ícono aparece con la animación de voltear figurita (patrón del sello de Helena). Queda para el pasaporte una insignia por álbum completo (fuera de este lote).

### Comportamiento del front (vale para las seis pantallas)
- **Revisión de endpoints antes de codificar las pantallas:** la fase F6 empieza comprobando, contra los bocetos, que cada dato que muestra una pantalla llega del contrato de F5b con la forma que la pantalla necesita, y anota en `decisiones.md` cualquier ajuste al backend que haga falta (campo que falta, orden, filtro combinado, 422 en un valor) antes de implementar el front; los ajustes se hacen en F5b, no se parchean en el front.
- **Pantallas de carga:** listados con skeleton de tarjetas (al entrar, al cambiar filtros y en «Mostrar más», donde el skeleton va debajo de lo ya cargado); detalles con `PantallaCarga` (espera, reintento, volver), como fijó F06; secciones del detalle que dependen de otra petición (favoritos/planes para el bloque de plan) con skeleton propio, sin bloquear el resto.
- **Debounce sin botón «Aplicar»:** la búsqueda por texto espera 300 ms tras la última tecla; los filtros (chips, letras RIASEC, selects) esperan 400 ms tras el último cambio, de modo que pulsar R, I y luego C dispare una sola consulta con «RIC». Un identificador de petición descarta respuestas viejas (que «psi» no pise a «psico», que «RI» no pise a «RIC»). Mientras hay una petición en vuelo, el contador muestra «Buscando…» y la grilla el skeleton; los controles siguen activos.
- **Loaders en acciones:** todo botón que llama al servidor pasa a `pendiente` (deshabilitado + spinner) hasta la respuesta: favorito (en tarjetas y cabeceras), «Llévame a un lugar inesperado», «Mostrar más», «Armar un plan», «Usarla en un presupuesto». Un fallo muestra el toast de `mensajeErrorServidor` y vuelve al estado anterior; no hay actualización optimista.
- **Enlaces que deben funcionar** (los filtros y la pestaña del catálogo viven en la URL como query, para que estos enlaces y el botón «atrás» del navegador funcionen y la lista restaure su estado): «Ver toda la familia» y «Carreras parecidas» → listado de carreras con `familia=<codigo>`; la familia o el área de una tarjeta → el mismo listado filtrado; «Ver las N de Lima» → despliega la lista dentro del detalle (no navega); una institución del detalle de carrera → su detalle; una carrera del detalle de institución → su detalle; «Usarla en un presupuesto» → Mis planes con esa institución precargada en el presupuesto del plan que el estudiante elija (si no tiene planes, lleva a crear uno); «Ver mi tarjeta» → la tarjeta del plan; «Armar un plan» → creación de plan con la carrera precargada; «Mis planes» del estado (c) → Mis planes; «Investigarla» → como hoy (F09); «Página web» → pestaña nueva; «Volver arriba» → ancla; pestañas del catálogo → cambian `?tab=` sin perder los filtros de las otras pestañas en memoria.
- **Carga y memoria sin sobrecargar:** nunca se piden las tres pestañas al montar, solo la activa; cada página pide 20 y solo lo que la tarjeta muestra; las páginas acumuladas de una pestaña se descartan al cambiar búsqueda o filtro (se conserva solo la combinación activa, no un caché por cada combinación); el caché de detalles por código se limita a los últimos 20 abiertos (LRU) y se vacía al cerrar sesión; las opciones de filtro (familias, ubicaciones, grupos) se piden una sola vez por sesión; el detalle de carrera trae sus instituciones como resúmenes (hasta ~300 filas, ~40 KB) y el front las agrupa y acota en memoria sin pedir más; nada del catálogo se guarda en `localStorage` (solo el estado de la pestaña y los filtros van en la URL). Si una pantalla necesita un dato que obligaría a traer el catálogo entero, se anota como ajuste de backend (un endpoint o un campo), nunca se resuelve descargando listas completas.

### Lo que esto agrega a F5b
Ya incorporado arriba: `gestion`, `tipo`, `area`, `familia` como filtros; `ingreso` en las instituciones del detalle de carrera; `puntajes` y `nombre_cine` en los detalles.

## F7 · Ocupaciones reales **[OBSOLETO: «fase posterior»; F7 entra en este ajuste, entre F5b y F6, con el contrato del plan]**

Entrada: el CSV del scraper (`codigo, titulo_es, titulo_en, resumen_es, tambien_llamado, descripcion_es, job_zone, riasec_R…C, riasec_perfil, grupo_mayor, grupo_menor, url_mpp, flag_en_mpp`) **ampliado** con conocimientos, habilidades, lugares de trabajo y personalidad (frase y estilos de trabajo), que se pedirá en otra sesión; más la tabla carrera → ocupaciones del emparejamiento con Gemini y los archivos de puntajes/high points por código O*NET.

- Modelo `Ocupacion`: nuevas columnas `resumen: str | None` (de `resumen_es`; si está vacío, la primera oración de `descripcion_es`, tope 140 caracteres), `tambien_llamado: list[str]` (JSON, de la lista del archivo), `job_zone: int | None`, `grupo: str` (grupo mayor, 2 cifras), `personalidad: Text | None`, `estilos_trabajo: list[str]` (JSON). Catálogo `grupo_ocupacional(codigo, nombre)` con los 22 grupos mayores en español, hecho a mano. `titulo_en` y `url_mpp` no se guardan ni se muestran.
- `busqueda` de la ocupación se arma con el título **y** los `tambien_llamado` (sin tildes), para que un sinónimo encuentre la ocupación.
- Solo se cargan las ocupaciones con `flag_en_mpp = 1`.
- Contrato: `OcupacionResumen` gana `resumen` y `grupo`; `OcupacionDetalle` gana `tambien_llamado`, `job_zone`, `personalidad`, `estilos_trabajo` (y ya tiene `puntajes` desde F5b). Filtro `grupo` en `catalogo/ocupaciones` y `GET catalogo/grupos` (solo los que tienen ocupaciones). No hay sector/industria.
- `carrera_ocupacion` se carga desde la tabla del emparejamiento (por `codigo` MTPE y código O*NET); las relaciones de prueba de `ruta.py` se retiran en esa fase.
- Las carreras de FF. AA. (campos 011/012) quedan sin ocupaciones; la sección no se pinta.

## Pendientes

1. Año de los ingresos y de las ocupaciones como texto del pie de página (lo pone el front en F6).
2. Verificar cuántas filas del scraper traen `resumen_es` lleno.
3. Ampliación del scraper (otra sesión) antes de ejecutar F7.

---

## Ajuste · catalogo-datos-reales


### Contexto
El catálogo funciona hoy con datos de prueba:
- **Carreras:** 6, en `fijos.CARRERAS`.
- **Instituciones y ubicaciones:** 5 instituciones y 3 ubicaciones, en `ruta.py`.
- **Ingresos:** inventados, en `ingreso_carrera` y `rango_ingreso`.
- **Ocupaciones:** salen del Excel O*NET (`datos/ocupaciones.py`).

Ya están los datos reales:
- **Ponte en Carrera:** 608 carreras, 716 instituciones e ingresos por familia, departamento e institución.
- **Mi Próximo Paso:** 923 ocupaciones con resumen, tareas, conocimientos, aptitudes, personalidad, estilos y grupo.

Este ajuste carga los datos reales, cambia el contrato y rehace las seis pantallas del catálogo según los bocetos. **F7 entra en el ajuste**, entre F5b y F6, para no construir las pantallas dos veces.

Como no hay ninguna spec en curso, la spec será `ov_backend/docs/specs/ajuste-catalogo-datos-reales.md`, con el texto de observaciones, este plan y las observaciones de la revisión. En el texto copiado se marcan como **obsoletos**: «promediar duplicados», «608 carreras», «programa_cine» y «F7 fase posterior». La rama es `ajuste/catalogo-datos-reales`, creada desde `main`. Los commits siguen el formato `Lote F06 · F5a: …`.

Los archivos de entrada están en `datos/archivos/catalogos/` y se renombra la carpeta a `catalogo/`. Ya revisé `ocupaciones_mpp_completo.csv`:
- 923 filas con `flag_en_mpp = 1`;
- RIASEC entre 1 y 7, sin vacíos;
- `riasec_perfil` de 1 a 3 letras;
- 22 grupos;
- todos los estilos están en la tabla;
- las 36 ocupaciones que `fijos` nombra con slug existen.

### Decisiones aprobadas
- **Falta `carreras_riasec.csv`:** el lector lo trata como opcional. Sin él, las carreras quedan «Sin perfil». Cuando el archivo aparezca, se carga sin tocar código. Las pruebas del lector usan un CSV pequeño en `tests/`.
- **Carreras duplicadas por tilde:** son 5 pares del mismo tipo y mismo `codigo_cine` (236/50, 176/322, 106/325, 179/163 y 107/344). Se agrupan por (tipo, nombre sin tildes, `codigo_cine`). Se conserva la que tiene instituciones (si empatan, la de menor id), se unen las relaciones institución–carrera de ambas y el log anota los id descartados. Quedan **603 carreras**.
- **`CARRERAS_RUTA`** (en `ruta.py`):
  - psychology → `mtpe-369`
  - civil-engineering → `mtpe-106`
  - environmental-engineering → `mtpe-176`
  - journalism → `mtpe-14`
  - nursing → `mtpe-308`
  - veterinary-medicine → `mtpe-115`
- **`INSTITUCIONES_RUTA`:**
  - t-uni → `inst-63` (UNFV, pública, Lima)
  - t-privada → `inst-83` (U. Peruana Unión, privada, Lima; ofrece Ing. Ambiental, igual que la UNFV)
  - t-cusco-privada → `inst-4` (U. Andina del Cusco)
  - t-tecnico → `inst-408` (IEST Público Faustino B. Franco, Arequipa, ofrece Enfermería Técnica `mtpe-489`)
  - t-ffaa → `inst-966` (Escuela Militar de Chorrillos)
- **`UBICACIONES_RUTA`:** t-lima → `dep-15`, t-cusco → `dep-8`, t-arequipa → `dep-4`.
- **`DURACIONES_CICLOS`:** se queda en `ruta.py` como `DATO DE PRUEBA`. Pone 11 ciclos al par UPeU–Ambiental para la prueba de duración impar de B11. El resto se calcula como `duracion` × 2.
- **Ingresos duplicados en un mismo campo CINE:** se toma la primera fila. Lo de «promediar» del texto queda obsoleto.
- **`nombre_cine`:** es una columna de `Carrera` (no hay tabla `ProgramaCine`). Solo se llena cuando el nombre CINE difiere del título, comparando sin tildes ni mayúsculas.
- **Relación carrera–ocupación provisional:** cada carrera recibe de 3 a 5 ocupaciones de las 923, al azar pero reproducible (semilla fija). Quedan fuera las carreras de FF. AA. (campos 011 y 012). Las 6 carreras de `OCUPACIONES_CARRERA` (en `ruta.py`) conservan sus relaciones, que prevalecen. Se reemplazará por el archivo real de emparejamiento.
- **`puntajes` en porcentaje (0–100):** la escala 1–7 queda como constante en `app/core/parametros.py`, y el front no conoce la escala.
- **«Comparado con tu resultado»:** solo se muestra si el estudiante tiene resultado RIASEC, con tres textos fijos del front:
  - comparten la letra principal;
  - comparten alguna letra, pero no la principal;
  - no comparten ninguna («tus intereses van por otro lado, aunque eso no la descarta»).
- **Los niveles de `job_zone`:** quedan como constante del front (`features/discovery/data/`), y `job_zone.csv` no se carga. Es lo más simple: son 5 textos fijos.

### Qué no cambia
- **Favoritos y acciones:** favoritos, las acciones `ver-*` y el guardia de acceso.
- **Planes:** `services/planes/` no lee `IngresoCarrera`.
- **Cálculo de coincidencias O*NET:** `calculo.py` usa la correlación de Pearson, que no depende de la escala. Cambia el conjunto de ocupaciones, no el método. Las pruebas que fijan coincidencias concretas solo ajustan sus códigos y conteos, y se anota.
- **Front:** el modo local (`CareerDetailView` con las pestañas Lima/Nacional, `catalogDetails.ts` y los datos locales) queda congelado.
- **Slugs de ocupaciones:** casos, testimonios y escenarios conservan los 36 slugs de ocupación.

### Modelo de datos (M, una sola migración, se sigue `/cambio-modelo`)
- **`FamiliaCarrera`:** agrega `area_codigo` y `area_nombre`. Se cargan los 90 campos.
- **`Carrera`:** agrega `tipo: TipoInstitucion` (obligatoria), `codigo_cine`, `ambito_laboral: Text | None` y `nombre_cine: str | None`.
- **`Institucion`:** agrega `distrito` y `direccion`.
- **Ingresos:** se borran `IngresoCarrera` y `RangoIngreso` y entran dos tablas nuevas:
  - `IngresoFamilia`, única por (tipo, familia, ubicación nula = nacional), con jóvenes y adultos (promedio, mínimo y máximo) y checks ≥ 0 y mín ≤ máx;
  - `IngresoInstitucion`, única por (institución, familia).
- **`GrupoOcupacional(codigo, nombre)`:** tabla nueva, sin `icono`. Se carga desde `grupos_ocupacionales.csv` (la columna `icono` del archivo se ignora). El pictograma y el color se mapean en el front por código.
- **`Ocupacion`:**
  - agrega `resumen`, `tambien_llamado` (JSON), `job_zone`, `grupo` (FK a `grupo_ocupacional`), `personalidad`, `estilos_trabajo` (JSON de códigos), `tareas` (JSON) y `aptitudes` (JSON), con checks de lista como los actuales;
  - se borran `lugares_trabajo` y `habilidades`, y `conocimientos` se queda.
- **`EstiloTrabajo(codigo, nombre)`:** tabla nueva, con 21 filas desde `estilos_trabajo.csv`. Es una **propuesta mía**: el contrato entrega `{codigo, nombre}` y `app/` no puede leer archivos de `datos/`, así que el nombre tiene que estar en la base. `Ocupacion.estilos_trabajo` guarda los códigos.
- **`FUENTE_INGRESOS` y la escala RIASEC 1–7:** van en `app/core/parametros.py`.
- **Clasificación de tablas:** `test_clasificacion_tablas.py`, `test_restricciones_estado.py` y `test_integridad_catalogos.py` clasifican las tablas nuevas.

### Datos (F5a)
- **`datos/catalogo.py` (nuevo):** lector de todos los CSV, con un error por fila con su número. Hace lo siguiente:
  - **Carreras:**
    - nombres en formato de título (conectores en minúscula y siglas PNP y FAP);
    - `ambito_laboral` sin «¿», en líneas separadas;
    - `duracion` toma la primera línea;
    - fusión de los pares duplicados por tilde;
    - `nombre_cine`.
  - **Instituciones:**
    - «Público», «Privado» y «Privada» → `GestionInstitucion`;
    - las 10 instituciones sin carreras no se cargan.
  - **Ubicaciones:** Lima unificada y el departamento 26 solo para ingresos.
  - **Ingresos:** `min_max` → dos enteros; en los duplicados por campo se toma la primera fila, y el log cuenta las descartadas.
  - **Ocupaciones:**
    - solo las filas con `flag_en_mpp = 1`;
    - `resumen`: `resumen_es` o la primera oración de `descripcion_es`, con un tope de 140 caracteres (485 filas lo superan). Se corta en el último espacio antes del tope y se agrega «…»;
    - `conocimientos` y `aptitudes`: las viñetas de `*_detalle` aplanadas en orden de página, con mayúscula inicial y sin repetidos;
    - `tareas`: la columna `tareas` (lista JSON), con la misma limpieza (mayúscula inicial, sin repetidos ni vacíos) y sin tope;
    - `tambien_llamado`: la columna `tambien_llamado` (lista JSON), sin repetidos ni vacíos;
    - `personalidad`: la columna `personalidad_frase`, tal cual;
    - `puntajes`: se guardan los valores 1–7 en `puntaje_ocupacion`, y el servicio entrega `round((valor − 1) / 6 × 100)` (1 → 0, 7 → 100);
    - `estilos_trabajo` traducidos por `valor_mpp`; un valor desconocido rompe la carga con el número de fila;
    - `grupo` validado contra `grupos_ocupacionales.csv`;
    - `puntaje_ocupacion` sale de `riasec_*` y `high_point` de `riasec_perfil`;
    - `busqueda` = título + `tambien_llamado`, sin tildes;
    - el código es `onet-15-1252-00`, salvo las 36 que tienen slug.
  - **Relación carrera–ocupación provisional:** con semilla fija, sorteando sobre las ocupaciones ordenadas por código (no en el orden del CSV) y sobre las carreras ordenadas por código.
- **`fijos.py`:**
  - `OCUPACIONES` queda como el mapa slug → código O*NET, y `DETALLE_OCUPACIONES` se elimina;
  - salen `CARRERAS` y `DETALLE_CARRERAS`;
  - `_cargar_catalogo` llama a `datos/catalogo.py`.
- **Archivos retirados:** `datos/ocupaciones.py`, `Career_Interest_RIASEC_Clean.xlsx` y `test_lectura_ocupaciones.py`. Este último pasa a ser `test_lectura_catalogo.py`. Una prueba solo se quita si su objeto desaparece, y se anota.
- **`ruta.py`:** quita `TIPOS_CARRERA`, `UBICACIONES`, `INSTITUCIONES`, `INGRESOS`, `HIGH_POINTS` y `CONOCIMIENTOS_OCUPACIONES`. Agrega los tres mapas y `OCUPACIONES_CARRERA`, y conserva `DURACIONES_CICLOS`.
- **`cargar.py`:** `TABLAS_PRINCIPALES` suma `carrera` e `institucion`.
- **Pruebas en `tests/integration/datos/`:** limpieza y conteos (603 carreras, 706 instituciones, 26 ubicaciones, 90 familias, 923 ocupaciones y 22 grupos). En `test_semilla_ruta.py` cambian solo los conteos.
- **Pruebas de la relación provisional y de las coincidencias:** ninguna prueba afirma que una ocupación concreta sale en el top de un perfil ni fija una relación sorteada. Afirman estructura y conteos, más las 6 relaciones fijas de `OCUPACIONES_CARRERA`.
- **En F5a mismo, porque las columnas desaparecen con la migración:**
  - `OcupacionDetalle` deja de serializar `lugares_trabajo` y `habilidades`, y `DetalleOcupacionServidor` deja de leerlos;
  - se actualizan los tipos del front, los fixtures y la prueba de contrato;
  - `tests/integration/instrumentos` se ajusta al conjunto nuevo de ocupaciones.

### Backend
### F5b · Carreras e instituciones
- **`schemas/catalogo.py`:**
  - `FamiliaPublica` con área;
  - `CarreraResumen.tipo`;
  - `CarreraDetalle` con `ambito_laboral`, `nombre_cine`, `ingreso: IngresoCarreraPublico { fuente, nacional, departamentos }`, `Tramo` e `instituciones: InstitucionEnCarrera`;
  - `InstitucionResumen.distrito`;
  - `InstitucionDetalle` con `direccion` y `carreras: CarreraEnInstitucion`;
  - `CarreraDetalle.parecidas: {total, carreras}`, con hasta 3 `CarreraResumen` de la misma familia y el mismo tipo, sin la carrera actual, resuelto dentro de la consulta del detalle;
  - `total_dominio` en `PaginaCarreras` y `PaginaInstituciones` (el conteo sin filtros, en una consulta). El front lo toma de la primera página. No hay ruta de totales.
- **Servicio y rutas:**
  - filtros `tipo`, `area` y `gestion`, validados como enumerados (un valor inválido da 422);
  - `listar_familias` devuelve solo las familias con carreras;
  - `listar_ubicaciones` devuelve solo las que tienen instituciones;
  - el ingreso por departamento se arma en una sola consulta y el ingreso por institución también.
- **Pruebas y fixtures:**
  - `catalogo`, con presupuestos de consultas;
  - `favoritos`, `planes` y `referencias` usan los mapas;
  - `escenarios` y `contrato`;
  - el exportador y los fixtures del front.
- **Front básico:** `types/servidorCatalogo.ts`, `services/api/catalogo.ts`, `adaptadoresCatalogo.ts` y `store/servidor/catalogo.ts` siguen el contrato nuevo. `IngresoCarrera.tsx` muestra lo mínimo (nacional, jóvenes y adultos).

### F7 · Ocupaciones reales
- **Contrato:**
  - `OcupacionResumen` gana `resumen` y `grupo` (leído de la columna);
  - `OcupacionDetalle` gana `tambien_llamado`, `job_zone`, `tareas`, `personalidad`, `estilos_trabajo: [{codigo, nombre}]`, `aptitudes` y `puntajes` (0–100). La baja de `lugares_trabajo` y `habilidades` ya se hizo en F5a;
  - `PaginaOcupaciones.total_dominio`.
- **Rutas:** el filtro `grupo` en `catalogo/ocupaciones` y `GET /cuentas/{c}/catalogo/grupos` → `[{codigo, nombre}]`, solo los grupos con ocupaciones, ordenados por nombre.
- **Inesperada:** elige entre las 923 ocupaciones.
- **Pruebas:**
  - `catalogo`, `escenarios` y `contrato`;
  - fixtures y la adaptación básica del front en api (tipos, servicio y almacén).

### Front · F6 (pantallas, solo api)
Primero reviso cada dato de los bocetos contra el contrato. Lo que falte se corrige en F5b o F7 y se anota.
- **F6a · Listados (`CatalogoServidor`, `FiltrosCatalogo`, `TarjetaCatalogo`, `useCatalogoServidor`, `store/servidor/catalogo`):**
  - la pestaña y los filtros pasan a la URL;
  - debounce de 300 ms para la búsqueda y de 400 ms para los filtros, con un identificador de petición;
  - «Mostrar 20 más» con «Mostrando N de M», barra de avance y «Volver arriba»;
  - skeletons;
  - filtros por pestaña: carreras con Tipo, Área, Familia, RIASEC y Afines; profesiones con RIASEC, Afines y **Grupo**; instituciones con Tipo, Gestión y Departamento;
  - tarjetas:
    - carreras con «Sin perfil» y sin descripción;
    - profesiones con un ícono por grupo (revelado o con candado) y `resumen`;
    - instituciones con «Departamento · Distrito»;
  - la cabecera de profesiones dice «N de M íconos revelados»;
  - el lugar inesperado va al pie de carreras y profesiones.
- **F6b · Detalles:**
  - **Carrera:**
    - cabecera con etiquetas, «Se registra como» y «Es tu Plan»;
    - «De qué trata», «Dónde podrías trabajar», el panel de ingresos (Por lugar y Por institución) y «Profesiones a las que conduce»;
    - en el lateral: el bloque de plan en sus tres estados, «Dónde estudiarla» con chips, «En tus planes», «Carreras parecidas» y el lugar inesperado.
  - **Profesión:**
    - cabecera con el ícono, Grupo, Preparación (`job_zone` con el texto del front), «También se le llama», sellos y favorito;
    - «Qué hacen» (descripción y `tareas`), «Perfil de intereses» (barras y comparación), «A qué tipo de persona le suele atraer», «Conocimientos» (chips) y «Aptitudes que necesitan» (viñetas); **no hay «Dónde trabajan»**;
    - en el lateral: «Carreras que llevan aquí», «Entrevistas de tu salón» y el lugar inesperado.
  - **Institución:**
    - cabecera;
    - la tabla de carreras con enlaces, Favorita primero, buscador y chips por área;
    - «Dónde queda», «Costos y admisión» y «En tus planes».
  - **Las tres:** un pie de fuentes con el año como texto del front.
- **Datos de cabecera y de chips:**
  - **Totales de la cabecera:** «603 carreras», «706 instituciones» y «N de 923 íconos revelados» salen de `total_dominio`.
  - **Exploración e íconos revelados:** «Tu exploración: N descubiertas» y «Ícono revelado en el caso ‹…›» se arman con las acciones `ver-*` y de revelado que las pantallas ya piden. Si el revelado no guarda el caso, la etiqueta dice «Ícono revelado en la Central de Casos» y se anota en `pendientes-interfaz.md`.
  - **Departamentos:** el select de instituciones arranca en «Todo el país». Los chips de «Dónde estudiarla» arrancan en el departamento del estudiante si el perfil lo tiene; si no, en Lima, y se anota en pendientes. No hay consultas nuevas.
  - **Perfil de intereses:** el subtítulo no menciona la escala.
- **Comportamiento:**
  - `pendiente` y toast en las acciones;
  - LRU de 20 detalles, que se vacía al cerrar sesión;
  - las opciones de filtro (familias, ubicaciones y grupos) se piden una vez por sesión;
  - nada se guarda en `localStorage`.
- **Enlaces:** los del texto. Para «Armar un plan» y «Usarla en un presupuesto» primero verifico que la creación de plan admita la precarga. Si no la admite, se anota en `pendientes-interfaz.md` y te aviso antes de seguir.
- **Tamaño:** se respetan los límites de 300 y 400 líneas. Para eso, se extraen subcomponentes en `features/discovery/components/`, y la tabla grupo → pictograma va en `features/discovery/data/`.

### Fases
1. **F5a · Modelo y carga:** carreras, instituciones y ocupaciones, en una sola migración. Se corren `datos`, `migraciones`, `escenarios`, `instrumentos` y `catalogo`, y la carga manual `datos.cargar ruta --vaciar`, que debe dejar 603 carreras, 706 instituciones y 923 ocupaciones.
2. **F5b · Contrato de carreras e instituciones:** con su front básico. Se corren `catalogo`, `datos`, `escenarios`, `contrato`, `planes`, `favoritos` y `referencias`, más `npm run test:servidor`, `npm run build`, `npm run lint` y `npm run check:estructura`.
3. **F7 · Contrato de ocupaciones:** grupos, filtro y front básico. Se corren `catalogo`, `instrumentos`, `escenarios` y `contrato`, más los comandos del front.
4. **F6a · Listados:** se corren `tests/servidor/{catalogo,instrumentos,perfil,logros}`.
5. **F6b · Detalles:** se corren las mismas carpetas.
6. **Cierre:** la suite completa de ambos repos, la documentación y el resumen.

### Documentación
- `docs/sistema/integracion.md`: el contrato y los archivos de `catalogo/`.
- `docs/sistema/instrumentos.md`: las ocupaciones desde MPP, la escala 1–7, los ingresos y la relación carrera–ocupación provisional.
- `ov_frontend/docs/pendientes-interfaz.md`: se cierran «ingresos por región y edad» y «dirección y distrito», y la relación real carrera–ocupación queda pendiente del archivo de emparejamiento.
- `ov_frontend/docs/origen-de-datos.md`: los niveles de `job_zone` y los pictogramas son datos del front.
- `decisiones.md`: todo lo de arriba.

La spec queda en curso: no se cierra.

### Verificación manual (en el navegador integrado, backend `ruta` y front en api)
- Buscar «admin»: deben distinguirse la universitaria y la técnica.
- Filtrar carreras por área Ingeniería y por tipo Instituto.
- Abrir Psicología: ingreso nacional, Lima y por institución.
- Abrir la PUCP y ver el ingreso de sus carreras.
- Buscar «presidente»: debe salir Directores Ejecutivos (por `tambien_llamado`).
- Filtrar profesiones por el grupo Salud.
- Abrir Directores Ejecutivos y ver las tareas, los estilos traducidos, las aptitudes, las barras y la comparación.
- Probar «Mostrar 20 más», el «atrás» del navegador y los enlaces de familia.
- Filtrar instituciones por Gestión + Departamento.
- Pedir un tipo inválido: debe dar 422.
- Ver los tres estados del bloque de plan y «Carreras parecidas».
- Abrir la tabla de carreras de la PUCP: las favoritas van primero.
