# Auditoría de rendimiento de la plataforma: portal del estudiante y portal del apoderado

Alcance: las rutas GET y `POST /acciones/*` que usan el estudiante y el apoderado, y el front de los dos portales en
modo `api`. Quedan fuera el panel de la orientadora (ya auditado y corregido), el motor de reglas (ya tiene su prueba de
presupuesto) y el cálculo de resultados. Las fases A y B fueron solo de medición; el 14 de noviembre se aplicaron las
correcciones aprobadas (sección G), con el estado de cada una en la sección D.

**Estado:** fases A y B entregadas. El 14 de noviembre se aplicaron las correcciones aprobadas en la rama
`ajuste/auditoria-plataforma` (sección G). D-B2 queda mitigado con R1: lo que resta crece con la definición del
registro, con tope, y una prueba de techo lo fija; R2 queda como opción abierta. Las pruebas del 18 y el 19 de
noviembre, con más de 20 estudiantes a la vez y cuentas nuevas, guían las prioridades: ver la sección H («Operación para
el 18 y el 19») y la sección I («Despliegue»).

## Resumen para las pruebas del 18 y el 19

| Riesgo | Qué | Gravedad | Qué hacer antes |
|---|---|---|---|
| **Memoria al ingresar** | Argon2 con los parámetros por defecto usa 64 MiB por verificación. 25 ingresos simultáneos llevaron el proceso a **1,6 GB** en la medición. La EC2 del README es una `t3.small` (2 GB) con 2 workers, o una `t3.micro` (1 GB). **Corregido el 14 de noviembre (D-B1(a)):** con 4 turnos por proceso, el pico baja a 281 MB por worker, sin ingreso más lento con 2 núcleos. | Media, con la corrección desplegada | Comprobar el tipo de instancia, agregar swap y que el salón ingrese de forma escalonada (sección H). |
| Conexiones durante el LLM | Ninguna acción deja una conexión ni una transacción abierta mientras espera al LLM. Medido con 25 esperas simultáneas de 8 s: 0 conexiones en transacción. | Ninguna | Nada. |
| Pool de conexiones | 15 por worker (5 más 10 de desborde), 30 en total. La prueba de carga llegó a 30 de 30 sin errores ni esperas largas. | Baja | Nada. |
| Bloqueos de base | En PostgreSQL no hubo esperas por bloqueos. En SQLite las escrituras se serializan y llegan a 4,6 s, cerca del tiempo de espera de 5 s de SQLite; el despliegue usa RDS PostgreSQL. | Ninguna en RDS | Nada. |
| **Esta rama no está desplegada** | `ajuste/auditoria-plataforma` (sobre `ajuste/auditoria-panel`) lleva 32 commits sin integrar en `main`, y a `deploy` le faltan además 27 de `main`. Las correcciones de la auditoría del panel tampoco están en `deploy`. | — | Ver «Integración y despliegue». |

## Cómo se midió

Es el mismo método que en la auditoría del panel.

- **Base de medición:**
  - SQLite local, conjunto `contenido`, sembrada con acciones reales a través de la API y el cliente de prueba del LLM
    (`ClientePrueba`, sin red), con `ENTORNO=desarrollo`.
  - Para la carga, además, un clúster PostgreSQL 17 temporal y propio, creado con `initdb` en el scratchpad (puerto
    55432, solo `127.0.0.1`, `max_connections=100`). Se usó el mismo motor que RDS sin tocar ninguna otra base. Nunca
    se usó la base desplegada.
  - Todo es `DATO DE PRUEBA` y quedó fuera del repo.
- **Cuentas:**
  - **Nueva** (`est-mia`): solo ingresó. Casi todas sus secciones están cerradas y responden 409 en 4 consultas.
  - **A mitad** (`est-ana` tras `b3-8`): dos planes listos y los registros respondidos hasta ahí.
  - **Terminó** (`est-ana` al final):
    - las 38 requeridas, las misiones extra disponibles y los 6 casos;
    - 62 ingresos, 61 check-ins, 61 entradas del diario y 61 preguntas del día;
    - unas 160 vistas de carreras y 20 de ocupaciones;
    - 25 favoritos;
    - tres planes completos con 8 dudas y 10 pasos cada uno;
    - una entrevista publicada y 12 cartas.
  - **Apoderado** (`apo-rosa`): p1–p8, con 1, 2 y 3 hijos vinculados.
  - **Para medir el crecimiento**, además: 24 autores con su entrevista publicada, 24 reacciones en cada una y un
    comentario de la orientadora en cada una.
- **Conteo:** cada sentencia que llega al cursor (`before_cursor_execute`, como `ContadorConsultas`), por petición
  completa con el guardia de acceso incluido. Para separar las etapas de una acción, se midió cuánto aporta cada
  función envolviéndola sin cambiar el código.
- **Tiempo:** mediana de 3 peticiones (los POST, una sola). Sirve para comparar entre filas. El criterio es el número
  de consultas.
- **Tamaño:** el cuerpo JSON de la respuesta. Comprimido: gzip de nivel 1 (el de nginx por defecto) y de nivel 6.
- **Carga:** `uvicorn` local con `--workers 2`, como `despliegue/ec2/ov-backend.service`, y un cliente de prueba del LLM
  que demora 2 s (8 s para observar las conexiones). 25 hilos, uno por estudiante, con una barrera por fase para que
  coincidan, y las peticiones de arranque en paralelo, como el navegador. Se muestreó `pg_stat_activity` cada 100 ms.
- **Front:** lectura del código y un `npm run build` (`dist/` está ignorado por git).
- **Scripts:** fuera del repo, en el scratchpad de la sesión (`medicion/` y `carga/`).

## 1. Transversal

### 1a. El LLM no retiene conexiones

| Acción | Dónde | Transacción durante el LLM |
|---|---|---|
| `registro/responder`, `responder-seguimiento`, `reenviar` | `app/api/registro.py:19-29` (no usan `SesionBD`); `app/services/registro/flujo.py:245-252`: primera transacción (`fabrica.begin()`, `:248`), el LLM fuera (`_evaluar_primera`, `:192-193`) y la segunda transacción (`_cerrar`, `:185-189`) | Ninguna |
| `registro/entregar` | `flujo.py:312` (`terminar`), dentro de `ejecutar_accion` | No llama al LLM |
| `planes/guardar-seccion` (sugerencias de pasos tras CONOCIMIENTO o REALIDAD) | `app/api/planes.py:30-41`; `app/services/planes/acciones.py:344-351`; `app/services/planes/sugerencias.py:274-280` (leer, LLM fuera, guardar) | Ninguna |
| `pedir-sugerencias-guion` | `app/api/investigaciones.py:40-51`; `app/services/investigaciones/sugerencias.py:177-187` | Ninguna |

**El guardia.**
- **Qué hace:** abre la sesión de la petición (`SesionBD`) y la consulta del token la autoinicia.
- **Por qué no retiene la conexión:** `_autorizar` hace `rollback()` al terminar (`app/dependencies.py:53-69`), así que
  la conexión vuelve al pool antes del endpoint.

**Medido en PostgreSQL:**
- 25 `registro/responder` simultáneos con el LLM demorando 8 s.
- Durante toda la espera, `pg_stat_activity` mostró 10 conexiones `idle` (en el pool) y **0 `idle in transaction`**.

**Capacidad:**
- **Pool:** `create_engine(url, pool_pre_ping=True)` (`app/database.py:32-33`) deja el `QueuePool` por defecto: 5 más
  10 de desborde = **15 conexiones por worker y 30 con 2 workers**. Quien no consigue conexión espera hasta 30 s
  (`pool_timeout`) y luego falla. RDS `db.t4g.micro` admite unas 80, así que sobra margen.
- **Hilos:** los endpoints son `def` síncronos y corren en el pool de hilos de AnyIO, **40 por worker y 80 en total**.
  Una espera del LLM ocupa un hilo y ninguna conexión.
- **Cuántas esperas aguanta:** unas 70 esperas simultáneas antes de que las demás peticiones hagan cola por hilos. El
  tiempo máximo de una llamada es 12 s en registro y guion y 30 s en los pasos (`app/core/parametros.py:61`, `:144`).
  Con 25 estudiantes no es un límite.
- **El ingreso sí retiene una conexión:** la verificación Argon2 ocurre dentro de la transacción del ingreso
  (`app/api/sesion.py:13-21`, `ejecutar_accion`). Son unos 100 ms con la CPU libre y más cuando hay contención.

### Hallazgo urgente: memoria de Argon2 al ingresar

- **Parámetros:** `PasswordHasher()` sin argumentos (`app/services/acceso.py:20`): `time_cost=3`,
  **`memory_cost=65536` KiB (64 MiB)** y `parallelism=4`.
- **Medición:** 25 verificaciones de la misma contraseña.

| Hilos simultáneos | Tiempo total | Pico de memoria del proceso |
|---|---|---|
| 1 | 1,70 s | 88 MB |
| 2 | 1,00 s | 152 MB |
| 25 | 0,56 s | **1.627 MB** |

- **Escenario de riesgo:**
  - Con 2 workers, cada uno con hasta 40 hilos, 25 estudiantes que pulsan «Ingresar» a la vez pueden sumar de 0,6 a
    1,6 GB solo en verificaciones, sobre los dos procesos (unos 150 MB cada uno).
  - Con 2 vCPU, cada verificación tarda más y se superponen más que en esta máquina, que tiene 20 núcleos.
  - En una `t3.small` sin swap, el kernel puede matar un worker. Las peticiones en curso de ese worker fallan con 502
    en nginx, y uvicorn lo vuelve a levantar.
  - Si el ingreso se escalona en 10 a 20 s, el pico baja a unos pocos cientos de MB.
- **Bloqueo por intentos:** es por cuenta, no por IP (`acceso.py:97-104`). Un salón detrás de una sola IP no se bloquea
  entero.

### 1b. Prueba de carga: 25 estudiantes nuevos a la vez

Escenario por estudiante:
1. Ingreso: `POST /sesion/ingresar`, `GET /sesion`, `POST /acciones/ingresar`, las 6 lecturas del arranque en paralelo
   y la segunda lectura de notificaciones del mapa.
2. Completar `b0-1` y su refresco.
3. Avanzar el resto del tramo 0, con refresco tras cada actividad.
4. Abrir `b1-1` y guardar su primer ítem con el LLM de prueba (2 s).

Tiempos en ms con 25 estudiantes en la misma fase:

| Fase · ruta | PostgreSQL mediana / p95 / máx. | SQLite mediana / p95 / máx. |
|---|---|---|
| `POST /sesion/ingresar` | 1006 / 1191 / 1196 | 746 / 1076 / 1077 |
| `GET /sesion` | 252 / 542 / 546 | 239 / 496 / 500 |
| `POST /acciones/ingresar` | 353 / 468 / 473 | 300 / 573 / 673 |
| `GET actividades` (arranque) | 437 / 573 / 605 | 327 / 400 / 426 |
| `GET avance` · `resumen` · `secciones` · `presentaciones` · `notificaciones` (arranque) | 371–454 / ≤ 632 / ≤ 695 | 233–297 / ≤ 399 / ≤ 400 |
| `POST completar-actividad` (`b0-1`, los 25 a la vez) | 295 / 545 / 609 | 577 / 1154 / 1186 |
| `POST completar-actividad` (tramo 0, 125 peticiones) | 391 / 577 / 720 | 131 / **2762 / 4588** |
| `POST responder-items` | 398 / 479 / 537 | 129 / **3013 / 4010** |
| `GET actividades` (refrescos) | 352 / 556 / 637 | 59 / 113 / 128 |
| `GET .../b1-1/registro` | 247 / 453 / 460 | 167 / 219 / 222 |
| `POST registro/responder` (LLM de 2 s) | 2289 / 2429 / 2465 | 2393 / 2819 / 2895 |
| Duración de cada fase | 3,1 s · 1,0 s · 6,9 s · 2,9 s | 2,3 s · 1,2 s · 7,3 s · 3,2 s |

- **Errores:** ninguno en las dos bases: ni 5xx, ni 409 por conflicto, ni tiempos agotados.
- **PostgreSQL:**
  - **Conexiones:** el pico llegó a **30**, el tope de los dos pools. En las fases 1 y 3 hubo hasta 29 en
    `idle in transaction`: son peticiones con una sesión abierta mientras Python arma la respuesta, porque las lecturas
    no confirman hasta que se cierra la sesión.
  - **Esperas por bloqueos:** no hubo ninguna de tipo `Lock`. En la fase 4 hubo esperas `LWLock` (hasta 9), propias
    del disco local durante las escrituras.
- **SQLite (propio de SQLite, no aparece en RDS):**
  - Un solo escritor a la vez. Las acciones esperan el candado de escritura: p95 de 2,8 s y máximo de 4,6 s, cerca de
    los 5 s tras los que pysqlite devuelve `database is locked`.
  - Las lecturas son más rápidas que en PostgreSQL local porque no hay red ni pool.
- **Lo que no se reproduce aquí:** la CPU de la EC2 (2 vCPU y créditos de ráfaga de `t3`), la latencia de red a RDS y
  la memoria de 2 GB. Los tiempos absolutos en producción serán peores. La memoria es el riesgo, como se ve en 1a.

### 1c. Gasto fijo por petición

| # | Sentencia | Desde dónde | En qué rutas |
|---|---|---|---|
| 1 | `SELECT cuenta.id, codigo, rol, activa WHERE codigo = ?` | Guardia: `_autorizar` (`app/dependencies.py:55-56`). Después hace `rollback`, que expira lo leído. | Todas, salvo `/sesion/ingresar` |
| 2 | `SELECT cuenta.*` (la cuenta completa) | `obtener_cuenta` (`dependencies.py:110`, `CuentaConsultada`) o la validación de cada acción. Vuelve a leer la fila que acaba de leer el guardia. | Todas las de `/cuentas/{c}/…` y todas las acciones |
| 3 | `SELECT desbloqueo WHERE cuenta_id IN (?)` | Contexto de consultas (`core/contexto.py`): disponibilidad de la sección o del objetivo | Todas las rutas con sección y todas las acciones |
| 4 | CTE `eventos_cuenta` | Progreso de la regla, para el mensaje del 409 | Solo cuando la sección está cerrada |

- **Una petición vacía cuesta 2 consultas** (`GET /sesion`), 3 con la comprobación de la sección y 4 si responde 409.
- **El ingreso completo de una cuenta nueva** hace 10 peticiones con guardia y 35 consultas. **20 de ellas (57 %) son
  gasto fijo** (2 × 10), y **4 más son lecturas repetidas de desbloqueos** (resumen, secciones, actividades y la
  acción).

Opciones, sin elegir:
1. **Que el guardia lea la cuenta completa y la conserve para la petición.** Un `rollback` expira los objetos, así que
   haría falta guardar los valores, o no hacer `rollback` sino cerrar la transacción sin expirar
   (`expire_on_commit=False` en esa sesión o `sesion.commit()` de solo lectura). Ahorra 1 consulta por petición.
  Toca el acceso.
2. **Que `obtener_cuenta` use el id que ya resolvió el guardia** (`sesion.get(Cuenta, actor.id)`). No ahorra la
   consulta, que sigue siendo una, pero la hace por clave primaria. Ganancia mínima.
3. **Guardar por petición los desbloqueos de la cuenta** en `ContextoConsultas`. Ya se hace dentro de una misma
   petición: lo repetido aparece entre peticiones, no dentro de una. Bajarlo requiere que el front pida menos (ver 2).
4. **Una ruta de arranque que agrupe resumen, secciones y presentaciones.** Va contra la regla de un dominio por ruta
   (`AGENTS.md`, «Dónde va cada cosa») y cambia el contrato. No se recomienda.

### 1d. Compresión

- **Lo que dice el repo: nada comprime las respuestas JSON.**
  - La aplicación no tiene `GZipMiddleware` (`app/main.py`).
  - `despliegue/ec2/nginx-ov.conf` no declara `gzip`. El `nginx.conf` de Ubuntu trae `gzip on`, pero `gzip_types`
    queda comentado, así que solo comprime `text/html` y no `application/json`.
  - Amplify reenvía `/api/<*>` a la EC2 (`despliegue/amplify/reescrituras.json`). Si la CDN de Amplify comprime las
    respuestas de una reescritura no se puede saber desde el repo.
- **Cómo comprobarlo en el despliegue**, sin tocar la base, con un token de prueba de una cuenta de prueba:
  `curl -sI -H 'Accept-Encoding: gzip' -H 'Authorization: Bearer …' https://<dominio>/api/cuentas/<cuenta>/actividades`.
  Si la respuesta no trae `Content-Encoding: gzip`, viaja sin comprimir.

| Respuesta | Sin comprimir | gzip 1 | gzip 6 |
|---|---|---|---|
| `actividades`, cuenta nueva | 54,5 KB | 9,9 KB | 6,7 KB |
| `actividades`, cuenta que terminó | 30,9 KB | 8,9 KB | 6,1 KB |
| Resultado de intereses (`TEST-RIASEC/resultado`) | 22,0 KB | 7,9 KB | 5,4 KB |
| `familia/resultados` (apoderado) | 22,2 KB | 8,0 KB | 5,5 KB |
| `planes` (3 planes completos) | 22,1 KB | 4,0 KB | 2,8 KB |
| `/instrumentos` (catálogo) | 18,8 KB | 9,5 KB | 6,5 KB |
| `diario/entradas` (61 entradas) | 28,4 KB | 1,4 KB | 1,0 KB |
| Detalle de carrera | 14,5 KB | 3,9 KB | 2,8 KB |
| `fichas` · `favoritos` | 10,1 · 9,0 KB | 3,2 · 2,2 KB | 2,3 · 1,6 KB |
| Paquete JS del front (lo sirve Amplify) | 2.829 KB | | 817 KB (lo informa Vite) |

