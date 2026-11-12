# Decisiones de la spec en curso

## Ajuste coherencia-bloque0

Decididas por el usuario en el texto de observaciones:

- Las actividades presentan el tema dentro de la historia: primero el estudiante resuelve algo y después llega la lámina, corta. El detalle queda en la ficha.
- Lumi no tiene género en ningún texto, y no habla como profesor.
- La orientadora no se nombra en boca de los personajes: quién ve cada cosa se dice en una lámina o en la explicación de una pregunta.
- Se habla de carreras y ocupaciones, como en el catálogo.
- El libro de Helena tiene páginas con sello, no capítulos.
- «Opción inicial» no se le nombra al estudiante: solo se le dice que, si guarda pronto su plan, al final verá con qué idea empezó.
- La señal se llama «Tu señal de hoy», no «check-in».
- El aviso de misma familia no se muestra al estudiante: dos planes cercanos son normales. `GET /planes` sigue entregando `avisos` para la orientadora; sale el pendiente «Es a propósito».
- «Anterior» está en todos los pasos, salvo la pantalla de Lumi de un registro y el cierre. El cambio alcanza al modo local (excepción aprobada).

Tomadas en el ajuste:

- `NODOS_PERMITIDOS.instrumento` admite `diapositiva`, porque b0-3 lleva una lámina dentro del cuestionario y la validación de contenidos la rechazaba. `cuestionarioServidor` y el reproductor ya la pintan sin más cambios.
- Los textos de `t-ins-1` se sobrescriben en `contenido.py` a partir de `ruta.INSIGNIAS` y `ruta.TEXTOS_INSIGNIAS`, cambiando solo el requisito y el «cómo se consiguió», para no tocar `ruta` ni sus pruebas.
- Al rehacer una actividad, los intentos de una pregunta no se guardan: el reproductor los recuerda por nodo en esa visita (`intentosRevision`) para que la pregunta se vea resuelta al volver con «Anterior». Fuera de rehacer, ya se releen de los intentos del navegador.
- En un registro del servidor no había pasos después de la última consigna; desde el ajuste coherencia-bloque1 sí los hay (ver abajo).
- Pruebas adaptadas, autorizadas por las observaciones: `tests/local/actividades/actividades-anterior.test.mjs` (pregunta, paso tras una pregunta, registro entregado y primer ítem de un cuestionario ahora tienen «Anterior») y `tests/servidor/planes/servidor-planes-vistas.test.mjs` (el aviso de misma familia ya no aparece).
- Se borran los estilos `.sx-p-aviso`, que solo usaba el aviso de misma familia.

## Ajuste coherencia-bloque1

Decididas por el usuario en el texto de observaciones:

- Los registros pueden llevar una pregunta con respuesta correcta antes de los ítems y pasos de cierre después del último ítem.
- Quién ve los registros se dice una sola vez, en una lámina de b1-1 (el primer registro); sale de todos los registros el diálogo de Lumi «Esto lo lee tu orientadora…».
- Ningún texto anuncia en qué actividad reaparece lo que el estudiante escribe.
- Nadia no entrega ni traza un mapa del viajero: el mapa de la isla ya lo lleva y salió de su taller.
- El artefacto de Iván no lleva al pergamino de un salto: acerca cada vez un poco más y toma su rumbo de lo que el viajero entiende de sí; cuando se queda quieto, algo o alguien lo ayuda a orientarse.
- Familia se nombra en los diálogos de b1-3 sin explicar el módulo ni la carta.
- Las opciones de una pregunta, en actividades y batallas, tienen un largo parecido y distractores verosímiles; la correcta no se reconoce por ser la más larga.
- Las actividades y la ficha de mitos enseñan a no cambiar un mito por su versión al revés.
- La historia de Lumi solo se insinúa: no cuenta de dónde viene (b1-1) y siempre mira el faro y se da la vuelta (b1-2).

Tomadas en el ajuste:

