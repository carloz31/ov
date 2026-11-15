# Ajuste pendientes-orientadora · Reglas de «Para conversar» (temas-conversar)

Rama `ajuste/pendientes-orientadora` desde `main` (ya tiene panel-estudiantes y auditoría del panel). No hay spec en curso: el plan aprobado se guarda como `ov_backend/docs/specs/ajuste-pendientes-orientadora.md`. El texto de observaciones (`ajuste-temas-conversar.md`) decide las reglas, textos y presupuesto; aquí solo va cómo y lo que difiere del repo.

## Diferencias con el repo (reportadas, ya decididas con el usuario)

1. **Ítems de `contenido`:** las cinco filas de registro nombran ítems que `ruta` no tiene. Van en `datos/contenido.py`; `fijos.py` guarda las cinco de planes/llegada. Decidido.
2. **Medidores:** no hay tabla de medidores; son columnas `entusiasmo`, `capacidad`, `recursos` (1–3) de `tarjeta_carrera`, y el estudiante ve «Poco/Algo/Mucho». Sus nombres solo están en el front. Los medidores se nombran por columna, y sus nombres y el texto del nivel («Poco») van en `parametros` de la fila. Textos: «Marcó «Poco» en «{medidor}» frente a su Plan A ({carrera}).{idea}». Decidido.
3. Códigos reales (§9.1): «chocan» = `CHOCAN` (propia de `b1-3-contraste`); «Me da miedo equivocarme» = `MIEDO` (lista `ESTILOS`); la exclusiva de `b1-3-voz` = `NADIE`. Moneda: `DESANIME`; seguridad: `POCO`.
4. `valores_contexto` (§9.2): `b4-5-moneda` guarda `marcadores.plan_a` / `plan_b` (el nombre de la carrera mostrado). `b5-1-seguridad` no tiene marcadores, pero `ecos_mostrar` guarda el eco `proyecto` con `carrera` del Plan A. Sí alcanza. La comparación es por nombre de carrera contra el plan cargado. Sin ese valor guardado, vale la observación 3 de abajo.
5. `{plan_b}` sale de `marcadores.plan_b` y `{opcion}` de `opciones_elegidas[].texto`: tal como se mostró.
6. El nombre del ajuste es `pendientes-orientadora` (como se invocó); el texto se llamaba `temas-conversar`.

## Observaciones del usuario al plan (incorporadas)

1. **Medidores, un solo lugar.**
   - Hoy la pestaña Planes del perfil usa `textoMedidor` de `adaptadoresPanelEstudiante.ts` («Bajo/Medio/Alto») y la etiqueta «Entusiasmo» (`VistazoPlanes.tsx`, `PlanCompletoPerfil.tsx`). Pasará a usar `MEDIDORES` y `ESCALA_MEDIDOR` de `adaptadoresPlanes.ts`, los que ve el estudiante («Me entusiasma», «Poco/Algo/Mucho»), y se borra `textoMedidor`.
   - En el back, `MEDIDORES_PLAN` y `NIVELES_MEDIDOR` en `datos/fijos.py` son la única fuente de los `parametros` de los temas.
   - `scripts/verificar_contenido_front.py` compara esas dos constantes con las del front, para que no se separen.
2. **Presupuesto medido antes de implementar (F0).**
   - Se mide el Resumen hoy, con una prueba temporal de conteo, y se informa.
   - Estimado de lo que sale: `planes_a`, `_nombres_carreras`, conocimiento y complicaciones propios de los temas, más la recarga de `plan_fuera_de_areas`, que son 5 consultas de `DatosIntereses` + resultados + `intereses_por_cuenta`.
   - Estimado de lo que entra: motivos, conocimiento, dudas, complicaciones y registros. Los planes y las áreas se comparten.
   - El neto se mide en F0. Si supera hoy + 2, me detengo y te doy el número antes de tocar la prueba.
   - Cada tabla de planes (motivos, conocimiento, dudas, complicaciones) se lee solo si una fila activa la necesita. Cada evaluador declara qué partes del contexto usa (`necesita`), y la carga se arma con la unión de las filas activas.