**Lectura:** activar `gzip_types application/json` en nginx reduce de 3 a 5 veces todo lo que viaja tras cada acción.
Es un cambio de configuración y no de contrato (D-B6).

## 2. Refresco, ingreso y mapa

### Costo por gesto del usuario

La acción más todas las lecturas que dispara el front. KB sin comprimir. Las rutas del front están en la sección C.

| Gesto | Peticiones | Consultas | KB |
|---|---|---|---|
| **Ingreso (cuenta nueva)** | `sesion/ingresar` 1 · `GET /sesion` 2 · `acciones/ingresar` 4 · `notificaciones` 4 **×2** · `actividades` 7 · `avance` 3 · `resumen` 3 · `secciones` 4 · `presentaciones` 3 | **35** (20 de gasto fijo) | **≈ 59** (actividades, 54,5) |
| Ingreso (cuenta que terminó) | Lo mismo, más `check-ins` 4 y el resultado RIASEC 7 | **43** | **≈ 66** (actividades 30,9 y RIASEC 22) |
| **Completar una actividad** | `completar-actividad` 8–12 · `actividades` 5–7 · `avance` 3 · RIASEC 7 (si `act-tip-final` está abierta) · `marcar-vistas` 3 (si hubo notificaciones) · la sección vencida si se abre algo (p. ej. `secciones` 4) | Nueva 19–26 · terminó 23–29 | Nueva ≈ 57 · terminó ≈ 55 |
| **Guardar un ítem de registro** | `registro/responder` 16–65. Refresca solo si la respuesta trae eventos o desbloqueos (`registro.ts:41-43`). | 16–65 | ≤ 8 |
| **Abrir un detalle de carrera** | `GET detalle` 15–21 · `ver-carrera` 4–7 · `actividades` 5 · `avance` 3 · RIASEC 7 | **34–43** | **≈ 68** |
| **Mover un medidor** | `planes/medidores` 6 · `actividades` 5 · `avance` 3 · RIASEC 7 · `planes` 18 | **39** | **≈ 76** |
| **Marcar un paso** | `planes/paso-hecho` 8 · lo mismo que el medidor | **41** | **≈ 76** |
| **Escribir una entrada** | `escribir-entrada` 7–9 · `actividades` 5 · `avance` 3 · RIASEC 7 · entradas 4 · amistad 4 · preguntas 4 (`vencerDiario`) | **34–36** | **≈ 86** (entradas, 28) |
| **Escribir una carta** | `escribir-carta` 6–10 · `actividades` 5 · `avance` 3 · RIASEC 7 · `conversaciones` 6 | **27–31** | **≈ 60** |

En los cinco últimos gestos, **entre 15 consultas y 55 KB son el refresco** (actividades, avance y RIASEC), aunque la
acción no cambie nada del mapa (ver abajo).

### Qué declara cada acción y qué solo se ve al volver a pedir

Toda acción devuelve `RespuestaAccion` (`app/schemas/acciones.py:160-175`):
- `eventos_registrados`;
- `nuevos_desbloqueos`, con `tipo_objetivo` BLOQUE, ACTIVIDAD, FICHA, TESTIMONIO, PREGUNTA_DIARIO, SECCION, INSIGNIA,
  NIVEL, SECCION_PLAN o CONVERSACION;
- `nuevas_notificaciones`;
- `entradas_desbloqueadas`, solo cuando la acción dejó preguntas en el diario.

Se compararon `actividades`, `avance`, `resumen` y `secciones` antes y después de cada acción:

| Acción | Declara | Cambia en las lecturas | ¿Lo declara todo? |
|---|---|---|---|
| `completar-actividad` (`b0-2`) | Evento `COMPLETA_ACTIVIDAD b0-2`; desbloqueos SECCION DIARIO, ACTIVIDAD `b0-3` y PREGUNTA_DIARIO | `b0-2` → COMPLETADA; `b0-3` → DISPONIBLE (y su `bloqueo`); DIARIO → DISPONIBLE; `avance`: `camino`, `tramos[B0]`, `requeridas` y `tramo_actual` (+1) | **Implícito:** COMPLETADA y los contadores de `avance` no vienen en la respuesta, pero se deducen del evento `COMPLETA_ACTIVIDAD`. |
| Primer ítem de un cuestionario (`responder-items`) | Nada | `b0-3` → **EN_CURSO** | **No.** El front ya lo resuelve refrescando en el primer ítem (`operaciones.ts:130-131`). |
| Primer ítem de un registro | `registro.estado` en la respuesta | La actividad → EN_CURSO | Sí. El front lo copia (`registro.ts:16-30`). |
| `ver-carrera` | Evento `VISTA_CARRERA` | **Nada** | Sí: no hay nada que refrescar. |
| `escribir-entrada` | Eventos `ESCRIBE_ENTRADA_*` | **Nada** | Sí |
| `escribir-carta` | Nada | **Nada** | Sí |
| `planes/medidores` | Evento `ACTUALIZA_PLAN` | **Nada** | Sí |

Lo que cambia en el mapa solo puede venir por dos caminos:
1. **Un desbloqueo.** Disponibilidad, `visible`, estado del bloque y de la Ciudad, nivel, secciones, fichas e
   insignias. Todos se guardan como `desbloqueo` y viajan en `nuevos_desbloqueos`.
2. **Un cambio de progreso de la propia actividad.** COMPLETADA, que viene como evento `COMPLETA_ACTIVIDAD` (y
   `COMPLETA_BLOQUE`), o EN_CURSO, que no viene declarado.

El front no muestra los contadores `actual` de `bloqueo.condiciones_faltantes`. Solo lee `mensaje`,
`evaluador_especial` y `condiciones_faltantes[0].requerido`, que no cambia (`useHistoriaLumi.ts:34`). Por eso no
quedan barras desactualizadas: las barras «actual de requerido» salen de `GET progreso`, que se pide aparte.

**Conclusión para un refresco condicional:**
- Es seguro saltarse `actividades` y `avance` cuando la respuesta no trae desbloqueos ni eventos `COMPLETA_ACTIVIDAD` o
  `COMPLETA_BLOQUE` y la acción no es la primera respuesta de un cuestionario.
- La única excepción sin declarar es EN_CURSO del primer ítem de un cuestionario, que el front ya trata aparte.
- El nivel (`resumen`) solo cambia con un desbloqueo NIVEL, y el front ya lo condiciona así.

### Por qué `actividades` pesa 55 KB en la cuenta nueva

| | Cuenta nueva | Cuenta que terminó |
|---|---|---|
| Total | 54,5 KB | 30,9 KB |
| `bloqueo` de las actividades | **24,9 KB** (78 bloqueadas, una regla y 84 condiciones) | 3,1 KB (10 bloqueadas) |
| `bloqueo` de los bloques | 2,2 KB | 0 |
| `descripcion` | 7,5 KB | 7,5 KB |
| Actividades con `visible=false` | 14 de 80 (viajan completas) | 3 |

Qué campos se usan en el front:
- **Mapa** (`features/adventure/lib/puntosServidor.ts`): `codigo`, `contenido`, `visible`, `estado`, `titulo`, `tipo`
  y `requerida`. Del bloque, `numero`, `nombre`, `espacio` y `codigo`. También `duracion_estimada_min`
  (`etiquetaActividad.ts:12`).
- **Panel de detalle del punto** (`detallesRuta.ts:19-56`): `descripcion` y, de `bloqueo`, solo `mensaje` del primer
  elemento (`adaptadores.ts:103-107`) y `evaluador_especial` (`adaptadoresInstrumentos.ts:74-77`).
- **Dentro de `condiciones_faltantes`:** solo `requerido` de la primera condición, en `useHistoriaLumi.ts:34`.
  `tipo_evento`, `referencia`, `tipo_conteo`, `actual`, `cumplida` y `texto` no se leen. `regla` tampoco.
- **Actividades con `visible=false`:** se descartan en el mapa y en el reproductor, pero se usan para el revelado
  (`refresco.ts:25-26`, `:77-80`) y en `useHistoriaLumi.ts:28`.
- **Campos sin uso:** `orden` en el mapa (solo el apoderado, `parent/lib/selectors.ts:15`) y `visibilidad`
  (solo `contenidos.ts:124`).

**Lectura:** casi la mitad del peso de la cuenta nueva (unos 24 KB) son condiciones de bloqueo que el front no lee.
Recortarlas cambia el contrato de `ActividadCuenta` (D-B7). Con gzip, la respuesta baja a 7–10 KB y la ganancia es
mucho menor.

### Resultado de intereses: cuándo cambia y dónde se vuelve a pedir

> **Corrección (14 de noviembre):** la lectura «en cada refresco» depende de `act-tip-final`, que no existe en
> `contenido` ni en `ruta`. Con los datos desplegados, el refresco nunca pedía el resultado. Los costos de esta
> sección que lo suman están corregidos en la sección G.

- **Cuándo cambia de verdad:** solo con `revelar-resultado` y `reiniciar-instrumento`. Las respuestas de los ítems no
  lo cambian hasta que se revela, y cada revelado crea un resultado nuevo con su `calculado_en`.
- **Dónde lo pide el front sin que haya cambiado:**
  - En cada ingreso y en **cada refresco tras cualquier acción**, si `act-tip-final` no está BLOQUEADA
    (`store/servidor/refresco.ts:81-85`). Si responde 409 (sin resultado), lo vuelve a pedir en el refresco siguiente.
  - Con el libro de Helena abierto, en cada recarga de actividades: el efecto de `useHelenaPages.ts:72-93` depende de
    `actividades.datos` y vuelve a pedir todos los resultados revelados con `?aplicacion=`, `comparacion`, `historial`
    y `/instrumentos`.
  - Al abrir Mi perfil (`useStudentProfile.ts:38`), siempre: `cargarInstrumentos` no mira si ya estaba listo
    (`instrumentos.ts:41-47`).
  - Al revelar o reiniciar se pide 2 veces seguidas: primero el refresco y después `cargarInstrumentos(true)`
    (`instrumentos.ts:153-182`).
- **Caché:** no hay. `resultado.ts:15-22` solo comparte la petición mientras está en vuelo, y
  `cargarResultadoRiasec` nunca comprueba si el resultado ya estaba cargado.

## 3. Registro (solo medición; la corrección se decide aparte)

### ¿Crece con los ítems? Sí, con un tope por definición

`registro_cuenta` (`app/services/registro/consultas.py:85-93`) arma **todos** los ítems del registro en cada respuesta.
Para cada uno llama a `resolver_contexto` (`consultas.py:64` → `contexto.py:488`), que vuelve a leer la base:
`resolver_marcadores`, `_opciones` y `_ecos` dos veces (para mostrar y para el LLM, `contexto.py:498-500`). Cada una
de esas funciones lee sus fuentes: planes, resultados, respuestas vigentes y piezas.

Comparación de registros reales sobre la cuenta que terminó. Los segmentos se midieron envolviendo cada función:

| Registro | Ítems | `GET registro` | `responder` | Guardado (con su contexto) | `eventos_adecuado` | Respuesta (`registro_cuenta`) | Contexto dentro de la respuesta | `entregar` |
|---|---|---|---|---|---|---|---|---|
| `b1-6`, `b2-3`, `b4-2` | 1 | 4 | 17 | 10 (1) | 2 | 2 | 1 en 1 llamada | 9 |
| `b3-a`, `ma3` | 1 | 5 | 16–17 | 9–10 (1–2) | 2 | 3 | 2 | 9–10 |
| `ma8`, `h3` | 1 | 10 | 27 | 15 (7) | 2 | 8 | 7 | 15 |
| `b5-1`, `b5-3` | 1 | 12 | 33 | 18 (9) | 2 | 10 | 9 | 17 |
| `b4-5` | 1 | 13 | 35 | 19 (10) | 2 | 11 | 10 | 18 |
| `b1-1`, `b1-7` | 3 | 6 | 19 | 10 (1) | 2 | 4 | 3 en 3 llamadas | 11 |
| `b2-4` | 3 | 7 | 20 | 10 (1) | 2 | 5 | 4 en 3 | 12 |
| `b1-3` | 3 | 8 | 21 | 10 (1) | 2 | 6 | 5 en 3 | 13 |
| `b3-4` | 2 | 8 | 22 | 11 (2) | 2 | 6 | 5 en 2 | 13 |
| **`b4-1`** | **2** | **35** | **65** | **27 (18)** | 2 | **33** | **32 en 2** | **40** |

- **De qué depende:** las consultas son, por ítem, el costo de su contexto, más una base fija. El costo del contexto va
  de 1 (un ítem sin piezas) a 16–18 (un ítem de `b4-1` que lee planes, resultados de instrumentos y ecos de varios
  registros).
- **Tope por definición:** `MAXIMO_ITEMS_REGISTRO = 5` (`app/core/parametros.py:49`), que valida el cargador
  (`datos/cargador.py:428-429`). Hoy el registro más grande tiene 3 ítems y el más caro es `b4-1`, con 2. Con 5 ítems
  como el más caro de `b4-1`, `responder` llegaría a unas **115 consultas** (27 + 5 × 16 + 5).
- **Con los datos de la cuenta no crece:**
  - `b4-1` hace 65 consultas con 2 planes (fase A, a mitad) y 65 con 3 planes completos.
  - Las lecturas de planes y resultados usan `IN (…)` sobre todos los planes.
  - 61 entradas del diario y 160 vistas no cambian nada.

**Lecturas duplicadas dentro de `responder`:**
- El contexto del ítem guardado se resuelve 2 veces: en el guardado (`flujo.py:219`) y otra vez en la respuesta.
- `validar_registro` corre 3 veces (5 consultas en total): en el guardado, en `_escribir` (`flujo.py:176`) y en la
  segunda transacción.
- Dentro de un mismo `resolver_contexto`, los planes se leen hasta 9 veces en `b4-1`: una vez por cada marcador, opción
  o eco que los necesita.

**Separación pedida:**

| Parte | Consultas |
|---|---|
| Guardado y validación (acceso, validar, contexto del ítem, intento, cierre de repreguntas) | 9 a 27 |
| Evaluación | `eventos_adecuado` 2; el motor, 0 al editar un ítem (sin eventos nuevos) |
| Armar la respuesta (`registro_cuenta`) | 2 a 33 |
| `entregar` | Casi todo es `registro_cuenta` (de 2 a 33 de sus 9 a 40) |

### Qué usa el front de la respuesta de `responder`

- **El registro completo:** `useRegistroServidor.ts:141`, `:159` y `:181` hacen `setRegistro(paso.registro)`.
- **El desenlace** (`adaptadoresRegistro.ts:110-115`) usa `paso.paso`, `paso.mensaje`, `paso.repregunta` y `paso.item`,
  y busca la respuesta dentro de `paso.registro`.
- **El almacén** usa `registro.estado` y, para decidir si refresca, `eventos_registrados` y `nuevos_desbloqueos`
  (`registro.ts:40-43`).

### Opciones de corrección, sin elegir

| Opción | Qué es | ¿Modifica `resolver_contexto`? | ¿Contrato? | Riesgo | Cómo se demostraría que la respuesta sale idéntica |
|---|---|---|---|---|---|
| R1 | **No resolver dos veces el ítem guardado:** pasar a `registro_cuenta` el contexto que ya resolvió el guardado. | No | No | Bajo | La prueba de registros de `contenido` (`tests/integration/registros/`) y una comparación del JSON de `responder` antes y después en todos los registros de `contenido`. Ahorra de 1 a 18 consultas, no corrige el crecimiento. |
| R2 | **Una lectura por petición para el estudiante**, como `LecturaContexto` del panel (`panel/contexto_lectura.py`): vigentes, planes, referencias y piezas leídos una vez para todos los ítems. `registro_cuenta` arma cada ítem desde ahí. | No (queda como referencia) | No | Medio. Duplica las reglas de marcadores y ecos, como en el panel. | La misma técnica del panel: una prueba que, por cada ítem de cada registro de `contenido` y para varias cuentas (nueva, a mitad, terminó), compare lo que arma la lectura con `resolver_contexto` en vivo, más la comparación del JSON completo de `GET registro` y de `responder`. |
| R3 | **Memorizar dentro de `resolver_contexto`** las lecturas de sus fuentes (planes, resultados, vigentes, piezas) en `ContextoConsultas`, válidas durante la petición y sin invalidación entre transacciones. | **Sí** (por dentro; su salida debe ser igual) | No | **Alto**. La segunda transacción de `responder` lee después de escribir la evaluación: una caché que la cruce devolvería datos viejos. | Las pruebas de `registro` y de `registros`, más la comparación de salidas de `resolver_contexto` antes y después, ítem por ítem, en las cuentas de `contenido`. |
| R4 | **Devolver solo el ítem guardado y el siguiente** en `responder`. | No | **Sí** (`PasoRegistro`), con cambios en el front (`useRegistroServidor.ts`) | Medio | Pruebas de contrato del back y del front; el front tendría que fusionar el ítem en el registro que ya tiene. |

Todas tocan el flujo del registro y quedan para decidir una por una, **después del 19**. Hoy, una cuenta nueva el día
de la prueba hace los registros de B1 (16–22 consultas por ítem), no los de B4 y B5.

## 4. Planes

### `GET planes` no crece

| Planes | Dudas por plan | Pasos por plan | Consultas | KB |
|---|---|---|---|---|
| 3 | 8 | 10 | 18 | 22,1 |
| 3 | 0 | 10 | 18 | 13,9 |
| 3 | 0 | 0 (quedan los hechos) | 18 | 11,4 |
| 1 | 0 | 0 | 18 | 6,6 |
| 1 | 8 | 0 | 18 | 9,5 |
| 1 | 8 | 10 | 18 | 11,2 |

(En la fase A, con 2 planes a mitad del camino, fueron 19: una rama.)

### `guardar-seccion`

