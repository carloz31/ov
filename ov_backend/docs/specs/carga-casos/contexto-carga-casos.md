# Contexto · carga de casos

Material de entrada para el ajuste que cargará los casos nuevos de la Central de Casos. Define qué trae cada caso:
un **JSON del front** con lo que el servidor no guarda y una **ficha del servidor** con lo que va a `datos/`.
`forest-fire.json` es el caso actual convertido a este formato, como ejemplo.

## Lo que el backend ya tiene de un caso

| Dato | Dónde |
|---|---|
| `codigo`, `titulo`, `bloque`, `orden`, `contenido`, `duracion_estimada_min`, `descripcion` | `actividad` (tipo CASO) |
| `requerida`, `visibilidad` | `actividad` |
| `puntaje_minimo`, `puntaje_maximo` (puntos de satisfacción; el máximo es el total de necesidades) | `actividad` |
| Cuántas necesidades tiene cada problema, sin decir cuáles | `CONFIGURACION_CASOS` (`datos/ruta.py`) |
| Tipos RIASEC (**se retiran**: ver «Para el ajuste») | `actividad_dimension`; `dimensiones` de `CasoCuenta` |
| Temáticas de partida y llegada (A–E), para el avance por temática; **se mantienen** | `actividad_tematica` |
| Qué lo abre (con su mensaje de bloqueo) y qué regala (`SUPERA_CASO` → testimonios u otros) | Reglas |
| Ocupaciones que nombra | Solo su existencia: `fijos.OCUPACIONES` (slug → O*NET, **se retira**) las carga aunque no estén en el catálogo |
| Intentos, puntaje, colección | `resultado_caso`, `progreso_actividad`, `coleccion_ocupacion` |

El servidor recibe el puntaje y las ocupaciones bien asignadas desde el front (`resolver-caso`); no sabe qué
ocupación resuelve cada problema.

## JSON del front

Un archivo por caso. La actividad CASO lo nombra con `"caso": "<id>"` en su JSON de contenido.

```text
{
  id                 slug del caso; es el valor de "caso" en la actividad
  tematica           texto libre de qué trata el caso; reemplaza «Tipo del caso: <tipos RIASEC>»
  intro {
    narrativa        párrafos de la intro, en orden
    imagen           archivo de imagen de la intro
    alerta           texto que se lee al terminar la intro («Fase 1: <alerta>»)
  }
  presupuesto        llamadas disponibles en todo el caso; cada llamada usa 1
  profesionales [    el directorio completo, también los que no responden a ninguna necesidad
    { onet           código O*NET de la ocupación (p. ej. 33-2011.00), que será su código en la plataforma
      persona }      nombre de quien la ejerce en el caso
  ]
  fases [            en orden; «Fase N de M» sale de esta lista
    { id, nombre, subtitulo
      escuchar { texto, textoMovil }        instrucción de la escena y su versión de celular
      fondo { imagen, posicion }            imagen de la escena y su background-position («62% 50%»)
      mensajes [                            las personas de la escena
        { id, quien, contexto, mensaje, resumen,
          posicion { x, y } }               en porcentaje de la imagen (0–100)
      ]
      problemas [
        { id, titulo, detalle
          resultado                         narrativa del problema al cerrar la fase
          necesidades [                     las ocupaciones que el problema necesita
            { onet                          una de profesionales
              aporte                        lo que hace esa ocupación en el problema
              siFalta }                     lo que pasó por no llamarla
          ] }
      ] }
  ]
}
```

### Reglas

- Cada `onet` de `profesionales` es único: una persona por ocupación en el caso.
- Cada `onet` de `necesidades` está en `profesionales` y no se repite dentro de un problema; sí puede repetirse en
  problemas distintos.
- El total de necesidades del caso es su `puntaje_maximo`.
- Los `id` de fases, mensajes y problemas son únicos dentro del caso.
- Ningún texto vacío. Las imágenes son nombres de archivo de `ov_frontend/public/` sin parámetros (`?v=2`): cada
  caso nuevo trae las suyas.

### Lo que no va en el JSON

- Lo que tiene el servidor: título (también el del topbar), descripción, duración, puntaje mínimo y máximo, estado e
  intentos.
