# Ajuste · colegio

## Contexto

Hoy no existe el colegio: `Salon` es lo más alto de la jerarquía y las Leyendas se ven en toda la base. Se crea la tabla `colegio`, se conecta con `salon`, y se aplica la regla: **un estudiante o una orientadora ve lo de su salón y, a lo mucho (Leyendas), lo de su colegio; nunca lo de otro colegio.**

No hay spec en curso, así que este plan se guarda como `ov_backend/docs/specs/ajuste-colegio.md`. Rama: `ajuste/colegio` (ya creada, sin commits).

## Resultado de la auditoría de endpoints

Se revisaron todos los servicios y rutas buscando lo que lee, cuenta o agrega datos de otras cuentas.

| Punto | Hoy | Pasará a |
|---|---|---|
| `investigaciones/consultas.py` · `condicion_vista('LEYENDAS')`, con ella `SALON_Y_LEYENDAS` y `condicion_visible` | Todas las Leyendas de la base | Solo Leyendas con autor de su colegio |
| `investigaciones/orientadora.py` · `listar_publicaciones` (sin filtro de salón) | Sus salones + todas las Leyendas | Sus salones + Leyendas de los colegios de sus salones |
| `investigaciones/orientadora.py` · `detalle_publicacion` | Abre cualquier Leyenda | Igual que la tabla: 404 si es de otro colegio |
| `investigaciones/acciones.py` · `_coautores` | Busca cualquier código: el 409 revela el nombre de una cuenta de otro colegio | Quien no es de su colegio responde 404, como si no existiera |

**Se corrigen solas al filtrar `condicion_visible`**, porque todas pasan por ella (solo se añaden pruebas):
- `GET /cuentas/{c}/entrevistas` y `/entrevistas/{e}`, y `conteos.leyendas` de `GET /cuentas/{c}/investigaciones`.
- `ver-entrevista`, `reaccionar-entrevista`, `reportar`, `marcar-favorito` y `desmarcar-favorito`.
- `evaluar_leyenda` / `contar_favoritos`: solo marca favorita quien la ve, así que el conteo queda dentro del colegio.
- `eliminar-reaccion` de la orientadora: las reacciones de una entrevista ya solo vienen de su colegio.

**Reacciones y comentarios:** el límite se aplica al escribir. Solo reacciona quien ve la entrevista y solo comenta la orientadora de sus salones, así que `lista_reacciones` no necesita un filtro propio. En una Leyenda muestra lo de todos los salones del colegio; este comportamiento se mantiene y queda cubierto por una prueba. No hay ruta para mover un salón a otro colegio; si algún día se agrega, esa tarea tendrá que decidir qué pasa con sus reacciones anteriores.

## Qué no cambia

- **Ya acotado al salón, sin tocar:** `_aliados` (estudiantes con guía lista), `conteos.salon`, `conteos.mias`, la vista `SALON`, y destacar, comentar, eliminar y descartar reportes de la orientadora (`entrevista_de_sus_salones`).
- **Sin cruce entre cuentas:** favoritos, fichas, notificaciones, avance, batallas, casos, logros (no hay rankings ni porcentajes globales), referencias, registro, diario, planes, instrumentos, actividades, secciones.
- **Por vínculo activo:** `familia` y `conversaciones`. Un apoderado con hijos en dos colegios sigue viendo a ambos.
- **Catálogo global:** carreras, ocupaciones, instituciones, testimonios.
- **Forma de las respuestas:** ningún esquema cambia y el colegio no se expone en la API. Por eso el front no se toca: «la ven todos los salones» sigue siendo cierto dentro del colegio.
- **Rutas de `desarrollo.py`:** `GET /cuentas`, `POST /eventos` y `POST /desarrollo/reiniciar` no se tocan. Solo existen con `ENTORNO=desarrollo`, y el servidor usa `ENTORNO=produccion` (confirmado por el usuario).

## Modelo de datos (decisión de diseño a aprobar)

Se sigue `/cambio-modelo`.

- **Tabla nueva `colegio`** en `app/models/cuentas.py`: `id`, `codigo` (único), `nombre`. Se clasifica como catálogo, igual que `salon`, así que el reinicio la conserva.
- **`salon.colegio_id`:** FK a `colegio.id`, **NOT NULL**. Todo salón pertenece a un colegio.
- **`Salon.codigo` sigue siendo único en toda la base**, igual que `Cuenta.codigo`, porque es el identificador que expone la API. Dos colegios con un «Quinto A» repiten `nombre`, no `codigo`.
- **La entrevista no guarda colegio:** se deriva de autor → salón → colegio, como ya se hace con el salón. Los coautores siempre son del mismo salón.
- **La orientadora** no recibe colegio propio: sus colegios son los de sus salones (`orientadora_salon`). Si tuviera salones en dos colegios, ve las Leyendas de ambos.

**Migración `0047`, revisada a mano y con `downgrade`:**
1. Crea `colegio`.
2. Si ya hay salones, inserta `('col-piloto', 'Colegio piloto')`. En una base vacía no inserta nada, para no chocar con la carga de datos.
3. Agrega `colegio_id` nulable, asigna todos los salones a ese colegio y lo pasa a NOT NULL.

