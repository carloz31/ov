# Especificación: estructura común de actividades (estudiante y apoderado)

Fuente de verdad para el formato de actividades de ambos roles. Complementa `docs/mission-spec.md` (significado de los nodos) y lo modifica en los puntos indicados en §6.

Archivos de esta entrega:

- `pad_01_acompanar.json`: ACT-P01, informativa del apoderado.
- `pad_02_informacion.json`: ACT-P02, informativa del apoderado.
- `catalogo_apoderado.json`: voz neutra `orientacion` y fichas `ficha-pad-rol`, `ficha-pad-info` (se agregan a `catalogo.json`).
- `encuentro_mitos_cierre.json`: reemplazo de los nodos e21–e24 de `encuentro_mitos.json`.
- `registro_mis_pregones.json`: ACT-07, registro que recibe la parte escrita que salía del encuentro de mitos.

---

## 1. Principio

Toda actividad, de cualquier rol, es el mismo objeto `Actividad`: metadatos + una lista ordenada de `nodos` + una `recompensa`. El **tipo** decide qué nodos se permiten y cuándo está completa. La **audiencia** decide solo cómo se dibuja. Lo que se guarda es idéntico para ambos roles.

| Eje | Decide | Valores |
| --- | --- | --- |
| `tipo` | Nodos permitidos, completitud, si hay preguntas de seguimiento | `encuentro` (informativa), `registro`, `instrumento` |
| `audiencia` | Renderer | `estudiante` (inmersivo), `apoderado` (sobrio) |
| `presentacion` | Solo instrumentos: con o sin diálogo | `narrativa`, `directa` |

Equivalencia con el diagrama de clases: `encuentro` = `INFORMATIVA`, `registro` = `REGISTRO`, `instrumento` = `CUESTIONARIO`. `audiencia` corresponde a `Bloque.audiencia`; en el JSON se repite en la actividad para que el front no tenga que resolver el bloque. `nodoActualId` corresponde a `ProgresoActividad.posicion`.

---

## 2. Metadatos de `Actividad`

| Campo | Obligatorio | Estudiante | Apoderado |
| --- | --- | --- | --- |
| `id`, `codigo`, `tipo`, `titulo`, `subtitulo` | Sí (`subtitulo` opcional) | Igual | Igual |
| `audiencia` | No (por defecto `estudiante`) | `estudiante` | `apoderado` |
| `bloque`, `orden`, `obligatoria`, `requisitos` | Sí | Ruta y desbloqueos | Ruta del apoderado (bloque 6) |
| `duracionEstimadaMin` | Sí | Se muestra en el drawer | Se muestra en la tarjeta de la actividad |
| `personajeIds` | Sí | Personajes de la escena | Solo `orientacion` |
| `ubicacion` | No | Punto del mapa | No se usa |
| `objetivoAprendizaje` | En encuentros | Interno (diseño y orientadora) | Igual |
| `presentacion` | Solo instrumentos | Sí | No aplica |
| `plantilla` | Solo registros | `secuencial` o `matriz` | No aplica |
| `recompensa` | No | `afinidad`, `piezaLlave`, `recursoIds`, `mensajeFin` | Solo `recursoIds` y `mensajeFin` |
| `siguienteSugerida` | No | Botón al terminar | Botón al terminar |
| `promptDiario` | No | Entrada de diario desbloqueada | No aplica (el apoderado no tiene diario) |

---

## 3. Nodos permitidos por tipo

```ts
export const NODOS_PERMITIDOS: Record<TipoActividad, Nodo['tipo'][]> = {
  encuentro: ['dialogo', 'eleccion', 'diapositiva', 'pregunta'], // se quita 'consigna'
  registro: ['dialogo', 'eleccion', 'consigna'],
  instrumento: ['dialogo', 'eleccion', 'item', 'resultado'],
}

// Validación adicional al cargar contenido:
// audiencia 'apoderado' solo admite tipo 'encuentro' (HU-004).
```

Razón del cambio: escribir con preguntas de seguimiento es trabajo de un registro. Un encuentro termina con retos de comprensión y, si se quiere, aplicación mediante una `pregunta` de caso (como el consejo a Lucía). La reflexión escrita pasa al registro siguiente (ACT-07).

---

## 4. Render y almacenamiento de cada nodo

