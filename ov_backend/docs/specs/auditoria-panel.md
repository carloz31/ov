# Auditoría de rendimiento del panel de la orientadora

Alcance: panel-salon y panel-estudiantes, todas las rutas de `app/api/panel.py`, y el front del portal de la orientadora
en modo `api`. Es solo el informe: no se corrigió nada.

## Cómo se midió

- **Base:** SQLite, conjunto `contenido`, sembrada con acciones reales y el cliente de prueba del LLM (sin red), como
  `scripts/sembrar_panel_ejemplo.py`. Todo es `DATO DE PRUEBA` y quedó fuera del repo.
- **Salones de la orientadora `ori-aud`:** AU5 (5 estudiantes), AU30 (30), AU90 (90) y AU30X2 (30, con el doble de
  elementos por estudiante).
- **«Todos mis salones»:** la orientadora `ori-todos`, con tres salones de 30 (AT1–AT3), consultada sin `salon`.
- **Cada estudiante sembrado**, siempre el caso más cargado:
  - Ingresos propios y de su apoderado (vínculo activo).
  - El camino hasta `b4-5`, con partida, intereses revelados y todos los registros respondidos.
  - Un ítem en `vacio`, uno abierto, una repregunta y, en uno de cada cuatro, una respuesta sensible.
  - Dos planes: «Por qué», «Qué tan real es», conocimiento con 3 dudas (y 2 en el Plan B), 6 pasos con uno hecho y
    medidores.
  - 6 señales y 6 entradas del diario.
  - Uno de cada tres termina el camino (llegada y B5). En AU30X2 todos lo terminan, y las dudas, los pasos, las señales
    y el diario se duplican.
- **Los 8 estudiantes de ejemplo** (`est-panel-1…8`, 5A de `ori-carmen`) se sembraron con el script del repo.
- **Conteo:** cada sentencia que llega al cursor (`before_cursor_execute`, como `ContadorConsultas`), por petición
  completa con `TestClient`. Incluye el guardia de acceso.
- **Tiempo:** mediana de 3 peticiones (los POST, una sola). Es tiempo de la petición completa en Windows con SQLite.
  Sirve para comparar entre filas, no como cifra absoluta.
- **Tamaño:** el cuerpo JSON de la respuesta.
- **Front:** lectura del código y una prueba temporal con el arnés de `tests/servidor` (fixtures `contenido-panel-*`).
  Los resultados están en la sección C.
- **Scripts:** fuera del repo, en el scratchpad de la sesión (`auditoria/sembrar.py`, `medir.py`, `perfilar.py`).
  Sembrar los 245 estudiantes tarda unos 20 minutos.

## A. Consultas por ruta

### Rutas del salón

«5 / 30 / 90» es el tamaño del salón consultado; «3×30» es «Todos mis salones». «x2» indica si cambia con el doble de
elementos por estudiante (AU30X2 frente a AU30).

| Ruta | Consultas 5 / 30 / 90 / 3×30 | ¿Crece con estudiantes? | ¿Crece con elementos (x2)? | ms con 30 / 90 / 3×30 | KB con 30 |
|---|---|---|---|---|---|
| `seguimiento` | 23 / 23 / 23 / 23 | No | No (23) | 34 / 61 / 60 | 2,3 |
| `estudiantes` «Ver» · `avisos` | 14 / 14 / 14 / 14 | No | No | 23 / 42 / 42 | 2,3 |
| «Ver» · `alerta` | 14 / 14 / 14 / 14 | No | No | 22 / 42 / 42 | 2,3 |
| «Ver» · `test` | 10 / 10 / 10 / 10 | No | No | 14 / 22 / 21 | 2,3 |
| «Ver» · `tramo` | 7 / 7 / 7 / 7 | No | No | 15 / 27 / 29 | 0,8 |
| «Ver» · `detenidos` | 8 / 8 / 8 / 8 | No | No | 16 / 30 / 30 | 1,5 |
| «Ver» · `seguridad_baja` | 7 / 7 / 7 / 7 | No | No | 9 / 10 / 11 | 2,3 |
| «Ver» · `area` | 11 / 11 / 11 / 11 | No | No | 12 / 13 / 13 | 2,3 |
| «Ver» · `plan_fuera_test` | 19 / 19 / 19 / 19 | No (pero el **tiempo** sí: H2) | No | **121 / 321 / 512** | 0,0 |
| `intereses` | 20 / 20 / 20 / 20 | No (pero el **tiempo** sí: H2) | No | **119 / 316 / 317** (con 5: 34) | 0,9 |
| `areas` | 10 / 10 / 10 / 10 | No | No | 11 / 13 / 14 | 0,4 |
| `instituciones` | 10 / 10 / 10 / 10 | No | No | 11 / 12 / 12 | 0,2 |
| `lista-estudiantes` (inicial, por nombre, con aviso y test) | 18 / 18 / 18 / 18 | No | No | 26 / 51 / 48 | 5,9 (20 filas) |

### Rutas del perfil

«5 / 30 / 90» es el tamaño del salón del estudiante consultado, un estudiante a mitad del camino; «3×30» es
`ori-todos`. La columna «Elementos» compara estudiantes con más o menos datos.

