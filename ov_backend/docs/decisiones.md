# Decisiones de la spec en curso

Spec: `docs/specs/ajuste-catalogo-datos-reales.md`.

## F5a · Modelo y carga

- **Catálogo real desde `fijos`**: `datos/catalogo.py` lee los CSV de `datos/archivos/catalogo/` (carpeta renombrada desde `catalogos/`) y `fijos.cargar` lo carga en todo conjunto. Se retiran `datos/ocupaciones.py` y `Career_Interest_RIASEC_Clean.xlsx`: el CSV de Mi Próximo Paso es la única fuente de ocupaciones. `validar_distribucion_items` (no era de ocupaciones) pasa a `datos/fijos.py`.
- **Carreras duplicadas por tilde**: 5 pares del mismo tipo y CINE (179→163, 236→50, 322→176, 325→106, 344→107) se fusionan en la que tiene instituciones; quedan 603 carreras. El log de carga lista los id descartados.
- **Familias**: `campo_detallado.csv` trae 89 campos, no 90; se cargan los 89 (83 con carreras).
- **Nombres en formato de título**: carreras, instituciones y departamentos. Conectores en minúscula (a, al, de, del, e, el, en, la, las, los, o, u, y, con, para, por), siglas PNP y FAP intactas y, además, una palabra sola entre paréntesis en mayúsculas se trata como sigla («(CITEN)»). «Madre De Dios» queda «Madre de Dios».
- **Descripción de carrera**: se quitan comillas sueltas al inicio o al final (vienen del CSV).
- **Ingresos duplicados**: se toma la primera fila por (tipo, campo, departamento): 37 descartadas. Ingresos por institución: se descartan 21 filas de instituciones no cargadas (sin carreras) o repetidas.
- **Ocupaciones**: el código es el slug cuando `fijos.OCUPACIONES` lo nombra (36, para no tocar casos ni testimonios) y `onet-<código con guiones>` en las demás; `Ocupacion.codigo` pasa a obligatorio. `fijos.OCUPACIONES` queda como mapa slug → código O*NET; `DETALLE_OCUPACIONES`, `CARRERAS`, `DETALLE_CARRERAS` y, en `ruta.py`, `HIGH_POINTS`, `CONOCIMIENTOS_OCUPACIONES`, `TIPOS_CARRERA`, `UBICACIONES`, `INSTITUCIONES` e `INGRESOS` se eliminan.
- **Resumen de ocupación**: si pasa de 140 caracteres se corta en el último espacio antes del tope y se agrega «…».
- **`EstiloTrabajo(codigo, nombre)`** como tabla (21 filas): el contrato entrega `{codigo, nombre}` y `app/` no lee archivos de `datos/`.
- **`IngresoFamilia`**: además de la restricción única (tipo, familia, ubicación), un índice único parcial sobre (tipo, familia) con ubicación nula, porque la restricción no distingue nulos. Los checks exigen mínimo ≤ máximo y no negativos; no se exige que el promedio caiga entre los extremos (la fuente no lo garantiza).
- **Relación carrera–ocupación provisional**: semilla 2026, 3 a 5 ocupaciones por carrera sorteadas sobre los códigos ordenados; sin las carreras de los campos 011 y 012. `ruta.OCUPACIONES_CARRERA` reemplaza la relación de las 6 carreras mapeadas.
- **Mapas de la ruta** (los 5 de instituciones y 3 de ubicaciones que el plan fijó): `CARRERAS_RUTA`, `INSTITUCIONES_RUTA` y `UBICACIONES_RUTA` en `ruta.py`; las pruebas los usan por su papel desde `tests/soporte/soporte_catalogo_ruta.py` (`PSICOLOGIA`, `INST_UNI`…). `DURACIONES_CICLOS` solo fija los 11 ciclos de UPeU–Ing. Ambiental (los 10 de la UNFV ya salen de la duración).
- **Migración 0033**: no sube con el catálogo cargado (las columnas nuevas son obligatorias y no se deducen de los datos de prueba): se crea la base de nuevo y se carga el conjunto. Tampoco baja con el catálogo real cargado; `test_migraciones` lo refleja (0033 se detiene antes que 0032).
- **Contrato adelantado a F5a** (las tablas viejas desaparecen con la migración): `CarreraDetalle.ingreso` pasa a `IngresoCarreraPublico { fuente, nacional, departamentos }` con `Tramo`, y `OcupacionDetalle` pierde `lugares_trabajo` y `habilidades`.
- **Fixture `catalogo-inesperada`**: con 603 carreras la elección al azar ya no es única; el exportador fija la elección en la de menor código.
- **`openpyxl`** queda como dependencia sin uso en el código de la aplicación; retirarla es una decisión aparte.
- **journalism → `mtpe-291` (Ciencias de la Comunicación)**, no Periodismo (`mtpe-14`): ninguna universidad pública dicta Periodismo, y el plan B de la ruta usa `t-uni` (UNFV, pública) con la precarga de pensión cero. Decidido con el usuario.
- **Letras de prueba para las 6 carreras de la ruta** (`ruta.TIPOS_CARRERA`, DATO DE PRUEBA): mientras falte `carreras_riasec.csv`, las carreras reales no tienen letras y t-explorar, las carreras recomendadas, las sugerencias y la insignia de letras dejan de demostrarse; la ruta les pone las letras de antes solo si la carrera no trae las suyas. La spec pedía retirar `TIPOS_CARRERA`: se conserva por esa falta.

## F5b y F7 · Contrato

