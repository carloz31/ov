# Decisiones de la spec en curso

## Ajuste planes-desbloqueo-original

- En `contenido`, R-PLAN-CONOCIMIENTO, R-PLAN-REALIDAD y R-PLAN-PASOS vuelven a pedir b3-2, b3-8 y b4-5, con el mensaje que nombra el título de cada actividad; R-PLAN-POR_QUE sigue con b0-4. El desbloqueo de todas con b0-4 era temporal para el piloto.
- Va como migración de datos nueva (0062), que repite el SQL de la 0061 en sentido contrario y con la misma guarda; la 0061 ya estaba en `main` y no se edita.
- No se quitan los desbloqueos ya dados: quien abrió las cuatro secciones con b0-4 las conserva. Quitarlos exigiría tocar tablas de estado (README de despliegue, 7.6).
- Se conserva el cierre que agrupa las secciones que se abren juntas: es genérico y, con una sola sección, muestra el texto de siempre.
- Las pruebas de la 0061 quedan fijadas en esa revisión (suben a `'0061'`) y las de la 0062 van en el mismo archivo, para reutilizar sus ayudas.
- Se trabajó en `main`, sin rama ni commits, por pedido del usuario.
