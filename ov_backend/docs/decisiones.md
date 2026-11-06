# Decisiones de la spec en curso

## Ajuste conversaciones

- Diez conversaciones de un catálogo de doce: la 3 pasa a pregunta guía de conv-4, la 7 sale, la 12 se une a conv-10 y se agrega conv-9, porque así lo decidió el usuario.
- conv-1 y conv-2 se abren con la carta; las demás, con el registro del camino que trabaja su tema y siempre una actividad requerida, para que las cartas siempre puedan entregarse.
- La tarjeta muestra la temática como chip; conv-2 y conv-5 comparten «Valores».
- Responder no es conversar: ningún texto de pantalla en api afirma que conversaron y las reflexiones parten de lo leído; `conversada` y `COMPLETA_CONVERSACION` no cambian porque son nombres internos.
- «Algo que ya saben» pasa a «Conectando nuestros caminos» y el título al responder es fijo, «Dos miradas al respecto», porque el contenido no depende del momento de lectura.
- Las cifras de inadecuación e informalidad van con población, periodo y fuente vigentes (Minedu y UNESCO, 2026; INEI, abril 2025–marzo 2026), o sin número donde basta la idea, porque las anteriores no tenían una base precisa.
- `b3_10.json`: conserva «Se abrió una voz nueva en tu mochila» y solo cambia el nombre de la conversación, porque el documento citaba un texto anterior al ajuste testimonios.
- `b4_5.json` deja de anunciar «Lo que cuesta y cómo lo haremos», porque ya no existe y b4-5 no abre ninguna (aprobado por el usuario).
- FP02 y `p2.json` dicen «una de las conversaciones guiadas» en lugar de «la primera», porque las expectativas ahora son conv-4 (aprobado por el usuario).
- `ParentConversationsCard` y el aria-label de `PuntosRegalo` dicen que respondieron, aunque no estaban en la tabla, por el mismo criterio (aprobado por el usuario).
- F17 y `b3_10.json`: «Entre los demás, parte cambió de rumbo…», porque con la cifra nueva «Parte de ellos» apuntaba a quienes sí trabajan en lo suyo (aprobado por el usuario).
- Las líneas de fuente de `b0_5`, `b1_4`, `b3_3`, `b3_10`, `ma7` y `p5`, y una explicación de `b3_3` que atribuía el dato al MTPE, se alinean con las fuentes nuevas, porque contradecían la cifra que acompañan.
- Las pruebas de recorrido van en `test_recorrido_contenido.py` y no en un archivo nuevo, porque usan sus ayudas y ninguna prueba importa un `test_*.py`.
- `claude/fichas-plataforma.md` no está en el repo: lo actualiza el usuario en su proyecto.
- Pendiente de revisar aparte (población, periodo y fuente): «siete de cada diez emprendedores empiezan por falta de empleo» (F17 y `b3_10.json`) y «solo tres de cada diez jóvenes pasan a educación superior» (`b3-5-p12`, `b3-b-p08`).
- `TipoObjetivo` del front decía `CONVERSACIONES` y el backend envía `CONVERSACION`, así que la fila «Conversaciones disponibles» del cierre nunca salía. Se corrige el tipo y el filtro de `finishSummary`, y se adapta la entrada de tres pruebas de `servidor-cierre`, que usaban ese nombre directamente o por los fixtures antiguos `completar-mission-next-step.json` y `desbloqueos-no-vistos.json` (no generados, no se editan); lo encontró la prueba en la aplicación real.