| Ruta | Consultas 5 / 30 / 90 / 3×30 | ¿Crece con estudiantes? | ¿Crece con elementos por estudiante? | ms con 30 / 90 |
|---|---|---|---|---|
| `estudiantes/{e}` (perfil) | 60 / 60 / 60 / 60 | No | No: varía de 51 a 61 según qué ramas se cumplen (sin plan, con llegada…); con el doble de señales, dudas y pasos, igual | 59 / 70 (con 5: 49) |
| `…/tests` | 40 / 40 / 40 / 40 | No | **Sí: una por cuestionario con resultado vigente** (sin resultados 33, intereses 40, tres cuestionarios 42; tope: el catálogo de instrumentos) | 37 / 38 |
| `…/tests/partida-llegada` | 15 / 15 / 15 / 15 | No | No | 13 / 14 |
| `…/tests/{aplicacion}/resultado` | 18 / 18 / 18 / 18 | No | No | 21 / 23 |
| `…/planes` | 34 / 34 / 34 / 34 | No | No: sin planes 18, con 1 a 3 planes de 30 a 34 (ramas, no bucle) | 30 / 30 |
| `…/planes/{p}` | 32 / 32 / 32 / 32 | No | No (32 con el doble de dudas y pasos) | 29 / 29 |
| `…/respuestas` | 68 / 68 / 68 / 68 (terminó: 89) | No | **Sí: con los ítems respondidos** (0 ítems → 16, 6 → 22, 20 → 68, 22 → 72; 22 con B5 → 89) | 63 / 64 (terminó: 83 / 82) |
| `…/respuestas/{actividad}` | De 14 a 46 según el registro | No | **Sí: con sus ítems que dependen de otros** (14 de base; `b4-1`: 46; `b4-5`: 24) | De 43 a 51 |
| `…/avance` | 28 / 28 / 28 / 28 | No | No (28 con el doble de señales y diario) | 30 / 43 |
| `POST /acciones/escribir-nota` | 16 en todos | No | No | Unos 20 |
| `POST /acciones/editar-nota` | 16 en todos | No | No | Unos 20 |
| `POST /acciones/borrar-nota` | 15 en todos | No | No | Unos 20 |

### Qué crece y dónde

- **`respuestas` y `registro`, una lectura por ítem.**
  - `resolver_contexto` (`app/services/registro/contexto.py:488`) se escribió para un ítem de una cuenta y lee la base
    cada vez: `_vigentes` (`:126`), los planes en `resolver_marcadores` (`:316`), las referencias, las piezas y las
    opciones en `_ecos` y `_opciones` (`:395`, `:471`).
  - Además calcula los ecos del LLM (`ecos_llm`, `:106`). *Corrección posterior:* el panel sí los usa, porque
    `eco_cambiado` compara los guardados con los de hoy para «Cambió después» (ver G).
  - El panel lo llama dentro de bucles:
    - `perfil_respuestas.py:131`: `cambio_despues` llama a `_cambio` y este a `_hoy`, para cada respuesta vigente de
      cada registro.
    - `perfil_respuestas.py:133` → `_lectura` → `_item:74`: los ítems de «Para leer primero» vuelven a resolver el
      mismo contexto que ya se resolvió en la línea 131.
    - `perfil_respuestas.py:145` → `_item:74`: lo mismo en el registro desplegado.
  - Las sentencias repetidas en `respuestas` de un estudiante que terminó: `respuesta_registro` ×22, y
    `tarjeta_carrera`, `motivo_tarjeta` e `institucion` ×13 cada una.
  - `eco_cambiado` es solo cálculo y no consulta. Lo que consulta es obtener el contexto de hoy que necesita.
- **`tests`, una lectura por cuestionario con resultado.** `_otros` (`perfil_tests.py:174`) llama a
  `representar_resultado` dentro del bucle de instrumentos (`:188`). La función ya sabe leer por lotes
  (`cargar_representaciones`), pero recibe un resultado por vez.

### Lo pedido en particular (punto 4)

- **Evaluadores de alertas y temas** (`alertas.py`, `temas.py`): todos leen por lotes sobre `alcance.ids`. Ninguno
  consulta por estudiante.
  - Duplicados constantes: `planes_a` se lee 3 veces por cálculo de temas (`temas.py:42`, `:51`, `:70`) y
    `por_revisar` hasta 3 veces por petición (la alerta, el estado del test y el resumen).
  - El número de consultas crece con las **alertas activas configuradas** (una o dos por evaluador), que son catálogo,
    no estudiantes.
- **Funciones escritas para una sola cuenta:**
  - `representar_resultado`: solo en `tests` (H3) y `resultado`, que es un solo resultado.
  - Familias recomendadas: el salón usa la versión por lotes, `intereses_por_cuenta`, y el perfil la llama con un solo
    resultado. Sin N+1, pero con costo de CPU (H2).
  - Planes: `cargar_planes` es por cuenta, pero solo se usa en el perfil de esa cuenta.
  - Avance: `avance_aplicacion` va en un bucle por aplicación del instrumento principal (`perfil.py:124`,
    `perfil_tests.py:45`). Crece con el catálogo, no con los estudiantes.
  - `eco_cambiado` y `resolver_contexto`: H1.
  - Familia: `rutas_completas` y `avance_ruta` se llaman con un solo apoderado en el perfil y por lotes en el salón.