- `NODOS_PERMITIDOS.registro` admite `pregunta`. En un registro del servidor sus intentos van al navegador, como en un encuentro; `entregar` no los mira.
- En api, continuar la última consigna lleva a los pasos de cierre, si los hay, y el registro se entrega al continuar el último (`useActivityPlayer.move` llama a `registro.entregar()` en vez de `completar-actividad`, que rechaza los registros), con el cargador y el aviso de error del reproductor. Sin pasos de cierre (los de `ruta`), continuar la última consigna entrega como antes. Se entrega al final, y no al dejar el último ítem, para que quien sale durante los pasos de cierre vuelva al último ítem en lectura (registro con todo respondido y sin terminar) y siga desde ahí, como pide la tabla de cierre.
- Pedido por el usuario tras la revisión en navegador: el panel decía «Iniciar actividad» de un registro a medias o con todo respondido y sin entregar, porque responder un ítem no tocaba las actividades cargadas (pasaba antes de este ajuste). Ahora `store/servidor/registro.ts` aplica a las actividades ya cargadas el `registro.estado` de cada paso confirmado (responder, seguimiento, reenviar), sin volver a pedirlas, como `actualizarFicha`.
- Pruebas adaptadas, autorizadas por la tabla de cierre de las observaciones: en `tests/servidor/registro/servidor-registro-flujo.test.mjs`, «con todo respondido y sin terminar…» y «rehacer…» ahora recorren los pasos de cierre antes de entregar, y `recorrerApertura` resuelve la pregunta de b1-1. Del back, los mensajes de `R-CIUDAD` y `R-c*` en `test_casos_contenido.py` y la `descripcion` de `tests/llm/casos/b1-6.json`. En `tests/integration/datos/test_conversaciones_contenido.py` sale `b1-5-p05` de `CORRECTAS`: esa pregunta ya no existe con el banco nuevo.

Anotado para otros ajustes (de las observaciones, sin tocar):

- ma1, diálogo 01: «Leí tu punto de origen y me quedé pensando.» Nadia ya no lee un punto de origen: escuchó la historia.
- ma2: sus 10 preguntas tienen el problema del largo, y su título dice «profesiones».
- Las demás batallas (b3-5, b3-7, b3-9, b3-b, b4-4, ma7-b): revisar el mismo patrón.
- Banco de b1-5: con los textos tal cual, la correcta es la más larga en 3 de 18 (p10, p13 y p15; en p10 por un carácter), no en 2 como decía el texto de observaciones. No se tocaron los textos.
- Fuentes de las fichas: Habermas y Bluck (2000), Savickas (2005), Bandura (1977), Low y otros (2005), Oettingen (2014) y Gollwitzer (1999) se citaron sin verificarlas en línea; los datos nuevos de F05 vienen de notas de prensa que citan la fuente original.

## Ajuste coherencia-bloque2

Decididas por el usuario en el texto de observaciones:

- b2-1 y la ficha F08 trabajan las cinco habilidades sociales que mide la página del libro (asertividad, empatía, expresión de sentimientos, resolución de problemas y liderazgo). Convivencia y comunicación quedan en una nota de la ficha.
- El tema de los cuestionarios entra en b2-1 por la historia de Rosa y una sola pregunta; el detalle queda en F07.
- La propuesta de Gardner no se presenta como un hecho: se dice que él propuso mirar la inteligencia de esa forma, sin nota sobre la discusión entre investigadores.
- Salen las personas famosas de la lámina de inteligencias y de F09; la ficha lleva tareas donde se usa cada inteligencia.
- En b2-3 sale la comparación que ponía «interés y propósito» por encima de «salario, estatus o presión»: no hay valores mejores que otros.
- En b2-4 los ítems los pide Nico, y la lámina trabaja «lo que te sale» y «lo que te gusta» sin los términos «aptitud» y «capacidad». A Nico le cuesta una parte de lo que quiere, no la carrera entera.
- En los registros, el personaje de la escena cuenta algo propio que muestra cómo se responde cada ítem, y es quien los pide.
- En las informativas, las láminas van después de que el estudiante resuelve algo y las presenta el personaje de la escena o nadie; Lumi no explica la teoría.
- Quien guarda las preguntas de cada página lo dice Rosa: Dora en b2-1, Bruno en b2-2 y Sol en b2-5. Ningún texto anuncia h1, h2 ni h3.
- El guardián de b2-5 calza con b1-7: la aguja se detiene y vuelve a moverse cuando el viajero dice qué entendió de sí en el bosque; no dice «tramo», no adelanta lo que viene y no nombra a la orientadora.
- Ningún texto dice que una carrera tiene un código RIASEC ni que se buscan carreras por letras; las ocupaciones sí tienen código y el filtro por letras se nombra solo para ellas.
- Salen del bloque «brújula» (b2-3), «bitácora», «tarjeta» para una lámina, los diálogos de Lumi «Esto lo lee tu orientadora…» y los adjetivos con género dirigidos al estudiante.

Tomadas en el ajuste:

