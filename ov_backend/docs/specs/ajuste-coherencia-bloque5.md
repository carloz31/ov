# Ajuste coherencia-bloque5

## Contexto

Reescritura, ya decidida por el usuario, del contenido del bloque 5 (el faro, `b5-1` a `b5-5`), de la ficha F21, de una frase de F02 y una ficha nueva F24 (el pergamino). Con esto ningún diálogo de `plataforma/` lleva `eco` y el bloque deja de nombrar el informe de viaje y a la orientadora. Los textos van **tal cual** del texto de observaciones (`ajuste-coherencia-bloque5.md`) y de los cinco JSON adjuntos. No hay spec en curso: el ajuste tiene su propia spec `ov_backend/docs/specs/ajuste-coherencia-bloque5.md`. Rama `ajuste/coherencia-bloque5` (ya creada desde `main`).

## Qué cambia (hoy → pasará a)

### Front
- `ov_frontend/src/data/activities/contenidos/plataforma/b5_1.json` … `b5_5.json`: hoy el contenido anterior (b5-1 con `eco` en `b5-1-06`, `_nota`, título «Mi informe de viaje» en b5-5) → cada uno se reemplaza completo por el adjunto (copia de `C:\Users\mauri\Downloads\b5_N.json`).
- `ov_frontend/src/data/activities/catalogo.json`, personaje `vigia`: solo cambia `descripcion` al texto de §3.1.
- `ov_frontend/docs/contenidos-actividades.md`:
  - línea 22 (eco de diálogo): «En `plataforma/` ya solo lo usa `b5-1-06`» → ningún JSON de `plataforma/` lo usa; el código se conserva por `t_eco` y `t_lee_cuestionario` (conjunto `ruta`).
  - línea 91 («Datos del estudiante»): sale «Queda uno, `b5-1-06`…»; queda que el código se puede retirar cuando `ruta` deje de usarlo.
  - línea 117 («Textos que no siguen los criterios»): sale la entrada de `b5-1-06`.
- Sin cambios de código del front: `ResourceText.tsx` ya pinta tablas, listas, negrita, enlaces y citas (`>` → `<blockquote>`, l. 42); se revisa en el navegador. Ninguna lista del front enumera fichas por código (solo fixtures generados).

### Backend (solo `ov_backend/datos/contenido.py`, conjunto `contenido`)
- `ACTIVIDADES` (l. 118): título de b5-5 «Mi informe de viaje» → «Lo que decía el pergamino».
- `DESCRIPCIONES` (l. 249-253): las cinco de §2.2.
- `REGLAS`: mensajes de `R-B5`, `R-b5-1`, `R-b5-2`, `R-F21` (§2.3), condiciones iguales; nueva `R-F24` tras `R-F23` (§2.4).
- `FICHAS`: F21 nueva descripción y contenido completo (§2.5; título, tema «Mis opciones» y audiencia iguales); F24 nueva tras F23 (§2.6); F02 solo la frase de «Para tu viaje» (§2.7).
- Los textos markdown se trasladan con un script de un solo uso (en el scratchpad) que extrae los bloques ```markdown``` del texto de observaciones y escribe su `repr` en la tupla, para no reteclear nada.

### Pruebas y docs
- `ov_backend/tests/integration/datos/test_carga_contenido.py` l. 69: `len(fichas) == 31` → 32, y se suma `fichas['F24'].audiencia == ESTUDIANTE` (autorizado en §4).
- `ov_backend/AGENTS.md` (tabla «Datos»): «las 31 fichas» → «las 32 fichas».
- Fixtures del front: se re-exporta (`scripts/exportar_fixtures_front.py`) y se revisa el diff; si los `contenido-*` no cambian, no hay nada que commitear.
- `ov_backend/docs/decisiones.md`: las decisiones de §7 y las propias del ajuste.

## Qué no cambia
- Conjunto `ruta` y sus pruebas; el código del front que pinta el eco de un diálogo (lo usan `t_eco` y `t_lee_cuestionario`).
- `REFERENCIAS` (las de b5-1 y b5-3 las usan sus ítems), `ITEMS` de `b5-1-seguridad` y `b5-3-cambio`, tarjetas del LLM, `TEST-PARTIDA-LLEGADA`, duraciones y demás títulos en `ACTIVIDADES` (ya están en 8/10/5/6/8).
- Condiciones de reglas, F22, F23, las demás fichas, plan, mochila, libro. Nada del informe de viaje. `docs/requisitos.md` (HU del informe) no se toca.
- `ov_backend/docs/historico/`.