- **Un solo commit para F5a, F5b y F7**: la migración 0033 borra columnas que el contrato anterior servía, y el front no compila con un contrato a medias.
- **Orden de los listados por nombre** (carreras e instituciones por `busqueda`, ocupaciones por `busqueda`, que empieza por el título), no por código: los códigos reales (`mtpe-…`, `inst-…`, `onet-…`) no tienen orden útil. Familias, ubicaciones y grupos se ordenan sin tildes en Python, para que «Áncash» no quede al final.
- **`parecidas`**: misma familia y mismo tipo que la carrera, sin ella; total y las 3 primeras por nombre, con dos consultas fijas.
- **`InstitucionDetalle.descripcion`** se conserva en el contrato, siempre nula, para no cambiar más de lo pedido.
- **Títulos de ocupación**: son los de Mi Próximo Paso también para las 36 con slug («Paramédicos», no «Paramédico/a»); los testimonios y casos los muestran así.
- **Hoja de vida de la Central**: sus «habilidades» se llenan con `aptitudes`.
- **`TramoIngreso` en el front**: el esquema se llama `Tramo`, pero en `types/servidor.ts` ese nombre ya es el de los tramos del avance.
- **`test_r29_codigo_nullable_en_coincidencia_via_e_historial`** se retira: probaba ocupaciones sin código, que ya no existen (`Ocupacion.codigo` es obligatorio).
- **`CarreraResumen.duracion`** (antes solo en el detalle): la tarjeta de carrera del boceto muestra la duración; se agrega al resumen y el detalle la hereda.

## F6a · Listados

- **«Tu exploración»**: se elimina de carreras e instituciones (ninguna consulta dice cuántas vio la cuenta; decidido con el usuario) y se conserva en profesiones como «N de M íconos revelados» (colección + `total_dominio`).
- **Pestañas**: siguen siendo rutas (`/student/catalog/<pestaña>`), no `?tab=`; los filtros van como query. Cada pestaña recuerda su última búsqueda en memoria (`lib/filtrosCatalogo.ts`) y los enlaces de las pestañas la usan; en local queda vacía.
- **«Afines a mi resultado»**: es el filtro `riasec` con las dos primeras letras del código de interés del resultado (seguidas y en orden, como busca el filtro); excluyente con «Mis favoritos». Sin resultado revelado, el chip queda deshabilitado. `?afines=1` ya no es un modo aparte en api.
- **Espera**: el texto escribe la URL a los 300 ms y los demás filtros piden la lista a los 400 ms; cada cambio se calcula sobre la última URL escrita, así que R-I-C seguidas piden una sola vez «RIC». El turno por clase del almacén descarta respuestas viejas.
- **Almacén**: una sola lista por clase (la combinación activa); cambiar de filtro descarta las páginas acumuladas. Detalles en memoria, los últimos 20 (LRU). Todo lo del catálogo se vacía al cambiar la sesión de cuenta.
- **«Mostrar N más»**: muestra cuántas faltan cuando son menos de 20 («Mostrar 8 más»).
- **Prueba adaptada**: `servidor-resultados` probaba el modo aparte `?afines=1` en api (coincidencias con correlación); ahora verifica que abre el catálogo del servidor, que aplica el filtro (lo autoriza la spec: «?afines=1 deja de ser un modo aparte»).

## F6b · Detalles

- **Plan de la carrera**: el bloque lee los planes que la pantalla ya tiene (los locales del front) y «Armar un plan» usa el flujo existente (`createPlanFromCareer`). La precarga de institución, «En tus planes» de la institución y el departamento del estudiante quedan en `pendientes-interfaz.md`.
- **«En tus planes» en el detalle de carrera** no se repite: lo cubre el bloque de plan en sus tres estados, como en el boceto.
- **Título del caso** del ícono revelado: sale de las actividades ya cargadas (el `caso` de la colección es el código de la actividad); si no está, «Ícono revelado en la Central de Casos».
- **Tareas** de la profesión: se muestran las 5 primeras; «También se le llama», los 4 primeros nombres.
- **Montos**: miles con espacio fino (`S/ 4 320`), como en los bocetos.
- **Tabla de carreras de la institución**: buscador y chips por área con más de 8 carreras; 6 filas y «Mostrar las N restantes».
- **Detalles sin pestañas** (revisión del usuario): los tres detalles del catálogo del servidor no muestran la barra Profesiones / Carreras / Instituciones; se vuelve con «← Carreras» (que recuerda la búsqueda). `DiscoveryStage` gana `navegacion`; local no cambia.
- **Cancelación de listas** (revisión del usuario): además del turno por clase, la petición en vuelo de una pestaña se cancela con `AbortController` al pedir otra (`obtener` acepta una señal; una consulta cancelada responde como sin conexión y nadie la espera).
- **Revisión de listados y detalles** (pedidos del usuario): el buscador y «Mis favoritos» tienen el mismo alto; los detalles del servidor no muestran «Catálogo · …» bajo «volver» (`AtlasNavigation` gana `migas`) y abren desde el inicio de la página (antes iban al título); «Por institución» del panel de ingresos gana un selector de lugar (el departamento de la institución).
- **Filtros en panel** (pedido del usuario): `PanelFiltros` (filas `role="group"` con etiqueta en columna fija) y `FilaResultado` («N carreras · M filtros activos» y «× Limpiar filtros» debajo del panel). Los intereses (letras y «afines») cuentan como un filtro; la búsqueda y «Mis favoritos», también. «Limpiar filtros» deja la ruta de la pestaña sin parámetros (las pestañas son rutas, no `?tab=`) y pide la lista de inmediato, sin espera; el estado vacío muestra el mismo botón.