- Sin cambios de código: la pregunta dentro de un registro y los pasos de cierre ya existían desde coherencia-bloque1, y los JSON nuevos solo usan nodos, bloques y expresiones ya admitidos.
- Los contenidos de F07–F10 se copiaron con un script desde los bloques markdown de las observaciones y se comprobó que el texto cargado es idéntico carácter por carácter (pedido por el usuario al aprobar).
- Ninguna prueba ni fixture contenía los textos cambiados; no se adaptó ninguna prueba.
- Revisión en navegador (base aparte con `contenido`): b2-1 a b2-5 completos, «Anterior» ida y vuelta en b2-1 y b2-4, preguntas con pista, registros con pregunta y pasos de cierre, salida y reingreso de b2-4 durante el cierre (vuelve al último ítem en lectura), tablas a 375 px, F07–F10 y lo que abre cada cierre. Las frases nuevas de Dora (visita 4) y Sol (visita 6) se comprobaron en el JSON, no en pantalla.

Vistos en la revisión y corregidos a pedido del usuario:

- `ResourceText.tsx` mostraba la barra de «O\*NET» (F07, F10 y, desde antes, F12). Ahora quita la barra de un signo escapado en párrafos, negritas y enlaces, y las celdas de tabla pasan por `enLinea` (también admiten negrita y enlaces). Prueba nueva en `servidor-ficha-modal.test.mjs`.
- `b2-4-cruce` no tenía `dialogo` y su consigna no mostraba a Nico (`RegistroPersonaje` no pinta nada sin texto). Lleva `dialogo='Esta es la pregunta que más me costó responder a mí.'`, frase elegida por el usuario. La huella de las tarjetas del LLM no cambia: solo cubre el texto de la tarjeta. Se adaptó `test_carga_registros_definitivos.py`, que lo listaba entre los ítems sin diálogo a propósito.
- Un registro completado se sigue abriendo desde el paso 1 al volver a entrar («Ver o modificar mis respuestas»): si entrara directo a los ítems, no habría forma de volver a ver lo que se dice antes. Lo decidió el usuario, en contra de lo que pedía §6 de las observaciones. Se probó abrirlo en el último ítem y se deshizo. Solo un registro respondido y sin entregar entra en el último ítem, como antes.
- En las láminas, la primera columna de una tabla cortaba palabras a unos 1024 px («Investigad|or»). `.sx-content-table` y `.journey-content-table` usan `overflow-wrap: break-word`, así la columna toma el ancho de su palabra más larga.

Anotado para otros ajustes (de las observaciones, sin tocar):

- Código RIASEC por carrera: revisar la lámina de b4-1, las preguntas de la batalla b4-4 con la regla «si solo calza con el código…», F19, h3 («las cinco familias que salieron de tus intereses») y las conversaciones familiares.
- h1 (Mi reto): su diálogo 02 dice «Esto lo lee tu orientadora…», y su cierre, «plan de práctica» y «bitácora». Se ve con h2 y h3.
- b2-6 figura en los documentos de diseño como opcional y no existe en el repo.
- Fuentes: el dato del MTPE (F08 y `b2-1-14`) viene de una nota de Andina, ambigua en el «más del 80 %»; confirmarlo en el informe de la Encuesta de Demanda Ocupacional 2022. Caballo (2007) y Lent, Brown y Hackett (1994) sin verificar en línea; Durlak y otros (2011) y Su, Rounds y Armstrong (2009) verificadas por su resumen. No se comprobó que el Anexo 4.1 liste siete habilidades. La columna «Tareas donde se usa» de F09 es criterio de orientador.

## Ajuste coherencia-bloque3

Decididas por el usuario en el texto de observaciones:

