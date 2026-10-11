> Actualización del 5 de octubre de 2026: para audiencia, nodos permitidos, tablas, narradores y actividades del apoderado prevalece [la especificación de actividades comunes](./especificacion-actividades-comunes.md). Los encuentros ya no admiten consignas; el significado restante de los nodos se conserva.

# Spec de prototipo: tipos de actividad

Archivos:

- `modelo-datos.ts`: tipos (v2).
- `ejemplos/catalogo.json`: personajes, recursos, piezas de llave e instrumento.
- `ejemplos/instrumento_mara.json`: test Sí/No (interacción 1 de 14).
- `ejemplos/encuentro_mitos.json`: actividad informativa.
- `ejemplos/registro_linea_tiempo.json`: registro con plantilla visual.

Toda actividad es una lista `nodos` que el front recorre en orden. El tipo de actividad decide qué nodos se permiten (`NODOS_PERMITIDOS`) y cómo se guardan los datos.

---

## 1. Render de nodos (común a todos)

| Nodo          | Cómo se muestra                                                                                                                            | Avance                                                        | Qué se guarda                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | --------------------------------------------- |
| `dialogo`     | Caja de diálogo RPG con avatar y nombre del hablante (`expresion` cambia el avatar)                                                        | Clic o tap en "continuar"                                     | Nada                                          |
| `eleccion`    | Botones de respuesta del jugador                                                                                                           | Al elegir: se muestra `reaccion` (si existe) y luego se sigue | `RespuestaEleccion` solo si `registrar: true` |
| `diapositiva` | Tarjeta a pantalla completa con `titulo` y `bloques`; el presentador aparece pequeño en una esquina; `recursoIds` como botón "Profundizar" | Botón "Entendido"                                             | Nada                                          |
| `pregunta`    | Enunciado en el diálogo del hablante y opciones como tarjetas                                                                              | Ver §3                                                        | `IntentoPregunta` por intento                 |
| `item`        | `etiqueta` arriba ("Para conocerte mejor:"), texto oficial del ítem y botones según `formato`                                              | Al responder: reacción según valor, luego sigue               | `RespuestaItem`                               |
| `consigna`    | Campo de texto, subida de archivo u opciones; o celda de plantilla (§4)                                                                    | Al enviar (valida mínimos)                                    | `Entregable`                                  |
| `resultado`   | Pantalla de revelación del perfil                                                                                                          | —                                                             | Dispara el cálculo de `ResultadoInstrumento`  |

Bloques de diapositiva:

- `parrafo`: texto normal.
- `lista`: viñetas con título opcional.
- `destacado`: caja de color (`dato` en azul, `idea_clave` en amarillo, `alerta` en rojo suave).
- `comparacion`: dos columnas, "mito" en gris a la izquierda y "realidad" en color a la derecha.
- `pasos`: tarjetas numeradas.
- `reflexion`: pregunta en cursiva, sin campo para responder.
- `fuente`: texto pequeño al pie, con enlace si hay.

---

## 2. Instrumento (ej. Mara)

- **`presentacion: "narrativa"`**: se renderizan todos los nodos.
- **`presentacion: "directa"`**: se renderizan solo los nodos `item` y `resultado`, en formato de lista o tarjetas. Se omiten diálogos, elecciones y reacciones. Así, la misma actividad sirve para ambos modos.
- Los ítems no tienen respuesta correcta. Las reacciones repiten lo respondido de forma neutra, sin elogios ni juicios.
- Una vez respondido un ítem, no hay botón para volver atrás durante la interacción (para evitar respuestas "estratégicas"). Si se decide permitir correcciones, se sobrescribe `RespuestaItem` usando la misma clave única.
- **Retomar:** `ProgresoActividad.nodoActualId` apunta al siguiente nodo pendiente. Si el estudiante sale a mitad, al volver sigue desde el último ítem sin responder.
- **Completado:** cuando todos los nodos `item` tienen respuesta. Al completarse se aplica la recompensa (afinidad +1) y se muestra `mensajeFin`.
- **Cálculo del perfil:** cuando las 14 actividades del instrumento `tip` están completas, se habilita a Elena (`act-tip-final`). Su nodo `resultado` calcula los puntajes con `clave`.

Ejemplo de lo que se guarda:

```json
{
  "estudianteId": "est-123",
  "instrumentoId": "tip",
  "itemId": "tip-004",
  "aplicacion": "unica",
  "valor": "no",
  "actividadId": "act-tip-01",
  "respondidaEn": "2026-10-02T15:04:00Z"
}
```

**Pendiente:** completar `codigo` con la numeración original y la `clave` oficial del instrumento.

---

## 3. Encuentro (ej. La plaza de los rumores)

**Diseño pedagógico.** La historia es solo el gancho. El contenido está en las diapositivas: casi el 70 % del tiempo es lectura de contenido. Estructura:

