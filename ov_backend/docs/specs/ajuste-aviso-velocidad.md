# Ajuste · aviso-velocidad

Implementa la HU-096 en modo api: Lumi avisa con un toast cuando alguien responde un cuestionario demasiado rápido, a lo más dos veces por intento. El aviso no bloquea nada. El backend decide cuándo avisar, porque el estado debe sobrevivir entre misiones, recargas y dispositivos; el front mide el tiempo y muestra el aviso. No hay spec en curso, así que este ajuste tendrá la suya: `ov_backend/docs/specs/ajuste-aviso-velocidad.md`. Rama: `ajuste/aviso-velocidad` (ya creada desde `main`).

## Qué cambia y por qué

| Dónde | Hoy | Pasará a |
|---|---|---|
| `responder_items` (`app/services/actividades.py:79`) | Guarda la opción; no recibe ni mide tiempos. | Recibe `tiempo_ms` por ítem. En la primera respuesta de cada ítem lo guarda y actualiza el ritmo del intento, en la misma transacción. Devuelve `aviso_velocidad`. |
| `reiniciar_instrumento` (`actividades.py:223`) | Borra respuestas y anula el resultado. | Además borra la fila de ritmo de esa cuenta y aplicación. |
| `itemResponse` (`useInstrumentResponses.ts:60`) | Envía `{item, opcion}`. | Envía `tiempo_ms` si el ítem no tenía respuesta confirmada, y guarda el aviso recibido. |
| `AvisoToast` (`components/student/AvisoToast.tsx`) | Dura 6 s, `etiqueta` obligatoria y descripción en una sola línea cortada con «…». | Props opcionales `duracion` y `parrafo`, y `etiqueta` opcional. Sin ellas, el marcado y el comportamiento no cambian. |
| `StudentActivityPlayer.tsx` | Sin aviso. | Pinta el toast de velocidad, que sobrevive al cambio de nodo. |

## Qué no cambia

El cálculo de resultados, el revelado en el libro de Helena, la secuencia y el contenido de las misiones, `useNoveltyQueue`, `UnlockToast` y las notificaciones, los eventos y el motor, y el modo local (`AvisoToast` conserva sus valores por defecto). `avisos_velocidad` no se muestra en ninguna pantalla ni sale en ninguna consulta. Corregir con «Anterior» sigue funcionando igual.

## Modelo de datos (decisión de diseño a aprobar; sigue `/cambio-modelo`)

- **`instrumento`:** `ms_por_palabra` (por defecto 150), `ms_respuesta` (por defecto 1200) y `racha_aviso` (por defecto 4), con `server_default`. `ms_respuesta` cubre decidir más dos toques (la opción y «Continuar»). En la migración, un `UPDATE` portable deja 800 en los instrumentos cuya escala tiene 2 opciones, para las bases ya cargadas.
- **`respuesta_item`:** `tiempo_ms` (int, nullable).
- **Tabla nueva `ritmo_aplicacion`:** `cuenta_id`, `aplicacion_id` (únicos juntos), `racha_rapida`, `items_desde_aviso`, `avisos_velocidad` y `actualizado_en`. Va en `TABLAS_DE_ESTADO`.
  - **Por qué una tabla nueva:** hoy el intento no tiene fila propia. `progreso_actividad` es por actividad y la racha cruza actividades; `resultado_instrumento` solo existe después de revelar.
  - **Reinicio por perfil plano:** se borra la fila, así que los avisos del intento anulado no quedan registrados, igual que sus respuestas. Aprobado por el usuario; se anota en `decisiones.md`.
- **`app/core/parametros.py`:** `MAX_AVISOS_VELOCIDAD = 2` e `ITEMS_ENTRE_AVISOS_VELOCIDAD = 10`.

## Backend

- **Sin endpoints nuevos.** `RespuestaItemEntrada` gana `tiempo_ms: int | None` (por defecto `None`, `ge=0`). `RespuestaItemsGuardados` gana `aviso_velocidad: int | None`.
- **Regla pura:** `umbral_ms` y `evaluar_ritmo(estado, item, tiempo_ms, instrumento) -> (estado, aviso)` en `app/services/instrumentos/calculo.py`, que no accede a la base.
- **Integración en `responder_items`:**
  - Solo entran los ítems sin respuesta previa en `existentes`.
  - La aplicación se resuelve con `AplicacionActividad` y `Aplicacion` de la caché de definiciones, según el instrumento del ítem. Si la actividad no tiene aplicación, no hay ritmo ni aviso.
  - La fila de ritmo se lee una sola vez, sin consultas dentro de bucles.
  - En un lote, una vez dado un aviso no se dispara otro.
- **Pruebas nuevas:**
  - `tests/unit/instrumentos/`: umbral (palabras, escalas de 2 y de 5 opciones: 7 palabras con 5 opciones da 2250 ms y 17 palabras, 3750 ms), racha rota por un ítem lento, primer aviso en el 4.º rápido, segundo aviso con 10 ítems de separación, tope de 2 y `tiempo_ms` nulo.
  - `tests/integration/instrumentos/`: racha que cruza dos actividades, reenvío que no cuenta y conserva `tiempo_ms`, intentos independientes (partida y llegada; reinicio por perfil plano) y lote con un solo aviso.
