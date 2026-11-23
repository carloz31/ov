# Plataforma gamificada de orientación vocacional

Plataforma web que complementa el proceso de orientación vocacional de estudiantes de cuarto y quinto de secundaria. El estudiante recorre una ruta de actividades, cuestionarios y registros; su apoderado tiene un portal propio con actividades y conversaciones en familia, y la orientadora da seguimiento a sus salones desde un panel.

## Estructura

| Carpeta | Contenido |
|---|---|
| `ov_backend/` | API en FastAPI con SQLAlchemy y Alembic. Guarda la estructura, las reglas de desbloqueo y el estado de cada cuenta. |
| `ov_frontend/` | Interfaz en React, TypeScript y Vite. Contiene las vistas y el contenido narrativo de las actividades. |
| `despliegue/` | Guía y archivos del despliegue en AWS (EC2, RDS y Amplify). |
| `.github/workflows/` | Flujo que corre las pruebas y despliega. |

## Ejecutar en local

Requisitos: Python 3.14 con uv, y Node.js 22 con npm.

1. Backend, desde `ov_backend/`: crea `.env` a partir de `.env.example` y ejecuta

   ```
   uv sync
   uv run alembic upgrade head
   uv run python -m datos.cargar contenido
   uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

2. Frontend, desde `ov_frontend/`: crea `.env.local` con `VITE_DATOS=api` y `VITE_API_URL=/api`, y ejecuta

   ```
   npm ci
   npm run dev
   ```

El detalle de cada parte está en [ov_backend/README.md](ov_backend/README.md) y [ov_frontend/README.md](ov_frontend/README.md).

## Cuentas de prueba

La carga `datos.cargar contenido` crea cuentas de prueba con datos inventados (correos de `example.com`), para recorrer los tres portales sin registrar a nadie. Se ingresa con el correo y la contraseña:

| Rol | Usuario | Contraseña | Qué se ve |
|---|---|---|---|
| Estudiante | `ana.estudiante@example.com` | `Ana2026!` | La ruta desde el inicio: mapa, actividades, diario, planes. |
| Apoderado | `rosa.apoderada@example.com` | `Rosa2026!` | El portal del apoderado de Ana y Luis, con sus actividades y las conversaciones en familia. |
| Orientadora | `carmen.orientadora@example.com` | `Carmen2026!` | El panel de su salón (5A), con la lista y el perfil de cada estudiante. |

Estas tres y los otros cinco estudiantes de prueba (Luis, Beto, Mía, Teo y Sol) están en `ov_backend/datos/usuarios_prueba.txt`; los apoderados de Beto, Mía, Teo y Sol, en `APODERADOS_PRUEBA` de `ov_backend/datos/contenido.py`.

La misma carga siembra once estudiantes de ejemplo en el salón 5A (`est-panel-1` a `est-panel-11`), cada uno en una situación distinta: uno que nunca ingresó, uno que recién empieza, uno con un cuestionario respondido con prisa, uno que terminó el camino, entre otros. Sirven para ver el panel de la orientadora con datos: avance del salón, avisos, respuestas de los registros, planes y entrevistas publicadas. Sus credenciales, y las de sus apoderados, están en `CREDENCIALES` de `ov_backend/scripts/sembrar_panel_ejemplo.py`. Para cargar sin ellos: `uv run python -m datos.cargar contenido --sin-ejemplos`.

Estas cuentas son para una instalación local. En un despliegue con usuarios reales se desactivan, como indica `despliegue/README.md`.

## Pruebas

- Backend, desde `ov_backend/`: `uv run pytest -n auto -q`
- Frontend, desde `ov_frontend/`: `npm test`

El flujo de GitHub Actions las ejecuta antes de cada despliegue.

## Documentación

- [ov_backend/docs/sistema/](ov_backend/docs/sistema/): cómo funcionan el motor de desbloqueo, los registros, los instrumentos, los planes, las investigaciones y el panel.
- [ov_frontend/docs/](ov_frontend/docs/): origen de los datos y formato de los contenidos de las actividades.
- [despliegue/README.md](despliegue/README.md): despliegue y operación.