## Modelo de datos
Sin cambios.

## Fases
1. **F1 · contenido:** los cinco JSON, `catalogo.json`, `contenido.py` (título, descripciones, reglas, F21, F24, F02), `test_carga_contenido.py`, `AGENTS.md`. Pruebas: `tests/integration/datos` y `tests/integration/escenarios` (back), `scripts/verificar_contenido_front.py`, y en el front `npm test` de las carpetas de actividades + `npm run test:servidor`. Re-exportar fixtures. Commit `Ajuste coherencia-bloque5 · F1: …`.
2. **F2 · cierre:** `contenidos-actividades.md`, `decisiones.md`; búsquedas de §6 (`"eco"` en `plataforma/`, «informe» y «orientadora» en `b5_*.json`); suites completas de ambos repos (`uv run pytest -n auto -q`; `npm test`, `build`, `lint`, `check:estructura`); revisión en el navegador con el conjunto `contenido` según §6 (bloqueos y mensajes, cada actividad, reingreso, «Anterior», lo que se abre, F24 como cita, F21 tablas y lista, F02, pantalla angosta). Commit `Ajuste coherencia-bloque5 · F2: …`.

La spec queda en curso; cerrarla es decisión del usuario.

## Verificación
- `uv run python scripts/verificar_contenido_front.py` sin discrepancias.
- Suites completas en verde con el subagente `pruebas`.
- Navegador (preview del front en modo api contra el backend con `contenido`): recorrido de §6.

## Preguntas abiertas
Ninguna.

---

# Anexo · texto de observaciones


Para `/ajuste coherencia-bloque5`. Revisado contra `main` del repo `carloz31/ov`, commit `5f49fc3` (13 nov 2026), que ya trae los bloques 0 a 4.

Este ajuste se apoya en lo que trajeron los bloques anteriores: una `pregunta` dentro de un registro, pasos después del último ítem, «Anterior» en todos los pasos y las tablas de las fichas sin la fila de guiones.

## Qué es

Reescritura del contenido de las cinco actividades del bloque 5, el faro (`b5-1` a `b5-5`), de la ficha `F21`, de una frase de la ficha `F02`, y una ficha nueva, `F24`. Con este ajuste ningún diálogo de `plataforma/` lleva ya el campo `eco`, y el bloque deja de nombrar el informe de viaje, que todavía no existe. Los textos ya están decididos por el usuario: **no se reescriben, no se resumen y no se «mejoran»**. El ajuste los coloca en su lugar y comprueba que la plataforma los muestre bien.

Esta carpeta trae, junto a este documento, cinco JSON finales: `b5_1.json` · `b5_2.json` · `b5_3.json` · `b5_4.json` · `b5_5.json`.

No hay batallas en el bloque ni bancos de preguntas.

Todo lo del backend va **solo en el conjunto `contenido`** (`ov_backend/datos/contenido.py`). El conjunto `ruta` y sus pruebas no se tocan.

## 1. JSON de las actividades

**Hoy:** `ov_frontend/src/data/activities/contenidos/plataforma/b5_1.json`, `b5_2.json`, `b5_3.json`, `b5_4.json` y `b5_5.json`.
**Pasará a:** cada uno se reemplaza, completo, por el archivo del mismo nombre de esta carpeta.

| Actividad | Tipo | Nodos (hoy → queda) | Lo que conviene saber |
|---|---|---|---|
| b5-1 Mi proyecto | Registro | 7 → 12 | **Lleva una `pregunta` (`b5-1-07`) y dos pasos después del ítem.** Una lámina de Teresa en vez de dos. **Sale el último `eco` de un diálogo.** `duracionEstimadaMin` pasa de 12 a 8 |
| b5-2 Mi punto de llegada | Cuestionario | 5 → 6 | Solo diálogos alrededor del cuestionario. El nodo del ítem pasa de `b5-2-04` a `b5-2-05`; **cambia su `etiqueta`** («Marca cuánto te describe hoy:» → «¿Qué tan de acuerdo estás hoy?») |
| b5-3 Mirar el camino | Registro | 3 → 7 | **Lleva una `pregunta` (`b5-3-04`) y un paso después del ítem. Entra Teresa:** `personajeIds` pasa a `["vigia", "companero"]` y el `hablanteId` de la consigna, de `companero` a `vigia`. `duracionEstimadaMin` pasa de 8 a 5 |
| b5-4 La sala de la luz | Informativa | 6 → 7 | **Entra el guardián:** `personajeIds` pasa a `["helena", "guardian", "companero"]`. Sin preguntas ni láminas |
| b5-5 Lo que decía el pergamino | Informativa | 9 → 10 | **Cambian `titulo` («Mi informe de viaje» → «Lo que decía el pergamino») y `subtitulo` («Una sola frase»).** Dos láminas: `b5-5-02` no tiene presentador, lleva `etiqueta` y un solo párrafo; `b5-5-07` es de Helena |

