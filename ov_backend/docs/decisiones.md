# Decisiones de la spec en curso

## Ajuste despliegue-piloto

- Candado de `actualizar.sh --recargar` (`scripts/comprobar_recarga.py`): son conocidas las cuentas que la propia carga de `contenido` vuelve a crear (`contenido.CUENTAS`, los estudiantes y apoderados de la siembra de ejemplos y la autora de `contenido.SALON_EGRESADO`) más E99, A99 y O99; cualquier otra bloquea. Así la última recarga antes del piloto (con `est-ana` y compañía en la base) sigue permitida.
- `--forzar` salta el candado solo a mano en la EC2; el workflow no lo expone.
- Respaldo con `pg_dump` en `/home/ov/respaldos/` antes de toda migración o recarga, 15 conservados; si falla, no se despliega (código 5). El candado corre antes del respaldo: si bloquea, no se toca nada.
- Durante el piloto `datos/contenido.py` se congela; un cambio de reglas inevitable va como migración de datos (`despliegue/README.md`, 7.6). «Actualizar sin borrar» queda fuera.

## Ajuste planes-desbloqueo-completo

- En `contenido`, R-PLAN-CONOCIMIENTO, R-PLAN-REALIDAD y R-PLAN-PASOS piden COMPLETA_ACTIVIDAD de b0-4, como PLANES: en el piloto nadie llega a b3-2, b3-8 ni b4-5. `ruta` conserva el desbloqueo progresivo.
- Va como migración de datos 0061 (7.6 del README de despliegue), en SQL puro con la guarda dentro de cada UPDATE, para que también se genere sin conexión; solo actúa si existen b0-4, b3-2, b3-8 y b4-5 y es idempotente.
- No se tocan tablas de estado ni hay reevaluación: quien ya completó b0-4 recibe las secciones con su siguiente actividad (el motor reevalúa por tipo de evento). A esos estudiantes se les pedirá completar otra misión.
- La prueba de la migración arma la base con la plantilla de `contenido`, la estampa en head y la baja a 0060.
- El cierre de una actividad agrupa en una fila las SECCION_PLAN que se abren juntas («Nuevas secciones en tus planes: …»); con una, el texto de siempre. La guía de Mis planes ya no dice que las secciones se abren al avanzar.