- En el puerto, los datos del mundo real están en algo de la historia (el tablero de la capitanía, el tablero de Doña Cifra, el tablón del puerto, la pila de Clotilde) y van en láminas con su fuente. Lumi no los explica.
- Los enemigos del puerto (Doña Cifra, el Feriante, Clotilde) afirman algo y el estudiante lo corrige; las preguntas las hace Lumi.
- En la historia, las fichas del catálogo son «hojas del atlas»: «ficha» es lo de la mochila y «carta» es lo del diario.
- Ninguna carrera tiene un código RIASEC en el front. El camino de los intereses es: ocupaciones que se parecen al perfil, «Cómo se llega aquí» y, de ahí, las carreras. El backend conserva el RIASEC de las carreras y sus filtros.
- Sale la tarea de guardar tres favoritos y la de buscar una opción «fuera de tu tipo principal»: queda como invitación.
- b3-4 y b3-a se quedan solo con Lumi, que cuenta el caso de otra persona (Maite; un viajero y una enfermera) para mostrar cómo se responde el ítem.
- El mínimo y el máximo de los ingresos del catálogo son los percentiles 10 y 90 (nota técnica de Ponte en Carrera). Sale «quien empieza está mucho más cerca del mínimo».
- Institutos y universidades se comparan con sus dos caras: la familia de instituto mejor pagada supera a casi todas las universitarias, y en 18 de 22 familias que se dictan en los dos la universitaria paga más al inicio.
- Las escuelas de las FF. AA. y la Policía dan una propina durante la formación, no un sueldo; el ejemplo con cifras de requisitos va en F15, con su año.
- Con los institutos no se dice «si no está licenciado, descártalo» (solo dos de cada diez tienen licencia): se dice qué preguntar. El catálogo no indica si una institución tiene licencia y las fichas ya no lo afirman.
- Beca 18 se describe con la convocatoria 2027 y sin prometer un número de becas.
- Gastón Acurio queda en su testimonio, que se nombra por su título («Cocinar a escondidas»).
- Alejandra calza con su carta de b0-5, y la familia no queda como culpable. El guardián de b3-10 calza con b1-7 y b2-5: no dice «tramo», no adelanta lo que viene y no nombra a la orientadora.
- En los cuatro bancos de batalla las opciones tienen la misma forma y un largo parecido; los distractores son medias verdades o el dato dado vuelta.
- Los textos usan los nombres de pantalla del plan («Cómo lo haría realidad», «Mis próximos pasos»), no los del backend.
- Salen del bloque los diálogos de Lumi «Esto lo lee tu orientadora…», «bitácora», «me interesa», «tercer tramo», los anuncios de lo que viene y los adjetivos con género dirigidos al estudiante.

Tomadas en el ajuste:

- Las fichas F11–F17 y los cuatro bancos se copiaron con un script desde las observaciones y `bancos_bloque3.py`, y se comprobó que lo cargado es idéntico carácter por carácter. `bancos_bloque3.py` no entra al repo.
- `ACTIVIDADES` y `R-b3-a` ya tenían el título de b3-4, las duraciones de b3-a (4) y b3-b (5) y el requisito b3-3 de b3-a: solo cambiaron los JSON del front, y `verificar_contenido_front.py` queda sin discrepancias.
- Las carreras dejan de admitir `riasec` y `afines` en `PARAMETROS.careers` (`filtrosCatalogo.ts`): así la URL de carreras los ignora y no llegan al servidor, sin tocar `useCatalogoServidor`.
- Decidido por el usuario al planear: sale «Cómo encaja contigo» de «Por qué la elijo» (`SeccionPorQue`, `encajeRiasec`, la carga del resultado RIASEC en `usePlanAbierto` y `.sx-p-encaje`), porque decía «{carrera} es de tipo …».
- Agregado por el usuario al aprobar: la pestaña «Profesiones» del catálogo se llama «Ocupaciones», y la ayuda del modo lectura dice «Filtre por el tipo de interés de la ocupación». Ids, rutas y nombres internos (`professions`) no cambian.
- Pruebas adaptadas, autorizadas por §4 de las observaciones: en `test_conversaciones_contenido.py` salen `b3-5-p06` y `b3-5-p08` de `CORRECTAS` (el banco de b3-5 se reemplazó entero). En el front, `servidor-catalogo-portal` (carreras sin filtro de intereses ni sellos; la ayuda nueva, en ocupaciones), `servidor-catalogo-vistas` (el caso de los temporizadores pasa a ocupaciones; «Limpiar filtros» cuenta 2 filtros porque `riasec` y `afines` se ignoran en carreras) y `servidor-planes-{contrato,tarjeta}` (sin `encajeRiasec` ni «Cómo encaja contigo»).
- Revisión en navegador (base aparte con `contenido`, `est-ana` hasta b2-5 y `est-luis` hasta b3-9): b3-1 (elección, láminas, preguntas con retroalimentación y la de varias respuestas, tabla de cuatro columnas también a 375 px), b3-4 (pregunta dentro del registro, eco del valor de b2-3, dos pasos de cierre y cierre; un registro completado vuelve a abrirse desde el paso 1, como se decidió en el bloque 2), b3-6 (pregunta de seis opciones y lámina `b3-6-12` con la primera cabecera vacía, también a 375 px), F11–F16 (tablas sin fila de guiones, listas numeradas y con negrita, enlaces; F17 sigue cerrada hasta b3-10) y el catálogo (carreras sin sellos ni «Intereses», `riasec` y `afines` de la URL no llegan al servidor, detalle sin letras, ocupaciones intactas). No se miraron en pantalla b3-2, b3-3, b3-8, b3-10, b3-a, las cuatro batallas, el plan ni el modo lectura del apoderado: los cubren las pruebas.