- **Aviso más importante por fila de la lista:** se calcula en memoria (`lista.py:85-89`, `avisos_por_estudiante`),
  sin consultas. Confirmado: 18 consultas con 5, 30, 90 y 3×30 estudiantes.
- **Ítems de «Para leer primero»:** sí consultan por ítem y repiten lo ya resuelto para `cambio_despues` (H1).

## B. Tamaño de las respuestas

### Caso 5 de los ejemplos (`est-panel-5`, a mitad y con mucho registrado)

| Ruta | KB | Lo que más pesa |
|---|---|---|
| Perfil | 2,5 | Partida (0,7), intereses (0,4), planes (0,4) |
| Tests | 3,0 | Partida y llegada (1,3), intereses (1,2) |
| Partida y llegada | 2,9 | Las afirmaciones de cada dimensión |
| Resultado de intereses (`APL-RIASEC`) | **20,1** | Ocupaciones (10,4: 23 filas), familias (4,0), dimensiones (3,6), `por_area` (1,1) |
| Planes | 1,4 | |
| Plan 1 | 2,7 (3,3 con el doble de dudas y pasos) | Conocimiento (1,1), pasos (0,7) |
| Respuestas | 4,1 | `registros` (4,0: 19 filas); «Para leer primero» venía vacío en este caso |
| Avance | 1,3 | |

### Rutas del salón con 30 estudiantes

| Ruta | KB |
|---|---|
| Lista | 6,5 (20 filas: `items` 5,7; `avisos` 0,45; `accesos` 0,23) |
| Seguimiento | 2,5 |
| Intereses | 1,0 |
| «Ver» | Hasta 2,3 (6,8 con 90) |

### Campos que viajan sin uso y datos repetidos (punto 7)

Revisé los campos de los esquemas del panel contra el front. Casi todos se leen, porque el front los copia tal cual y
el adaptador los usa. Lo que encontré:

- **El resultado de intereses** es el más pesado, pero su vista (`ResultadoInteresesPortal`) usa ocupaciones,
  `por_area`, familias y `familia_principal`.
  - `familia_principal` viaja completo en cada una de las 23 ocupaciones (unos 113 B cada vez), aunque la tabla y la
    tarjeta solo muestran su `nombre`.
  - Las familias repiten su lista de ocupaciones.
  - Recortarlo cambia el contrato de `ResultadoPublico`, que también usan el estudiante y el apoderado. No conviene
    por 2 a 3 KB.
- **Cada página de la lista repite los catálogos:** «Mostrar más» vuelve a traer `accesos` y `avisos` (0,7 KB), y cada
  fila trae `tramo.total`, `tramo.nombre` y `salon`, que se repiten entre filas. Es poco.
- **Entre rutas se repite poco:**
  - Tests repite el resumen de intereses y de partida del perfil, con más detalle. Cada pestaña trae su propia
    versión, como pide el contrato.
  - «Para leer primero» trae los mismos ítems que `respuestas/{actividad}`, pero el front no vuelve a pedir esos
    registros. Está bien.
  - La cabecera viaja solo en el perfil. Está bien.
- **El front ordena una tabla y pide `intereses` entero:** las dos tablas y los tres bloques (hallazgo B5 del front).
  Evitarlo pide una ruta o un parámetro nuevos, es decir, un cambio de contrato.

## C. Front: carga y memoria

### Peticiones por pantalla (punto 8)

Prefijo: `/cuentas/{c}/panel/`. En desarrollo, `StrictMode` (`src/main.tsx:18`) monta dos veces; en producción, no.

| Pantalla | Al entrar | Repetidas sin necesidad | Dobles |
|---|---|---|---|
| Inicio · Seguimiento | `seguimiento?salon=` | Se revalida al montar, a propósito (regla 4). Cambiar de pestaña no la repite. | Solo con `StrictMode` (sin deduplicación en vuelo) |
| Inicio · Intereses | `intereses` y `seguimiento` | Volver a la pestaña la pide otra vez (se desmonta). Ordenar una tabla pide todo `intereses`. | Solo con `StrictMode` |
| «Ver» | `estudiantes?conjunto&valor` | Reabrir lo revalida; cerrar no pide nada. | Solo con `StrictMode` |
| Áreas e instituciones completas | `areas` o `instituciones` con página | Al volver se revalida solo la primera página y se pierde lo de «Mostrar más». La búsqueda espera 300 ms (bien). | Solo con `StrictMode` |
| Lista de estudiantes | `lista-estudiantes` con filtros | **Una petición por tecla del buscador**, sin espera (medido: 3 teclas, 3 peticiones). Al volver del perfil queda solo la primera página. | `StrictMode`, y además no se deduplica en vuelo (medido: 2 llamadas, 2 peticiones) |
| Perfil · Resumen | `estudiantes/{e}` | Una vez por visita. Cambiar de pestaña no lo repite. | En desarrollo, 2: la limpieza lo descarta y el segundo montaje lo pide otra vez |
| Notas | El POST de la acción | **No recarga el perfil** (bien) | No |
| Tests | `/tests` (y `/tests/partida-llegada` con «Ver todas») | Pide `/tests` también al entrar con `?resultado=` o `?todas=1` (`PestanaTests.tsx:103`) | No (la guardia `turnos` deduplica) |
| Resultado completo | `/tests/{a}/resultado` | Una vez por visita | No |
| Planes y plan completo | `/planes` (no con `?plan=`) y `/planes/{p}` | Una vez por visita; cada plan, una vez | No |
| Respuestas y registro desplegado | `/respuestas`; `/respuestas/{act}` al desplegar | Una vez. Los de «Para leer primero» no se piden. | No |
| Avance y familia | `/avance` | Una vez por visita | No |