Lo demás:

- Los ítems de los dos registros (`b5-1-seguridad`, `b5-3-cambio`) no cambian: ni consigna, ni opciones, ni piezas, ni tarjetas del LLM, ni las frases que los presentan. El cuestionario (`TEST-PARTIDA-LLEGADA`) tampoco.
- **Ningún diálogo de estos JSON lleva `eco`.** Hoy lo lleva `b5-1-06` (`b5-1-ref-planes`). El proyecto, los pasos y la primera señal se siguen mostrando en el ítem, que los trae del servidor. Las referencias no se tocan en el backend.
- Los identificadores de nodo que no son ítems cambian en las cinco. Comprobar con una búsqueda en el repo que ninguno se use en el backend, en las pruebas ni en otros archivos del front.
- Sale el campo `_nota` de `b5_1` y `b5_3`. Sale la `nota` de las elecciones de `b5_4` y `b5_5`.
- Cambia `objetivoAprendizaje` en `b5_4` y `b5_5`.
- En las preguntas, las opciones tienen un largo parecido y la posición de la correcta varía (segunda, tercera, segunda). Los textos van tal cual.
- Los nombres entre comillas que citan la pantalla son los de hoy en el front: «Mis próximos pasos», «Mis planes», «Mis dudas» (dentro de «Qué tanto la conozco») y «Cuánto costaría»; en el cuestionario, de «Nada de acuerdo» a «Muy de acuerdo». Si alguno no coincide con lo que se ve, avisar antes de cambiar el texto.
- **Ningún texto del bloque nombra el informe de viaje ni a la orientadora.**

## 2. Datos del backend (`ov_backend/datos/contenido.py`)

### 2.1 Título (`ACTIVIDADES`)

| Actividad | Hoy | Queda |
|---|---|---|
| b5-5 | «Mi informe de viaje» | «Lo que decía el pergamino» |

Los demás títulos y las duraciones no cambian.

### 2.2 Descripciones cortas (`DESCRIPCIONES`)

| Actividad | Hoy | Queda |
|---|---|---|
| b5-1 | «Tu proyecto de hoy, qué tan seguro te sientes de él y qué te da o te quita esa seguridad.» | «Teresa, la vigía, cuenta qué tan segura estaba cuando le ofrecieron el faro. Mira tu proyecto de hoy y cuenta qué te da seguridad, o qué te la quita.» |
| b5-2 | «Lumi recuerda las preguntas de Helena. Tu punto de llegada, con el mismo instrumento del primer día.» | «En la escalera del faro hay una hoja con la letra de Helena: las preguntas de la cabaña. Respóndelas otra vez para ver tu llegada junto a tu partida.» |
| b5-3 | «Lo que dijiste al llegar, al lado de lo que tienes hoy: qué ves distinto y qué te hizo cambiar.» | «Teresa cuenta qué pensaba cuando llegó al faro y qué la hizo verlo distinto. Mira lo que dijiste al llegar y cuenta qué ves hoy distinto, y por qué.» |
| b5-4 | «La última escalera del faro. En la sala de la luz, sobre un atril, el pergamino con tu nombre.» | «La última escalera del faro. En la sala de la luz, sobre un atril, el pergamino.» |
| b5-5 | «Abres el pergamino: está escrito con tu letra. Helena explica por qué nunca dijo dónde estaba.» | «Abres el pergamino: trae una sola frase. Helena cuenta qué quiere decir y por qué nunca dijo dónde estaba.» |

### 2.3 Mensajes de reglas (`REGLAS`)