Como todos los salones quedan en un solo colegio, **no pueden existir datos cruzados** entre colegios (reacciones o favoritos): no hace falta limpiar nada.

## Backend

`app/services/investigaciones/consultas.py`, con una sola condición reutilizable:

```python
def leyenda_de_su_colegio(salones):
    """Leyenda con algún autor de los colegios de esos salones (subconsulta: no agrega consultas)."""
```

- `condicion_vista` la usa con `[cuenta.salon_id]`. Un estudiante sin salón no ve ninguna Leyenda.
- `listar_publicaciones` y `detalle_publicacion` la usan con `salones`, en lugar de `Entrevista.leyenda_en.is_not(None)`.
- `_coautores` busca solo cuentas de salones del colegio del autor. Esto también cierra el caso de dos estudiantes sin salón, que hoy pasan como compañeros (`None != None`). Otro salón del mismo colegio sigue dando 409, como hoy prueba `est-beto`.

## Datos

- `datos/ruta.py`: `COLEGIOS = (('col-piloto', 'Colegio piloto'),)` con `DATO DE PRUEBA`, y `SALONES` gana el colegio: `('5A', 'Quinto A', 'col-piloto')`.
- `datos/contenido.py`: `COLEGIOS = ruta.COLEGIOS` y actualizar la fila correspondiente de `PROVISIONALES`.
- `datos/cargador.py` · `_cargar_estructura`: crea los colegios antes que los salones.
- Ruta y contenido siguen con **un solo colegio**, con las mismas cuentas. El segundo colegio solo existe dentro de las pruebas.
- Los fixtures del front se regeneran para comprobar que **no cambian**.

## Pruebas

**Nuevas:**
- `tests/integration/investigaciones/test_aislamiento_colegios.py`: pasa 5B a un segundo colegio con una orientadora propia (`DATO DE PRUEBA`, dentro de la prueba) y comprueba:
  - Beto no ve la Leyenda de 5A en `LEYENDAS` ni en `SALON_Y_LEYENDAS`, `conteos.leyendas` es 0, y el detalle da 404.
  - Beto recibe 404 en `ver-entrevista`, `reaccionar-entrevista`, `reportar` y `marcar-favorito`.
  - La orientadora del otro colegio no la ve en su tabla ni en el detalle.
  - Ana recibe 404, sin nombre, al poner a Beto de coautor.
  - `aliados` no incluye a Beto.
  - Control: en el mismo colegio, otro salón sí ve la Leyenda.
  - **Reacciones y comentarios de una Leyenda:** con un tercer salón del mismo colegio que 5A, su estudiante reacciona y comenta. Quien abre el detalle ve en `lista_reacciones` las reacciones de ambos salones y el comentario de la orientadora, y `reacciones` y `reacciones_por_tipo` los suman. Beto, de otro colegio, recibe 404 al reaccionar y su intento no cambia ni la lista ni los conteos. Lo mismo con `favoritos`.
- `tests/integration/migraciones/test_migraciones.py`: `0047` con salones existentes (quedan en `col-piloto`), en base vacía (sin colegios) y `downgrade`.

**Existentes que hay que adaptar**, solo por la tabla nueva y anotadas en `decisiones.md`:
- `tests/unit/arquitectura/test_clasificacion_tablas.py`: agregar `colegio` a `CATALOGO`, como exige esa prueba.
- `tests/unit/acceso/test_politica_y_contrasenas.py`: el `Salon` de prueba necesita un colegio.

Las pruebas de Leyenda con `est-beto` no se tocan: 5A y 5B siguen en el mismo colegio.

## Documentos

- `docs/sistema/investigaciones.md`: «Visibilidad», la introducción y la tabla de `publicar-entrevista`.
- `docs/requisitos.md`: HU-065 y la definición de Leyenda pasan a decir «de su colegio».
- `docs/sistema/integracion.md`: solo si menciona el alcance de las Leyendas.
- `docs/decisiones.md`: decisiones del ajuste y pruebas adaptadas.
- `ov_frontend/docs/pendientes-interfaz.md`: el backend no entrega el colegio y ninguna vista lo pide, así que se anota solo si aparece una necesidad.

## Fases

1. **F1 · Modelo y datos:** tabla, migración, cargador, `ruta` y `contenido`, documento y las dos pruebas adaptadas. Pruebas: `unit/arquitectura`, `unit/acceso`, `integration/migraciones`, `integration/datos`, `integration/escenarios`.
2. **F2 · Aislamiento:** condición de Leyendas, tabla y detalle de la orientadora, `_coautores`, prueba nueva y documentos. Pruebas: `integration/investigaciones`, `integration/favoritos`, `integration/actividades`, `integration/contrato`, `integration/escenarios`.
3. **F3 · Verificación del sistema:**
   - Regenerar fixtures y confirmar que no hay diferencias.
   - Suite completa: `uv run pytest -n auto -q`; `npm test`, `npm run build`, `npm run lint`, `npm run check:estructura`.
   - `uv run alembic heads` con un solo head.
   - Prueba real sobre una base temporal: `alembic upgrade head`, cargar `ruta`, levantar el backend y correr `scripts/verificar_leyenda.py`, que recorre la Leyenda por HTTP entre 5A y 5B.

Un commit por fase. Sin push. La spec queda en curso.