- Tipos RIASEC: el caso ya no los tiene; su lugar lo toma `tematica`.
- El cargo y la hoja de vida del profesional: salen de la ocupación del servidor (`titulo`, `descripcion`,
  `conocimientos`, `aptitudes`).
- Lo común a la Central: la ayuda del «?» (`ayudaCentral`), los textos de las pantallas, el costo de 1 por llamada.
- La nube de palabras de la comunidad (`forestFireWordCloud`): ya no va en los casos.

## Ficha del servidor

Por cada caso, junto a su JSON:

| Campo | Ejemplo (`t-caso`) |
|---|---|
| Código de la actividad | `t-caso` |
| Caso que juega (id del JSON) | `forest-fire` |
| Bloque y orden | `CIUDAD`, después de `t-mision-habilidades` |
| Título | Caso de prueba |
| Descripción | Ayuda a resolver un caso de la ciudad. |
| Duración (min) | 10 |
| Requerida · visibilidad | sí · `SIEMPRE` |
| Puntaje mínimo | 10 (de 14) |
| Temáticas de partida y llegada (A–E) | C |
| Qué lo abre y su mensaje de bloqueo | Completar `t-mision-intereses-2` · «Completa las dos misiones de intereses.» |
| Qué regala al superarlo | `t-testimonio-1`, `t-testimonio-2` |

## Para el ajuste

- **Sin tipos RIASEC en los casos.** Se retiran `actividad_dimension` (solo la usan los casos), `DIMENSIONES_ACTIVIDADES`
  y su validación en el cargador, `dimensiones` de `CasoCuenta` y, en el front, `textoTiposCaso`
  (`lib/servidor/adaptadoresCasos.ts`), que pasa a mostrar la `tematica` del JSON. Las temáticas A–E
  (`actividad_tematica`) no cambian. Es un cambio de modelo y de contrato.
- **El código O*NET es el código de la ocupación.** Los slugs eran provisionales: se retiran `fijos.OCUPACIONES` y
  el prefijo `onet-`, y `codigo` pasa a ser el O*NET tal cual (`33-2011.00`), igual a `codigo_onet`
  (`codigo_ocupacion` de `datos/catalogo.py`). Toca todo lo que nombra ocupaciones por slug: casos, testimonios
  (`TESTIMONIOS` de `ruta.py`), escenarios y pruebas, fixtures regenerados y los ids del front
  (`forestFireCase.ts`, `data/catalog/occupations.ts`, rutas del catálogo). Las ocupaciones de los casos que no estén
  en el catálogo se siguen cargando con `en_catalogo` falso; el ajuste decide de dónde salen (del JSON o de una
  lista en `datos/`).
- **Necesidades en el servidor (opcional).** Que el backend cargue las necesidades del JSON (problema →
  ocupaciones) y valide las que recibe `resolver-caso`; así `CONFIGURACION_CASOS` deja de duplicar los conteos. Es
  un cambio de modelo.
- **Validación.** `scripts/verificar_contenido_front.py` debería comprobar las reglas de arriba, que cada `onet`
  exista y que el total de necesidades sea el `puntaje_maximo` de cada actividad que juega el caso.
- **Fuera de este formato:** generalizar la vista (`ForestFire…`, `FOREST_FIRE_BUDGET_LIMIT`,
  `FOREST_FIRE_PASS_SCORE`, el título «Incendio forestal» y el ícono de llama de la intro) para que lea el caso del
  JSON y el título del servidor.

## Conversión de `forest-fire.json`

Sale de `ov_frontend/src/data/content/forestFireCase.ts` y de la intro de `ExplorationCaseIntroView.tsx`, con los
textos sin cambios. Los slugs se pasaron a O*NET con `fijos.OCUPACIONES`. Se quitaron `name`, `description` y
`skills` de los profesionales, la nube de palabras y el `?v=2` de los fondos de estabilización y recuperación. La
`tematica` («Realista · Social») es el texto que hoy se ve en la Central; está para reemplazarse por la del caso. Sus
necesidades por problema (2, 3, 3, 1, 2, 3; total 14) coinciden con `CONFIGURACION_CASOS`.