| Regla | Hoy | Queda |
|---|---|---|
| `R-B5` | «Compara tus planes para bajar al faro.» | «Pon a prueba tu orden con la moneda de Iván para seguir hacia el faro.» |
| `R-b5-1` | «Registra al menos un paso en tu Plan A para escribir tu proyecto con la vigía.» | «Anota al menos un paso en «Mis próximos pasos» de tu Plan A para mirar tu proyecto con la vigía.» |
| `R-b5-2` | «Escribe tu proyecto con la vigía.» | «Mira tu proyecto con la vigía del faro.» |
| `R-F21` | «Escribe tu proyecto con la vigía.» | «Mira tu proyecto con la vigía del faro.» |

Solo cambian los mensajes; las condiciones no. Las demás reglas del bloque no cambian.

### 2.4 Regla nueva (`REGLAS`)

```python
('R-F24', 'FICHA', 'F24', 'Abre el pergamino en la sala de la luz.', (('COMPLETA_ACTIVIDAD', 'b5-5', 'EVENTOS', 1),)),
```

Va junto a las demás reglas de fichas, con la misma forma que `R-F21`.

### 2.5 Ficha F21 · Después de decidir (`FICHAS`)

Título y tema no cambian. La descripción pasa de «Por qué una decisión vocacional es provisional, qué viene en los meses siguientes y qué hacer si no ingresas.» a «Por qué una decisión se revisa, qué te da y qué te quita seguridad, qué viene después y qué hacer si no ingresas.» El contenido queda así, completo:

```markdown
Decidir no cierra el proceso: lo cambia de etapa. Lo que viene es prepararse, postular y ajustar, y conviene saber desde ahora cómo se ve.

### Una decisión que se revisa

Lo que eliges hoy es un rumbo, y se corrige con lo que vas sabiendo:

- Vas a saber más de la carrera cuando la estudies que ahora.
- La oferta y el trabajo cambian en los años que dura una carrera.
- Tú cambias. Lo que valoras a los 17 se amplía a los 22.

Tener un Plan B no es dudar del A: es saber qué harías si no sale. Y parte de lo que venga no se puede planear: un curso que no esperabas, un trabajo de verano, alguien que te cuenta de su oficio. Conviene tener un rumbo y, a la vez, seguir probando cosas.

### Qué te da seguridad y qué te la quita

Tener una seguridad a medias sobre tu proyecto es normal a esta altura. Ayuda saber de dónde sale:

| De dónde sale | Ejemplo |
| --- | --- |
| Lo que ya hiciste | Fuiste a la charla, hablaste con alguien de la carrera, resolviste un examen de práctica. Es lo que más pesa |
| Lo que viste en otros | Alguien parecido a ti, de tu colegio o de tu barrio, que lo logró |
| Lo que te dicen | Alguien que te conoce y te dice, con razones, que puedes |
| Cómo te sientes ese día | Los nervios antes de un examen no dicen cuánto sabes |

Lo que te quita seguridad casi siempre tiene nombre: el examen, la plata, lo que dirán en casa, no saber cómo es la carrera por dentro. Con nombre, se puede averiguar o preparar.

Poca seguridad no quiere decir que el plan sea malo, y mucha no quiere decir que esté resuelto. Las dos dicen qué mirar ahora.

### Lo que viene, y cuándo

Cada institución tiene su calendario, y algunos empiezan antes de que termines el colegio.

| Qué | Cuándo suele ser | Qué conviene |
| --- | --- | --- |
| Tus notas del colegio | Hasta fin de año | Varias becas y modalidades de admisión las miran |
| Beca 18 | Se postula el año anterior al de estudios. Para estudiar en 2027, la inscripción cerró en octubre de 2026 | Si no llegaste, puedes postular a la siguiente convocatoria con la secundaria terminada |
| Exámenes de admisión | Varias universidades públicas toman dos al año, y algunas el primero cuando todavía estás en 5.°: San Marcos tomó en octubre de 2026 el examen para empezar en 2027 | Mirar el cronograma en la página de admisión de cada institución |
| Preparación | Los meses previos al examen: academia, centro preuniversitario o por tu cuenta | Conseguir el temario oficial antes de pagar nada |

### Y si no ingreso

Ingresar a una universidad pública es difícil: en promedio son seis veces más selectivas que las privadas, y es común no lograrlo a la primera. No ingresar no dice cuánto vales. Hay cuatro salidas:

1. **Postular de nuevo**, con más preparación y sabiendo ya cómo es el examen.
2. **Entrar por otra modalidad o a otra institución**, y evaluar después un traslado. Para pedirlo hay que haber aprobado unos dos años de estudios (cuatro ciclos o 72 créditos), y cada universidad decide cuántos cursos reconoce.
3. **Empezar por una carrera técnica** y continuar después en la universidad. Cuánto te reconocen lo decide cada universidad: pregúntalo antes de matricularte.
4. **Un año entre el colegio y los estudios**: trabajar, llevar un curso corto, conversar con alguien de la carrera. Rinde más si sabes para qué lo usas.

Si no ingresas dos veces a la misma institución, revisa el plan, no tu valor: a veces es la preparación, a veces la modalidad, a veces la institución.

### De una duda a un paso

Un proyecto avanza con pasos chicos. En tu plan, «Mis próximos pasos» no lleva fechas: cada paso está pendiente o hecho. Un buen paso sale de algo que te quita seguridad:

- «No sé cómo es el examen»: conseguir el temario y resolver uno de práctica.
- «No sé si alcanza la plata»: hacer la cuenta en «Cuánto costaría» y mostrarla en casa.
- «No sé cómo es la carrera por dentro»: conversar con alguien que la estudia o trabaja en eso.

> Elegir es el primer paso de un camino, no el último.

**Para tu viaje.** En «Mi proyecto», con Teresa, miras tu proyecto de hoy, marcas qué tan firme lo sientes y cuentas qué te da o te quita seguridad. En tu plan, lo que te falte saber va a «Mis dudas», dentro de «Qué tanto la conozco», y lo que vas a hacer, a «Mis próximos pasos».

**Fuentes:** MINEDU (2013), cartilla, estación 5 y actividad 17. Bandura (1997), Self-efficacy: The exercise of control. Krumboltz (2009), The Happenstance Learning Theory, Journal of Career Assessment, 17(2). Sunedu, III Informe bienal sobre la realidad universitaria en el Perú. Ley N.° 30220, Ley Universitaria (traslados), y Ley N.° 30512. [Pronabec, Beca 18](https://www.pronabec.gob.pe/beca-18). [El Peruano (2026), admisión 2027-I de San Marcos](https://elperuano.pe/noticia/305929-examen-de-admision-unmsm-2027-postulantes-tienen-hasta-el-9-de-octubre-para-inscribirse).
```