3. **`omitir_si_cambio`.**
   - Se omite si el plan ya no existe (borró su Plan B) o si cambió su carrera.
   - Si el intento no guardó el valor del plan, se omite cuando la fila lo nombra en `valores_requeridos` (la moneda: `[plan_b]`, porque el texto usa `{plan_b}`) y se muestra cuando no («Mi proyecto»).
4. **`plan_fuera_de_areas`: hoy no reutiliza.**
   - Hoy construye su propio `DatosIntereses` y llama a `frente_test`, que vuelve a leer resultados y familias.
   - Pasará a usar, para el estudiante del perfil, lo que el Resumen ya leyó: `intereses_vigentes` (resultado vigente no plano y familias) y `en_areas` sobre el Plan A ya cargado.
   - El criterio es el mismo («Planes frente al test»: Plan A, resultado vigente no plano y su familia fuera de las sugeridas).
   - `intereses_vigentes`, `planes_activos` y `en_areas` se mueven de `perfil.py` a `comun.py`, para que `temas.py` no importe `perfil`. El Inicio sigue con `frente_test`, sin cambios.
5. **Comparación de zonas en `autopercepcion.py`.**
   - `ORDEN_ZONAS` y `cambio` pasan de `perfil.py` a `autopercepcion.py`.
   - Se agrega una función `comparar(partida, llegada)` que, por dimensión, devuelve zona de partida, zona de llegada y cambio. La usan `partida_resumen` y `llegada_sin_avance`, lista para que el próximo ajuste (detalle de partida y llegada, en esta misma rama) la amplíe.

## Qué cambia y por qué

- **`app/services/panel/temas.py`**. Hoy hay cinco evaluadores, y cada uno lee por su cuenta (`planes_a`, `_nombres_carreras`, conocimiento y complicaciones con una consulta cada uno). Pasará a tener un contexto compartido `ContextoTemas` (vía `Lecturas.una_vez("temas", …)`), cargado una vez por petición:
  - **Planes:** reutiliza `perfil.planes_activos` (que ya usa «Lo que está pensando»). Se mueve a `temas.py` o a `comun.py` y lo comparten `_planes` y los temas. Encima, por los ids de tarjeta del Plan A: motivos (`MotivoTarjeta`), conocimiento (`ConocimientoTarjeta`), dudas abiertas (conteo agrupado de `DudaTarjeta` ABIERTA) y complicaciones. Es una consulta por tabla, la misma cantidad que hoy, y se saltan si no hay Plan A. Los textos de opciones salen de la caché de definiciones (`OpcionLista`).
  - **Registros:** una sola consulta `RespuestaRegistro` vigente `WHERE item_registro_id IN (…)` con los ítems (`item` y `datos`) de las filas activas, para el estudiante. Los ids se resuelven con `definiciones.por_codigo(ItemRegistro, …)`.
  - **Partida/llegada:** `mediciones_del_alcance(lecturas)`. Ya se comparte.
- **Contrato de evaluadores intacto:** `funcion(lecturas, parametros) -> {cuenta_id: datos}`. Para precargar los ítems, `calcular_alertas` pasa las filas activas del grupo a `Lecturas` (`lecturas.items_temas`) antes de evaluar. Los seis avisos del Inicio no cambian ni cargan nada nuevo. El grupo `para-conversar` solo se evalúa en `perfil._temas`, como hoy.
- **Evaluadores nuevos:**
  - `eleccion_registro`, `plan_medidor`, `valores_fuera_del_plan` y `llegada_sin_avance`. Siguen §3 del texto.
  - `eleccion_registro` usa `referencias.referenciable`. Las frases opcionales `voz`, `idea`, `complicaciones`, `dudas` y `detalle` se arman con plantillas que vienen de `parametros`.
  - `llegada_sin_avance` usa `perfil.cambio` (comparación por zonas, que se mueve a `autopercepcion.py` para no importar `perfil` desde `temas`).