| Sección y cambio | Consultas en SQLite | De ellas, `INSERT` |
|---|---|---|
| CONOCIMIENTO sin dudas nuevas | 7 | 1 |
| CONOCIMIENTO con 1 duda nueva (con sugerencias del LLM) | 21 | 3 |
| CONOCIMIENTO con 8 dudas nuevas | 36 | 17 (8 dudas, 8 sugerencias y el evento) |
| CONOCIMIENTO de 8 a 0 dudas | 9 | 1 |
| PASOS sin pasos nuevos | 7 | 1 |
| PASOS con 1 paso nuevo | 10 | 2 |
| PASOS con 10 pasos nuevos | 20 | 11 |
| PASOS de 10 a 0 | 9 | 1 |

- **El código no hace un flush por elemento.** Las dudas se agregan con `sesion.add_all(nuevas)`
  (`app/services/planes/acciones.py:236`), las sugerencias con `sesion.add_all(...)` (`sugerencias.py:262`) y los
  pasos con `sesion.add(nuevo)` (`acciones.py:313`). Después hay un solo flush.
- **Lo que separa los `INSERT` es el dialecto.** SQLAlchemy 2.0.54 agrupa los `INSERT` de un mismo flush
  (`insertmanyvalues`) en PostgreSQL, pero no en SQLite cuando necesita los ids generados. Medido con una tabla de
  prueba: **8 filas son 8 `INSERT` en SQLite y 1 en PostgreSQL**.
- **Lectura:** en RDS, `guardar-seccion` no crece con las dudas ni con los pasos. Solo crecen las filas por sentencia.
  Las demás sentencias (5 a 14 `SELECT`) son constantes.
- **Consecuencia para las pruebas:** las pruebas de presupuesto corren en SQLite y cuentan un `INSERT` por fila. Una
  prueba de presupuesto de `guardar-seccion` tiene que contar los `INSERT` aparte, o aceptar que crecen solo en
  SQLite.

### Qué acciones necesitan volver a leer `GET planes`

- **Hoy:** las seis acciones (crear, guardar sección, medidores, paso hecho, ordenar, eliminar) pasan por `accionPlanes`
  (`store/servidor/planes.ts:8-12`), que hace el refresco completo y después `vencerSeccion('planes')`.
- **Pedido doble:** con un desbloqueo SECCION_PLAN, `planes` se pide 2 veces (una dentro del refresco y otra al
  vencerla).
- **Qué devuelve cada acción:** solo `RespuestaAccion` (eventos, desbloqueos y notificaciones), sin el plan
  (`services/api/planes.ts:15-60`). Ninguna puede actualizar el almacén por sí sola sin un cambio de contrato.
- **Qué recalcula el servidor en cada acción:**

| Acción | Qué cambia el servidor que el front no puede deducir | ¿Podría actualizar el almacén con su propia respuesta? |
|---|---|---|
| `medidores` | Nada más que los tres valores enviados | Sí, sin cambio de contrato: el front ya sabe lo que envió. |
| `paso-hecho` | El estado del paso y el posible cierre de su duda (`cerrada_por_paso_id`) | Solo si la respuesta devuelve el plan (contrato). |
| `ordenar` | Las prioridades | Sí, sin cambio de contrato (es el orden enviado). |
| `eliminar` | Las prioridades de los demás | Con cuidado: hay que recalcular las prioridades. |
| `crear` y `guardar-seccion` | Totales, estados de sección, dudas, sugerencias del LLM, `lista_para_comparar` | No: necesitan `GET planes` o que la acción devuelva el plan (contrato). |

## 5. Catálogo

- **Las 4 consultas de más** entre la cuenta a mitad y la que terminó (carrera 17 → 21, ocupación 13 → 17 y familia
  9 → 13) **son una rama que se cumple, no crecimiento.**
  - Son las mismas 4 sentencias en las tres rutas: `resultado_instrumento`, `dimension`, `coincidencia` con
    `ocupacion`, y los conteos de `ocupacion_familia`.
  - Representan el resultado de intereses para marcar la afinidad, y aparecen cuando la cuenta ya lo reveló.
  - No dependen de favoritos, planes ni vistas: la cuenta que terminó tiene 25 favoritos, 3 planes y unas 180 vistas, y
    aun así son 4.
- **`ver-*` y el refresco.**
  - **Qué devuelven:** `RespuestaAccion` con el evento `VISTA_*` y los desbloqueos que provoquen, por ejemplo una regla
    que cuenta vistas de carreras.
  - **Medido:** tras un `ver-carrera` sin desbloqueos no cambia nada en actividades, avance, resumen ni secciones.
  - **Qué hace el front:** `useCatalogVisit.ts:19` descarta la respuesta, y `verEnCatalogo` (`catalogo.ts:307-315`)
    siempre hace el refresco completo.
  - **Conclusión:** la respuesta permite saltarse el refresco cuando `nuevos_desbloqueos` viene vacío (F2). Es el caso
    más frecuente: cada detalle abierto.

## 6. Investigaciones

| Situación del salón | `entrevistas` (lista) | `entrevistas/{e}` (detalle) | `investigaciones` |
|---|---|---|---|
| 1 entrevista | 12 · 0,6 KB | 15 · 0,7 KB | 10 |
| 25 entrevistas sin reacciones | 13 · 12,5 KB | 15 · 0,7 KB | — |
| 25 entrevistas, 24 reacciones y 1 comentario en cada una | 13 · 12,6 KB (15,7 KB con `limite=50`) | 16 · **8,6 KB** | 10 |

- **No crecen en consultas** con las entrevistas, las reacciones ni los comentarios. Las diferencias de 12 a 13 y de 15
  a 16 aparecen cuando hay otras entrevistas o un comentario: son ramas.
- **El tamaño sí crece:** el detalle trae todas las reacciones sin paginar (8,6 KB con 24) y la lista trae la página.

## 7. Apoderado

| Ruta | 1 hijo | 2 hijos | 3 hijos |
|---|---|---|---|
| `GET familia` | 8 · 0,7 KB | 10 · 1,2 KB | **12** · 1,6 KB |
| `GET familia/resultados` (con y sin `?estudiante=`) | 9 · 22,2 KB | 9 | 9 |
| `GET conversaciones?estudiante=` | 7 · 5,2 KB | 7 | 7 |
| `GET /sesion` · `actividades` · `notificaciones` · `fichas` | 2 · 4 · 4 · 6 | igual | igual |

- **`familia` crece con los hijos: 2 consultas por hijo.**
  - **Dónde:** `consultar_familia` arma cada hijo en un bucle (`app/services/familia.py:168`) con `_estudiante`
    (`:154-159`). Este llama a `nivel_actual(sesion, hijo)` y a `avance_ruta(sesion, hijo)`, y `avance_ruta` lee
    `progresos_de(hijo.id)` (`:56`).
  - **Cuánto pesa:** con 3 hijos, 4 consultas de más.
  - **Corrección propuesta:** cargar los progresos y los desbloqueos de todos los hijos en una lectura (D-B3).
- **`/instrumentos` repetido:**
  - `useResultadosHijoSeccion` (`store/servidor/apoderadoResultados.ts:110-115`) revalida en cada montaje y en cada
    cambio de hijo. Cada vez pide `familia/resultados` (22 KB) y `/instrumentos` (18,8 KB, el catálogo, que no depende
    de la cuenta, `apoderado.ts:263`).
  - Esto ocurre en cada visita a Inicio (`useParentOverview.ts:98`) y al detalle de un cuestionario
    (`ParentQuestionnaireDetailView.tsx:49`).
- **Las rutas del hijo:** el front del apoderado nunca llama a `/cuentas/{hijo}/actividades`, `avance`, `planes`,
  `favoritos` ni `instrumentos`. Usa sus propias `actividades` y `familia`, `familia/resultados?estudiante=`, sus
  `fichas`, `conversaciones?estudiante=` y el catálogo con su cuenta. Que esas rutas respondan al apoderado (fase A) es
  la política de acceso del backend, no un uso del front.

## A. Consultas por ruta (fase A)

En cada celda: **consultas · ms · KB**. Un código HTTP al final indica que la ruta no respondió 200 para esa cuenta
(409: sección cerrada). Mediana de 3 peticiones con la caché caliente.

### Ingreso, sesión y mapa

| Ruta | Nueva | A mitad | Terminó | Frecuencia en el front |
|---|---|---|---|---|
| `POST /sesion/ingresar` | 1 · 116 · 0,3 | | | Rara vez: al iniciar sesión. El tiempo es Argon2. |
| `GET /sesion` | 2 · 9 · 0,1 | 2 · 10 · 0,1 | 2 · 10 · 0,1 | Cada ingreso |
| `POST /acciones/ingresar` | 4 | | 4 (igual en los 62 ingresos) | Cada ingreso |
| `GET actividades` | 7 · 22 · **54,8** | 7 · 29 · **42,5** | 5 · 21 · **30,9** | Cada ingreso **y tras cada acción** |
| `GET avance` | 3 · 11 · 0,9 | 3 · 10 · 0,9 | 3 · 13 · 0,8 | Cada ingreso **y tras cada acción** |
| `GET resumen` | 3 · 10 · 0,3 | 3 · 11 · 0,3 | 3 · 7 · 0,3 | Cada ingreso; tras una acción, solo con NIVEL |
| `GET secciones` | 4 · 14 · 2,5 | 4 · 15 · 0,9 | 3 · 8 · 0,6 | Cada ingreso; tras una acción, solo con SECCION |
| `GET secciones/{s}` | 4 · 12 · 0,4 | 3 · 13 · 0,1 | 3 · 11 · 0,1 | Al abrir una sección |
| `GET presentaciones` | 3 · 11 · 0,0 | 3 · 11 · 0,0 | 3 · 7 · 0,0 | Cada ingreso |
| `POST presentacion-vista` | 5 | | 5 | Al cerrar cada presentación de primera visita |
| `GET progreso/{tipo}/{c}` | 4 · 8 · 0,3 | 4 · 13 · 0,3 | 4 · 11 · 0,3 | Al abrir la Ciudad cerrada, una ficha bloqueada, un sello o el perfil; se repite con cada recarga de actividades |
| `GET notificaciones` | 4 · 9 · 0,0 | 4 · 10 · 4,2 | 4 · 12 · 4,2 | **2 veces por ingreso** |
| `POST notificaciones/marcar-vistas` | 3 | | 3 | Cada actividad con cierre, cada toast y la campana |

### Acciones del motor (fuera de alcance; solo como referencia)

| Acción | Consultas | ¿Crece con el historial? | ms |
|---|---|---|---|
| `completar-actividad` | 8–12 (nueva 9; apoderado 9–10) | No | 27 |
| `resolver-batalla` | 11–21 según la batalla | No | 33 |
| `resolver-caso` | 6–11 | No | 26 |
| `responder-items` | 8 | No | 23 |
| `revelar-resultado` | 11–14 | n/d | 58 |

### Instrumentos, catálogo, planes, diario, mochila, Central, investigaciones, familia y apoderado

| Ruta | Nueva | A mitad | Terminó | Apoderado o hijo | Frecuencia |
|---|---|---|---|---|---|
| `GET /instrumentos` | 1 · 8 · **18,8** | 1 · 14 · 18,8 | 1 · 8 · 18,8 | | Al abrir el libro; en el apoderado, en cada visita a Inicio |
| `GET /actividades/{a}/items` | 1 · 8 · 5,0 | 1 · 9 · 5,0 | 1 · 6 · 5,0 | | Al abrir un test o el drawer de Mara (se repite tras cada refresco con Mara seleccionada) |
| `GET actividades/{a}/respuestas` | 3 · 10 · 0,1 | 3 · 11 · 0,1 | 3 · 8 · 1,6 | | Al abrir un test |
| `GET instrumentos` | 5 · 13 · 1,3 | 5 · 16 · 1,3 | 5 · 14 · 1,2 | | Al abrir Mi perfil o el libro |
| `GET instrumentos/TEST-RIASEC/resultado` | 6 · 10 · 409 | 6 · 14 · 409 | 7 · 15 · **22,0** | | **Cada ingreso y cada acción** |
| `GET instrumentos/{i}/historial` | 3 · 8 · 0,0 | 3 · 13 · 0,0 | 7 · 28 · 22,0 | | Al abrir el libro |
| `GET catalogo/carreras` | 409 | 8 · 21 · 5,6 | 8 · 12 · 5,6 | 7 · 17 · 5,6 | Al abrir; al escribir (espera de 300 ms) o filtrar (400 ms) |
| `GET catalogo/carreras/{c}` | 409 | 17 · 30 · 14,5 | 21 · 36 · 14,5 | 15 · 22 · 14,5 | Cada detalle (caché LRU de 20) |
| `GET catalogo/ocupaciones/{c}` | 409 | 13 · 20 · 3,0 | 17 · 36 · 3,0 | | Cada detalle |
| `GET catalogo/familias/{f}` | 409 | 9 · 14 · 1,7 | 13 · 23 · 1,7 | | Al elegir una familia |
| `GET catalogo/instituciones/{c}` | — | 9 · 19 · 1,3 | 9 · 18 · 1,3 | | Cada detalle |
| `GET catalogo/familias`, `ubicaciones`, `grupos` | 409 | 4 | 4 | 3 | Una vez por sesión; `familias` sin caché en el guion |
| `POST ver-carrera`, `ver-ocupacion`, `ver-institucion` | | | 4–9 | | Cada detalle, con refresco completo |
| `GET favoritos` · `POST marcar-favorito` | 409 | 6 · 0,5 | 8 · 9,2 · 6–7 | | Al abrir el perfil o Mis planes · cada clic |
| `GET planes` | 409 | 19 · 31 · 8,3 | 18 · 27 · 22,1 | | Al abrir y tras cada acción del plan |
| `GET diario/entradas` | 409 | 4 · 12 · 0,0 | 4 · 10 · **28,2** (61 entradas, sin paginar) | | Al abrir el diario |
| `GET diario/preguntas` · `amistad` · `check-ins` | 409 | 4 · 4 · 4 | 4 · 4 · 4 | | Al abrir; check-ins en cada ingreso |
| `POST escribir-entrada` · `check-in` · `pregunta-del-dia` | | | 7–9 · 6 · 8 (61 veces, sin crecer) | | Cada acción del diario |
| `GET logros` · `tematicas` | 6 · 3 | 6 · 3 | 6 · 3 | 2 (apoderado) | Al abrir el pasaporte |
| `GET fichas` · `testimonios` | 6 · 6 | 6 · 6 | 6 · 10,1 KB · 6 · 9,0 KB | 6 · 3,0 KB | Al abrir la mochila; en el apoderado, en cada montaje |
| `GET casos` · `batallas` · `batallas/{a}/preguntas` | 5 · 6 · 409 | 5 · 6 · 4 | 5 · 6 · 4 | | Al abrir; pedidos dobles (C) |
| `GET investigaciones` · `entrevistas` · `entrevistas/{e}` | 409 | 409 | 10 · 12 · 15 | | Al abrir cada pantalla |
| `GET conversaciones` | 409 | 6 · 5,5 KB | 6 · 5,1 KB | 7 · 5,2 KB | Al abrir Familia o Inicio del apoderado |
| `GET familia` · `familia/resultados` | | | | 10 · 9 (22,2 KB) | Cada ingreso del apoderado · cada visita a Inicio |

## B. Backend: ¿crece con…?

«Sí» señala que las consultas crecen. El tamaño de la respuesta se anota aparte.

| Ruta | Historial (eventos, diario, check-ins, notificaciones) | Elementos de la cuenta (planes, dudas, pasos, favoritos, ítems respondidos, resultados, conversaciones) | Catálogo y definición | Compañeros del salón | Hijos (apoderado) |
|---|---|---|---|---|---|
| Ingreso y arranque (`sesion`, `ingresar`, `actividades`, `avance`, `resumen`, `secciones`, `presentaciones`, `notificaciones`) | No (62 ingresos, 61 días) | No | No: lo fijan `test_presupuestos_motor.py` (100 actividades y 100 reglas) y `test_bloqueo_actividades.py` | — | — |
| `registro/responder`, `entregar` y `GET registro` | No | No (2 o 3 planes, 65 en `b4-1`) | **Sí: con los ítems del registro y las piezas de cada uno.** Tope: 5 ítems. | — | — |
| `GET planes` | No | **No** (18 con 1–3 planes, 0–8 dudas y 0–10 pasos); el tamaño sí | — | — | — |
| `planes/guardar-seccion` | No | **Solo en SQLite** (un `INSERT` por fila); en PostgreSQL se agrupan | — | — | — |
| Detalles del catálogo | No (180 vistas) | No: 4 más por la rama del resultado revelado | Lo fija `test_catalogo.py` | — | — |
| `favoritos` | — | No (lo fija `test_favoritos.py`) | | | |
| `entrevistas` y `entrevistas/{e}` | — | No | — | **No** (de 1 a 25 entrevistas, 24 reacciones cada una); el tamaño del detalle sí | — |
| `conversaciones` | No (12 cartas) | No | — | — | No |
| `familia` | No | No | — | — | **Sí: +2 por hijo** (`familia.py:168`) |
| `familia/resultados` | No | No | — | — | No |
| `diario/*` y `check-ins` | No (61 entradas y check-ins); `diario/entradas` crece en tamaño | — | Lo fija `test_presupuesto_diario.py` | — | — |

**Lecturas duplicadas dentro de una petición:**
- **`registro/responder`:** el contexto del ítem guardado 2 veces, `validar_registro` 3 veces y los planes hasta 9 veces
  dentro de un contexto.
- **Todas las rutas:** la cuenta 2 veces (el guardia y la dependencia, ver 1c).
- **El refresco y el libro de Helena (front):** ver C.

## C. Front: carga y memoria

Rutas relativas a `ov_frontend/src/`.

### Peticiones por pantalla