Ninguna petición del panel pasa un `AbortSignal`: una búsqueda o un salón viejos terminan igual (el turno descarta su
respuesta).

### Almacenes (punto 9)

- **`store/servidor/panelEstudiante.ts`:**
  - Guarda un solo perfil (con sus secciones y turnos) y una sola lista (llave, turno y páginas).
  - El perfil se descarta al abrir otro estudiante, al desmontar el perfil o al cambiar la sesión.
  - La lista se descarta al cambiar de llave.
- **`store/servidor/panel.ts`:** guarda tres `Map` por llave (cargas, listas, turnos) que solo se vacían al cambiar de
  sesión. Dentro de una sesión **acumula** una entrada por cada combinación de salón, orden, «Ver», búsqueda y tipo.
  No tiene tope.

Prueba temporal (`node --test`, 5 de 5 en verde, fuera del repo) y `tests/servidor/panel` (13 de 13 en verde):

| Afirmación | Resultado |
|---|---|
| Un solo perfil en memoria | **Se cumple.** Con A cargado (perfil, tests y plan 1), abrir B deja a A en `null` en las tres secciones, y una respuesta tardía de A se descarta. |
| La lista se reemplaza al cambiar filtro, orden o salón | **Se cumple.** Con 26 filas, cada cambio deja 13 y la llave anterior en `null`. Mientras carga, la página es `null` (F2). |
| Nada va a `localStorage`, `sessionStorage` ni a otro almacén | **Se cumple** en los dos almacenes y en las vistas del panel en api. Fuera de alcance: `useSelectedSalon.ts` (modo local) y `prioritySettings.ts` («Configuración del salón») usan `sessionStorage`. |

### Re-renderizados (punto 10, por lectura de código)

- **Guardar una nota repinta el perfil entero unas 3 veces:** `enviando` y `errorNota` viven en
  `usePerfilEstudiante.ts:33-34`.
- **Cambiar de pestaña desmonta la anterior** (`PerfilEstudianteView.tsx:96-113`). No pide nada de nuevo, pero pierde
  el estado local: las tarjetas desplegadas, el filtro «Destacados» y el borrador de la nota nueva
  (`RespuestasYNotas.tsx:86`).
- **Desplegar un registro repinta solo esa tarjeta.** Los selectores devuelven referencias estables
  (`useSyncExternalStore` sobre entradas del `Map`).
- **«Ver» repinta todo el Inicio:** el estado `ver` está en `usePanelSalon.ts:25`.
- **`modelo` se recrea en cada render** en los tres hooks. Ningún componente del panel usa `memo`, así que hoy no rompe
  nada, pero impide memorizar.
- **Las keys son estables.** Posible duplicado: `key={s.fecha}` en `PestanaAvance.tsx:54`, si hay dos señales el mismo
  día (no verificado).

## D. Hallazgos por gravedad

«Contrato» indica si la corrección cambia la respuesta de una ruta.