La ficha lleva dos tablas (de dos y de tres columnas), una lista numerada con negrita y listas simples. Revisar que `ResourceText.tsx` lo muestre bien, también en pantalla angosta.

### 2.6 Ficha nueva F24 · El pergamino (`FICHAS`)

Se agrega después de `F23`, con la misma forma de tupla que las demás:

| Campo | Valor |
|---|---|
| Código | `F24` |
| Título | «El pergamino» |
| Descripción | «Lo que encontraste sobre el atril, en la sala de la luz del faro.» |
| Tema | «Decidir mi futuro» |
| Audiencia | `ESTUDIANTE` |

Contenido, completo:

```markdown
> Quien llega hasta mí ya trae lo que vino a buscar.
```

- **La ficha es así de corta a propósito:** es el pergamino. No lleva secciones, «Para tu viaje» ni fuentes. No agregar nada.
- Si la mochila o el modal de la ficha dependen de que el contenido tenga más de un bloque, o de alguna sección, avisar antes de cambiar el texto.
- Si alguna lista del front enumera las fichas por código (fixtures, pruebas), se suma `F24`.

### 2.7 Ficha F02 · Lo que pesa cuando decides (`FICHAS`)

Solo cambia una frase de «Para tu viaje». **Lo demás queda idéntico a lo que hay en `main`.**

| Hoy | Queda |
|---|---|
| «Más adelante, en el acantilado, el Eco te pondrá casos de compañeros para que reconozcas qué les faltó.» | «Más adelante vas a practicar con las razones de otros viajeros: reconocer cuál va sola y qué le faltó.» |

La frase anterior («El camino mira primero lo que viene de ti y después lo que viene de afuera.») no cambia.

## 3. Front, fuera de los JSON del bloque

### 3.1 Personaje (`ov_frontend/src/data/activities/catalogo.json`)