- **`plan_conoce_poco`:** devuelve `dudas` (frase opcional, singular o plural) y deja de devolver `preguntas`.
- **Retirados:** `plan_idea_ajena`, `plan_complicaciones` y `dimension_por_trabajar`, con sus filas. Nada más los usa.
- **`perfil.py`:** `_temas` devuelve todos los temas en orden y `PerfilEstudiante` gana `temas_visibles: int` (de `PANEL_TEMAS_VISIBLES`).

## Qué no cambia

Avisos del Inicio, lista y «Ver»: no evalúan temas y sus presupuestos quedan iguales. `resolver_contexto`, `contexto_lectura.py`, el flujo del registro, el cálculo de resultados y los planes del estudiante no se tocan. Tampoco cambian el criterio de `plan_fuera_de_areas` (sí sus lecturas, observación 4), las demás pestañas del perfil (salvo los medidores de Planes, observación 1) ni el diseño (`06-perfil-resumen.png`).

## Modelo de datos

Sin cambios: no hay tablas ni columnas nuevas.

## Datos

- **`datos/fijos.py`:**
  - `ALERTAS` del grupo `para-conversar` = `plan-poco-entusiasmo`, `plan-fuera-areas`, `plan-se-ve-lejos`, `plan-conoce-poco` y `llegada-sin-avance`, con sus `parametros`:
    - nombres de medidores, nivel, plantillas;
    - `textos_origen` de la idea (`FAMILIA` «de su familia», `CONOCIDO` «de alguien que conoce»);
    - plantillas de `detalle`.
  - `ORDEN_PARA_CONVERSAR`: los diez códigos, que fijan `orden`.
  - `TEXTOS_PERFIL_ALERTAS` con los textos nuevos.
  - `PANEL_TEMAS_VISIBLES = 4`.
- **`datos/contenido.py`:**
  - Tupla nueva `ALERTAS_CONTENIDO`, con las cinco filas de registro y sus textos.
  - El cargador común (`datos/cargador.py`) la carga tras los ítems, en el grupo de `fijos`, con `orden` según `ORDEN_PARA_CONVERSAR`. En `ruta` queda vacía.
- **Validación al cargar** (tras el conjunto), sobre toda fila de los evaluadores nuevos:
  - `item` y `datos` existen y son de elección;
  - cada código de `opciones` es opción de ese ítem (de su lista o propia);
  - cada medidor es una de las tres columnas;
  - `valores_fuera_del_plan` exige que el ítem use la lista `VALORES`.
- **`scripts/sembrar_panel_ejemplo.py`:**
  - caso 7: seis temas o más;
  - caso 5: sus cuatro temas;
  - un caso con moneda y Plan B cambiado después;
  - caso 8: ninguno.
- Se regeneran los fixtures del front (`contenido-panel-*`, `ruta-panel-*`).

## Backend · pruebas

- `tests/integration/panel/test_panel_temas.py`: se reescribe con los escenarios de §7. La spec retira las reglas viejas, así que las pruebas de `plan_idea_ajena`/`dimension_por_trabajar` se adaptan o se retiran (se anota en decisiones). Las pruebas de registro usan `contenido`; las de planes, `ruta` con filas agregadas en la prueba, como hoy `t-idea-propia`.
- `tests/integration/datos/test_datos_panel.py`: orden y filas nuevas, con las fallas de carga (ítem inexistente, opción ajena, medidor inexistente).
- `tests/integration/panel/test_panel_presupuestos.py`:
  - prueba nueva del Resumen sobre `contenido` con los diez temas activos: cuenta absoluta ≤ la de hoy + 2;
  - una fila más de `eleccion_registro` no suma consultas;
  - Inicio y lista sin cambios.
  - Se mide y se informa el antes y el después (§9.4).

## Frontend