| # | Gravedad | Hallazgo | Dónde | Corrección propuesta | Costo | Contrato |
|---|---|---|---|---|---|---|
| H1 | **Alta** | `respuestas` y `registro` hacen de 5 a 8 consultas por ítem respondido que depende de otros: de 16 a 89 consultas por estudiante. «Para leer primero» repite lo ya resuelto. | `perfil_respuestas.py:61`, `:74`, `:131`, `:133`, `:145`; `registro/contexto.py:126`, `:316`, `:395`, `:488` | Una lectura de contexto «para la orientadora» por cuenta, cacheada en `contexto(sesion)`: vigentes de todos los ítems, planes, referencias y piezas leídos una vez; memorizar el contexto de hoy por ítem para no resolverlo dos veces (los `ecos_llm` sí hacen falta: ver G). `resolver_contexto` del estudiante no cambia. | 1 a 1,5 días con pruebas (es lógica compartida con el flujo del registro) | No |
| H2 | **Alta (tiempo)** | `intereses`, «Ver» `plan_fuera_test` y el tema `plan_fuera_de_areas` no crecen en consultas, pero sí en filas y CPU: 64 coincidencias por estudiante con la **ocupación completa**, incluidas sus 6 columnas JSON. Con 90 estudiantes son 6.470 objetos y 35.761 decodificaciones JSON: 316 ms (512 ms en 3×30). | `instrumentos/consultas.py:226-252` (`cargar_representaciones`, la consulta `select(Coincidencia, Ocupacion)` de la línea 246), llamada desde `panel/intereses.py:211` (`frente_test`) | (a) En la lectura por lotes, solo las columnas necesarias (`Coincidencia.correlacion` y `posicion`, `Ocupacion.id` y `codigo`) en lugar de las entidades. (b) Más a fondo: guardar el código y las familias recomendadas en el resultado al calcularlo. Es un cambio de modelo, que hay que proponer aparte. | (a) 2 a 3 h, sin medir aún cuánto baja; (b) 1 día más la migración | No |
| H3 | Media | `tests` hace una consulta más por cada cuestionario con resultado vigente (de 33 a 42). Tiene tope en el catálogo de instrumentos, pero rompe el criterio de aceptación. | `perfil_tests.py:174-188` (`_otros`) | Cargar las representaciones de todos los resultados vigentes antes del bucle (`cargar_representaciones` ya lo admite) y que `representar_resultado` lea de la caché. | 1 a 2 h | No |
| H4 | Media | Cada ruta del perfil (también las notas) repite el acceso: `exigir_orientadora` ×3, la cuenta ×4 y `resolver_alcance` dos veces. Son unas 11 consultas fijas por petición. La primera llamada lee todos los estudiantes de todos sus salones solo para obtener los salones. | `panel/perfil_acceso.py:34-40` | Resolver una vez: los salones de la orientadora y, después, solo el salón del estudiante. | 1 h | No |
| H5 | Media | El perfil hace 60 consultas, con duplicados constantes: `intereses_vigentes` dos veces, `por_revisar` tres, `tarjeta_carrera` cuatro y `planes_a` tres en los temas. | `panel/perfil.py:117`, `:159`; `temas.py:42`, `:51`, `:70`; `comun.py:178` (`por_revisar`), `:231` (`estados_test`) | Llevar esas lecturas a `Lecturas` como `cached_property`. Calculo unas 10 consultas menos. | 2 h | No |
| H6 | Baja | `perfil` y `avance` tardan más con el salón (perfil 49 → 70 ms, avance 23 → 43 ms), porque leen todas las actividades completadas de los compañeros para su tramo. Las consultas no cambian; las filas, sí. Lo mismo pasa con el tiempo de `seguimiento`, `lista` y «Ver», que es lineal y moderado (hasta 61 ms con 90). | `panel/comun.py:309` (`medianas_salon`) y `:77` (`completadas_por_estudiante`) | Aceptable hoy. Si molesta, contar por bloque en SQL en lugar de traer cada fila. | 2 h | No |
| H7 | Baja | El resultado de intereses pesa 20 KB, con `familia_principal` completo en cada ocupación. | `schemas/instrumentos.py` (`ResultadoPublico`) | No tocarlo, o recortar `familia_principal` a código y nombre. | 1 h más fixtures | **Sí** (también el estudiante y el apoderado) |
| H8 | Baja | Ordenar una tabla de Intereses recalcula y trae todo `intereses`, que es la ruta más lenta (H2). | `panel.ts:320` (front) y `/panel/intereses` | Con H2 resuelto, deja de importar. Si no: las listas completas `areas` e `instituciones` ya ordenan. | n/d | Sí, si se separa |
| F1 | **Alta (front)** | El buscador de la lista hace una petición por tecla, y cada tecla muestra el esqueleto y esconde accesos y filtros. | `FiltrosEstudiantes.tsx:70`, `useEstudiantesLista.ts:53` | Esperar 300 ms, como `useListaInteres.ts:16-19`. | 0,5 h y una prueba | No |
| F2 | Media (front) | Con un filtro nuevo, la página queda en `null`, y los accesos rápidos y las opciones de «Aviso» desaparecen mientras carga. Contradice el comentario de `ListaEstudiantes.tsx:11-12`. | `panelEstudiante.ts:160`, `:169`; `ListaEstudiantes.tsx:25`, `:32` | Mostrar la última página con `aria-busy` hasta que llegue la nueva, sin conservarla bajo la llave vieja. | 1 h | No |
| F3 | Media (front) | Revalidar al montar reduce «Mostrar más» a la primera página (lista de estudiantes, áreas e instituciones). | `panelEstudiante.ts:164`, `panel.ts:356` | Revalidar con `limite = filas cargadas` (hasta el máximo de 100 de la lista) o conservar las páginas. | 1 h | No |
| F4 | Baja (front) | Sin deduplicación en vuelo ni cancelación: dobles en `StrictMode`, y las búsquedas viejas terminan igual. | `panel.ts:288-306`, `panelEstudiante.ts:158-171`; `services/api/panelEstudiante.ts` no acepta `senal` | No pedir si la misma llave ya está cargando; un `AbortController` por llave. | 1,5 a 2,5 h | No |
| F5 | Baja (front) | La caché de `panel.ts` crece sin tope dentro de la sesión. | `panel.ts:263-265` | Guardar solo las últimas N llaves por tipo. | 0,5 h | No |
| F6 | Baja (front) | `/tests` se pide aunque se entre directo a un resultado o a «Ver todas». | `PestanaTests.tsx:103` | `activa` solo sin `resultado` ni `todas`. | 5 min | No |
| F7 | Baja (front) | Guardar una nota repinta todo el perfil; cambiar de pestaña pierde el borrador de la nota y las tarjetas desplegadas; «Ver» repinta todo el Inicio. | `usePerfilEstudiante.ts:33-34`, `PerfilEstudianteView.tsx:96-113`, `RespuestasYNotas.tsx:86`, `usePanelSalon.ts:25` | Bajar el estado de la nota a `MisNotas`; guardar el borrador por estudiante en el módulo; usar `memo` en los bloques del Inicio. Conservar el borrador cambia un comportamiento visible: pedir el visto bueno. | 1,5 h | No |