| Pantalla | Al entrar | Repetidas sin necesidad | Dobles | Por tecla |
|---|---|---|---|---|
| Ingreso y mapa del estudiante | `POST ingresar`, después `actividades`, `avance`, `resumen`, `secciones`, `presentaciones` y `notificaciones` (`refresco.ts:38-63`, `operaciones.ts:70`); `check-ins` si CHECK_IN está abierta (`refresco.ts:70-72`); el resultado RIASEC si `act-tip-final` está abierta (`refresco.ts:81-85`) | El resultado RIASEC en cada refresco. El drawer de Mara vuelve a pedir `/items` tras cada refresco (`useMapScreen.ts:97-120`). Con la Ciudad cerrada, `progreso/BLOQUE/CIUDAD` tras cada refresco (`useCityRequirement.ts:16-31`). | **Notificaciones**: `operaciones.ts:70` y `useNoveltyQueue.ts:90`. La deduplicación de `notificaciones.ts:77` solo cubre la petición en vuelo (`:94-96`). | — |
| Reproductor: completar | `completar-actividad`, después el refresco completo | El resultado RIASEC | — | — |
| Reproductor: cuestionario | `/items` y `respuestas` | El primer ítem lanza el refresco completo para ver EN_CURSO (`operaciones.ts:130-131`) | — | — |
| Reproductor: registro | `registro` y `referencias`, una vez (`RegistroServidorPlayer.tsx:34`, `:41`) | — | — | `SubmissionNode.tsx:218-223` escribe el journey en `localStorage` en cada tecla (no pide al servidor) |
| Batalla | `batallas` y `preguntas` | — | **`GET batallas`**: `useChallengePlayer.ts:43-62` y `useFichasBatalla.ts:16-35` (montado en `CaminoScreen.tsx:104` y `CiudadScreen.tsx:75`), sin caché | — |
| Caso | `casos` y `ocupaciones-caso` | — | **`GET casos`**: `useCasoServidor.ts:24` (intro y página del caso), `useProgresoCaso.ts:26` (drawer, en cada selección) y otra vez tras resolver (`useForestFireCase.ts:113`), además del refresco | — |
| Libro de Helena | `instrumentos`, un resultado por aplicación revelada, `comparacion`, `historial` y `/instrumentos` | Todo el libro con cada recarga de actividades (`useHelenaPages.ts:72-93`); `progreso/BLOQUE/CIUDAD` (`:85`) | Al revelar o reiniciar, 2 veces (`instrumentos.ts:153-182`) | — |
| Mi perfil | `instrumentos` y resultados (`useStudentProfile.ts:37-39`), `logros` y `favoritos` | `cargarInstrumentos` sin caché en cada apertura (`instrumentos.ts:41-47`) | — | — |
| Diario | `entradas` y `amistad`; `preguntas` con el diario abierto; `pregunta-del-dia` (una vez por día) | Cada acción hace el refresco completo y después `vencerDiario` (`diario.ts:22-25`) | Preguntas, si se desbloquea una PREGUNTA_DIARIO; check-ins tras el check-in (`diario.ts:64-70`) | El texto de la entrada repinta la página (K), sin peticiones |
| Planes | `planes` (`usePlanesServidor.ts:14`) | Cada acción hace el refresco completo y después `vencerSeccion('planes')` (`planes.ts:8-12`) | `planes`, si se desbloquea una SECCION_PLAN | Los medidores y «Lo hice» guardan al instante: un clic, una acción y el refresco |
| Catálogo | La lista; las opciones una vez por sesión (`catalogo.ts:260-280`) | Cada detalle dispara `ver-*` y el refresco completo (`catalogo.ts:307-315`) | — | Búsqueda con espera de 300 ms y filtros de 400 ms, con `AbortController` (`useCatalogoServidor.ts:48-49`, `:104-119`; `catalogo.ts:121-123`). Bien. |
| Mochila | `fichas` y `testimonios`; el detalle de cada ficha queda en caché por sesión (`fichas.ts:33-45`) | — | — | — |
| Investigaciones | `investigaciones` (revalidada al montar cada hook, `secciones.ts:198-206`), `entrevistas` y `logros` | Cada acción hace el refresco completo y vence investigaciones (`investigaciones.ts:28-38`) | **`GET catalogo/familias` sin caché**: `useBuscadorFamilia.ts:21-31` en cada montaje y `useGuionInvestigacion.ts:59` con `?familia` | La lista de entrevistas espera 300 ms (`useInvestigacionesListado.ts:50`); el buscador de familias filtra en el cliente |
| Familia (estudiante) | `conversaciones`, revalidada en cada montaje | Cada acción hace el refresco completo y vence conversaciones (`conversaciones.ts:8-12`) | `conversaciones`, si se desbloquea una CONVERSACION | — |
| Apoderado: Inicio | `POST ingresar`, `actividades` y `familia` (`apoderado.ts:107-120`); `conversaciones?estudiante=` (`apoderadoConversaciones.ts:174-180`); `familia/resultados` y `/instrumentos` (`apoderadoResultados.ts:110-115`) | Resultados y `/instrumentos` en cada visita | **Notificaciones**: `apoderado.ts:115` y `useParentOverview.ts:56` | — |
| Apoderado: Actividades | `fichas` en cada montaje (`apoderadoFichas.ts:53-66`, `:104-109`), sin deduplicar en vuelo (`revision++`); también desde `ParentActivityView.tsx:20` | Completar pide de nuevo `actividades` y `familia` (`apoderado.ts:238-242`) | `fichas` | — |

- **No hay sondeos periódicos.** Los `setInterval` del front solo mueven relojes y animaciones.
- **`StrictMode` en desarrollo** duplica los efectos sin deduplicación. En producción no.

### Almacenes de `store/servidor/` y almacenamiento del navegador

| Almacén | Qué guarda | Cuándo lo descarta | ¿Acumula sin tope? |
|---|---|---|---|
| `sesion.ts` | Un objeto global: 15 secciones, `instrumentos`, `respuestasPartida`, `resultadoRiasec` y `porRevelar` | Al ingresar (`limpiarEstadoServidor`) | No (tamaño fijo) |
| `secciones.ts` | Contadores y `pendientes`, por nombre | — | No |
| `catalogo.ts` | Listas, turnos y peticiones por clase; `detalles` (LRU de 20); `fichas` de familia (`:60`, `:234`) | Al cambiar de sesión (`:74-86`) | **`fichas` de familia, sin tope** dentro de la sesión |
| `fichas.ts:26` | Detalles de fichas con clave `sesion:codigo` | **Nunca** | **Sí, entre sesiones** |
| `favoritos.ts:38` | Un `Map` por número de sesión | No borra las sesiones viejas | **Sí, entre sesiones** |
| `casos.ts:37` | Directorios por lista de códigos | Al cambiar de sesión | Sin tope dentro de la sesión |
| `entrevistas.ts` | `detalles` | Al cambiar de sesión | Sin tope dentro de la sesión |
| `notificaciones` | La lista | Al cambiar de sesión | Crece con «Mostrar más» y con las acciones |
| `apoderadoResultados`, `apoderadoConversaciones`, `apoderadoFichas` | `Record` por hijo o código | Al cambiar de cuenta | Acotado por los hijos |

En `localStorage`, en modo api:

| Clave | Qué guarda | Cuándo escribe |
|---|---|---|
| `ov.acceso.v1` | La sesión (`accesoStore.ts:10`, `:59`) | Al ingresar |
| `ov.missions.v2.api` | La proyección de actividades y los borradores por cuenta (`journeyStore.ts:52-71`) | **En cada GET actividades** (`secciones.ts:122`) y **en cada tecla** de un texto (`SubmissionNode.tsx:220`). Cada vez se lee y se reescribe entero. |
| `ov.student-adventure.v1.api` | `completedMissionIds` y el estado de la aventura (`adventureStore.ts:160-182`) | En cada GET actividades |
| `ov.parent-missions.v1` | El journey del apoderado (`parentJourneyStore.ts:81`) | Tras sus actividades |
| `ov.student-ui.v1` | Indicadores de interfaz (intros vistas, sonido, `lastMap`) | Al cambiar |

`reflectionStore`, `followUpStore`, `discoveryStore` y `explorationStore` también escriben en `localStorage`. No se
verificó si se usan en api. `sessionStorage` lo usa solo la orientadora.

### Contenido estático y paquete

- **Paquete:** un solo JS de **2.829 KB (817 KB comprimido)** y un CSS de 490 KB (84 KB comprimido). Vite avisa que
  hay fragmentos de más de 500 KB.
- **Sin división por rutas:** no hay `React.lazy`, `Suspense` ni `import()`. `routes/AppRoutes.tsx` importa todas las
  páginas, incluidas las de la orientadora, y `vite.config.ts` no tiene `manualChunks`.
- **Contenidos:** `data/activities/contenidos.ts` importa de forma estática los 132 JSON: 88 de `plataforma`
  (unos 565 KB), 31 de `ruta` (unos 51 KB) y 13 de la raíz (unos 99 KB). Son unos 715 KB, más `catalogo.json`
  (22 KB) y los 6 casos (unos 89 KB). Todos entran en el paquete inicial, también los de `ruta`, que en el despliegue
  no se usan.
- **Imágenes:** están en `public/` (212 MB) y se cargan por URL al mostrarlas. Ningún TS las importa.
- **Para las pruebas:** 25 estudiantes que cargan el paquete por primera vez descargan unos 20 MB comprimidos en total
  desde la CDN de Amplify. El servidor no lo nota, pero sí una wifi escolar lenta.

### Repintados evidentes

- **Global:**
  - `useEstadoServidor` (`sesion.ts:151`) devuelve el almacén entero, y lo usan 38 archivos. Cada `useXServidor`
    (`secciones.ts:176-185`) también se suscribe a todo.
  - Un `refrescar` publica de 10 a 15 veces (`cargando`, `vencido` y `listo` por sección), y cada publicación repinta
    a todos los consumidores.
- **Mapa:**
  - `getCaminoPoints` y `puntosServidor` se recalculan sin `useMemo`, 2 veces en `CaminoScreen.tsx:27`, `:115` y 2 en
    `useMapScreen.ts:47`, `:62`.
  - `details` y `conServidor` son objetos nuevos en cada render (`useMapScreen.ts:74-91`).
  - `CaminoScreen.tsx:22` llama a `useEstadoServidor()` solo para suscribirse.
- **Reproductor:** usa el journey entero (`useActivityPlayer.ts:34`). Cada tecla de `SubmissionNode` actualiza el
  journey: escribe `localStorage` y avisa a todos sus suscriptores.
- **Diario:** unos 20 `useState` en `useJournalPage.ts`; `body` (`:73`) repinta toda la página en cada tecla y
  `usedTags` (`:145`) se recalcula sin memo.
- **Planes:** `usePlanesServidor.ts:10` se suscribe al almacén entero solo para leer `secciones`.

## D. Hallazgos y correcciones propuestas

Columnas:
- **Riesgo:** bajo, medio o alto.
- **Lógica validada:** si toca el motor, el flujo del registro o el cálculo de resultados.
- **Contrato:** si cambia la respuesta de una ruta.
- **Estado:** lo que se hizo el 14 de noviembre (con su commit), lo que quedó en parte y lo que no se hace.

### Backend

| # | Gravedad | Hallazgo | Dónde | Corrección propuesta | Costo | Riesgo | Lógica validada | Contrato | Estado |
|---|---|---|---|---|---|---|---|---|---|
| D-B1 | **Alta (operación)** | Argon2 usa 64 MiB por verificación; 25 ingresos simultáneos llegan a 1,6 GB. | `app/services/acceso.py:20` | Sin código, para el 18 y el 19: comprobar la instancia, agregar swap o subir a `t3.medium`, y escalonar el ingreso del salón. Con código: (a) un semáforo que limite las verificaciones simultáneas (p. ej. 4 por worker); (b) bajar `memory_cost` (los hashes guardan sus parámetros, así que los viejos siguen verificando, y `check_needs_rehash` permite migrarlos al ingresar). (b) es una decisión de seguridad. | (a) 1 h; (b) 1 h más la decisión | (a) bajo; (b) medio | No | No | Hecha (a), `d8ff4d37`. (b), bajar `memory_cost`: no se hace. |
| D-B2 | **Alta (consultas)** | Registro: de 16 a 65 consultas por ítem; crece con los ítems y sus piezas (tope de 5 ítems, unas 115 consultas). El contexto del ítem guardado se resuelve 2 veces y `validar_registro` corre 3 veces. | `registro/consultas.py:64`, `:93`; `flujo.py:176`, `:219`; `contexto.py:488-504` | Opciones R1 a R4 de la sección 3. | R1 2 h; R2 1 a 1,5 días; R3 1 día; R4 1 día con el front | R1 bajo; R2 medio; R3 alto; R4 medio | **Sí** (flujo del registro) | R4 sí | Mitigado con R1 (`8068fd84`): crecimiento acotado por la definición, fijado por la prueba de techo (`8e721c7e`). R2: opción abierta. R3 y R4: no se hacen. |
| D-B3 | Media | `familia` hace 2 consultas por hijo. | `app/services/familia.py:154-168` | Cargar los progresos y desbloqueos de todos los hijos en una lectura del contexto antes del bucle. | 1 h | Bajo | No | No | Hecha, `224354b6`. |
| D-B4 | Media | Gasto fijo: la cuenta se lee 2 veces en cada petición. | `app/dependencies.py:55-69`, `:110` | Opciones 1 a 3 de 1c. Toca el acceso. | 1 a 2 h | Medio | No | No | Hecha (opción 1), `8d9604ff`. |
| D-B5 | Baja | `guardar-seccion` crece con dudas y pasos, **solo en SQLite**. | Dialecto (`insertmanyvalues`) | Nada en producción. En la prueba de presupuesto, contar los `INSERT` aparte. | — | — | No | No | No se hace. |
| D-B6 | Media (red) | Ninguna respuesta JSON viaja comprimida (según el repo). | `despliegue/ec2/nginx-ov.conf` | `gzip on; gzip_types application/json; gzip_min_length 1024;` en nginx, o `GZipMiddleware`. Primero comprobar si Amplify ya comprime (1d). | 0,5 h | Bajo | No | No | Hecha, `9c0d02b6`; se aplica a mano en la EC2 (sección H). |
| D-B7 | Baja | `actividades` manda unos 25 KB de `condiciones_faltantes` que el front no lee (cuenta nueva). | `app/schemas/actividades.py:10-31` (`bloqueo: list[MotivoBloqueo]`) | Recortar `bloqueo` a `mensaje`, `evaluador_especial` y el `requerido` de la primera condición, o mandarlo solo en `progreso`. Con gzip pierde importancia. | 2 h más fixtures | Medio | No (el cálculo no cambia) | **Sí** | No se hace. |
| D-B8 | Baja | El detalle de una entrevista trae todas las reacciones sin paginar (8,6 KB con 24). | `entrevistas/{e}` | Nada por ahora. | — | — | No | Sí, si se pagina | No se hace. |
| — | Anotación | `diario/entradas` pesa 28 KB con 61 entradas (1,4 KB comprimido). | | Sin propuesta, como se pidió. | | | | | No se hace (no se pagina el diario). |

### Front

