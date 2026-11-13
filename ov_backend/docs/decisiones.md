# Decisiones de la spec en curso

- Casos de la Central (c1–c6, conjunto `contenido`): el mínimo para superarlos baja un punto a pedido del usuario (6→5 en los de 8 y 8→7 en los de 10), porque resultaban difíciles. Se adaptan `test_carga_contenido.py` y `test_casos_contenido.py`; `ruta` (`t-caso`, congelado) no cambia.
- Vista explicada de partida y llegada (api): se quita la frase de Helena del front bajo el título (`ResultHeader`), a pedido del usuario; queda solo la `lectura` del instrumento. Se adapta `servidor-partida-llegada.test.mjs`.

## Ajuste coherencia-apoderado

- Las ocho actividades del apoderado se reescribieron con un mismo criterio: cada una parte de una situación con un padre o una madre de motivos entendibles; el apoderado decide antes de leer la explicación; el tema va primero y la fuente al pie; las opciones equivocadas son verosímiles y su retroalimentación reconoce lo que tienen de cierto; el cierre deja una idea, una acción para la semana y la ficha.
- La plataforma le habla al apoderado de usted y en primera persona del plural solo para proponer («le proponemos…»). No hay elogios.
- Ninguna preferencia del padre se trata como el problema: querer la universidad o un camino que parece más seguro es válido; las actividades trabajan cómo y dónde decirlo.
- El dinero se trata de frente: qué estudiar lo decide el hijo o hija; cuánto puede aportar la familia lo decide la familia.
- Cada actividad tiene un solo tema y una forma distinta (p1 una familia a lo largo de un mes; p2 las expectativas y temores del apoderado; p3 la misma semana contada por un padre y su hija; p4 lo que el apoderado callaba a los 17; p5 apostar y luego mirar el dato; p6 una conversación en tres turnos; p7 tres ideas de carrera en un año; p8 una carta en dos versiones).
- Lo que el apoderado todavía no abrió (los temas de conversación, lo que hay tras el sello) se comenta sin enumerarlo.
- Actividades de 10 a 14 minutos; las fichas son material de consulta más largo, con «Dudas frecuentes de los padres».
- Las fuentes complementarias se verificaron una por una; lo que es recomendación del equipo de orientación va rotulado así; se retiraron las afirmaciones sin respaldo.
- Gastón Acurio sale como caso de `p4` y de `FP04` (su testimonio del estudiante no cambia).
- El diploma se llama «Diploma de compromiso» en todo el portal.
- En las preguntas del apoderado se quita el paso «Volver a intentarlo»: tras un error se puede marcar otra opción de inmediato (las equivocadas quedan con ✕ y deshabilitadas, y salen de la selección); el botón dice «Comprobar de nuevo». Una sola implementación en ambos modos, como excepción aprobada al modo local congelado; se adapta `tests/local/portales/parent-missions.test.mjs`, y por los textos del portal (4.1 y 4.2), `tests/local/aventura/adventure-rendering.test.mjs`.
- Si el `nodoActualId` guardado de una actividad del apoderado en curso ya no existe en su contenido, la actividad empieza de nuevo y se descartan sus intentos guardados (`progresoObsoleto`), sin migración: antes quedaba trabada en el primer nodo.
- `ResourceText` pinta una lista numerada con viñetas sangradas debajo de un ítem (FP05) como lista anidada; las fichas del estudiante no usan ese formato y no cambian.
- Las descripciones de p6 y p7 llevan las comillas rectas del texto de observaciones («"no sé"», «"quiero esperar"», «"no ingresé"»), tal cual.

## Ajuste coherencia-lumi

- La historia de Lumi se cuenta en cinco recuerdos (`lumi-1`…`lumi-5` en `contenido`), uno por nivel de amistad, que se abren con 1, 2, 3, 4 y 5 cartas (tope de 3 por día): `UMBRALES_AMISTAD` pasa a `(1, 2, 3, 4, 5)`, compartido con `ruta`. Las reglas se arman con `zip(RECUERDOS_LUMI, UMBRALES_AMISTAD, MENSAJES_RECUERDOS_LUMI, strict=True)`; `contenido` ya no toma los recuerdos de `ruta` y sale su fila de `PROVISIONALES`.
- La historia no depende del camino: se abre por amistad, así que ningún recuerdo nombra lo que pasa en el faro ni promete llegar al final. El «Hoy subí» de b5-5 queda como lo que se ve en el camino.
- Qué es Lumi: una estrella que se soltó del cielo la noche antes de ocupar el lugar que le asignaron sin preguntarle (la estrella fija que guía a los marineros). Cayó en el bosque de las voces y ahí talló su frase: «Nadie me preguntó». Cumple lo que b0-2 deja abierto.
- El tema de fondo no se explica: rechazar algo solo porque fue impuesto y explorar sin comprometerse nunca, frente a elegir después de explorar. Lumi termina eligiendo guiar a su manera, lo mismo que le asignaron, pero esta vez preguntándoselo. No hay láminas ni fuentes en los recuerdos.
- Lumi no tiene género tampoco en los textos del diario: «Compañía de ruta», «Quien te acompaña» y «…con Lumi…». Además, en la ayuda de Lumi (`GuideDialogue`), «Lumi · Quien te acompaña» y la etiqueta «Lumi, quien te guía», y el nivel local «Compañía de ruta» de `lumiBond.ts`; este último es del modo local congelado y el usuario lo aprobó como excepción (solo texto, sin tocar los umbrales locales).
- Se adaptan `test_recuerdos_lumi.py::test_el_conteo_tiene_el_tope_diario_de_la_amistad` (prueba el tope con el primer umbral que lo supera, el 4.º), `servidor-historia-lumi.test.mjs` (requisitos 1–5) y el conteo de `tests/local/actividades/contenidos.test.mjs`; los fixtures de `ruta` se regeneran por los umbrales.
- Un recuerdo de Lumi recién desbloqueado no se abre solo (decisión del usuario, que prevalece sobre lo que esperaba el texto de observaciones): queda en la historia como «Nuevo recuerdo · Toca para verlo» hasta que el estudiante lo abre, como ya establecían `ov_frontend/AGENTS.md` y `useJournalPage`. No cambia código.
- La tarjeta de amistad dice «Falta 1 carta» (y «Faltan n cartas» con más de una), a pedido del usuario: con un nivel por carta casi siempre falta una. `LumiBondPanel` es común a los dos modos; la corrección de texto vale también en local, como excepción aprobada. Se adapta `servidor-diario-vista.test.mjs`.