## E. Lo que se midió y está bien

- **Rutas del salón:** ninguna crece en consultas con el número de estudiantes. Son iguales con 5, 30 y 90 y con
  «Todos mis salones» (3×30), y no crecen con el doble de elementos por estudiante: `seguimiento` 23, los nueve «Ver»
  entre 7 y 19, `intereses` 20, `areas` e `instituciones` 10, la lista 18 con cualquier filtro u orden.
- **Lista:** el aviso más importante y los accesos se calculan en memoria, sin consultas por fila.
- **Perfil, planes, plan completo, partida y llegada, resultado, avance y notas:** no crecen con el salón ni con la
  cantidad de dudas, pasos, señales, entradas del diario o planes. Las variaciones (51–61, 18–34) son ramas que se
  cumplen o no.
- **Perfil y avance:** de los compañeros solo se lee su tramo, en una consulta, como fija
  `test_las_consultas_del_perfil_no_crecen_con_el_salon`.
- **Evaluadores de alertas y temas:** todos leen por lotes.
- **Notas:** la acción no recarga el perfil en el front, y sus tres rutas cuestan 15–16 consultas constantes.
- **Tamaños:** todas las respuestas pesan menos de 7 KB, salvo el resultado de intereses (20 KB).
- **Front:** cada pestaña, plan, registro y resultado se pide una sola vez por visita; con `?plan=` no se pide
  `/planes`; los turnos descartan respuestas viejas; los almacenes se vacían al cambiar de sesión; la búsqueda de áreas
  e instituciones espera 300 ms; las llaves de filtro no disparan efectos de más.

## F. Pruebas de presupuesto: qué hay y qué falta

El criterio de aceptación pide una prueba por ruta que fije que el número de consultas no crece con los estudiantes ni
con los elementos por estudiante.

| Ya existe | Archivo |
|---|---|
| `seguimiento` con el salón | `tests/integration/panel/test_panel_seguimiento.py:159` |
| `intereses` con el salón | `tests/integration/panel/test_panel_intereses.py:138` |
| `lista-estudiantes` con el salón | `tests/integration/panel/test_panel_perfil.py:92` |
| Perfil y `avance` con el salón | `tests/integration/panel/test_panel_perfil.py:231` |

**Faltan:**

- **Contra el número de estudiantes:** `estudiantes` (cada conjunto), `areas`, `instituciones`, `tests`,
  `partida-llegada`, `resultado`, `planes`, `planes/{p}`, `respuestas`, `respuestas/{actividad}` y las tres acciones de
  notas.
- **Contra los elementos por estudiante:** todas, en especial `respuestas` y `registro` (ítems), `tests`
  (cuestionarios con resultado), `planes/{p}` (dudas y pasos), `avance` (señales y diario) y la lista y el perfil
  (planes y alertas por estudiante).

Propuesta: una prueba por ruta con el patrón «pocos frente a muchos» de `ContadorConsultas`. Con H1 y H3 sin corregir,
las de `respuestas`, `registro` y `tests` fallarían hoy.

## G. Después de las correcciones

Las correcciones aprobadas van en tres commits de la rama `ajuste/auditoria-panel`. No se hicieron H6, H7 ni H2 (b).

| Fase | Hallazgos | Commit |
|---|---|---|
| 1 | H2 (a), H3, H4, H5, H8, F1, F6 | `6e73a965` |
| 2 | H1 | `ef2d8bab` |
| 3 | F2, F3, F4 (sin `AbortController`), F5, F7 y las pruebas de presupuesto | `8a37b3e9` |

La medición se repitió con el mismo método de la sección «Cómo se midió», sobre una copia de la misma base. Cada
celda dice «antes → después».

### Rutas del salón

| Ruta | Consultas 5 / 30 / 90 / 3×30 | ms con 30 / 90 / 3×30 |
|---|---|---|
| `seguimiento` | 23 → 22 / 23 → 22 / 23 → 22 / 23 → 22 | 34 → 35 / 61 → 60 / 60 → 62 |
| `estudiantes «Ver» avisos` | 14 → 14 / 14 → 14 / 14 → 14 / 14 → 14 | 23 → 25 / 42 → 42 / 42 → 41 |
| `estudiantes «Ver» alerta` | 14 → 14 / 14 → 14 / 14 → 14 / 14 → 14 | 22 → 24 / 42 → 41 / 42 → 43 |
| `estudiantes «Ver» test` | 10 → 10 / 10 → 10 / 10 → 10 / 10 → 10 | 14 → 16 / 22 → 20 / 21 → 20 |
| `estudiantes «Ver» tramo` | 7 → 7 / 7 → 7 / 7 → 7 / 7 → 7 | 15 → 16 / 27 → 28 / 29 → 28 |
| `estudiantes «Ver» detenidos` | 8 → 8 / 8 → 8 / 8 → 8 / 8 → 8 | 16 → 18 / 30 → 31 / 30 → 30 |
| `estudiantes «Ver» seguridad_baja` | 7 → 7 / 7 → 7 / 7 → 7 / 7 → 7 | 9 → 9 / 10 → 11 / 11 → 11 |
| `estudiantes «Ver» plan_fuera_test` | 19 → 19 / 19 → 19 / 19 → 19 / 19 → 19 | 121 → 30 / 321 → 57 / 512 → 54 |
| `intereses` | 20 → 20 / 20 → 20 / 20 → 20 / 20 → 20 | 119 → 31 / 316 → 58 / 317 → 58 |
| `areas` | 10 → 10 / 10 → 10 / 10 → 10 / 10 → 10 | 11 → 12 / 13 → 13 / 14 → 13 |
| `instituciones` | 10 → 10 / 10 → 10 / 10 → 10 / 10 → 10 | 11 → 11 / 12 → 13 / 12 → 14 |
| `estudiantes «Ver» area` | 11 → 11 / 11 → 11 / 11 → 11 / 11 → 11 | 12 → 11 / 13 → 14 / 13 → 16 |
| `lista-estudiantes` | 18 → 17 / 18 → 17 / 18 → 17 / 18 → 17 | 26 → 27 / 51 → 48 / 48 → 49 |
| `lista-estudiantes orden=estudiante` | 18 → 17 / 18 → 17 / 18 → 17 / 18 → 17 | 26 → 26 / 52 → 49 / 48 → 49 |
| `lista-estudiantes aviso+test` | 18 → 17 / 18 → 17 / 18 → 17 / 18 → 17 | 26 → 25 / 52 → 49 / 48 → 49 |

