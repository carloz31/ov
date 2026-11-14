# Decisiones de la spec en curso

## Ajuste panel-estudiantes

- Modelo (aprobado en el plan): `grupo_alerta.en_inicio`, `alerta.nombre_perfil`, `descripcion_perfil` y `destino` (enum `DestinoPerfil`), y tabla de estado `nota_orientadora` (migración 0057, en `TABLAS_DE_ESTADO`).
- Un solo registro de evaluadores para avisos y temas; cada evaluador devuelve `{estudiante: datos}` y `calcular_alertas` filtra por `en_inicio` (Inicio y «Ver» solo los del Inicio). Se adaptó `test_carga_alertas_y_parametros_en_orden` con los temas nuevos (autorizado por §3.1).
- Los textos que dependen de un código (motivos, «nunca», nombres de «Sin empezar»/«Terminó el camino», origen de la idea, «partida»/«llegada») van en los `parametros` de la fila de `alerta`, no en código: así se cambian con una fila.
- Las preguntas de conocimiento dichas a la orientadora («cómo es un día normal»…) son una lista común nueva `CONOCIMIENTO_ORIENTADORA` en `fijos.py`: la base solo tenía las preguntas dirigidas al estudiante.
- «La mayoría del salón va en» (aviso `avance-bajo`) es el tramo más frecuente del salón, y en empate el más avanzado.
- `senales_recientes` devuelve nivel y fecha; `Lecturas.senales` sigue dando solo niveles para el Inicio.
- Las complicaciones de una lista se escriben en minúscula dentro de la frase del tema; las escritas por el estudiante, tal cual.
- Notas como acciones (`escribir-nota`, `editar-nota`, `borrar-nota`), no rutas REST: en el repo toda escritura es `POST /acciones/*` (decidido por el usuario).
- `validar_eleccion` guarda `origen` y `grupo` de las piezas (decisión aprobada en el plan); se adaptó `test_piezas_se_validan_contra_las_ofrecidas_con_su_texto` a la nueva forma.