| Personaje | Hoy | Queda |
|---|---|---|
| `vigia` | «Enciende la luz del faro cada noche para los que todavía están en el mar. Sabe que nadie navega en línea recta. Serena; habla de la decisión como ruta provisional.» | «Enciende la luz del faro cada noche para los que todavía están en el mar. Llegó a ayudar al vigía anterior por un invierno y se quedó. Ve a los barcos corregir el rumbo toda la noche. Serena, de pocas palabras.» |

Solo cambia `descripcion`. Los demás personajes no cambian.

### 3.2 El eco de un diálogo

- Con este ajuste, **ningún JSON de `plataforma/` lleva `eco` en un diálogo.**
- **El código del front que pinta el eco de un diálogo no se retira:** lo siguen usando dos diálogos del conjunto `ruta` (`t_eco.json`, nodo `t-eco-recuerdo`, y `t_lee_cuestionario.json`, nodo `t-lee-cuestionario-cita`).
- `REFERENCIAS` no se toca: las referencias de b5-1 y b5-3 las usan sus ítems.
- Si `ov_frontend/docs/contenidos-actividades.md` dice que queda un eco de diálogo en `plataforma/` (b5-1), se actualiza.

## 4. Pruebas que leen textos que cambian

- `ov_backend/tests/integration/datos/test_carga_contenido.py` comprueba `len(fichas) == 31`: pasa a 32. Si conviene, se suma una comprobación de que `F24` es de `ESTUDIANTE`.
- Si alguna prueba o fixture compara el título de b5-5, las descripciones, los mensajes de las reglas, la ficha F21 o la cantidad de nodos del bloque 5, se actualiza con los valores de este documento. No se cambia el comportamiento que prueban.
- Si alguna prueba o fixture del front espera el eco en `b5-1-06`, se actualiza.
- Si `scripts/exportar_fixtures_front.py` exporta títulos, descripciones o fichas que cambiaron (el título de b5-5, `F24`), se vuelve a exportar después de cambiar el backend.
- Los textos anteriores siguen en `ov_backend/docs/historico/`: no se tocan.

## 5. Qué no cambia

- El conjunto `ruta` y sus pruebas.
- Las condiciones de las reglas de desbloqueo y lo que abre cada actividad, salvo la regla nueva `R-F24`.
- Los ítems de los registros, sus tarjetas del LLM (`datos/tarjetas_registros`) y sus huellas. El cuestionario de partida y llegada y su página en el libro.
- `REFERENCIAS`, las duraciones y los títulos, salvo el de b5-5.
- Las fichas `F22` y `F23` y sus actividades (la feria y ma5).
- La pantalla del plan, la mochila y el libro de Helena.
- Nada del informe de viaje: no se crea ninguna pantalla ni servicio.
- Las actividades de los demás bloques y sus fichas, salvo la frase de F02 (§2.7).

## 6. Comprobaciones

- `scripts/verificar_contenido_front.py` sin discrepancias.
- Suites completas del backend y del front.
- Buscar `"eco"` en los JSON de `plataforma/`: no queda en ningún diálogo.
- Buscar «informe» y «orientadora» en `b5_*.json`: no aparecen.
- En el navegador, con el conjunto `contenido`:
  - **Bloque 5 bloqueado:** el mensaje dice «Pon a prueba tu orden con la moneda de Iván para seguir hacia el faro.» Con el bloque abierto y sin pasos en el Plan A, b5-1 muestra el mensaje nuevo de `R-b5-1`.
  - **b5-1:** la elección con sus dos reacciones, la pregunta, la lámina, el ítem (que muestra el proyecto, los pasos y la primera señal) y los dos pasos de cierre. La frase «Desde el faro se ve tu proyecto entero…» aparece una sola vez, delante del ítem.
  - **b5-2:** los dos diálogos, la elección, la instrucción, el cuestionario completo y el cierre. La escala coincide con la que anuncia Lumi. Al terminar, la primera página del libro muestra el segundo sello.
  - **b5-3:** los diálogos de Teresa, la pregunta, el ítem (lo pide Teresa) y el paso de cierre. La frase «Esto dijiste cuando recién llegabas…» aparece una sola vez.
  - **b5-4:** el guardián con su avatar, la elección con sus tres reacciones y los dos diálogos de Helena.
  - **b5-5:** la lámina del pergamino (un solo párrafo, también en pantalla angosta), la elección, la pregunta con pista y explicación, la lámina final y los tres diálogos de cierre. En el mapa y en el panel aparece con su título nuevo.
  - **Reingreso:** volver a entrar a b5-1 y b5-3 ya entregados.
  - **«Anterior»:** recorrer las cinco de inicio a fin y de fin a inicio.
  - **Lo que se abre:** al cerrar b5-1, b5-2 y la ficha F21; al cerrar b5-2, b5-3; al cerrar b5-3, b5-4 y la pregunta del diario «Antes de salir»; al cerrar b5-4, b5-5; al cerrar b5-5, la ficha «El pergamino» en la mochila.
  - **Ficha F24:** se abre mostrando solo la frase, como cita.
  - **Ficha F21:** las dos tablas sin la fila de guiones, la lista numerada con negrita y los enlaces de las fuentes.
  - **Ficha F02:** «Para tu viaje» muestra la frase nueva.
  - **Después del cierre:** el libro, «Mis planes», el diario y la ciudad siguen abiertos.

