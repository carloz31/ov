# Decisiones de la spec en curso

## Ajuste despliegue-piloto

- Candado de `actualizar.sh --recargar` (`scripts/comprobar_recarga.py`): son conocidas las cuentas que la propia carga de `contenido` vuelve a crear (`contenido.CUENTAS`, los estudiantes y apoderados de la siembra de ejemplos y la autora de `contenido.SALON_EGRESADO`) más E99, A99 y O99; cualquier otra bloquea. Así la última recarga antes del piloto (con `est-ana` y compañía en la base) sigue permitida.
- `--forzar` salta el candado solo a mano en la EC2; el workflow no lo expone.
- Respaldo con `pg_dump` en `/home/ov/respaldos/` antes de toda migración o recarga, 15 conservados; si falla, no se despliega (código 5). El candado corre antes del respaldo: si bloquea, no se toca nada.
- Durante el piloto `datos/contenido.py` se congela; un cambio de reglas inevitable va como migración de datos (`despliegue/README.md`, 7.6). «Actualizar sin borrar» queda fuera.