| # | Gravedad | Hallazgo | Dónde | Corrección propuesta | Costo | Riesgo | Lógica validada | Contrato | Estado |
|---|---|---|---|---|---|---|---|---|---|
| F1 | Media | Notificaciones 2 veces en cada ingreso, en el estudiante y en el apoderado. | `operaciones.ts:70` y `useNoveltyQueue.ts:90`; `apoderado.ts:115` y `useParentOverview.ts:56` | No volver a pedir si la lista ya está cargada en esta sesión (o compartir la promesa resuelta). | 0,5 h y una prueba | Bajo | No | No | Hecha, `903a04cb`. |
| F2a | **Alta (frecuencia)** | `ver-*` dispara el refresco completo al abrir cada detalle del catálogo (unas 15 consultas y 55 KB). | `catalogo.ts:307-315`, `useCatalogVisit.ts:19` | Refrescar solo si la respuesta trae `nuevos_desbloqueos`. Medido: sin desbloqueos no cambia nada en actividades, avance, resumen ni secciones. | 1 h y una prueba | Bajo | No | No | Hecha, `9d012942`. |
| F2b | Alta | Todas las demás acciones refrescan actividades, avance y RIASEC aunque no cambien nada (diario, cartas, medidores, pasos, investigaciones). | `refresco.ts:38-48`, `:101-122` | Refresco condicional: actividades y avance solo con desbloqueos o eventos `COMPLETA_ACTIVIDAD` o `COMPLETA_BLOQUE`, o en la primera respuesta de un cuestionario. Mantener el refresco tras `completar-actividad`, batallas y casos. | 2 a 3 h y pruebas | Medio (toca la frescura del mapa en todas las acciones) | No | No | Hecha, `2a79ef13` y `721a589c`. |
| F3 | **Alta (frecuencia)** | El resultado RIASEC (7 consultas y 22 KB) se pide en cada ingreso y en cada refresco; al revelar o reiniciar, 2 veces; sin caché. | `refresco.ts:81-85`, `resultado.ts:15-22`, `instrumentos.ts:41-47`, `:153-182` | Pedirlo solo si no está cargado, y forzarlo solo tras `revelar-resultado` o `reiniciar-instrumento`. Tras un 409, no repetir hasta el próximo revelado. | 1 h y una prueba | Bajo | No (solo cuándo se lee) | No | Hecha, `3667d9f3` (en `contenido` no hay `act-tip-final`: ver la corrección en G). |
| F4 | Media | El libro de Helena se pide entero con cada recarga de actividades. | `useHelenaPages.ts:72-93` | Depender de un indicador de cambio (revelado o reinicio) y no de `actividades.datos`. | 1 h | Medio (pantalla de resultados) | No | No | Hecha, `5611137d`. |
| F5 | Baja | `GET batallas` doble, `GET casos` hasta 4 veces por caso, `catalogo/familias` sin caché. | `useChallengePlayer.ts:43-62`, `useFichasBatalla.ts:16-35`; `useCasoServidor.ts:24`, `useProgresoCaso.ts:26`, `useForestFireCase.ts:113`; `useBuscadorFamilia.ts:21-31`, `useGuionInvestigacion.ts:59` | Compartir la petición en vuelo y reutilizar lo cargado. Para familias, usar `useOpcionesCatalogo`. | 1,5 h | Bajo | No | No | Hecha en parte, `5ed42fea`: batallas y familias. Los casos no se hacen ahora (después del 19). |
| F6 | Baja | El apoderado pide `/instrumentos` (estático, 18,8 KB) y `familia/resultados` en cada visita a Inicio, y `fichas` en cada montaje sin deduplicar. | `apoderado.ts:263`, `apoderadoResultados.ts:110-115`, `apoderadoFichas.ts:53-66` | Guardar `/instrumentos` por sesión; deduplicar `fichas` en vuelo. | 1 h | Bajo | No | No | Hecha, `0b341c67`. |
| F7 | Media | Planes: cada medidor o paso hace el refresco completo más `GET planes` (39–41 consultas y unos 76 KB por clic); `planes` doble con SECCION_PLAN. | `planes.ts:8-12` | Medidores y orden: aplicar lo enviado al almacén sin `GET planes`. Lo demás, con F2b. | 1,5 h | Medio | No | No | Hecha en parte, `c2dad716`: sin refresco ni `planes` doble. Medidores y orden siguen pidiendo `planes` (haría falta cambiar el contrato). |
| F8 | Media | `localStorage` reescrito entero en cada GET actividades y en cada tecla de un texto. | `journeyStore.ts:52-71`, `secciones.ts:122`, `SubmissionNode.tsx:218-223`, `adventureStore.ts:160-182` | Escribir con espera (300 ms) y solo si cambió. | 1,5 h | Medio (borradores) | No | No | Hecha, `b417792b`. |
| F9 | Media | Un solo paquete de 817 KB comprimido, con las páginas de la orientadora y los 132 JSON de contenido (incluidos los de `ruta`). | `routes/AppRoutes.tsx`, `data/activities/contenidos.ts`, `vite.config.ts` | `React.lazy` por portal y carga de contenidos por actividad (`import.meta.glob` perezoso). | 1 a 2 días | Medio | No | No | No se hace ahora (después del 19). |
| F10 | Baja | Repintados globales: almacén entero en 38 consumidores; el mapa recalcula sus puntos sin memo; el diario repinta en cada tecla. | K | Selectores por sección; `useMemo` en el mapa; bajar el estado del texto. | 1 a 2 días | Medio | No | No | No se hace ahora (después del 19). |
| F11 | Baja | `fichas.ts` y `favoritos.ts` acumulan entre sesiones. | `fichas.ts:26`, `favoritos.ts:38` | Vaciar al cambiar de sesión, como `catalogo.ts`. | 0,5 h | Bajo | No | No | Hecha, `cd44b0a1`. |

### Correcciones que tocan lógica validada (se deciden una por una)

- **D-B2, registro (R1 a R4):** todas tocan el flujo del registro. R3, además, cambia por dentro `resolver_contexto`.
- **Motor y cálculo de resultados:** fuera de alcance; no se proponen cambios. F3 y F4 solo cambian cuándo el front
  lee el resultado, no cómo se calcula.

### Integración y despliegue

- **Ramas:**
  - Esta rama (`ajuste/auditoria-panel`) tiene **15 commits que no están en `main`**, entre ellos las correcciones de
    la auditoría del panel (`6e73a965`, `ef2d8bab` y `8a37b3e9`) y el cierre de su spec.
  - `deploy` (lo que corre en EC2 y Amplify) tiene 42 commits menos que esta rama.
- **Pasos para que las correcciones de antes del 18 lleguen a las pruebas:**
  1. Integrar esta rama en `main`, con la suite completa en verde (`uv run pytest -n auto -q`; `npm test`,
     `npm run build`, `npm run lint` y `npm run check:estructura`), o aplicar F1, F2a, F3, F5 (parcial) y F6 en una
     rama nueva desde `main`.
  2. Abrir un PR hacia `deploy`. Sus pruebas corren en GitHub Actions (`despliegue/README.md`, sección 7).
  3. El push a `deploy` actualiza la EC2 y después Amplify. Las correcciones de front solo necesitan el build de
     Amplify, pero el flujo despliega los dos.
- **Las medidas de operación de D-B1** (instancia, swap e ingreso escalonado) y **D-B6** (nginx) no pasan por git: se
  aplican en la EC2.

## E. Lo que se midió y está bien

- **LLM:** ninguna de las cuatro acciones que lo llaman retiene una conexión ni una transacción mientras espera
  (medido con 25 esperas simultáneas).
- **Concurrencia en PostgreSQL:** con 25 estudiantes a la vez, sin errores, sin esperas por bloqueos y con el pool
  dentro de su tope.
- **Bloqueo de ingreso:** es por cuenta, no por IP.
- **Historial:** ninguna ruta crece con 62 ingresos, 61 check-ins, 61 entradas, unas 180 vistas ni 12 cartas.
- **`GET planes`:** 18 consultas con cualquier número de planes, dudas o pasos.
- **Catálogo:** las 4 consultas de más son una rama (el resultado revelado), no crecimiento con favoritos, planes ni
  vistas.
- **Entrevistas:** no crecen con las entrevistas, las reacciones ni los comentarios del salón.
- **`familia/resultados` y `conversaciones`:** no crecen con los hijos.
- **Registro:** no crece con los datos de la cuenta (planes, diario, vistas), solo con su definición.
- **Front:** la búsqueda del catálogo espera y cancela; no hay sondeos; las opciones del catálogo se piden una vez; el
  detalle de cada ficha y de cada carrera queda en caché; el registro se lee una vez por apertura; el apoderado no usa
  las rutas del hijo.

## F. Pruebas de presupuesto: qué hay y qué falta

| Ya existe | Archivo | Qué fija |
|---|---|---|
| Rutas de dominio (`resumen`, `actividades`, `fichas`, `logros`, `testimonios`, `diario/preguntas`, `secciones`) y `completar-actividad` | `tests/integration/motor/test_presupuestos_motor.py` | No crecen con 100 actividades, 100 reglas ni 500 eventos |
| Motivos de bloqueo | `tests/integration/actividades/test_bloqueo_actividades.py:72` | No crecen con las actividades bloqueadas |
| Diario, `tematicas`, `logros` | `tests/integration/diario/test_presupuesto_diario.py:14` | No crecen con las entradas ni con las actividades |
| Instrumentos y reinicio | `tests/integration/instrumentos/test_presupuestos_instrumentos.py:51` | |
| Catálogo, favoritos, casos, batallas, testimonios, secciones y referencias | `test_catalogo.py:357`, `test_favoritos.py:78`, `test_casos.py:90`, `test_batallas.py:170`, `test_testimonios.py:63`, `test_secciones.py:123`, `test_referencias.py:149`, `:208` | No crecen con el catálogo |
| Prioritarios del motor | `tests/integration/motor/test_prioritarios_motor.py:63` | |

**Faltan**, con el patrón «pocos frente a muchos»:
- **Registro:**
  - `GET registro`, `registro/responder` y `registro/entregar` contra los datos de la cuenta (1 o 3 planes, con y sin
    resultados, ítems respondidos). Hoy pasarían.
  - Contra los ítems del registro. Hoy fallaría por D-B2: sirve de prueba de aceptación de la corrección que se elija.
- **`GET planes`:** contra 1 o 3 planes, 0 u 8 dudas y 0 o 10 pasos. Hoy pasaría.
- **`planes/guardar-seccion`:** contra 0 u 8 dudas y 0 o 10 pasos, contando los `SELECT` sin los `INSERT`, o con
  `TEST_POSTGRES_URL`. Hoy pasaría así.
- **`familia`:** contra 1 o 3 hijos. Hoy fallaría por D-B3. También `familia/resultados` y `conversaciones` contra los
  hijos (hoy pasarían).
- **Investigaciones:** `entrevistas` y `entrevistas/{e}` contra 1 o 25 entrevistas con reacciones y comentarios; y
  `investigaciones`. Hoy pasarían.
- **Arranque:** `sesion`, `acciones/ingresar`, `avance`, `notificaciones` y `presentaciones` contra el historial
  (ingresos, notificaciones). Hoy pasarían.
- **`conversaciones` (estudiante) y `escribir-carta`:** contra las cartas. Hoy pasarían.
- **Gasto fijo:** una prueba que fije en 2 las consultas de `GET /sesion`, para que no crezca el acceso.
- **Front (`tests/servidor`):**
  - F1: una sola lectura de notificaciones al ingresar;
  - F2a: `ver-*` sin desbloqueos no pide actividades;
  - F3: el resultado RIASEC no se vuelve a pedir tras una acción;
  - F6: `/instrumentos` una vez por sesión en el apoderado.

## Pendientes de la auditoría del panel

- **¿La prueba de respuestas idénticas compara con `resolver_contexto` en vivo?** Sí.
  `tests/integration/panel/test_panel_contexto_lectura.py:72`
  (`test_el_contexto_de_cada_item_es_el_de_resolver_contexto`) compara, ítem por ítem, lo que arma `LecturaContexto`
  (`_con_lectura`, `:58-61`) con `resolver_contexto` llamado en vivo (`_en_vivo`, `:64-69`, que importa
  `app.services.registro.contexto.resolver_contexto`, `:22`).
- **¿El corte de coincidencias sale de los parámetros?** Sí. `app/services/instrumentos/consultas.py:338` calcula
  `tope = max(MAXIMO_OCUPACIONES_AFINES, MINIMO_OCUPACIONES_AFINES)` (hoy 30 y 10, `app/core/parametros.py:12-13`) y
  filtra con `Coincidencia.posicion <= tope` (`:340`, `:344`). No hay un 30 fijo. `tests/integration/panel/
  test_panel_intereses.py` usa esos parámetros.

## G. Correcciones del 14 de noviembre

Rama `ajuste/auditoria-plataforma`, creada desde `ajuste/auditoria-panel`. Hay un commit por corrección, cada uno con
su prueba. Ninguna corrección cambia el contrato de una ruta, `resolver_contexto`, el motor ni el cálculo de resultados.

Cada prueba se comprobó fallando sin su corrección, salvo la de F11: su efecto es liberar memoria, que no se puede
medir desde la prueba, así que esta fija el comportamiento (la respuesta tardía de otra sesión no se guarda).

| # | Corrección | Commit | Prueba |
|---|---|---|---|
| F1 | La campana no se pide dos veces al entrar (una lista de hace menos de 10 s se reutiliza) | `903a04cb` | `tests/servidor/logros/servidor-notificaciones.test.mjs` |
| F2a | Ver un detalle del catálogo sin desbloqueos no refresca el camino | `9d012942` | `tests/servidor/catalogo/servidor-catalogo-almacen.test.mjs` |
| F3 | El resultado RIASEC no se pide en cada refresco (sí tras un error, revelar o reiniciar) | `3667d9f3` | `tests/servidor/instrumentos/servidor-resultados.test.mjs` |
| F6 | El apoderado pide `/instrumentos` una vez por sesión; las fichas comparten la petición en vuelo | `0b341c67` | `servidor-apoderado-resultados.test.mjs`, `servidor-familia-contrato.test.mjs` |
| F5 | Batallas compartidas entre el drawer y el reproductor; familias del guion una vez por sesión | `5ed42fea` | `servidor-batallas.test.mjs`, `servidor-investigaciones-familias-cache.test.mjs` |
| F11 | Las cachés de fichas y favoritos conservan solo la sesión actual | `cd44b0a1` | `tests/servidor/testimonios/servidor-fichas-sesion.test.mjs` |
| D-B3 | `familia` lee progresos y desbloqueos de todos los hijos juntos (antes, 8 consultas más 2 por hijo; ahora, 8 fijas) | `224354b6` | `tests/integration/familia/test_presupuesto_familia.py` |
| D-B1(a) | Hasta 4 verificaciones Argon2 a la vez por proceso; el turno se toma antes de abrir la transacción del ingreso | `d8ff4d37` | `tests/integration/acceso/test_turnos_verificacion.py` |
| D-B6 | gzip para `application/json` en `despliegue/ec2/nginx-ov.conf` (solo ese archivo) | `9c0d02b6` | Se aplica a mano en la EC2 (sección H) |
| F2b | Refresco condicional (detalle en «Lote 3») | `2a79ef13` | `tests/servidor/actividades/servidor-refresco-condicional.test.mjs` |
| F7 | Las acciones del plan sin desbloqueos no refrescan el camino ni piden `planes` dos veces | `c2dad716` | `tests/servidor/actividades/servidor-refresco-planes.test.mjs` |
| F4 | El libro de Helena se recarga al cambiar sus cuestionarios, no con cada refresco; al revelar, una sola lectura | `5611137d` | `tests/servidor/instrumentos/servidor-libro-helena.test.mjs` |
| R1 | `responder` no resuelve dos veces el contexto del ítem guardado | `8068fd84` | `tests/integration/registro/test_presupuesto_responder.py` y el JSON completo idéntico (abajo) |
| D-B4 | El guardia conserva la cuenta del token para la petición (una petición vacía pasa de 2 consultas a 1) | `8d9604ff` | `tests/integration/acceso/test_cuenta_del_token.py` y las demás de acceso |
| F8 | `localStorage` se escribe solo si cambió, y el borrador con espera, sin perder texto (solo en api) | `b417792b` | `tests/servidor/actividades/servidor-escritura-local.test.mjs` |
| Sección F | Las pruebas de presupuesto que faltaban | `f8b338bd` | Ver «Pruebas de presupuesto agregadas» |

- **F5:** los casos quedan para después del 19, como decía el informe.
- **F2b:** diario, check-in, cartas e investigaciones refrescan el camino solo con desbloqueos. Los requisitos con
  «actual de requerido» se vuelven a pedir con cada acción, y los ítems de Mara ya no dependen de las actividades.
- **Dependencia entre commits:** F4 usa la revisión de acciones de F2b, así que revertir F2b exige revertir también F4.

### Lote 3: qué se volvía a pedir con cada recarga de actividades y su disparador nuevo

| Lectura | Antes | Ahora |
|---|---|---|
| `GET progreso/BLOQUE/CIUDAD` (Ciudad cerrada, `useCityRequirement.ts`) | Cada recarga de actividades | Cada acción confirmada (`useRevisionAcciones`), refresque o no el camino |
| `GET progreso/FICHA` o `TESTIMONIO` (`useRequisitoRecurso.ts`) | Cada recarga | Cada acción confirmada |
| El libro de Helena completo (`useHelenaPages.ts`) | Cada recarga y otra vez al revelar | Cuando cambia el estado de un cuestionario, y una vez tras revelar o reiniciar |
| El requisito de la Ciudad dentro del libro | Junto con el libro | Cada acción confirmada, en un efecto aparte |
| `/items` del drawer de Mara (`useMapScreen.ts`) | Cada recarga con Mara seleccionada | Al elegir el punto o cuando cambia su estado |
| `GET check-ins` | Solo si la sección se abre o no está cargada | Igual; tras un check-in, explícito |
| El resultado RIASEC | Cada refresco (también tras un 409) | Una vez; tras un error, revelar o reiniciar (F3) |
| Secciones vencidas montadas | Con cada refresco | Con cada refresco; una sección que su desbloqueo ya venció no se vence otra vez |

- **Ninguna barra «actual de requerido» queda vieja tras una acción sin desbloqueo.** Esos conteos cambian solo con
  eventos, y toda acción confirmada sube la revisión que las vuelve a pedir.
- **Ninguna acción quedó con el refresco completo por no poder garantizar la frescura.** Las que cambian el progreso de
  una actividad lo conservan por diseño: completar, responder ítems, revelar y reiniciar, batallas, casos y registros.
  Está verificado en `app/services`: solo esas escriben `ProgresoActividad`.

### El JSON del registro, antes y después de R1

- **Qué se grabó:** `medicion/golden.py` (fuera del repo) graba el JSON completo de `GET registro`, `responder` y
  `entregar` en los 19 registros de `contenido`. Cubre la cuenta nueva (`est-mia`), la que va a mitad (`est-ana` tras
  `b3-8`) y la que terminó, más una reedición de cada registro al final: 170 peticiones, 162 con 200.
- **Cómo se compara:** se quitan las marcas de tiempo del reloj y se normalizan los códigos aleatorios de las
  notificaciones.
- **Resultado:** dos corridas del código anterior salen idénticas entre sí, y la del código con R1 sale idéntica a
  ellas.

### R2: opción abierta (decidido: el registro queda con R1)

`LecturaContexto` (`app/services/panel/contexto_lectura.py`) no sirve tal cual para armar la respuesta del estudiante.
Le faltan dos cosas:

1. **Las opciones de lista:** solo arma las de los ítems de piezas (`_armar`). La respuesta del estudiante necesita las
   opciones de todo ítem con elección, con `lineas`, `grupo`, `pregunta` y `arranque` por opción, y también las que
   vienen de una referencia (`opciones_por_item`).
2. **El marcador que falta:** ante un marcador sin valor guarda `None` y pierde cuál era. La respuesta del estudiante
   lo necesita en `marcador_faltante`.

Para servir al estudiante habría que copiar al módulo del panel la regla de `_opciones` (la base de la fuente sin las
propias, más las propias con sus marcadores), además de las copias de marcadores y ecos que ya tiene.

**Decisión: opción (b).** El registro queda con R1 y `LecturaContexto` no se extiende. Con R1, lo que resta crece con
la definición del registro (sus ítems y piezas), tiene tope y solo pesa en `b4-1`. No crece con la cuenta, que era el
criterio. Una tercera copia de reglas en el módulo del panel no se justifica por un registro.

