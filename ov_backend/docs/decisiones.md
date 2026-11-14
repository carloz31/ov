# Decisiones de la spec en curso

## Ajuste panel-estudiantes

- Modelo (aprobado en el plan): `grupo_alerta.en_inicio`, `alerta.nombre_perfil`, `descripcion_perfil` y `destino` (enum `DestinoPerfil`), y tabla de estado `nota_orientadora` (migración 0057, en `TABLAS_DE_ESTADO`).
- Un solo registro de evaluadores para avisos y temas; cada evaluador devuelve `{estudiante: datos}` y `calcular_alertas` filtra por `en_inicio` (Inicio y «Ver» solo los del Inicio). Se adaptó `test_carga_alertas_y_parametros_en_orden` con los temas nuevos (autorizado por §3.1).
- Los textos que dependen de un código (motivos, «nunca», nombres de «Sin empezar»/«Terminó el camino», origen de la idea, «partida»/«llegada») van en los `parametros` de la fila de `alerta`, no en código: así se cambian con una fila.
- Las preguntas de conocimiento dichas a la orientadora («cómo es un día normal»…) son una lista común nueva `CONOCIMIENTO_ORIENTADORA` en `fijos.py`: la base solo tenía las preguntas dirigidas al estudiante.
- «La mayoría del salón va en» (aviso `avance-bajo`) es el tramo de la mediana del salón, el mismo valor con que el evaluador decide el aviso (`comun.medianas_por_salon`, que también usa `muy_atras`); una mediana entre dos tramos nombra el menor (corrección del usuario).
- `senales_recientes` devuelve nivel y fecha; `Lecturas.senales` sigue dando solo niveles para el Inicio.
- Las complicaciones de una lista se escriben en minúscula dentro de la frase del tema; las escritas por el estudiante, tal cual.
- Notas como acciones (`escribir-nota`, `editar-nota`, `borrar-nota`), no rutas REST: en el repo toda escritura es `POST /acciones/*` (decidido por el usuario).
- `validar_eleccion` guarda `origen` y `grupo` de las piezas (decisión aprobada en el plan); se adaptó `test_piezas_se_validan_contra_las_ofrecidas_con_su_texto` a la nueva forma.
- El acceso del perfil vive en `panel/perfil_acceso.py` (una sola función) para que notas y lecturas no se importen en ciclo.
- Las notas se nombran por `numero` (secuencia por orientadora, columna en 0057), no por id: la API no expone ids internos.
- Lista: los conteos de los accesos rápidos son sobre todo el alcance (salón), sin aplicar buscador ni filtros; `-avisos` invierte el orden por avisos.
- «Para practicar» es la dimensión de menor proporción entre las que tienen textos `desarrollo`; «Destaca», las `dimensiones_destacadas` del resultado.
- Partida sin llegada: si ninguna respuesta es baja no se envía el grupo (el front no muestra el bloque vacío).
- Estado de un registro: COMPLETADO (con la fecha del último COMPLETA_ACTIVIDAD), EN_CURSO (progreso sin completar) o AUN_NO_LLEGA; los registros son los de tipo REGISTRO del camino y luego los de la ciudad.
- `sembrar_panel_ejemplo.py` usa las ayudas de `tests/soporte` (como el exportador) y el cliente de prueba del LLM; todas sus acciones llevan la fecha fija de esas ayudas, para que los fixtures se regeneren idénticos. Exige `--desarrollo` y se niega con `ENTORNO=produccion`.
- El motivo de «Por revisar» del test de intereses se llama `motivo_revision` en las respuestas del perfil, para no confundirlo con los motivos del LLM (que nunca se envían; la prueba de contrato busca la clave `motivo`).
- Front: un solo almacén `store/servidor/panelEstudiante.ts` para lista y perfil; cada visita al perfil es un perfil nuevo (salir lo descarta), así «una vez por visita» no depende del orden de los efectos.
- Front: el plan completo, el resultado completo y «Ver todas sus respuestas» son vistas dentro de su pestaña (`?plan=`, `?resultado=`, `?todas=1`), no rutas aparte: así no se descarta el perfil al abrirlas.
- Front: `ResultadoInteresesPortal` y `QuestionnaireDetailContent` se reutilizan sin cambiar sus rótulos («Su código de interés», «Le atraen…» sirven para la orientadora); no hizo falta parametrizarlos, así que la vista del apoderado no cambia. El instrumento no trae descripción en esa respuesta: «Qué mide este cuestionario» queda vacío en los otros cuestionarios.
- Front: «Ver avance» es el botón de un aviso que lleva a Avance y familia (el boceto decía «Ver señales»).