En estas rutas el número de consultas ya era constante. Lo que cambió es el tiempo de `intereses` y de «Ver»
`plan_fuera_test` (H2): con 90 estudiantes, de 316 a 58 ms y de 321 a 57 ms; con 3×30, de 317 a 58 ms y de 512 a
54 ms. `seguimiento` y la lista bajan una consulta (H5: los parámetros, el estado del test y `por_revisar` se leen
una vez).

### Rutas del perfil

«Terminó con 30 / x2» es un estudiante que terminó el camino en AU30 y otro de AU30X2, con el doble de dudas, pasos,
señales y diario.

| Ruta | Consultas 5 / 30 / 90 / 3×30 | Consultas: terminó con 30 / x2 | ms con 30 / 90 |
|---|---|---|---|
| `perfil` | 60 → 44 / 60 → 44 / 60 → 44 / 60 → 44 | 60 → 44 / 60 → 44 | 59 → 47 / 70 → 53 |
| `tests` | 40 → 35 / 40 → 35 / 40 → 35 / 40 → 35 | 40 → 35 / 40 → 35 | 37 → 40 / 38 → 34 |
| `partida-llegada` | 15 → 8 / 15 → 8 / 15 → 8 / 15 → 8 | 15 → 8 / 15 → 8 | 13 → 10 / 14 → 10 |
| `resultado APL-RIASEC` | 18 → 11 / 18 → 11 / 18 → 11 / 18 → 11 | 18 → 11 / 18 → 11 | 21 → 16 / 23 → 19 |
| `planes` | 34 → 27 / 34 → 27 / 34 → 27 / 34 → 27 | 34 → 27 / 34 → 27 | 30 → 22 / 30 → 24 |
| `plan 1` | 32 → 25 / 32 → 25 / 32 → 25 / 32 → 25 | 32 → 25 / 32 → 25 | 29 → 23 / 29 → 24 |
| `plan 2` | 32 → 25 / 32 → 25 / 32 → 25 / 32 → 25 | 32 → 25 / 32 → 25 | 29 → 20 / 27 → 22 |
| `respuestas` | 68 → 32 / 68 → 32 / 68 → 32 / 68 → 32 | 89 → 32 / 86 → 32 | 63 → 36 / 64 → 40 |
| `registro (máx.)` | 46 → 22 / 46 → 22 / 46 → 22 / 46 → 22 | 46 → 22 / 46 → 22 | 51 → 26 / 42 → 34 |
| `avance` | 28 → 21 / 28 → 21 / 28 → 21 / 28 → 21 | 28 → 21 / 28 → 21 | 30 → 25 / 43 → 40 |
| `escribir-nota` | 16 → 9 / 16 → 9 / 16 → 9 / 16 → 9 | 16 → 9 / 16 → 9 | 22 → 17 / 23 → 18 |
| `editar-nota` | 16 → 9 / 16 → 9 / 16 → 9 / 16 → 9 | 16 → 9 / 16 → 9 | 18 → 14 / 25 → 16 |
| `borrar-nota` | 15 → 8 / 15 → 8 / 15 → 8 / 15 → 8 | 15 → 8 / 15 → 8 | 18 → 15 / 23 → 15 |

### Los estudiantes de ejemplo (5A)

Columnas: caso 2 (recién empieza) / caso 5 (a mitad) / caso 7 (terminó) / caso 6 (respuesta sensible).