**D-B2: mitigado con R1, con el crecimiento acotado por la definición.**
`tests/integration/registros/test_techo_registros_contenido.py` recorre los 19 registros de `contenido` (el camino
completo, los opcionales y una reedición de cada uno) y fija el máximo de consultas de `GET registro`, `responder` y
`entregar` con los valores del 14 de noviembre. Por ejemplo, `b4-1` tiene 34 · 51 · 45 y `b4-5`, 12 · 25 · 28. Si un
registro nuevo o un cambio de definición supera su techo, la prueba falla y ahí se decide.

R2 sigue abierta, si algún día hiciera falta, con lo que le falta a `LecturaContexto` (los dos puntos de arriba).

### Pruebas de presupuesto agregadas

- `tests/integration/familia/test_presupuesto_familia.py`: `familia`, `familia/resultados` y `conversaciones` con 1 y
  5 hijos.
- `tests/integration/acceso/test_turnos_verificacion.py`: las verificaciones simultáneas no pasan del tope, y las que
  esperan turno no retienen conexión.
- `tests/integration/acceso/test_cuenta_del_token.py` y `tests/integration/cuentas/test_presupuesto_arranque.py`:
  - `GET /sesion` en 1 consulta;
  - el arranque (`sesion`, `ingresar`, `actividades`, `avance`, `resumen`, `secciones`, `presentaciones`,
    `notificaciones`, `conversaciones`) con 500 eventos, 60 notificaciones y 60 entradas más;
  - la carta repetida.
- `tests/integration/planes/test_presupuesto_planes.py`: `GET planes` con 1 y 3 planes, 0 y 8 dudas, 0 y 10 pasos, y
  `guardar-seccion` contando solo los `SELECT`. El primer guardado de PASOS lee una vez más (es una rama); después, 1,
  10 o 20 pasos leen lo mismo.
- `tests/integration/registro/test_presupuesto_registro_cuenta.py`: `GET registro`, `responder` y `entregar` con 3
  planes, 300 eventos y 40 entradas más.
- `tests/integration/registro/test_presupuesto_responder.py`: un `resolver_contexto` por ítem al responder.
- `tests/integration/investigaciones/test_presupuesto_entrevistas.py`: `entrevistas`, su detalle e `investigaciones`
  con 2 o 5 entrevistas, reacciones de 4 compañeros y comentarios. El comentario de la orientadora es una rama del
  detalle, así que se compara con un comentario y con muchos.

- `tests/integration/registros/test_techo_registros_contenido.py`: el techo de consultas de cada registro de
  `contenido`, en lugar de la prueba contra los ítems del registro, que sin R2 no se puede cumplir.

### Medición después de las correcciones

**Gasto fijo (D-B4):** todas las rutas con guardia bajan una consulta. `GET /sesion` pasa de 2 a 1, y una ruta con su
sección cerrada, de 4 a 3.

| Ruta | Antes | Después |
|---|---|---|
| `GET familia` (apoderado, 2 hijos) | 10 | 6 |
| `registro/responder` `b4-1` · `b4-5` · `b5-1` y `b5-3` · `ma8` y `h3` | 65 · 35 · 33 · 27 | 51 · 25 · 24 · 20 |
| `registro/entregar` `b4-1` | 46 | 45 |
| `GET planes` (3 planes) | 18 | 17 |
| `GET catalogo/carreras/{c}` (cuenta que terminó) | 21 | 20 |
| `completar-actividad` | 8–12 | 7–11 |

**Corrección de la fase B, sobre `act-tip-final`:**
- **Qué estaba mal:** el refresco del front pide el resultado RIASEC solo si existe la actividad `act-tip-final`, y esa
  actividad no está en `contenido` ni en `ruta`; solo la usan fixtures antiguos del front. Con los datos que se
  despliegan, el refresco nunca pedía el resultado. La tabla de costo por gesto de la sección 2 sumaba esas 7 consultas
  y 22 KB en la cuenta que terminó; aquí van sin ellas.
- **Qué sigue valiendo de F3:** evita la lectura doble al revelar (la del refresco más la del libro) en cualquier
  contenido que tenga esa actividad.
- **Dónde se pide el resultado en `contenido`:** el libro, el perfil, el catálogo (si no está cargado) y Mara.

**Costo por gesto del usuario** (la acción más lo que el front vuelve a pedir; KB sin comprimir):

| Gesto | Antes: consultas · KB | Después: consultas · KB |
|---|---|---|
| Ingreso, cuenta nueva | 35 · ≈ 59 | **23** · ≈ 59 (la campana, una vez) |
| Ingreso, cuenta que terminó | 36 · ≈ 44 | **23** · ≈ 39 |
| Completar una actividad (cuenta que terminó) | 16–22 · ≈ 33 | **13–17** · ≈ 33 |
| Guardar un ítem de registro | 16–65 · ≤ 8 | **14–51** · ≤ 8 |
| Abrir un detalle de carrera | 27–36 · ≈ 46 | **17–26** · ≈ 15 (sin refresco si no hay desbloqueo) |
| Mover un medidor | 32 · ≈ 54 | **22** · ≈ 22 |
| Marcar un paso | 34 · ≈ 54 | **24** · ≈ 22 |
| Escribir una entrada | 27–29 · ≈ 64 | **15–17** · ≈ 32 |
| Escribir una carta | 20–24 · ≈ 38 | **10–14** · ≈ 5 |

Si la respuesta trae un desbloqueo, el gesto suma el refresco del camino (actividades y avance: 6 consultas en la cuenta
que terminó y 8 en la nueva) y la sección que se abre.

La carga y Argon2 con 2 núcleos están en la sección H, al final («Carga y Argon2 con 2 núcleos, después de las
correcciones»).

## H. Operación para el 18 y el 19

Todos los comandos son para la EC2 (Ubuntu 24.04), por SSH. Ninguno toca la base.

**1. Tipo de instancia, núcleos, memoria y swap**

```bash
TOKEN=$(curl -s -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-type; echo
nproc
free -h
swapon --show
```

- **Si sale `t3.micro` (1 GB):** súbela a `t3.small` o `t3.medium` esos días (EC2 > Instancia > Detener > Cambiar tipo
  de instancia > Iniciar). La IP elástica se conserva.
- **Si `swapon --show` no muestra nada:** no hay swap; crea la del paso 2.