## 7. Decisiones ya tomadas (para `decisiones.md`)

- **El pergamino trae una sola frase:** «Quien llega hasta mí ya trae lo que vino a buscar.» En la plataforma es una ficha nueva, F24, que se entrega al abrirlo.
- **El bloque no nombra el informe de viaje:** no existe todavía y no estaba terminado de plantear. Tampoco nombra a la orientadora.
- **Helena admite que sabía dónde estaba y que calló,** y da su razón: vio a muchos subir derecho al faro el primer día, leer la frase sin que les dijera nada y bajar creyendo que la isla los había engañado.
- **El guardián se despide en la puerta de la sala de la luz,** donde la aguja deja de apuntar a la luz y señala la puerta, como dijo en b1-7.
- **La historia de Lumi sigue guardada para el diario:** en el faro solo insinúa. Ya no cuenta cómo llegó a la isla ni anuncia que la deja.
- **Iván queda cerrado:** nunca llegó al faro y no le hizo falta.
- b5-1: Teresa cuenta qué tan segura estaba cuando le ofrecieron el faro, y eso muestra cómo se responde el ítem. La elección pregunta por los barcos y la analogía la hace Teresa después. La lámina trata de la seguridad; el calendario y «si no ingreso» quedan en la ficha.
- F21: sale la tabla por meses (ubicaba mal los exámenes y las becas) y «tres pasos con fecha»; entra qué da y qué quita seguridad; el calendario va por tema.
- b5-2: las preguntas están en una hoja de Helena, en la escalera. Lumi no sabe para qué están ahí y descubre al final el segundo sello del libro. No es una página nueva: es la primera.
- b5-3: entra Teresa, que sube al balcón. Cuenta una idea con la que llegó (que cuidar un faro era aburrido) y qué la cambió (ver de cerca lo que se hace).
- El mensaje de `R-B5` ya no dice «compara tus planes» ni «bajar».
- b5-5 pasa a llamarse «Lo que decía el pergamino».
- El código que pinta el eco de un diálogo se conserva: lo usa el conjunto `ruta`.
- F22 y F23 no se revisan en este ajuste.
- Salen del bloque: «Esto lo lee tu orientadora…», «capítulo», «pasos con plazo», la línea de tiempo del desierto, «con el mismo instrumento», los anuncios de lo que viene y los adjetivos con género dirigidos al estudiante.

## 8. Anotado para otros ajustes

- **El informe de viaje** (lotes B15 y F11): falta plantearlo. Cuando exista, se decide cómo se nombra en el cierre.
- **`h3.json`** todavía dice «aparece en tu informe de viaje». Se ve con las opcionales de la ciudad, junto con h1, h2 y ma3.
- **F22 y F23,** con la feria y ma5.
- **Datos que envejecen en F21:** la fecha de Beca 18 y el examen 2027-I de San Marcos (octubre de 2026).
- **Fuentes leídas solo en su resumen:** Bandura (1997), con la revisión de Usher y Pajares (2008); Krumboltz (2009); el III Informe Bienal de Sunedu (falta confirmar el año de los datos de «seis veces más selectivas»). La referencia de la cartilla (estación 5 y actividad 17) se dejó como estaba; no se pudo leer.
- **«Es común no lograrlo a la primera»,** los ejemplos de la tabla de seguridad y los ejemplos de pasos de F21 son criterio de orientador; no llevan fuente.
- **El código del eco de un diálogo** puede retirarse cuando el conjunto `ruta` deje de usarlo.
