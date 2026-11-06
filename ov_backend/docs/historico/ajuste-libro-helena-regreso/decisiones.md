# Decisiones de la spec en curso

- `tests/integration/datos/test_semilla_ruta.py` también se adaptó, aunque la spec no la nombra entre las autorizadas: solo sus conteos (`seccion`, `regla_desbloqueo` y `condicion_desbloqueo`), por la sección y la regla nuevas que pide la spec.
- Las rutas del libro van en `routes/SubrutasLibroHelena.tsx`, como las demás subrutas: envolverlas en `AppRoutes.tsx` lo dejaba en 313 líneas (máximo 300) y no se admiten excepciones.
- Una pasada terminada se reconoce por la posición `$fin` o por no tener posición, no por el estado local `completada` como decía la spec: la hidratación ya garantiza, y sus pruebas lo exigen, que un `completada` con posición real conserve nodo y borradores. Ese caso (una pasada que se rehacía al recargar la base) retoma donde iba, pero sin intentos ni elecciones anteriores, para que las preguntas no salgan respondidas.
- Al limpiar una pasada terminada no se tocan `items`, aunque la spec los nombra: `RespuestaItem` no guarda su actividad y, en api, los cuestionarios se responden en el servidor.
- La sección `LIBRO_HELENA` solo protege la entrada al libro en el front: lecturas y acciones de instrumentos no la exigen, porque el capítulo II del perfil las usa con ella cerrada y ningún instrumento se puede revelar antes del punto de partida.