**2. Crear 2 GB de swap persistente**

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf
sudo sysctl -p /etc/sysctl.d/99-swappiness.conf
free -h
```

- **Para qué:** con swap, un pico de memoria se vuelve lento en lugar de matar un worker.
- **Cómo influye D-B1(a):** con los turnos, el pico de Argon2 queda en unos 560 MB (4 verificaciones por worker), y la
  swap cubre lo que sobre.

**3. Aplicar el gzip de D-B6 (a mano)**

`instalar.sh` copia `nginx-ov.conf` solo en la instalación, y después certbot le agrega el bloque `listen 443`.
`actualizar.sh` no lo vuelve a copiar. Por eso:

```bash
sudo cp /etc/nginx/sites-available/ov /etc/nginx/sites-available/ov.respaldo
sudo nano /etc/nginx/sites-available/ov
```

- **Qué pegar:** dentro de **cada** bloque `server { … }` (el de 443 que agregó certbot y el de 80), debajo de
  `client_max_body_size 5m;`, las seis líneas de `despliegue/ec2/nginx-ov.conf`:
  `gzip on;`, `gzip_types application/json;`, `gzip_min_length 1024;`, `gzip_comp_level 5;`, `gzip_proxied any;` y
  `gzip_vary on;`.
- **Dónde no ponerlas:** en `/etc/nginx/conf.d/`. El `nginx.conf` de Ubuntu ya trae `gzip on;` en el bloque `http` y
  nginx rechazaría el duplicado.

Después, comprobar y recargar:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Si `nginx -t` falla, se vuelve atrás con `sudo cp /etc/nginx/sites-available/ov.respaldo /etc/nginx/sites-available/ov`.

**4. Comprobar la compresión con curl**

Primero se obtiene un token con una cuenta de prueba, desde tu máquina. La contraseña la escribes tú.

```bash
read -s -p 'Contraseña: ' CLAVE; echo
TOKEN=$(curl -s https://DOMINIO_API/sesion/ingresar -H 'Content-Type: application/json' \
  -d "{\"usuario\":\"CORREO_DE_PRUEBA\",\"contrasena\":\"$CLAVE\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
```

Directo a la EC2 y a través de Amplify:

```bash
curl -s -o /dev/null -D - -H 'Accept-Encoding: gzip' -H "Authorization: Bearer $TOKEN" \
  https://DOMINIO_API/cuentas/CODIGO_CUENTA/actividades | grep -iE 'content-encoding|content-length'
curl -s -o /dev/null -w 'bytes: %{size_download}\n' -H 'Accept-Encoding: gzip' -H "Authorization: Bearer $TOKEN" \
  https://RAMA.XXXX.amplifyapp.com/api/cuentas/CODIGO_CUENTA/actividades
```

- **Comprimido:** aparece `Content-Encoding: gzip`, y una cuenta nueva baja de unos 55 KB a unos 10 KB.
- **Sin comprimir:** no aparece; el resto de las mejoras igual se aplica.

**5. Vigilar memoria y un OOM durante la sesión**

Deja abiertas dos terminales SSH:

```bash
watch -n 2 'free -m; echo; ps -o pid,rss,pcpu,cmd -C uvicorn --sort=-rss | head -5'
```

```bash
sudo journalctl -kf | grep -iE --line-buffered 'out of memory|oom|killed process'
```

Después de la sesión:

```bash
sudo journalctl -k --since '-4 hours' | grep -iE 'oom|killed process'
sudo journalctl -u ov-backend --since '-4 hours' | grep -iE 'error|exception|worker|timeout' | tail -50
```

- **Señales de alarma:**
  - `free` sin memoria disponible y la swap creciendo;
  - un `Killed process … uvicorn` en el kernel;
  - un 502 en el navegador, que es nginx sin worker.
- **Qué hacer:** que el siguiente grupo ingrese de a pocos.
- **Créditos de CPU:** una `t3` se queda sin ellos con carga sostenida. Revisa `CPUCreditBalance` en CloudWatch
  (EC2 > Instancia > Monitoreo) antes y después.

**6. Sin código: el orden de ingreso**

Los estudiantes ingresan conforme llegan a la sesión, sin esperar a que esté todo el salón para entrar juntos. Los
apoderados, unos minutos después de los estudiantes. Aunque 50 ingresos a la vez ya pasan sin errores (sección O),
tardan hasta 10 s cada uno con 2 núcleos; repartidos, tardan menos de medio segundo.

## I. Despliegue

**Lo que `main` tiene y `deploy` no** (27 commits, por ajuste):
- **panel-salon:** 8, más su cierre y una integración de `main`.
- **lumi-mensajes:** 6.
- **coherencia-lumi:** 5.
- **coherencia-apoderado:** 5, más su cierre.

**Lo que esta rama tiene y `main` no** (32 commits):
- **panel-estudiantes:** 8, más su cierre (en `ajuste/auditoria-panel`).
- **auditoría panel:** 5, más su cierre.
- **auditoría plataforma:** 17 (este documento y las correcciones de la sección G).

**Migraciones que correrán sobre RDS** (`actualizar.sh` hace `alembic upgrade head` en cada despliegue):
- `0056_panel_salon` (en `main`).
- `0057_panel_estudiantes` (en esta rama).
- Las correcciones de la auditoría plataforma no agregan migraciones.

**Recarga de datos:**
- **Qué cambió:** `datos/contenido.py` y `datos/fijos.py` tienen cambios respecto de `deploy`, y esos datos viven en la
  base. Para verlos hay que recargar `contenido`: en Actions, el workflow «Pruebas y despliegue» con
  `recargar_contenido`, o `actualizar.sh --recargar` en la EC2.
- **Atención:** la recarga **borra toda la base**: cuentas, progreso y catálogo. Carga de nuevo los usuarios de
  `datos/usuarios_prueba.txt`.
- **Cuándo hacerla:** antes de crear las cuentas de las pruebas del 18, nunca entre el 18 y el 19 si ya hay estudiantes
  con progreso.

**Para que esto llegue a las pruebas:**
1. Verificar esta rama e integrarla en `main` (incluye `ajuste/auditoria-panel`), con la suite completa en verde.
2. Abrir un PR de `main` hacia `deploy`; GitHub Actions corre las pruebas.
3. Con el push a `deploy` se actualiza la EC2 (migraciones y reinicio) y después Amplify. Si hace falta la recarga de
   datos, se lanza el workflow con `recargar_contenido`.
4. En la EC2, a mano: el gzip y la swap (sección H).

## J. Lista de verificación manual

Abre el portal en modo api con las herramientas del navegador (Red, filtro `Fetch/XHR`). «Ver» se refiere a esa
pestaña, salvo que se diga otra cosa.

| # | Pantalla | Qué hacer | Qué debes ver |
|---|---|---|---|
| F1 | Ingreso del estudiante → mapa | Ingresar | Un solo `GET …/notificaciones` (antes, dos). La campana muestra sus notificaciones. |
| F1 | Apoderado → Inicio | Ingresar | Un solo `GET …/notificaciones`. |
| F2a | Catálogo → detalle de una carrera | Abrir un detalle por primera vez | `POST /acciones/ver-carrera` y **ningún** `GET actividades` ni `avance` después. Si la vista abre algo (p. ej. `t-explorar`), sí aparecen y el mapa lo muestra. |
| F3 | Libro de Helena → página II (Intereses), lista para revelar | Romper el sello | El resultado se lee una vez (con el libro); en `contenido` no hay `act-tip-final`, así que el refresco nunca lo pedía. |
| F6 | Apoderado → Inicio, ir y volver dos veces | Navegar entre Inicio y otra vista | `GET /instrumentos` solo la primera vez; `familia/resultados` cada vez. |
| F6 | Apoderado → Mis actividades | Abrir una actividad | Un solo `GET …/fichas` aunque se monten la lista y la actividad. |
| F5 | Mapa → drawer de una batalla → Empezar | Abrir el drawer y entrar a la batalla | Un solo `GET …/batallas`. Tras un intento, al volver a entrar, uno nuevo. |
| F5 | Investigaciones → guion, paso 1 | Entrar, salir y volver | `GET …/catalogo/familias` solo la primera vez. |
| F11 | Cerrar sesión e ingresar con otra cuenta | Abrir una ficha en cada cuenta | La ficha de la segunda cuenta se pide de nuevo y muestra su contenido. Nada de la primera. |
| D-B3 | Apoderado con 2 hijos → Inicio | Cambiar de hijo | La tarjeta de cada hijo con su avance y nivel, como antes. |
| D-B1 | Ingreso | Ingresar con una contraseña errada 5 veces y luego bien | Los mismos mensajes y el bloqueo de 15 minutos de siempre; con la correcta, entra. |
| D-B6 | Cualquier vista, en la EC2 | El curl de la sección H | `Content-Encoding: gzip` en `actividades`. |
| F2b | Diario | Escribir una entrada | `POST escribir-entrada` y las lecturas del diario, **sin** `GET actividades`. Si la entrada abre una insignia, sí se refresca y aparece el aviso. |
| F2b | Mochila → una ficha bloqueada cuyo requisito cuente algo que se hace sin desbloqueo (p. ej. vistas del catálogo) | Abrir el detalle del requisito; ir al catálogo y abrir una carrera; volver a la ficha | El requisito «actual de requerido» muestra el conteo nuevo (`GET progreso/FICHA/…` tras la acción). Lo mismo con la Ciudad cerrada desde el mapa. |
| F2b | Familia → escribir la carta | Enviar la carta | `POST escribir-carta` y `GET conversaciones`, **sin** `GET actividades`. |
| F7 | Mis planes → un plan → «Cómo me siento» | Mover un medidor | `POST medidores` y **un** `GET planes`, sin `actividades`. El medidor queda en su valor. |
| F7 | Plan → «Lo hice» en un paso | Marcarlo | `POST paso-hecho` y un `GET planes`; el paso queda hecho y su duda cerrada. |
| F4 | Libro de Helena, con una página lista para revelar | Romper el sello | Un solo `GET …/instrumentos` y un resultado por página revelada (antes, dos de cada uno). La página se abre como siempre. |
| R1 | Un registro con piezas (p. ej. `b4-1` o `b4-5`) | Responder un ítem | La misma pantalla de Lumi y los mismos ecos que antes. |
| D-B4 | Cualquier vista | Usarla normalmente; luego desactivar la cuenta (en la base de desarrollo) y recargar | Todo responde igual. Con la cuenta desactivada, vuelve al ingreso (401). |
| F8 | Un registro o entregable de texto | Escribir rápido y salir del campo; recargar la página | El borrador está completo tras recargar. En Aplicación → Almacenamiento local, `ov.missions.v2.api` cambia al dejar de escribir, no con cada tecla. |
| F8 | Lo mismo | Escribir y cerrar la pestaña de inmediato; volver a abrir | El borrador sigue completo. |

### Comprobaciones en pantalla, sin recargar la página

Con una cuenta de estudiante de `datos/usuarios_prueba.txt` (por ejemplo, `est-mia`) en una base recién recargada.
«Sin recargar» quiere decir sin F5: se navega dentro de la aplicación.

| # | Caso | Cómo provocarlo | Qué debes ver, sin recargar |
|---|---|---|---|
| P1 | Tras revelar intereses | Completa el camino hasta `b2-5` («Intereses y ambientes de trabajo»): `b1-3` abre la Ciudad y `b2-5` abre `h-intereses-1`. En la Ciudad, completa «Mis intereses» 1 a 6 respondiendo con opciones variadas. En el libro de Helena, página II, rompe el sello. | En el **catálogo → Ocupaciones**: el filtro «Afines a mi resultado» y los sellos de letras en las tarjetas (las carreras no muestran RIASEC en api desde el ajuste coherencia-bloque3). En **Mi perfil → capítulo II** y en el **libro**: el resultado. En `contenido` no existe `act-tip-final`: su lugar lo ocupan el libro y el perfil. |
| P2 | Tras reiniciar y revelar de nuevo | El reinicio solo aparece con perfil plano (HU-095). Con otra cuenta nueva, responde los seis «Mis intereses» con **la misma opción en todos los ítems** y revela: sale el perfil plano con «Volver a realizar». Reinicia, vuelve a responder los seis con opciones variadas y revela. | El resultado nuevo (código de interés y ocupaciones afines) en el libro, en Mi perfil y en el catálogo («Afines a mi resultado»), no el plano anterior. |
| P3 | Una acción que ya no refresca el camino y da una insignia o sube de nivel | Con la cuenta después de `b0-4` («¿Tienes una opción en mente?»), que abre el catálogo: abre el detalle de **una carrera** por primera vez (sello `t-ins-familias`). Con B0 completo (`b0-1` a `b0-6`), abre **tres carreras distintas** (nivel 3, `R-NIV-3`). También sirven la primera ocupación (`t-ins-letras`) y la primera institución (`t-ins-instituciones`). | El aviso (toast) del sello o del título. En el **pasaporte**, el sello obtenido; en el **panel lateral del mapa**, el título nuevo. La vista registra el desbloqueo y por eso sí refresca el camino. |
| P4 | Completar una actividad que abre una sección | Con una cuenta nueva, completa `b0-2` («Lo que siento al terminar el colegio y mi diario»). Abre la sección Diario, la actividad `b0-3` y una pregunta del diario. También sirve `b0-4`, que abre Catálogo y Planes. | En el cierre, «Se abrió para ti» con la sección y la actividad. De vuelta en el mapa: el aviso, `b0-3` disponible (antes bloqueada) y el acceso rápido al Diario habilitado; al abrir el Diario, la pregunta nueva en el buzón. |

## Carga y Argon2 con 2 núcleos, después de las correcciones

Mismo método que en 1b: un uvicorn local con 2 workers sobre el PostgreSQL 17 temporal, el LLM de prueba con 2 s de
demora y 25 cuentas nuevas. Esta vez cada worker estaba fijado a 2 núcleos (afinidad de proceso), como la EC2. El
arranque del cliente ya pide la campana una sola vez (F1).

**Argon2 (25 verificaciones a la vez, 2 núcleos, la máquina sin otra carga; dos rondas):**

| | Tiempo total | Pico de memoria del proceso |
|---|---|---|
| Sin turnos (antes de D-B1) | 3,54 s · 3,58 s | **1.606 MB · 1.542 MB** |
| Con 4 turnos (D-B1(a)) | 3,49 s · 3,49 s | **281 MB · 281 MB** |

- **Con 2 núcleos, los turnos no hacen más lento el ingreso:** la CPU ya era el límite.
- **La memoria baja a una sexta parte:** con 2 workers, el tope es de unos 560 MB en total, en lugar de 3 GB.
- **Una medición anterior no sirve para tiempos:** se hizo mientras corría la suite completa en paralelo; sus tiempos
  (de 4 a 29 s) eran ruido de CPU, y no se usan.

**Carga de 25 estudiantes, PostgreSQL, 2 núcleos, después de las correcciones** (ms):

| Fase · ruta | Mediana / p95 / máx. |
|---|---|
| `POST /sesion/ingresar` | 3372 / 5110 / 5270 |
| `GET /sesion` · `POST /acciones/ingresar` | 36 / 824 / 914 · 45 / 905 / 907 |
| Arranque (`actividades`, `avance`, `resumen`, `secciones`, `presentaciones`, `notificaciones`) | 73–99 / ≤ 704 / ≤ 718 |
| `POST completar-actividad` (los 25 a la vez) | 331 / 514 / 580 |
| `POST completar-actividad` (tramo 0, 125 peticiones) | 305 / 494 / 586 |
| `POST responder-items` | 213 / 315 / 344 |
| `GET actividades` y `avance` (refrescos) | 253–346 / ≤ 610 / ≤ 695 |
| `POST registro/responder` (LLM de 2 s) | 2172 / 2222 / 2233 |
| Duración de cada fase | 5,7 s · 0,8 s · 6,1 s · 2,7 s |

- **Errores:** ninguno.
- **Bloqueos:** ni una espera por bloqueos (`Lock`).
- **Conexiones:** el pico fue de **22 de 30**; antes de las correcciones fueron 30 de 30.
- **El ingreso es lo más lento** (3,4 s de mediana y 5,3 s en el peor caso): son 25 verificaciones Argon2 sobre 2
  núcleos, con o sin turnos. Escalonar el ingreso (sección H, punto 6) lo reparte.
- **Las lecturas del arranque** salen rápido mientras los ingresos esperan su turno; su p95 (unos 700 ms) es el de las
  que coinciden con las verificaciones.
- **Lo que esta máquina no reproduce:** la latencia de red a RDS, los créditos de CPU de una `t3` y la memoria real de
  la EC2.

## K. Portal del apoderado: lo que la auditoría no había cubierto (solo medición)

Se midió el código anterior a las correcciones (`e7ae7bb2`) y el actual, sobre la misma copia de la base de medición:
`apo-rosa` con p1–p8 y su hija `est-ana` al final del camino. El front se tomó de su lectura (sección C).

### Costo por gesto (consultas · KB, sin comprimir)

| Gesto | Qué pide el front | Antes | Después |
|---|---|---|---|
| Ingreso, hasta ver Inicio | `sesion/ingresar` 1 · `GET /sesion` · `POST ingresar` · `notificaciones` (antes ×2) · `actividades` · `familia`; en Inicio, `conversaciones?estudiante=`, `familia/resultados?estudiante=` y `/instrumentos` | 46 · ≈ 54 | **32** · ≈ 52 |
| Completar una actividad | `completar-actividad` · `actividades` · `familia` · `marcar-vistas` | 26–27 · ≈ 4 | **19–20** · ≈ 4 |
| Escribir una carta | `escribir-carta` · `conversaciones` | 13 · ≈ 5 | **11** · ≈ 5 |
| Responder una conversación | `responder-conversacion` · `conversaciones` | 15–25 · 5–16 | **13–23** · 5–16 |
| Abrir el resultado de un cuestionario del hijo | `familia/resultados?estudiante=` · `/instrumentos` (después, solo la primera vez en la sesión) | 10 · ≈ 41 | **8** · ≈ 22 |

Por qué baja:
- **D-B4:** una consulta menos en cada petición.
- **D-B3:** `familia` pasa de 10 a 6 consultas.
- **F1:** la campana se pide una vez.
- **F6:** `/instrumentos` se pide una vez por sesión.

### `responder-conversacion`

| Respuesta | Consultas (antes → después) |
|---|---|
| La primera de un tema (el otro aún no responde) | 8 → 7 |
| La segunda, que deja el tema conversado | 14 → 13 |
| La segunda, cuando además deja una entrada en el diario o el regalo (`conv-6`, `conv-10`) | 18 → 17 |

- **No crece:** se respondieron los 10 temas, uno tras otro, con las dos cuentas. Los valores se repiten en cada tema;
  no dependen de cuántas conversaciones ni cuántas cartas haya.
- **El tamaño sí crece:** `GET conversaciones` pesa 5,2 KB sin respuestas y 16 KB con los 10 temas respondidos.
  Las consultas siguen en 6.

### Carga con 2 núcleos sobre PostgreSQL: 25 estudiantes y 25 apoderados a la vez

Cada cuenta hizo su ingreso, su inicio y completó una actividad: `b0-1` el estudiante y `p1` el apoderado. Se usó
el mismo método que en la sección H, con 2 workers fijados a 2 núcleos.

| Variante | Duración del ingreso | `sesion/ingresar` mediana / máx. | Lecturas del inicio (p95) | Errores |
|---|---|---|---|---|
| Los 50 ingresos en el mismo segundo, 4 turnos de Argon2 por worker (lo desplegado) | 40 s | 35,2 s / 39,6 s | ≈ 30,9 s | **3 errores 500 y 1 conexión cortada** |
| Los 50 en el mismo segundo, 1 turno por worker (solo medido) | 129 s | 4,7 s / 8,8 s, y **7 ingresos sin respuesta en 120 s** | 0,5–0,6 s | 7 tiempos agotados en el cliente |
| Los 50 repartidos en 20 s (2,5 por segundo), 4 turnos | 20 s | **0,30 s / 0,35 s** | **< 0,1 s** | **Ninguno** |
| Completar una actividad (las tres variantes) | — | — | `completar-actividad` 0,47–0,50 s; refrescos ≈ 0,7 s | Ninguno |

Los 409 (`conversaciones` y `familia/resultados` antes de que el apoderado termine su ruta) son los esperados y no
cuentan como errores.

**Problema, a decidir:** 50 verificaciones Argon2 en el mismo segundo saturan los 2 núcleos.

- **Con 4 turnos:** las peticiones que ya tenían conexión avanzan tan lento que el pool de un worker (15 conexiones)
  se agota y las demás fallan tras 30 s (`QueuePool limit … timeout 30`).
- **Con 1 turno:** el pool no se agota, pero algunos ingresos esperan su turno más de 2 minutos.
- **Repartidos en 20 s:** todo responde bien.

El costo de Argon2 es CPU: con 2 núcleos, unas 3 verificaciones por segundo. Ningún ajuste del semáforo lo cambia;
solo reparte quién espera. Opciones:

1. **Sin código:** que no ingresen todos a la vez. Por ejemplo, los estudiantes por filas y los apoderados en otro
   momento; en una sesión real, los apoderados no ingresan en el mismo segundo que los estudiantes.
2. **Instancia con más núcleos** esos días (p. ej. `c7i.xlarge`, 4 vCPU). Una `t3.medium` tiene los mismos 2 núcleos
   que una `t3.small`.
3. **Código, con tu decisión:**
   - Que la espera del turno tenga un límite y responda 503 con «Intenta de nuevo en unos segundos», en lugar de
     dejar la petición colgada.
   - O separar el ingreso en un worker propio.
   - Bajar `time_cost` o `memory_cost` queda descartado por tu decisión anterior.

### Lista J: comprobaciones del apoderado en pantalla, sin recargar

| # | Caso | Con qué cuentas y qué pasos | Qué debes ver |
|---|---|---|---|
| A1 | Completar p8: aparece el diploma y se abre «Ver resultado» del hijo | `est-ana` revela intereses (pasos de P1). Luego `apo-rosa` completa p1 a p7 y después **p8**. | En el cierre de p8, el diploma («Diploma de compromiso»). De vuelta en Inicio, en la tarjeta de Ana, los cuestionarios con resultado muestran su clave y «Ver resultado», que abre la vista explicada. |
| A2 | Antes del diploma, el candado se mantiene | `apo-rosa` con p1 a p7 completas (sin p8) y `est-ana` con intereses revelado. | En Inicio, la fila de intereses de Ana con el candado, sin clave ni «Ver resultado». Al abrir la vista explicada desde la URL: el mensaje «Completa tus actividades para ver los resultados de tu hijo». |
| A3 | El estudiante escribe una carta y el apoderado la ve; y al revés | `est-ana` con `b1-3` completa (abre Familia) escribe su carta en **Familia**. `apo-rosa` con p1 a p8 abre **Conversaciones** con Ana. Al revés: `apo-rosa` escribe la suya y Ana abre **Familia**. | Cada uno ve la carta del otro al abrir su vista; cada vista se revalida al montarse. Los temas pasan de «bloqueada» a «sin responder». |
| A4 | Con dos hijos, cambiar de hijo cambia todo | `apo-rosa` tiene a `est-ana` y `est-luis` (`VIN-ANA`, `VIN-LUIS`). En Inicio, usar los chips de hijo. | La tarjeta (título, avance y cuestionarios), los resultados y la tarjeta de conversaciones pasan a Luis, y la URL lleva `?child=est-luis`. Conversaciones muestra las de Luis. |

## L. Front: imágenes y `localStorage` (solo medición)

### Imágenes

`public/` tiene 211 MB en 82 archivos. Todas son PNG; ninguna está en WebP ni tiene versiones reducidas. Las 20 más
pesadas:

| MB | Archivo | MB | Archivo |
|---|---|---|---|
| 4,29 | `images/adventure/journey-map.png` | 3,49 | `images/silent-lagoon-phase-3.png` |
| 4,00 | `images/hidden-plaza-intro.png` | 3,48 | `images/silent-lagoon-phase-2.png` |
| 3,81 | `images/hidden-plaza-phase-2.png` | 3,39 | `images/scholarship-mystery-intro.png` |
| 3,75 | `images/background/ciudad.png` | 3,37 | `images/background/acantilado.png` |
| 3,72 | `images/silent-lagoon-phase-1.png` | 3,36 | `images/hidden-plaza-phase-3.png` |
| 3,61 | `images/hidden-plaza-phase-1.png` | 3,30 | `images/background/desierto.png` |
| 3,59 | `images/background/bosque_volcan.png` | 3,27 | `images/thousand-voices-festival-intro.png` |
| 3,51 | `images/silent-lagoon-intro.png` | 3,26 | `images/background/playa.png` |
| 3,21 | `images/harvest-race-phase-2.png` | 3,19 | `images/harvest-race-phase-3.png` |
| 3,20 | `images/harvest-race-phase-1.png` | 3,16 | `images/harvest-race-intro.png` |

| Qué se carga | Imágenes | Peso |
|---|---|---|
| El mapa al ingresar, cuenta nueva: el mapa (`journey-map.png`), el fondo de la presentación (`background/bosque.png`) y Lumi (`personajes/companero.png`) | 3 | **8,8 MB** |
| Las actividades del tramo 0 (`b0-1` a `b0-6`): fondos de `escenario` y personajes con su expresión | 16 | **27,8 MB** |
| Las actividades del bloque 1 (`b1-1` a `b1-7`) | 14 | **29,1 MB** |

- **Cómo se calculó:** con los JSON de `contenidos/plataforma/` y el catálogo de personajes (`catalogo.json`,
  `expresiones` o `avatarUrl`).
- **Caché:** el navegador guarda las imágenes, así que una que se repite entre actividades se descarga una vez.
- **Lo que suma una sesión:** un estudiante nuevo que hace el tramo 0 descarga unos 36 MB de imágenes, sin contar el
  paquete JS (817 KB). Con 25 estudiantes, unos 900 MB por la red del colegio el mismo día.
- **Es un problema para una red escolar**, aunque el servidor no lo note: las imágenes las sirve la CDN de Amplify. No
  se cambia nada aquí.
- **Opciones a decidir:**
  - convertirlas a WebP o AVIF a 1920 px de ancho, que suele bajarlas a unos 200–400 KB cada una;
  - o, como mínimo, reducir los fondos y personajes del tramo 0 y del mapa.

### `localStorage`

| Clave | Cuenta nueva | Cuenta que terminó |
|---|---|---|
| `ov.missions.v2.api` | 6,6 KB | 6,6 KB |

- **Por qué no cambia:** en api es una proyección de tamaño fijo por actividad, armada desde `GET actividades`; las
  entregas y respuestas viven en el servidor. Los borradores de texto suman solo lo que se escribe y el envío los
  borra. El límite habitual es de unos 5 MB por origen.
- **Si la escritura falla por cuota** (o el almacenamiento está bloqueado):
  - `updateJourney` captura el error y fija `storageError` («No se pudo guardar. Libera espacio o permite el
    almacenamiento y vuelve a intentarlo.»), que muestran el reproductor de actividades (`useActivityPlayer.ts:43`) y
    el de desafíos (`useChallengePlayer.ts:26`).
  - En una escritura inmediata, el estado en memoria no cambia. En la hidratación desde el servidor, sí cambia
    (`hidratarJourneyServidor`); en un borrador diferido, también, pero no se guarda.
  - `adventureStore` marca `storageError` y conserva el estado en memoria (`useServerSession.ts:28`).
  - En api, nada del servidor depende de ese almacenamiento: el progreso, las respuestas y los resultados ya están en
    la base.

## M. Cuentas anónimas para la prueba

### Correo `.test`

- **El correo se acepta tal cual.** `normalizar_correo` (`app/services/acceso.py:53`) solo quita espacios y pasa a
  minúsculas; no valida el dominio, y `IngresoEntrada.usuario` es un `str` sin `EmailStr`.
- **El ingreso funciona.** Se probó en una base temporal: una cuenta con `nav07@ov.test` ingresa con
  `  NAV07@ov.TEST ` y responde 200.
- **Nada envía correo.** No hay SMTP ni servicio de correo en el backend, y el front no recibe el correo: no está en
  `types/servidor.ts`. El único `mailto:` está en vistas del modo local con datos de demostración
  (`StudentProfileView.tsx`, `FamilySummary.tsx`).

### Dónde se usa el nombre y cómo se ve «Navegante 07»

**El nombre no viaja en ningún prompt del LLM.** `app/services/registro/llm/mensaje.py:3` lo dice expresamente. Las
sugerencias del plan y del guion solo envían carrera, institución, familia y los textos del estudiante. Lumi no saluda
por nombre: los JSON de actividades no tienen marcador de nombre.

| Lugar | Cómo usa el nombre | «Navegante 07» / «Familia 07» |
|---|---|---|
| Mensajes de los resultados (`textos_instrumento`, `instrumentos/consultas.py:63`): estudiante, apoderado («No mide la inteligencia de …», «conversar con …») y orientadora | La primera palabra | **«Navegante»**: los 25 estudiantes se llamarían igual |
| Perfil del estudiante en el panel de la orientadora (`PerfilEstudianteView.tsx:45`, `PestanaResumen`, `AvisosParaConversar`, `PlanCompletoPerfil`, `PestanaAvance`) | La primera palabra | **«lo que Navegante registró»**, «Conversaciones con Navegante» |
| Avisos del panel del salón (`nombreCorto`, `adaptadoresPanel.ts:13`) | Primera palabra e inicial de la segunda | **«Navegante 0.»** |
| «Las mismas carreras que ve …» (`FamiliasPortal.tsx:64`, apoderado) | La primera palabra | **«Navegante»** |
| Saludo del Inicio del apoderado (`ParentOverviewView.tsx:24`) | La primera palabra | **«Hola, Familia»** |
| Avatares: mapa y menú del estudiante, barra de los portales (`slice(0,2)`); perfil y chips de hijos (iniciales de dos palabras); investigaciones y publicaciones (`iniciales`) | Tres formatos | «NA» · «N0» · «Na» |
| Carta del apoderado que lee el estudiante (`RegaloCarta.tsx`) | «Escrita por {nombre} · tu {parentesco}» | «Escrita por Familia 07 · tu madre» |
| Diploma del apoderado (`HojaDiploma.tsx:38`) | A su nombre | «Familia 07» |
| Lista de estudiantes, «Ver», cabecera del perfil, tarjeta del hijo, conversaciones, autores y coautores | Completo | Bien («Navegante 07») |

**Propuesta: alias sin espacios, con guion:** «Navegante-07» para el estudiante y «Familia-07» para el apoderado.

| Lugar | Cómo se ve |
|---|---|
| Lo que toma la primera palabra (resultados, panel, saludo) | «Navegante-07», distinto para cada estudiante; «Hola, Familia-07» |
| `nombreCorto` | «Navegante-07»: una palabra queda entera |
| Avatares | «NA» o «Na», igual que con el alias de dos palabras; ya no sale «N0» |
| Lista y orden | El cero delante mantiene el orden hasta 99 |
| Carta y diploma | «Escrita por Familia-07 · tu madre» y el diploma a nombre de «Familia-07». Es lo inevitable con un alias; si molesta, el parentesco firma la carta («— Madre») |

- **Alternativa:** una palabra distinta por estudiante («Orión», «Vega»…). Se lee mejor y da iniciales distintas, pero
  hay que mantener una lista de 25 nombres.
- **La orientadora** puede usar su nombre real: solo lo ve ella en su barra.

### Las cuentas de `usuarios_prueba.txt` en producción

- **Se pueden desactivar después del paso 6 sin afectar a las cuentas de la prueba.** Están en los salones 5A y 5B,
  y las cuentas del script quedan en un salón nuevo. El panel y los compañeros del salón nuevo no las cuentan.
- **Una excepción, las Leyendas:** se arman con todo el colegio, y el salón nuevo también es de `col-piloto`. Si en el
  recorrido del paso 6 una de esas cuentas publica una entrevista, podría verse como Leyenda en el salón nuevo. En el
  recorrido, no publiques entrevistas.
- **Qué deja de funcionar:**
  - el ingreso de esas cuentas (403 con la contraseña correcta);
  - sus tokens vigentes (401 desde la siguiente petición, por el guardia).
- **Cómo hacerlo:** no hay pantalla ni ruta. En la EC2, con psql y la `DATABASE_URL` del `.env`:
  `UPDATE cuenta SET activa = false WHERE codigo IN ('est-ana','est-luis','est-beto','est-mia','est-teo','est-sol','apo-rosa','ori-carmen');`
  Se revierte con `activa = true`.
- **Ojo:** una recarga de contenidos (`--recargar`) vuelve a crearlas activas.

### Orden completo del despliegue

1. **Instantánea manual de RDS** (RDS > Bases de datos > la base > Acciones > Tomar instantánea).
2. **Integrar e instalar:**
   - integrar esta rama en `main`, con la suite completa en verde;
   - abrir el PR de `main` a `deploy`;
   - con el push a `deploy`, el despliegue (EC2 y Amplify);
   - después, la recarga de contenidos: Actions > «Pruebas y despliegue» > Run workflow > `deploy` > marcar
     `recargar_contenido`. **Borra toda la base.**
3. **Swap y gzip en la EC2** (sección H, pasos 2 y 3).
4. **Crear las cuentas con el script**, primero con `--simular`. El comando, con el CSV copiado a la EC2 fuera del repo, por
   ejemplo en `/home/ov/cuentas-prueba.csv`:

   ```bash
   cd /opt/ov/ov_backend
   sudo -u ov /home/ov/.local/bin/uv run --no-sync python scripts/crear_cuentas.py /home/ov/cuentas-prueba.csv --simular
   sudo -u ov /home/ov/.local/bin/uv run --no-sync python scripts/crear_cuentas.py /home/ov/cuentas-prueba.csv
   ```

5. **Instantánea de RDS con las cuentas creadas.**
6. **Recorrido de comprobación en producción** con una cuenta de `datos/usuarios_prueba.txt` (lista J), sin publicar
   entrevistas. Después, si quieres, desactiva esas cuentas (sección M).
7. **Instantánea de RDS al terminar la sesión del 18.**

## N. Ráfaga de ingresos: la causa no es el orden de los turnos

Para la prueba, el ingreso será escalonado (decisión del 14 de noviembre). Antes de cerrar el tema, se trazó cada
ingreso dentro del servidor de medición: cuándo llega, cuándo entra al endpoint, cuándo obtiene su turno y cuándo lo
suelta. Fueron 50 ingresos a la vez, con 1 turno por worker y 2 workers en 2 núcleos.

| Qué se vio | Dato |
|---|---|
| Reparto entre workers | **48 ingresos a un worker y 2 al otro.** En Windows, uvicorn no reparte las conexiones entre sus workers; en Linux suele ser más parejo, pero no está garantizado. |
| Orden de los turnos | **Por orden de llegada**: en los dos workers, el orden en que se obtienen los turnos coincide con el de llegada al endpoint. |
| Espera de turno en el worker cargado | Mediana de 35,4 s y máximo de 39,0 s |
| Lo que tarda una verificación con turno | Mediana de 0,21 s. **Una tardó 30,37 s**: esa es la pausa entre los segundos 3,4 y 33,8. |

**Qué pasó:**
- **Los ingresos en espera ocupan hilos.** Cada ingreso que espera turno bloquea un hilo del pool de hilos del worker,
  que tiene 40. Con 34 ingresos esperando, casi no quedan hilos.
- **Las peticiones de los que ya ingresaron retienen conexiones.** Siguen sus lecturas, y al terminar esperan un hilo
  libre para cerrar la sesión de base (la dependencia `obtener_sesion` es síncrona). Mientras esperan ese hilo,
  retienen su conexión.
- **El que tiene el turno no consigue conexión.** El pool de conexiones del worker (15) se llena con esas sesiones sin
  cerrar, y el ingreso que tiene el turno espera una conexión hasta el `pool_timeout` de 30 s.
- **Resultado:** el turno queda retenido, y todos los que esperan detrás también. Con 4 turnos pasa lo mismo, y además
  aparecen errores 500 (`QueuePool limit … timeout 30`).

**No se corrigió.** El arreglo sale del módulo de turnos, así que me detuve como se indicó. Opciones:
1. Esperar el turno sin ocupar un hilo: un endpoint de ingreso asíncrono que espere un semáforo de asyncio por orden
   de llegada y recién entonces verifique en el pool de hilos. Toca `app/api/sesion.py` además de `acceso.py`.
2. Más hilos por worker (el límite de AnyIO, al arrancar) o más conexiones por pool. Atenúa el problema, no lo resuelve.
   **Hecho como mitigación para el 18 y el 19** (sección O); la opción 1 queda para después del 19.
3. Que la espera del turno tenga un límite y responda 503 «Intenta de nuevo».
4. Dejarlo así con el ingreso escalonado: repartidos en 20 s, 50 ingresos tardan 0,3 s cada uno y no hay ningún error
   (sección K).

### El botón «Ingresar»

- **Durante el envío:** se desactiva (`disabled={enviando}`, `LoginScreen.tsx:143`), su texto cambia a «Ingresando…»
  (`:145`) y Enter tampoco reenvía (`:96`, `useLogin.ts:36`).
- **Si la espera se alarga, no hay más indicación:** ni un aviso de que sigue trabajando ni un tiempo límite del cliente
  (`services/api/cliente.ts`). Desde `1c01f254` hay aviso y mensaje de reintento (sección O).
- **Quién corta antes:** nginx a los 60 s (`proxy_read_timeout`), y el reenvío de Amplify (CloudFront) probablemente a
  los 30 s. En ese caso el usuario ve un error aunque el ingreso termine después en el servidor.
- **En esta sección no se cambió nada;** el cambio posterior está en la sección O.

### El script de cuentas

- **Qué es:** `scripts/crear_cuentas.py` y `scripts/cuentas_ejemplo.csv` (commit `b4f0e9a2`), con las funciones del
  cargador (commit `1d82121d`). En el ejemplo: `ori-prueba` «Orientadora», `nav-01` «Navegante-01»… y `fam-01`
  «Familia-01», con `nav01@ov.test` y `fam01@ov.test`.
- **Parentesco:** el vínculo no tiene una lista de valores. La columna `parentesco` es texto libre (`str | None` en el
  modelo y los esquemas). El front lo muestra como «tu {parentesco}» en la carta y con mayúscula en la firma
  («— Madre»). El script exige parentesco para APODERADO, en minúsculas y con hasta 30 caracteres (madre, padre, abuela,
  tío, tutora…).
- **Pruebas:** las 16 de `tests/integration/cuentas/test_crear_cuentas.py` pasan.

### Lista J: comprobaciones del script

| # | Caso | Pasos | Qué debes ver |
|---|---|---|---|
| S1 | Estudiante, apoderado y orientadora desde el ejemplo | En una base de desarrollo con `contenido`: `uv run python scripts/crear_cuentas.py scripts/cuentas_ejemplo.csv --simular` y luego sin `--simular`. Las contraseñas están en `scripts/cuentas_ejemplo.resultado.csv`. | La lista de lo que crearía, sin contraseñas. Después, el salón 5P y las cinco cuentas. |
| S2 | Ingresar con cada una | `nav01@ov.test`, `fam01@ov.test` y `ori@ov.test`. | Navegante-01 entra al mapa. Familia-01 ve «Hola, Familia-01» en Inicio y la tarjeta de Navegante-01. Orientadora ve el salón 5P y a Navegante-01 y Navegante-02 en la lista, y no ve 5A. |
| S3 | Una carta | Navegante-01 completa hasta `b1-3` y escribe su carta; Familia-01 completa p1 a p8 y abre Conversaciones. | La carta de Navegante-01; en la del apoderado, «Escrita por Familia-01 · tu madre». |

### Lista J: imágenes

| # | Caso | Pasos | Qué debes ver |
|---|---|---|---|
| I1 | Ninguna imagen rota ni con bordes extraños | Recorrer el ingreso, el mapa (ampliar al máximo), `b0-1` a `b0-3` y un caso de la Central. | Mapa, fondos, personajes y escenas completos. Los personajes, sin un recuadro ni un borde claro alrededor (la transparencia se conserva). En la pestaña Red, todo `.webp` y ningún 404. |

## O. Imágenes, ráfaga de ingresos y pantalla de ingreso (14 de noviembre)

### Imágenes en WebP (commit `71fa203e`)

- **Qué se hizo:** los 78 PNG de `public/images` pasaron a WebP con Pillow (`uv run --with pillow`, fuera del
  proyecto), con calidad 82 y `method=6`. Los personajes quedaron a 512 px de ancho, con alfa sin pérdida y
  `exact=True`. El mapa, los fondos y las escenas conservan su resolución (1672×941).
- **Pesos:**

| Qué | Antes | Después |
|---|---|---|
| `public/` completo | 211 MB | 23 MB |
| Las 78 imágenes | 208,2 MB | 19,7 MB |
| 33 personajes | 71,6 MB | 2,1 MB |
| 45 mapa, fondos y escenas | 136,7 MB | 17,7 MB (mediana de 436 KB) |
| El mapa al ingresar (mapa, `bosque` y Lumi) | 8,8 MB | 1,2 MB |

- **Imágenes de más de 600 KB:** `adventure/journey-map.webp` (738 KB), `hidden-plaza-intro.webp` (634 KB) y
  `hidden-plaza-phase-2.webp` (602 KB). El mapa conserva su tamaño porque se amplía hasta 1,4×.
- **Revisión:**
  - Sin bandas visibles en los cielos y degradados (`bosque`, `ciudad` y `nevado`, ampliados 2×).
  - Sin halos ni bordes claros en los personajes, sobre fondo oscuro y claro (ampliados 3×).
  - La comparación está en `comparacion-imagenes/index.html` (raíz del repo, ignorada por git), con seis pares.
- **Originales:** en `ov-imagenes-originales/public/images/` (carpeta hermana del repo, fuera de él) y en la historia
  de git.
- **Referencias:**
  - Se actualizaron el código, los JSON (catálogo y casos), las pruebas y los documentos.
  - `index.html` y los estilos no tenían rutas `.png`; el front no tiene manifiesto (en `public/` solo hay dos SVG).
  - El backend no guarda rutas de imágenes: ni la base ni `datos/` las tienen.
- **`neutral`:** el catálogo nombraba 22 imágenes `<personaje>_neutral` que nunca existieron. Ahora apuntan al avatar
  base (antes cada una daba un 404).
- **Prueba nueva:** `tests/despliegue/imagenes-referencias.test.mjs`. Comprueba tres cosas: que toda imagen
  referenciada exista, que cada `escenario` tenga su fondo y que no quede ningún PNG.

### Ráfaga de ingresos: 120 hilos por worker (commit `ca11c3a6`)

- **El cambio:**
  - Al arrancar, cada worker sube el límite de hilos de AnyIO de 40 a 120 (`HILOS_POR_WORKER`, en el ciclo de vida
    de `app/main.py`).
  - Las verificaciones Argon2 simultáneas bajan de 4 a 1 por proceso (`VERIFICACIONES_CONTRASENA_SIMULTANEAS`).
  - La ruta de ingreso y el módulo de turnos no cambian.
  - La prueba `tests/integration/acceso/test_hilos_por_worker.py` fija los dos valores y comprueba que el límite
    rige tras arrancar.
- **La medición:**
  - PostgreSQL local, 2 workers y 2 núcleos.
  - Ingresos mixtos: estudiantes y apoderados, cada uno con su primera carga.
  - Reparto «windows»: 2 workers en un puerto, que Windows reparte desigual. Reparto «parejo»: 2 servidores de 1
    worker, con el cliente repartiendo por mitades, que se parece más a la EC2.

| Turnos | Reparto | Ingresos a la vez | Mediana | p95 | Máximo | Errores | Sin respuesta | Pico de conexiones | Pico de hilos | Memoria por proceso |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | windows | 50 | 5,7 s | 10,2 s | 10,6 s | 0 | 0 | 30 | 49 | 202–205 MB |
| 1 | windows | 25 | 2,8 s | 4,8 s | 5,0 s | 0 | 0 | 20 | 49 | 207 MB |
| 1 | parejo | 50 | 5,6 s | 10,0 s | 10,4 s | 0 | 0 | 30 | 51 | 211–212 MB |
| 1 | parejo | 25 | 2,7 s | 4,7 s | 5,0 s | 0 | 0 | 24 | 51 | 220–222 MB |
| 2 | windows | 50 | 6,0 s | 10,3 s | 10,6 s | 0 | 0 | 30 | 47 | 267 MB |
| 2 | windows | 25 | 3,0 s | 4,8 s | 5,0 s | 0 | 0 | 22 | 47 | 271–272 MB |
| 2 | parejo | 50 | 6,1 s | 10,4 s | 10,7 s | 0 | 0 | 30 | 48 | 275–276 MB |
| 2 | parejo | 25 | 3,3 s | 5,1 s | 5,3 s | 0 | 0 | 20 | 48 | 285 MB |

- **Antes (40 hilos):** con 50 a la vez, un worker quedaba retenido unos 30 s y aparecían errores 500
  (`QueuePool limit`), según la sección N.
- **Con 120 hilos:**
  - Los 50 ingresos pasan en todos los casos, sin errores ni ingresos colgados.
  - El pico de hilos (47 a 51) supera los 40 de antes y queda lejos de 120.
- **Por qué 1 turno:**
  - Da la misma espera que 2 (el CPU es el límite) y usa unos 60 MB menos por proceso.
  - Con 2 workers, el pico de Argon2 baja de unos 560 MB a 128 MB.
  - Esto reemplaza el valor 4 de D-B1(a).
- **Lo que queda:** esperar el turno sin ocupar un hilo (opción 1 de la sección N), después del 19.

### Pantalla de ingreso (commit `1c01f254`)

- **Aviso por espera:** si la petición lleva más de 8 s, bajo el botón aparece «Hay muchas personas ingresando.
  Espera unos segundos, no recargues la página.»
- **Tiempo agotado o error de red** (408, 502, 503, 504 o sin conexión): el mensaje invita a reintentar y el botón
  vuelve a activarse. Los demás errores conservan el mensaje del servidor.
- **Lo que no tiene:** ni tiempo límite propio ni reintentos. El aviso solo corre en modo api.
- **Prueba:** `tests/servidor/acceso/servidor-ingreso-lento.test.mjs`, que comprueba el aviso a los 8000 ms, que no se
  envía una segunda petición y el mensaje de reintento ante un 504.

| # | Caso | Pasos | Qué debes ver |
|---|---|---|---|
| L1 | Ingreso lento | Con la red limitada en las herramientas del navegador (o el servidor detenido unos segundos), pulsar «Ingresar». | «Ingresando…» y, a los 8 s, el aviso bajo el botón. |
| L2 | Sin servidor | Con el backend apagado, pulsar «Ingresar». | El mensaje que invita a reintentar y el botón activo de nuevo. |