Anotado para otros ajustes (de las observaciones, sin tocar):

- Textos visibles del catálogo que siguen diciendo «profesión»: el título «Catálogo de profesiones», «Buscar una profesión por nombre…», el conteo «N profesiones» y la descripción (`CatalogoServidor.tsx`), «Cuánto pesa cada interés en esta profesión» y «Esta profesión» (`PerfilIntereses.tsx`) y las presentaciones de Lumi del catálogo («El atlas de profesiones…», «…qué formación lleva a cada profesión…»). Se avisó al usuario; no se cambiaron.
- Datos que envejecen cada año: Beca 18 (lámina `b3-8-12`, F16 y `b3-9-p13` a `p16`), el sueldo mínimo (`b3-8-13` y F16), los requisitos de la Escuela de Oficiales de la Policía (F15 y F16) y la escala de propinas (F11).
- Datos que dependen de `carreras_salarios_por_departamento.csv`: la tabla de las familias mejor pagadas, las medianas (S/ 3 075 y S/ 2 632, redondeadas) y las 18 de 22 familias. Si el archivo cambia, se revisan `b3-3-04`, F13, `b3-5-p09` y `p10`.
- Institutos sin licencia: «autorizados antes de la ley actual» se apoya en el D. L. N.° 1495 y notas de 2026, sin leer la norma vigente completa. Si cambia, cambian `b3-6-12`, F14 y `b3-7-p06`.
- Por confirmar en la fuente: «tres de cada diez» de La República (tomado del extracto del buscador), el año de la planilla de ingresos del catálogo, que los créditos de pregrado del Pronabec son para continuar una carrera empezada y los 3 años de suboficiales.
- Nombres de las secciones del plan: el front dice «Cómo lo haría realidad» y «Mis próximos pasos»; `fijos.py`, «Qué tan real es» y «Mis pasos». Decidir si se unifican.
- `R-B4` nombra a la orientadora («las páginas que marcó tu orientadora»). b4-3, lámina 03, nombra el trayecto con cuatro opciones; hoy «Cómo llegaría» tiene seis.
- Código RIASEC por carrera en otros bloques: lámina de b4-1, batalla b4-4, F19, h3 y conversaciones familiares.
- `ma7` y `ma7-b` no se revisaron; comparten personaje (Doña Cifra) y tema con b3-3 y F13.

## Merge de llm-sugerencias en main

- Al juntar llm-sugerencias (guion y pasos del plan a Claude Haiku) con cartas-diario (diario y cartas sin LLM), Gemini quedó sin ningún asistente. Decidido por el usuario: se retira en el mismo merge `gemini.py`, `evaluacion.py` (`EvaluadorFalso`), `app.state.evaluador_respuestas`, las variables `EVALUADOR` y `GEMINI_*`, sus parámetros (`MODELO_LLM_REGISTRO`, `TEMPERATURA_ASISTENTES`, `NIVEL_RAZONAMIENTO_ASISTENTES`, `PAUSA_CASOS_GEMINI_SEGUNDOS`, `TIEMPO_MAXIMO_EVALUACION_SEGUNDOS`) y la dependencia `google-genai`.
- Pruebas retiradas o adaptadas por ese retiro: salen `test_evaluador_gemini.py`, `test_arranque_registro.py` y `soporte_red.py`; `test_configuracion_registro.py` pasa a probar `ANTHROPIC_API_KEY`; las del exportador de fixtures ya no restauran `EVALUADOR`; la pregunta del día de `test_cartas_adaptadas.py` ya no reemplaza el evaluador.
- `test_semilla_ruta.py` toma `opcion_lista` = 123 de llm-sugerencias (DIFICULTADES sin SALUD) y `referencia` = 12 de cartas-diario.
- Las dos ramas traían una migración 0053. La de cartas-diario (`0053_cartas_diario`) queda; las de llm-sugerencias, que no tocan sus tablas, se renumeran encima: guion 0053 → 0054 y pasos 0054 → 0055.