| Nodo | Estudiante (inmersivo) | Apoderado (sobrio) | Qué se guarda |
| --- | --- | --- | --- |
| `dialogo` | Caja RPG con avatar y efecto de escritura | Párrafo dentro de una tarjeta, sin avatar ni animación. Se recomienda no usarlo como nodo suelto: en el apoderado solo aparece dentro de pistas y reacciones | Nada |
| `diapositiva` | Tarjeta sobre fondo ilustrado, presentador en la esquina | Página limpia: `etiqueta` como eyebrow, `titulo`, bloques, botón "Continuar". `recursoIds` como botón "Ver ficha" | Nada |
| `pregunta` | Enunciado en la voz del personaje, opciones como tarjetas | Enunciado como texto, opciones como radio o checkbox, botón "Comprobar". Retroalimentación, pista y explicación en recuadros de texto bajo las opciones | `IntentoPregunta` por intento |
| `eleccion` | Botones de respuesta del jugador, luego reacción en diálogo | `enunciado` como pregunta, `nota` en texto pequeño, opciones como botones. La reacción se muestra como recuadro bajo las opciones y luego "Continuar" | `RespuestaEleccion` solo si `registrar: true` |
| `consigna` | Campo de texto; en registros, preguntas de seguimiento de Lumi | No se usa | `Entregable` (+ turnos de seguimiento) |
| `item` | Ítem con reacción del personaje | No se usa | `RespuestaItem` |
| `resultado` | Revelación de Helena | No se usa | `ResultadoInstrumento` |

Reglas del render sobrio:

- Sin imágenes de fondo, sin avatares, sin efecto de escritura, sin animaciones de entrada. Paleta azul calmada del módulo del apoderado y componentes shadcn/ui.
- Barra lateral con título y "Paso X de N", donde N cuenta solo `diapositiva`, `pregunta` y `eleccion`.
- Las pistas se rotulan "Pista" y la explicación "Para recordar"; no se atribuyen a un personaje.
- Pantalla final con `mensajeFin`, acceso a las fichas de `recompensa.recursoIds` y botón a `siguienteSugerida` o a "Mis actividades".
- Retomar: igual que el estudiante, por `nodoActualId`.

---

## 5. Bloques de diapositiva

| Bloque | Uso | Estado |
| --- | --- | --- |
| `parrafo` | Texto corrido | Existe |
| `lista` | Viñetas con título opcional | Existe |
| `destacado` | `dato` (azul), `idea_clave` (amarillo), `alerta` (rojo suave) | Existe |
| `comparacion` | Dos columnas con títulos libres (mito/realidad, antes/ahora, no es/sí es) | Existe |
| `pasos` | Tarjetas numeradas | Existe |
| `reflexion` | Pregunta en cursiva, sin campo | Existe |
| `fuente` | Pie con enlace opcional | Existe |
| `tabla` | Comparar opciones en varias columnas (rutas de estudio, frases que cierran y abren) | **Nuevo** |

```ts
| {
    tipo: 'tabla'
    titulo?: string
    columnas: string[]
    filas: string[][] // cada fila con tantas celdas como columnas
    nota?: string     // texto pequeño bajo la tabla
  }
```

En el estudiante la tabla va dentro del contenedor de lectura con scroll horizontal; en móvil se apila como tarjetas (una por fila, con el nombre de la columna como rótulo).

---

## 6. Cambios al modelo (`src/features/missions/model.ts`)

1. `Actividad.audiencia?: 'estudiante' | 'apoderado'`.
2. `NODOS_PERMITIDOS.encuentro` sin `consigna` (§3).
3. Nuevo bloque `tabla` (§5).
4. `NodoDiapositiva.etiqueta?: string`: eyebrow de la diapositiva ("Concepto", "Información", "Para conversar", "Resumen"). Si falta, el estudiante conserva el texto actual.
5. `NodoEleccion.enunciado?: string` y `NodoEleccion.nota?: string`: en el estudiante la pregunta la hace el diálogo anterior; en el apoderado no hay diálogo, así que la elección necesita su propio enunciado. Si existe `enunciado`, el estudiante también lo muestra sobre las opciones.
6. `Personaje.rol` admite `'narrador'`: voz sin avatar (`orientacion`). El front no intenta cargar `avatarUrl` vacío.

Ningún cambio afecta lo que se guarda: `ProgresoActividad`, `IntentoPregunta`, `RespuestaEleccion` y `Entregable` quedan iguales. Para el apoderado, el `estudianteId` de esos registros pasa a ser el id de la cuenta (`Cuenta` en el diagrama), con un store propio (`ov.parent-missions.v1`).

---

## 7. Reglas de comportamiento