| Ejemplos (5A) | Consultas antes → después |
|---|---|
| `perfil` | 51 → 35 / 60 → 44 / 61 → 45 / 53 → 37 |
| `tests` | 35 → 27 / 40 → 35 / 40 → 35 / 35 → 27 |
| `partida-llegada` | 15 → 8 / 15 → 8 / 15 → 8 / 15 → 8 |
| `resultado APL-RIASEC` | — / 18 → 11 / 18 → 11 / — |
| `planes` | 18 → 11 / 34 → 27 / 34 → 27 / 18 → 11 |
| `plan 1` | — / 32 → 25 / 32 → 25 / — |
| `plan 2` | — / 32 → 25 / 32 → 25 / — |
| `respuestas` | 16 → 9 / 68 → 32 / 72 → 32 / 22 → 21 |
| `registro (máx.)` | — / 46 → 22 / 46 → 22 / 17 → 8 |
| `avance` | 25 → 18 / 28 → 21 / 28 → 21 / 28 → 21 |
| `escribir-nota` | 16 → 9 / 16 → 9 / 16 → 9 / 16 → 9 |
| `editar-nota` | 16 → 9 / 16 → 9 / 16 → 9 / 16 → 9 |
| `borrar-nota` | 15 → 8 / 15 → 8 / 15 → 8 / 15 → 8 |
| `plan 3` | — / — / 32 → 25 / — |

La pestaña Tests del caso 8, con tres cuestionarios revelados, pasa de 42 a 36 consultas.

- **El perfil:** baja de 60 a 44 consultas (referencia pedida: unas 40). Lo que queda repetido es marginal: el vínculo
  familiar se lee en la cabecera y en las lecturas, y las familias de carreras, en el resumen de intereses y en el de
  planes.
- **Todas las rutas del perfil:** bajan unas 7 consultas fijas por H4 (el acceso se resuelve una vez).
- **`respuestas`:** queda en 32 consultas para un estudiante con datos, haya respondido 20, 22 o el doble de ítems;
  antes iba de 68 a 89. Un registro desplegado cuesta a lo más 22 (antes 46).
- **Lo que queda variable es de presencia, no de cantidad.** Por ejemplo, el caso 6 (21) no tiene intereses ni
  planes, así que algunas lecturas no se hacen. Lo mismo pasa con la pestaña Tests sin ningún cuestionario con
  resultado (25 en el caso 1).

### Estado de los hallazgos

| # | Estado | Nota |
|---|---|---|
| H1 | Corregido | `panel/contexto_lectura.py` (`LecturaContexto`): lee una vez por petición y arma cada ítem una vez. Las respuestas de los ocho ejemplos (152 registros) salen idénticas a las de antes, y una prueba lo fija. **Los ecos al LLM se siguen calculando**, aunque la corrección aprobada decía «sin ecos_llm»: `eco_cambiado` los necesita, y sin ellos «Cambió después» cambiaría. Se calculan sobre lo ya leído, sin consultas. `resolver_contexto` y el flujo del estudiante no cambiaron; las reglas de marcadores y ecos quedan repetidas en el módulo del panel, y la prueba de respuestas idénticas las protege. |
| H2 (a) | Corregido | Columnas en lugar de entidades, solo las coincidencias que `seleccionar_afines` puede elegir (posición ≤ 30) y familias solo de quien tiene Plan A. Comparado con `representar_resultado` en los 249 resultados de la base de medición: sin diferencias. |
| H2 (b) | No se hace | Por decisión. |
| H3 | Corregido | |
| H4 | Corregido | |
| H5 | Corregido | |
| H6 | No se hace | El tiempo de `perfil` y `avance` todavía crece un poco con el salón (avance: 25 → 40 ms de 30 a 90), por el tramo de los compañeros. |
| H7 | No se hace | |
| H8 | Corregido | Reordenar una tabla pide `areas` o `instituciones` con `limite` = las filas del top y `desde=0`. Mientras llega, la tabla conserva sus filas. |
| F1–F7 | Corregidos | F4 solo deduplica lo que está en camino (sin cancelación). F7 conserva el borrador de la nota por estudiante hasta guardarla o salir del perfil. |

### Pruebas que fijan el criterio

- **`tests/integration/panel/test_panel_presupuestos.py`** cuenta cada ruta tres veces con el salón de `ruta`
  poblado: con los cinco estudiantes, con doce más y con el doble de planes, dudas, pasos, complicaciones, señales,
  diario y cuestionarios con resultado. Las tres cuentas deben ser iguales.
  - Cubre 25 rutas o variantes: `seguimiento` (un salón y todos), los ocho conjuntos de «Ver», `intereses`, `areas`,
    `instituciones`, la lista (inicial y filtrada), el perfil, `tests`, `partida-llegada`, los dos resultados,
    `planes`, el plan completo, `respuestas`, `avance` y las tres acciones de notas.
  - Otra prueba responde los registros de `ruta` de a uno.
  - Se comprobó que falla si se deshace H3.
- **`tests/integration/panel/test_panel_respuestas_identicas.py`** siembra los ocho ejemplos (`contenido`) y
  comprueba:
  - las respuestas idénticas;
  - `respuestas` del caso 5 frente al caso 7, y con diez compañeros más;
  - tres registros con ecos y piezas (`b1-3`, `b4-1`, `b4-5`).
- **Front (`tests/servidor/panel`):**
  - H8: reordenar pide solo esa lista;
  - F1: una sola búsqueda tras 300 ms;
  - F2–F4: espera con la última página, revalidación con `limite` y sin duplicados;
  - F5: poda sin tocar lo que está a la vista;
  - F7: el borrador.
- **Suite completa:** backend 1407 aprobadas y 5 omitidas; front 968 aprobadas; `build`, `lint` y `check:estructura`
  en verde.