- `src/types/servidor.ts` (`temas_visibles`), el adaptador del perfil y `AvisosParaConversar.tsx`: muestra `temas_visibles` y luego el enlace «Ver los N temas restantes» (estado local, sin URL), con el mismo patrón que `PlanCompletoPerfil.tsx`.
- Destino RESPUESTAS: solo abre la pestaña. Hoy no admite abrir un registro por URL, así que no se construye.
- Fixtures y pruebas de render del Resumen actualizadas. El modo local sigue congelado.

## Fases

0. **F0 Medición:** se cuentan las consultas del Resumen hoy (sobre `contenido`, con los ejemplos) y se informa. Sin commit de código.
1. **F1 Backend:** contexto compartido, evaluadores, filas y carga validada, `temas_visibles`, pruebas de temas, datos y presupuestos. Se mide antes y después.
2. **F2 Ejemplos y contrato:** `sembrar_panel_ejemplo.py`, exportar fixtures y pruebas de contrato.
3. **F3 Front:** tipo, adaptador, tope con enlace, medidores de la pestaña Planes con `MEDIDORES`/`ESCALA_MEDIDOR` y pruebas de render.
4. **F4 Cierre:** `panel.md` (temas y evaluadores), `decisiones.md` y la suite completa de ambos repos. La spec queda en curso.

Commit por fase: `Ajuste pendientes-orientadora · F<n>: …`.

## Verificación

Subagente `pruebas`:
- por fase: `tests/integration/panel`, `tests/integration/datos` y `tests/integration/escenarios`;
- en F3: `npm run test:servidor`;
- en F4: `uv run pytest -n auto -q`, `npm test`, `build`, `lint` y `check:estructura`.

Con `sembrar_panel_ejemplo.py --desarrollo`, se revisan en el navegador los casos 5, 7 y 8 del Resumen.


## Ajuste · color-partida-llegada