- **Preguntas de seguimiento:** solo en actividades `registro`. En `SubmissionNode`, la condición para crear el `FollowUpRecord` incluye `activity.tipo === 'registro'`. Con §3 ya no hay consignas en encuentros, pero la condición queda como protección.
- **Completitud de un encuentro (ambos roles):** `nodoActualId === '$fin'` y todas las `pregunta` con `bloqueante: true` tienen un intento correcto o revelado. Es la lógica actual de `isActivityComplete`, sin cambios.
- **Elecciones con `registrar: false`:** sirven para personalizar el mensaje sin guardar nada. En el apoderado se usan para que identifique su preocupación o elija una acción sin dejar un registro (el apoderado no hace registros).
- **Recompensa del apoderado:** sin afinidad ni piezas. Las fichas de `recursoIds` quedan en un "Material de consulta" accesible desde la tarjeta de cada actividad completada ("Repasar" y "Ver ficha"). Completar toda la ruta otorga el diploma "Conozco mi rol" (ya existe en Inicio).

---

## 8. Cambios en el portal del apoderado

Esta tarea sí autoriza modificar `src/features/parent-portal/` (excepción a `AGENTS.md`, solo para lo indicado aquí). No tocar `counselor-portal/`.

1. Reemplazar `ParentActivity` y `ParentActivityStep` por `Actividad` del modelo común. Las actividades del apoderado se cargan desde JSON igual que las del estudiante.
2. `ParentActivitiesView`: listar las actividades con `audiencia: 'apoderado'` en orden. Se elimina la sección "Para cada hijo o hija" (`category: 'child'`): esas actividades pedían escribir y la ruta del apoderado es solo informativa.
3. `ParentActivityView`: reproductor sobrio que recorre los nodos según §4. Puede reutilizar `logic.ts` (`evaluateQuestion`, `isActivityComplete`, `nextPendingNode`) pero no los componentes del reproductor del estudiante.
4. `parentRoute` y el diploma siguen igual, ahora sobre las actividades nuevas.
5. **Carta del apoderado:** hoy el texto de la carta al estudiante sale del compromiso escrito en la actividad `role` (`familyGift.parentCommitment`). Como las actividades ya no reciben texto, la carta se escribe en el módulo de Conversaciones (HU-066), que es donde se habilitan. Mientras eso no exista, `getFamilyGiftLetter` usa su texto por defecto.

---

## 9. Plantilla rápida para producir contenido

Esqueleto de un encuentro (sirve para ambos roles; para el apoderado, sin `dialogo` sueltos):

```json
{
  "id": "", "codigo": "", "tipo": "encuentro", "audiencia": "apoderado",
  "titulo": "", "subtitulo": "", "bloque": 6, "orden": 0,
  "obligatoria": true, "requisitos": [], "duracionEstimadaMin": 12,
  "personajeIds": ["orientacion"],
  "objetivoAprendizaje": "Al terminar, el apoderado...",
  "nodos": [
    { "id": "x-01", "tipo": "diapositiva", "etiqueta": "Para empezar", "titulo": "", "bloques": [] },
    { "id": "x-02", "tipo": "eleccion", "registrar": false, "enunciado": "", "nota": "", "opciones": [] },
    { "id": "x-03", "tipo": "diapositiva", "etiqueta": "Concepto", "titulo": "", "bloques": [] },
    { "id": "x-04", "tipo": "pregunta", "hablanteId": "orientacion", "formato": "opcion_unica",
      "bloqueante": true, "alAgotarPistas": "revelar_y_continuar",
      "enunciado": "", "opciones": [], "explicacion": "", "pistas": [] },
    { "id": "x-99", "tipo": "diapositiva", "etiqueta": "Resumen", "titulo": "Lo que se lleva", "bloques": [], "recursoIds": [] }
  ],
  "recompensa": { "recursoIds": [], "mensajeFin": "" }
}
```

Secuencia recomendada para un encuentro: **gancho** (diapositiva o elección personal) → **concepto** → **reto** → (concepto → reto) × N → **práctica** (acción concreta o elección) → **resumen** con ficha. Una pregunta cada una o dos diapositivas.

Criterios de calidad del contenido:

- Cada diapositiva enseña una sola idea y termina en un `destacado` o una `reflexion`.
- Cada `pregunta` tiene `retroalimentacion` en todas las opciones, al menos una pista y una `explicacion` que refuerza el contenido, no que repite la respuesta.
- Los casos usan nombres y situaciones cotidianas del contexto limeño.
- Las afirmaciones con dato llevan `fuente`. Sin cifras que cambien con el tiempo, salvo que salgan de una fuente oficial con fecha.
- Apoderado: tono informativo y sin culpa (Anti Core Drive del temor a sentirse juzgado), entre 10 y 15 minutos, frases cortas para personas poco familiarizadas con entornos digitales.
