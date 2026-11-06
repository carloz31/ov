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
- Tres textos encontrados en la prueba real (aprobado por el usuario): con el otro ya respondido, la nota al responder dice que no se podrá editar, porque la anterior prometía lo contrario; «Tema N de M listo» pasa a «X de M temas listos», porque usaba el orden del tema y no lo respondido; `p6.json` deja de decir «la primera se abre», porque el apoderado las ve todas.
- «Conversaciones disponibles» en el cierre es una fila informativa, sin «Ir», por pedido del usuario al verla en pantalla; se adapta la prueba que exigía el enlace.

## Ajuste entrevistas por familia

- Modelo (migración 0046): `investigacion` y `entrevista` apuntan a `familia_carrera` en lugar de `ocupacion`, y `entrevista` suma `dedicacion`, para que más estudiantes coincidan en un tema y tengan más profesionales a quienes buscar; sin `dedicacion` se perdía a qué se dedica la persona.
- Los datos anteriores se eliminan por decisión del usuario, porque solo eran de prueba; también sus eventos, para que su referencia no se lea como una familia.
- Nueva `vista=SALON_Y_LEYENDAS`, porque el detalle de carrera muestra las dos y las vistas existentes eran excluyentes.
- El buscador del paso 1 busca solo por nombre de familia, por decisión del usuario.
- Las F6 y F7 del plan van en un solo commit, porque la regla del repo pide el cambio de modelo junto con su contrato.
- Textos de investigaciones: solo cambian los que hablan de elegir o investigar una ocupación. Los que hablan del oficio de la persona entrevistada siguen, porque siguen siendo ciertos; F18 cambia una frase. Las ayudas de las vistas solo locales no se tocan.
- Entrevistas de ejemplo en `scripts/sembrar_entrevistas_ejemplo.py` y no en `contenido`, porque ese conjunto se despliega; los videos son de los testimonios, solo para que el reproductor funcione.
- Sin decidir: F18 y `investigador.json` hablan de «cinco preguntas base» y el guion usa 3 (`PREGUNTAS_BASE_GUION`); ya existía antes de este ajuste.
- La descripción de la reacción «Aprendí algo» pasa a «sobre este trabajo», porque decía «la ocupación»; se encontró en la prueba real.
- La barra y Configuración de la orientadora muestran, en api, el nombre de la cuenta con sesión, como ya hace el apoderado (`useCounselorProfile`); la sesión no trae correo, así que ese campo queda vacío en api, y local conserva su perfil de demostración.