- **Pruebas existentes:** no se adapta ninguna salvo que el nuevo contrato lo exija; si pasa, queda anotado en `decisiones.md`.
- **Documentos:** sección «Aviso de velocidad» en `instrumentos.md`, que explica que `ms_respuesta` incluye los dos toques, y contrato de `responder-items` en `integracion.md`.

## Datos

- **`datos/fijos.py`:** `ms_respuesta` según las opciones de la escala de cada instrumento. Quedan 800 en habilidades (`ESC-CASI2`) y 1200 en intereses (`ESC-LIKERT5`), partida y llegada (`ESC-ACUERDO4`) e inteligencias (`ESC-VERDAD3`). `ms_por_palabra` y `racha_aviso` usan sus valores por defecto.
- **`datos/ruta.py`:** sin cambios.
- **Fixtures del front:** se regeneran.

## Frontend (solo api)

- **Contrato:** `types/servidorInstrumentos.ts` agrega `tiempo_ms?` a `RespuestaItemEntrada` y `aviso_velocidad` a `RespuestaItemsGuardados`. `respuestas_guardadas`, que hoy reutiliza `RespuestaItemEntrada`, pasa a `{item, opcion}`. `services/api/acciones.ts` no cambia, porque ya envía `respuestas` tal cual.
- **Medición (`useInstrumentResponses.ts`):**
  - Guarda la marca de tiempo al mostrarse cada nodo `item`, que es cuando sus opciones ya se pueden tocar; los diálogos son nodos aparte y no cuentan.
  - El tiempo se fija al pulsar «Continuar» y se conserva en `respuestaPendiente`, de modo que un reintento no lo altera.
  - Sin tiempo si el ítem ya estaba en `respuestasConfirmadas`.
- **Aviso:** se muestra solo en la rama `ok`, que ocurre una vez por guardado aunque antes hubiera un `guardado_sin_refrescar`. Esto importa porque el ítem que dispara el aviso puede ser el primero de una misión, justo el caso que refresca el camino.
- **Toast:** un componente nuevo, `features/activities/components/AvisoVelocidad.tsx`, usa `AvisoToast` con título «Lumi», sin etiqueta, 8 s y cerrar. Lleva el ícono `Sparkles` de lucide (Lumi es una estrella), porque `AvisoToast` no admite avatar. El texto va en párrafo completo, porque cortado en una línea no se leería. Es una clase nueva en `student-base.css`.
- **Textos:** funciones puras en `features/activities/lib/avisoVelocidad.ts`, con el personaje del `hablanteId` del ítem y su nombre de `getCharacterVisual` (`data/content/characters.ts`).

| Misión | Conduce | Versión |
|---|---|---|
| Partida (`b0_3`) | Helena | Tercera persona, con «Helena» (decisión tuya) |
| Llegada (`b5_2`) | `companero`, que es Lumi | Primera persona |
| Intereses | Sol | Tercera persona |
| Inteligencias | Maestro Bruno | Tercera persona |
| Habilidades | Dora | Tercera persona |

- **Pruebas en `tests/servidor/instrumentos/`:** tiempo al poder responder, sin tiempo al reenviar, toast con aviso 1 y 2, texto según el personaje y sin toast con `null`.

## Fases

1. **F1 · modelo y regla (backend):** todo lo anterior de modelo, migración, datos, backend, documentos y fixtures. Se corren `tests/unit/instrumentos`, `tests/integration/instrumentos`, `tests/integration/migraciones`, `tests/integration/datos`, `tests/integration/contrato` y `tests/integration/escenarios`, más `npm run test:servidor`. El tipo del front se actualiza en este commit, porque el contrato cambia aquí.
2. **F2 · medición y aviso (front):** se corren `tests/local/actividades`, `tests/servidor/actividades`, `tests/servidor/registro`, `tests/servidor/instrumentos` y `npm run test:servidor`.
3. **F3 · cierre:** suites completas (`uv run pytest -n auto -q`, `npm test`, `npm run build`, `npm run lint`, `npm run check:estructura`), `decisiones.md` y resumen. La spec queda en curso y no se hace push.

## Verificación

Además de las suites, con backend y front levantados en modo api: responder cuatro ítems seguidos rápido y ver el aviso 1; salir, volver a entrar y comprobar que la racha sigue. Se revisa en escritorio y en celular.

**Toast en celular:** hoy aparece a 136 px del borde superior, una posición pensada para el mapa, y con el texto completo puede tapar la pregunta durante los 8 s. Si la tapa, dentro de la actividad y solo en pantallas pequeñas se muestra abajo, sobre las opciones sin taparlas. En escritorio queda donde está y los demás toasts no cambian. En ambos casos se envía la captura al usuario. También se confirma en celular que el botón de cerrar del toast es visible y fácil de tocar.

## Decisiones propias (lo que las observaciones no definían)

- Un ítem con `tiempo_ms` nulo no cambia ningún contador: no suma a la racha, no la rompe y no suma a `items_desde_aviso`.
- `ms_respuesta` lleva por defecto 1200 en el modelo (valor aprobado por el usuario); el valor de cada instrumento lo fija `fijos.py`.

## Preguntas abiertas

Ninguna. La contradicción sobre Helena ya quedó resuelta: en la partida se usa la versión en tercera persona.
