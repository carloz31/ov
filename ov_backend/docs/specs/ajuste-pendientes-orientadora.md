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