Va en la misma rama `ajuste/pendientes-orientadora`. Se agrega como sección nueva de la spec en curso (`docs/specs/ajuste-pendientes-orientadora.md`, «## Ajuste · color-partida-llegada»). Las fases se numeran a continuación de las del ajuste anterior. El texto de observaciones (`ajuste-color-partida-llegada.md`) decide pantallas, textos, colores y órdenes. Los bocetos 13–16 se copian a `docs/specs/bocetos/color-partida-llegada/`.

### Diferencias con el repo

1. **Respuestas del estudiante en solo partida (§9.1).**
   - Salen de `GET /cuentas/{c}/actividades/{a}/respuestas` (`respuestas_actuales`, `RespuestaPublica`), con los ítems de `/actividades/{a}/items`.
   - Es una ruta genérica, que usa también RIASEC.
   - La marca va como campo nuevo `baja: bool | None` en `RespuestaPublica`: solo se llena en actividades de un instrumento COMPARACION y es nula en las demás.
   - **Excepción a §4.4 (decisión del usuario):** esa marca necesita `PANEL_OPCIONES_BAJAS`, que está en la tabla `parametro` y no en la caché. Se lee una vez por petición, solo cuando la actividad es de un instrumento COMPARACION: partida y llegada pagan +1 consulta. RIASEC y las demás rutas quedan con el mismo número.
2. **Estado completo:** `/comparacion` (`comparacion_autopercepcion`) trae solo etiquetas. Se le suma `ComparacionItem.direccion` (`SUBIO`, `BAJO` o nulo si no cambió). Se calcula por valor, con los inversos invertidos, desde el puntaje de la opción, que se agrega a la misma SELECT; la escala y el `inverso` salen de la caché. Son 0 consultas nuevas. `cambio: bool` no cambia.
3. **La tarjeta del resumen del libro (página I) comparte `ZoneChips`** (`PartidaLlegadaSummary.tsx`), así que toma el mismo tono de zona (§5.2, último párrafo).
4. **Colores del estudiante:** el tema ya tiene `--warning-soft`/`--warning-text` y `--success-soft`/`--success-text` (`styles/student/student-base.css`). No hace falta agregar variables. El contraste del texto sobre su fondo suave es de 5.5:1 y 5.6:1.

### Qué cambia y por qué

#### Backend · lógica común (§9.2)

- **`app/services/instrumentos/calculo.py`** (puro, sin base). Dos funciones nuevas, las únicas definiciones:
  - `es_respuesta_baja(valor, puntajes_escala, opciones_bajas)`: la regla que hoy está escrita dentro de `respuestas_autopercepcion`.
  - `direccion_respuesta(valor_partida, valor_llegada)`: `SUBIO`, `BAJO` o nulo si son iguales. Es la única comparación por valor; la usan `cambio_afirmacion` y la `direccion` del estudiante.
  - `cambio_afirmacion(valor_partida, valor_llegada, llegada_baja)`: la clasificación de §2.3 (`BAJO`, `SIGUE_BAJA`, `MEJORO`, `IGUAL`, o nulo si falta una respuesta). Recibe la marca de baja de la llegada, porque esa marca es la que separa SIGUE_BAJA de MEJORO e IGUAL.
  - El valor sigue saliendo de `calcular_puntaje_item`, que ya existe.
- **Un solo lector de `parametro`:**
  - `leer_parametros(sesion)` y `entero(...)` pasan de `panel/comun.py` a `app/services/instrumentos/parametros.py`.
  - El panel los importa desde allí, y `comun` los reexporta para no tocar a sus usuarios.
  - El estudiante usa la misma función (`leer_parametros`), así que no hay un segundo lector.
- **`respuestas_autopercepcion`** (panel) usa `es_respuesta_baja`. El cálculo no cambia y la prueba de que el resultado sale idéntico va en §Pruebas.
- **`_grupos`** usa `cambio_afirmacion`:
  - una afirmación que sube y sigue baja sale solo en «Siguen bajas»;
  - «Mejoraron» solo agrupa `MEJORO`;
  - «Bajaron» agrupa `BAJO`;
  - topes y órdenes no cambian.

#### Backend · detalle de la orientadora (§3.1)

- **`respuestas_partida_llegada` (`perfil_tests.py`).** Hoy devuelve dimensiones en el orden del cuestionario y afirmaciones con dos etiquetas. Pasará a devolver `DetallePartidaLlegada`, ya ordenado y clasificado:
  - del instrumento: `instrumento`, `nombre`, `etiqueta` (`_etiqueta`), `lectura` (`textos_instrumento(..., 'orientadora')`), `estado`, `fecha_partida` y `fecha_llegada` (de `partida_resumen`);
  - `conteo`: lista `[{codigo, cantidad}]` sin ceros. Por zona (`POR_TRABAJAR`, `EN_CAMINO`, `FUERTE`) o por cambio (`BAJO`, `SUBIO`, `IGUAL`);
  - `opciones_bajas`: el número del parámetro, para la leyenda;
  - por dimensión: `codigo`, `nombre`, `zona_partida`, `zona_llegada`, `cambio`. Las zonas salen de `autopercepcion.comparar` (lo mismo que `partida_resumen`). El orden es el de §2.2; «sigue por trabajar» es `ComparacionDimension.sigue_por_trabajar`;
  - por afirmación: `item`, `enunciado`, `partida`, `llegada` (etiquetas), `partida_baja`, `llegada_baja` y `cambio` (nulo en solo partida o sin una respuesta), en el orden de §2.3.
- Sin partida, `estado = SIN_PARTIDA` y `dimensiones = []`.
- No hay puntajes ni diferencias en la respuesta. Para ordenar se usa el valor dentro del servicio.
- `partida_resumen` recibe las `Lecturas` del perfil (alcance de ese estudiante), como ya acepta, para no repetir mediciones.
- Acceso igual que hoy.

#### Backend · estudiante (§3.2)

- **`respuestas_actuales` → `RespuestaPublica.baja`:**
  - el instrumento sale de la caché (actividad → aplicación);
  - si su tipo es COMPARACION, lee el parámetro (1 consulta) y marca cada respuesta con `es_respuesta_baja`;
  - en otro tipo, `baja = None` sin consultar.
  - El parámetro se lee con `instrumentos.parametros.leer_parametros`, el mismo lector del panel (una consulta).
- **`comparacion_autopercepcion` → `ComparacionItem.direccion`:** sin consultas nuevas (diferencia 2). Los demás campos no cambian y el apoderado no se toca.

#### Front · orientadora (§2, §6)

- **Componente nuevo `DetallePartidaLlegada.tsx`** en `features/counselor/components/perfil/`, con `BloquePanel`, `ChipPerfil`, `TONO_ZONA` y `TONO_CAMBIO`. Reemplaza `TodasLasRespuestas` en `PestanaTests.tsx`, que se retira.
  - **Cabecera:** «← Tests», título y etiqueta, línea de fechas, caja con `lectura` y chips de conteo.
  - **Leyenda:** en solo partida, el chip «Respuesta baja» con su explicación, y el número sale de `opciones_bajas`; con llegada, los cuatro chips de cambio.
  - **Bloques:** rejilla de dos columnas en solo partida y una columna con llegada.
  - **Tablas:** con desplazamiento horizontal en pantallas angostas.
  - Sin partida, solo el mensaje.
- **Textos del front** (`adaptadoresPanelEstudiante.ts`):
  - «Sigue baja», «Mejoró» y la leyenda;
  - conteos en singular y plural («1 bajó», «4 subieron», «3 por trabajar»).
- **Sin cambios:** la URL sigue con `?todas=1` (`usePerfilEstudiante`) y el almacén es el mismo (`usePartidaLlegadaPerfil`); solo cambia el tipo.
- `PartidaLlegadaPerfil.tsx`: el botón pasa a «Ver detalle por dimensión».

#### Front · estudiante (§5, §6)

- **CSS** (`partida-llegada.css`): variantes nuevas del chip `sx-d-pl-chip-aviso` y `sx-d-pl-chip-exito` (fondo `--warning-soft`/`--success-soft`, texto `--warning-text`/`--success-text`), más `sx-d-pl-chip-zona-<zona>`, que mapea Por trabajar → aviso, En camino → neutro y Fuerte → éxito.
- **`ZoneChips`:** chip de zona con su tono. Si cambió: partida en contorno neutro (`-outline`), flecha y llegada con su tono. «Se mantuvo» y un chip con su tono. Lo hereda la tarjeta de la página I.
- **`PartidaLlegadaSynthesis`:** los contadores de zona toman el tono de su zona. Los de «avanzaron» y «se mantuvieron» no cambian. Texto, gráfico y bloque sellado tampoco.
- **`ItemComparisonGrid`:**
  - en modo `partida`, «Al inicio» en ámbar si `baja`;
  - en modo `cambio`, inicio neutro y cierre en verde si `direccion = SUBIO` o en ámbar si `BAJO`, en lugar de `-strong`.
  - Una que sube y sigue baja va en verde (§5.2).
- **`PartidaLlegadaAnswers`:** leyenda bajo el título con los chips de zona y, en solo partida, «Las respuestas resaltadas son las que más puedes trabajar en el camino»; en el estado completo, «Mejoró» y «Bajó».
- **Datos:**
  - `partidaLlegada.ts` (`itemsPartida`) suma `baja` desde `RespuestaPublica`, y `ItemPartidaLlegada` suma `baja?` y `direccion?`;
  - tipos en `servidorInstrumentos.ts`.
- No hay peticiones nuevas. La rama COMPARACION sigue sin leer `puntaje`, `porcentaje` ni `diferencia`; `direccion` y `baja` no son ninguna de esas.

### Qué no cambia

- El cálculo de zonas y resultados, el revelado y el apoderado.
- Los textos del cuestionario.
- Las vistas de resultado de los otros instrumentos.
- El panel de arriba del estudiante, salvo los contadores.
- Las respuestas altas no se colorean.

### Modelo de datos

Sin cambios.

### Datos

- **`scripts/sembrar_panel_ejemplo.py`.** `Sembrador.autopercepcion` acepta valores por ítem, además de por dimensión.
  - Caso 7: una dimensión que baja (ya está), una afirmación que sube y sigue baja, y un ítem inverso que cambia.
  - Caso 2: respuestas bajas en la partida, incluido el ítem inverso.
- Se regeneran los fixtures del front: los `contenido-panel-*` de tests y partida-llegada, más los de `ruta` de comparación y respuestas de `t-partida`. Si el detalle de la orientadora no se exporta hoy, se agrega su export para los casos 1, 5 y 7 (sin partida, solo partida y con llegada).

### Pruebas (§7)

- **Unidad (`tests/unit/instrumentos`):**
  - `es_respuesta_baja` con un ítem directo y uno inverso;
  - `cambio_afirmacion` en todos los casos de §7, incluidos sube y sigue baja, inverso que mejora y sin respuesta.
- **`tests/integration/panel`:**
  - detalle en los dos estados y sin partida: órdenes y desempates, conteos sin ceros y `lectura` presente;
  - sin puntajes en la respuesta;
  - cambiar `PANEL_OPCIONES_BAJAS` cambia la marca;
  - `_grupos` con una afirmación que sube y sigue baja: sale solo en «Siguen bajas»;
  - un estudiante de otro salón da 404;
  - `respuestas_autopercepcion` da lo mismo que antes sobre los ejemplos.
- **`tests/integration/instrumentos`:**
  - `RespuestaPublica.baja` en partida y nula en RIASEC;
  - `direccion` en `/comparacion`;
  - la misma marca que el panel para la misma respuesta;
  - cambiar el parámetro cambia la marca;
  - los campos anteriores, intactos.
- **Presupuestos:**
  - `test_panel_presupuestos.py`: el detalle cuenta lo de hoy más, como mucho, la lectura de resultados para las zonas. Se informa el antes y el después.
  - `test_presupuestos_instrumentos.py`: `/respuestas` de `t-partida` = hoy + 1 y la de RIASEC = hoy.
  - `/comparacion` gana su prueba de presupuesto: igual a hoy.
- **Front (`npm run test:servidor`):**
  - render del detalle en los dos estados y sin partida;
  - render del estudiante en los dos estados, con una respuesta baja, una que sube y una que baja;
  - tarjeta de la página I con el tono de zona;
  - la prueba de «no lee puntajes» sigue en verde.

### Fases

5. **F5 Medición.** Se cuentan las consultas de hoy del detalle, de `/respuestas` (t-partida y RIASEC) y de `/comparacion`, y se informan. Sin commit.
6. **F6 Backend.** Funciones comunes, detalle, `_grupos`, campos del estudiante, pruebas y presupuestos.
7. **F7 Ejemplos y contrato.** Casos 2 y 7, fixtures y contrato.
8. **F8 Front de la orientadora.** Detalle nuevo, botón y pruebas de render.
9. **F9 Front del estudiante.** Chips con tono, leyenda, contadores y pruebas.
10. **F10 Cierre.** `panel.md`, `instrumentos.md`, `origen-de-datos.md`, `decisiones.md` y suite completa de los dos repos. La spec queda en curso.

Commit por fase: `Ajuste color-partida-llegada · F<n>: …`.

### Verificación

- El subagente `pruebas` corre, por fase, las carpetas de impacto (`panel`, `instrumentos`, `unit/instrumentos`, `contrato`, `escenarios`) y `npm run test:servidor`.
- Al cierre corre todo: pytest, `npm test`, `build`, `lint` y `check:estructura`.
- Con `sembrar_panel_ejemplo.py --desarrollo`, se revisan en el navegador el detalle de los casos 2, 5 y 7 y el libro de Helena del estudiante en los dos estados.