1. **Gancho** (e01–e05): Aurelio grita mitos y admite que nunca los revisó.
2. **Concepto** (e06): qué es un mito vocacional y de dónde viene.
3. **Herramienta** (e07): tres preguntas para revisar una creencia, y un reto de aplicación (e08).
4. **Cuatro mitos** (e10–e18): cada uno con una comparación mito/realidad, qué conviene saber y una fuente. Los retos se intercalan (e11, e16).
5. **Repaso** (e19): selección múltiple sobre los cuatro mitos.
6. **Resumen** (e20): se guarda la ficha en Recursos.
7. **Aplicación** (e21–e22): el estudiante aconseja a Lucía, un caso que combina dos mitos.
8. **Cierre y puente** (e23–e24): pieza de llave. El compañero conecta con ACT-07, donde el estudiante revisa sus propias creencias.

**Lógica de `pregunta`:**

1. El estudiante elige; en `opcion_multiple` confirma con un botón.
2. Si acierta: se muestra la `retroalimentacion` de la opción y luego la `explicacion`, y continúa.
3. Si falla: se muestra la `retroalimentacion` de la opción y luego la pista siguiente de `pistas` (voz del compañero), y puede reintentar.
4. Si falla y ya no quedan pistas, con `alAgotarPistas: "revelar_y_continuar"`: se marca la opción correcta, se muestra la `explicacion` y continúa (queda `revelada: true`).
5. En opción múltiple, la respuesta es correcta solo si coincide exactamente el conjunto marcado.

No hay puntaje ni penalización visible. Los intentos se guardan para que la orientadora vea qué conceptos cuestan más.

**Consigna final (e22):**

- Mínimo 120 caracteres, para evitar respuestas vacías (meta 2).
- La consigna es visible para la orientadora: es la mejor señal de si el estudiante entendió.
- **Opcional para prototipo:** mostrar a la orientadora los consejos que no mencionan ningún mito o pregunta del método.

**Completado:** cuando se envió e22. Al completarse: pieza de llave, ficha en Recursos y afinidad +1.

**Pendiente de validar por la orientadora:** las afirmaciones de las diapositivas e10, e13, e15 y e18 y sus fuentes. Se redactaron de forma cualitativa, sin cifras, para no fijar datos que cambian. Si se agregan cifras, que salgan de Ponte en Carrera o INEI con fecha. El video `rec-video-mitos` está por producir o seleccionar.

---

## 4. Registro (ej. Mi mapa de ruta)

**Plantilla `matriz` / `linea_tiempo`:**

- El front dibuja una línea horizontal con tres hitos (columnas: 1, 3 y 5 años) y cuatro filas debajo de cada hito (📍 dónde me veo, 🧰 qué necesito, 🚧 qué me podría frenar, ✅ con qué cuento).
- Cada celda es la consigna cuyo `slot` es `columna.fila`. Al tocar una celda se abre un panel con la `premisa`, la `ayuda` y el campo de texto. La celda muestra el texto recortado una vez llena.
- En móvil, las columnas se convierten en pestañas (1 año · 3 años · 5 años).
- Las consignas de `consignasFuera` (g-identidad) se muestran debajo de la línea, como una tarjeta aparte.
- El botón de `alternativa` abre la subida de archivo (g-archivo). Si el estudiante sube su línea hecha a mano, las celdas dejan de ser obligatorias (`reemplazaSlots`), pero g-identidad sigue siéndolo.
- La misma estructura sirve para un FODA: `estilo: "foda"`, 2 columnas (Interno / Externo) × 2 filas (Positivo / Negativo). Con eso salen los 4 cuadrantes: fortalezas, debilidades, oportunidades y amenazas. No hay que cambiar el backend.

**Criterio de obligatoriedad** (decisión de orientación):

- Son obligatorias las 3 celdas de "dónde me veo" y las 4 del primer año, que es el hito más concreto. Las demás son opcionales.
- Pedir 12 celdas completas a un estudiante que no tiene claridad favorece el abandono o el relleno mecánico. El mínimo de 15 caracteres por celda evita celdas vacías sin exigir redacción.

**Completado (regla):**

- Todas las consignas obligatorias con `Entregable`, **o**
- g-archivo con al menos 1 archivo más g-identidad.

**Edición posterior:** ACT-18 reabre esta misma actividad. Cada celda que se edite crea un `Entregable` con `version: 2`. Así se puede comparar el mapa del inicio con el del final.

Ejemplo de lo que se guarda (una celda):

```json
{
  "id": "ent-889",
  "estudianteId": "est-123",
  "actividadId": "act-06",
  "nodoId": "g-anio1-obstaculos",
  "contenido": { "tipo": "texto", "texto": "No sé si mi familia podrá pagar una privada" },
  "version": 1,
  "enviadoEn": "2026-10-05T16:20:00Z"
}
```

---

## 5. Orden en la ruta de los ejemplos

```
ACT-05 → ACT-06 Mi mapa de ruta (registro) → ENC-MITOS La plaza (encuentro) → ACT-07 (registro de mitos propios)
Bloque 2: TIP-01 Mara → TIP-02 … TIP-14 → Elena (resultado)
```
