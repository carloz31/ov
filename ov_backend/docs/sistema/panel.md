# Panel del salón (orientadora)

Inicio del portal de la orientadora: pestañas Seguimiento e Intereses del salón, las listas completas de áreas e instituciones y el panel lateral «Ver». Solo lo lee la orientadora, sobre sus salones; ninguna respuesta lleva texto del diario ni de registros.

## Configuración en la base

Todo lo que el panel decide sale de tablas de catálogo que llena `datos/fijos.py`:

| Tabla | Qué guarda |
|---|---|
| `grupo_alerta` | `codigo`, `nombre` y `orden` de cada grupo de avisos («Conversar pronto», «Se están quedando atrás»). |
| `alerta` | `codigo`, `grupo_id`, `nombre`, `descripcion` (nula), `evaluador` (nombre de la función registrada que la calcula), `parametros` (JSON `{clave: valor}`), `orden` dentro del grupo y `activa`. |
| `parametro` | `codigo`, `valor` (texto; el servidor lo convierte) y `descripcion`. Solo los umbrales y cantidades del panel (`PANEL_*`); los de `app/core/parametros.py` siguen allí. |

- Las alertas no se guardan por estudiante: se calculan al consultar y desaparecen solas cuando la condición deja de cumplirse.
- Una alerta inactiva no se calcula ni se muestra. Una alerta que es variante de un evaluador existente (otro umbral, otro instrumento, otro texto, otro grupo) es solo una fila; un tipo nuevo de condición necesita un evaluador nuevo en código.
