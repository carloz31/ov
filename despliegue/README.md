# Despliegue en AWS

Guía para publicar la plataforma en AWS desde la rama `deploy`: el frontend en Amplify, el backend en una instancia EC2 detrás de nginx y la base de datos en RDS (PostgreSQL). Sirve para instalarla por primera vez y para mantenerla: preparación de cada servicio, despliegue automático con GitHub Actions y recarga del contenido. Lo necesario para una sesión con muchos estudiantes conectados a la vez está en [operacion.md](operacion.md).

Arquitectura:

```
Navegador ──HTTPS──▶ Amplify (ov_frontend/dist)
                        │  /api/<*>  (reescritura 200, del lado de AWS)
                        ▼
                 EC2: nginx :443 ──▶ uvicorn 127.0.0.1:8000 (ov_backend)
                        │
                        ▼
                 RDS PostgreSQL :5432 (solo accesible desde la EC2)
```

El front sigue llamando a `/api`, como con el proxy de Vite en desarrollo. Amplify reenvía `/api/...` a la EC2, así que el navegador nunca habla directo con el backend: no hace falta CORS ni hay contenido mixto. Amplify solo hace de proxy hacia destinos **HTTPS**, por eso la EC2 lleva nginx con certificado de Let's Encrypt. Sin dominio propio se usa `sslip.io`: `1-2-3-4.sslip.io` resuelve a `1.2.3.4`. En esta guía, `IP-ELASTICA` es la IP elástica de la EC2 y `DOMINIO-API`, su dominio en `sslip.io`.

Archivos de esta carpeta:

| Archivo | Para qué |
|---|---|
| `../.github/workflows/despliegue.yml` | Pruebas de front y back; si pasan, despliega EC2 y luego Amplify. |
| `../amplify.yml` | Build del front (monorepo, `appRoot: ov_frontend`, Node 22). |
| `amplify/reescrituras.json` | Reglas de Amplify: `/api` → EC2 y la regla SPA de react-router. |
| `ec2/instalar.sh` | Preparación única de la instancia. |
| `ec2/actualizar.sh` | Cada nueva versión: pull de `deploy`, `uv sync`, respaldo de la base (`pg_dump`), migraciones y reinicio. Con `--recargar`, borra la base y carga `contenido` con los estudiantes de ejemplo del panel; con `--recargar --sin-ejemplos`, sin ellos. La recarga tiene candado (7.5). |
| `ec2/ov-backend.service` | Servicio systemd (uvicorn, 2 workers). |
| `ec2/nginx-ov.conf` | Proxy inverso de nginx hacia uvicorn, con gzip para el JSON. En una instancia ya instalada, el gzip se aplica a mano ([operacion.md](operacion.md), paso 3). |
| `ec2/env.produccion.example` | Plantilla del `.env` de producción. |

Se usa una sola región para todo (en esta guía, Ohio: `us-east-2`).

## 1. Rama deploy

```bash
git checkout main && git pull
git checkout -b deploy   # o: git checkout deploy && git merge main
git push -u origin deploy
```

Para publicar una versión nueva, se integra `main` en `deploy` y se hace push. GitHub Actions corre las pruebas y, si pasan, despliega back y front (paso 7).

## 2. EC2

1. EC2 > Lanzar instancia: **Ubuntu Server 24.04 LTS**, `t3.small` (o `t3.micro` para probar), almacenamiento 20 GB, un par de llaves para SSH.
2. Grupo de seguridad `ov-ec2-sg`:
   - SSH 22 → **Mi IP**.
   - HTTP 80 y HTTPS 443 → `0.0.0.0/0` (Amplify sale desde IPs de AWS no fijas; el 80 lo usa Let's Encrypt).
   - El 8000 no se abre: uvicorn escucha solo en `127.0.0.1`.
3. EC2 > IP elásticas > Asignar y asociar a la instancia. Sin IP elástica, la IP cambia al reiniciar y el dominio `sslip.io` deja de apuntar.
4. El dominio de la API es la IP elástica con guiones: `1.2.3.4` → `1-2-3-4.sslip.io`.

## 3. RDS PostgreSQL

1. RDS > Crear base de datos > Creación estándar > **PostgreSQL** (versión 16 o superior).
2. Plantilla **Capa gratuita** o Desarrollo/Pruebas; `db.t4g.micro`, 20 GB gp3, sin Multi-AZ.
3. Identificador `ov-db`, usuario maestro `ov_admin` y una contraseña propia, que se guarda aparte.
4. Conectividad: **Conectar a un recurso de computación EC2**, con la instancia del paso 2. Así RDS crea los grupos de seguridad que solo dejan entrar a la EC2 por el 5432. Acceso público: **No**.
5. Configuración adicional > Nombre de base de datos inicial: `ov`. Copias de seguridad automáticas: 7 días bastan.
6. Al terminar, se copia el **endpoint** (Conectividad y seguridad).

## 4. Preparar la EC2

```bash
ssh -i llave.pem ubuntu@IP-ELASTICA
git clone --branch deploy --depth 1 https://github.com/carloz31/ov.git /tmp/ov-kit   # si el repo es privado, se sube la carpeta despliegue/ con scp
sudo bash /tmp/ov-kit/despliegue/ec2/instalar.sh git@github.com:carloz31/ov.git DOMINIO-API CORREO
```

`CORREO` es el correo que Let's Encrypt usa para los avisos del certificado. El script se detiene dos veces a propósito:

1. **Llave de despliegue**: imprime una llave pública, que se agrega en GitHub > el repositorio > Settings > Deploy keys (sin escritura). Después se vuelve a correr el script.
2. **`.env`**: crea `/opt/ov/ov_backend/.env` desde la plantilla, que se edita:

   ```bash
   sudo -u ov nano /opt/ov/ov_backend/.env
   ```

   - `DATABASE_URL=postgresql+psycopg://ov_admin:CONTRASENA@ENDPOINT:5432/ov?sslmode=require` (si la contraseña tiene `@`, `/` o `:`, se escapa en formato URL).
   - `JWT_SECRETO`: `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`.
   - `ENTORNO=produccion` (quita `/desarrollo/reiniciar` y exige el secreto).

   Al correr el script de nuevo, termina instalando el servicio, nginx y el certificado.

Antes de migrar, se comprueba la conexión a RDS:

```bash
psql "postgresql://ov_admin:CONTRASENA@ENDPOINT:5432/ov?sslmode=require" -c "select version();"
```

## 5. Migrar, cargar datos y arrancar (una sola vez)

```bash
sudo -u ov bash -c 'cd /opt/ov/ov_backend && ~/.local/bin/uv run --no-sync alembic upgrade head && ~/.local/bin/uv run --no-sync python -m datos.cargar contenido'
sudo systemctl start ov-backend
curl -s -o /dev/null -w "%{http_code}\n" https://DOMINIO-API/docs   # 200
```

`datos.cargar contenido` crea también los usuarios de `datos/usuarios_prueba.txt`, los apoderados de prueba de `contenido` y los estudiantes de ejemplo del panel de la orientadora (`est-panel-*` en 5A; `--sin-ejemplos` los omite). Sirven para la primera prueba. Antes de abrir la plataforma a estudiantes reales, se crean las cuentas propias con `scripts/crear_cuentas.py` ([operacion.md](operacion.md), paso 4) y se desactivan todas las cuentas cuyas contraseñas están en el repositorio: las de `datos/usuarios_prueba.txt`, los apoderados de prueba y, si se cargaron, los ejemplos del panel (paso 6 del mismo archivo).

## 6. Amplify (front)

1. Amplify > Crear una aplicación > GitHub > el repositorio, rama **`deploy`**.
2. Se marca **Mi aplicación es un monorepo** y se escribe `ov_frontend` como directorio raíz. Amplify detecta el `amplify.yml` de la raíz.
3. Variables de entorno: `VITE_DATOS=api` y `VITE_API_URL=/api` (el build ya las usa por defecto, pero así quedan visibles).
4. Guardar e implementar.
5. Hosting > **Reescrituras y redireccionamientos** > Administrar > editor JSON: se pega `amplify/reescrituras.json` con `DOMINIO-API` en lugar de `IP-CON-GUIONES`. El orden importa: primero `/api`, luego la regla SPA.

Prueba: `https://deploy.XXXX.amplifyapp.com/api/openapi.json` debe devolver el JSON del backend, y en la app el ingreso con un usuario de prueba debe llevar al inicio según el rol.

## 7. GitHub Actions: pruebas y despliegue automático

`.github/workflows/despliegue.yml` hace esto:

| Evento | Qué corre |
|---|---|
| PR hacia `deploy` | Front: `npm run lint`, `check:estructura`, `npm test`, `npm run build`. Back: un solo head de Alembic y `pytest -n auto` (incluye las pruebas `postgres` contra un PostgreSQL 17 temporal). |
| Push a `deploy` (o «Run workflow» a mano) | Las mismas pruebas y, si todo pasa: `actualizar.sh` en la EC2 por SSH, comprobación de `https://DOMINIO-API/docs` y después el build de Amplify. |

Si una prueba falla, no se despliega nada: ni la EC2 ni Amplify. El backend siempre se actualiza antes que el front.

### 7.1 Amplify: que compile solo cuando lo pida GitHub

1. Amplify > la app > **Configuración de la aplicación > Configuración de la ramificación** > rama `deploy` > Editar > se desmarca **Habilitar la compilación automática**. Así un push no publica el front sin pasar las pruebas.
2. Amplify > la app > **Hosting > Configuración de compilación > Webhooks entrantes** > Crear webhook, para la rama `deploy`. Se copia la URL que genera.

### 7.2 Llave SSH solo para GitHub

En la máquina local (no se usa la `.pem` de AWS):

```bash
ssh-keygen -t ed25519 -N "" -f github-ec2 -C "github-actions"
ssh -i llave.pem ubuntu@IP-ELASTICA "cat >> ~/.ssh/authorized_keys" < github-ec2.pub
```

Grupo de seguridad de la EC2: GitHub sale desde IPs que cambian, así que la regla de SSH 22 pasa de «Mi IP» a `0.0.0.0/0`. La instancia solo acepta llaves (Ubuntu en EC2 trae desactivado el ingreso por contraseña), así que el riesgo es bajo para este uso.

### 7.3 Secretos del repo

GitHub > el repositorio > Settings > **Environments** > New environment `produccion`. En ese entorno se agregan estos secretos:

| Secreto | Valor |
|---|---|
| `EC2_HOST` | La IP elástica (`IP-ELASTICA`). |
| `EC2_SSH_KEY` | Todo el contenido de `github-ec2` (la llave privada, con las líneas `BEGIN`/`END`). |
| `API_DOMINIO` | `DOMINIO-API` (la IP elástica con guiones, con el formato `1-2-3-4.sslip.io`). |
| `AMPLIFY_WEBHOOK_URL` | La URL del webhook entrante del paso 7.1. |

Opcional: en Settings > Branches, se protege `deploy` con «Require status checks to pass» y se marcan los trabajos de front y back. Así ni siquiera un merge directo entra a `deploy` sin pruebas en verde.

### 7.4 Publicar una versión

```bash
git checkout deploy && git merge main && git push
```

El avance se ve en la pestaña **Actions** del repo. Para desplegar a mano sin Actions, en la EC2: `sudo bash /opt/ov/despliegue/ec2/actualizar.sh`.

Un push **conserva los datos**: respalda la base y solo migra la estructura. Si el respaldo falla, no se despliega nada (código 5). Los textos de las actividades viven en los JSON del front, así que corregirlos tampoco toca la base.

Si cambian datos que viven en la base (`datos/contenido.py`, reglas, ítems, fichas) o una migración exige la base vacía, hace falta recargar; con cuentas reales, eso ya no se puede (ver [operacion.md](operacion.md), paso 8).

### 7.5 Recargar el contenido (borra la base)

**Candado.** La recarga se niega (código 4, sin tocar nada: ni respaldo, ni migración, ni reinicio) si la base tiene alguna cuenta que no sea de las que la propia carga crea (`datos/contenido.py`, `usuarios_prueba.txt`, ejemplos del panel) ni E99, A99 u O99 (`ov_backend/scripts/comprobar_recarga.py`). Con cuentas reales en la base, la recarga queda bloqueada. `--forzar` se salta el candado, solo a mano en la EC2 y nunca desde Actions; se usa solo cuando la prueba con usuarios terminó y sus datos están respaldados.

Actions > **Pruebas y despliegue** > **Run workflow** > rama `deploy` > se marca **recargar_contenido** > Run. Corre las pruebas y, si pasan, en la EC2: detiene el backend, elimina el esquema completo (cuentas, progreso y catálogo), crea las tablas con `alembic upgrade head`, carga `contenido` (con los usuarios de `datos/usuarios_prueba.txt`, los apoderados de prueba de `contenido` y los estudiantes de ejemplo del panel), reinicia y publica el front. Con **sin_ejemplos** marcado también, la carga va sin los estudiantes de ejemplo.

A mano, en la EC2: `sudo bash /opt/ov/despliegue/ec2/actualizar.sh --recargar` (o `--recargar --sin-ejemplos`).

**Antes de una prueba con usuarios, se recarga sin ejemplos** (**sin_ejemplos** o `--sin-ejemplos`): los estudiantes y apoderados de ejemplo son cuentas inventadas cuyas credenciales están en el repositorio (`CREDENCIALES` de `scripts/sembrar_panel_ejemplo.py`).

La siembra corre en un proceso aparte con `ENTORNO=desarrollo` solo para él (fija la fecha de cada acción) y con el cliente de prueba del LLM: no llama a Claude ni a la red, y el backend desplegado sigue en producción. Si falla, la base queda con `contenido` sin ejemplos, el backend se reinicia igual y el paso termina con error (código 3) después de comprobar la API.

La recarga se usa solo mientras no haya datos reales de estudiantes ni apoderados.

## Diagnóstico

| Síntoma | Dónde mirar |
|---|---|
| El front carga pero el ingreso falla | `curl https://DOMINIO-API/docs` desde la máquina local; luego `sudo journalctl -u ov-backend -n 100`. |
| 502 o 504 en `/api/...` | La regla de Amplify apunta a un dominio sin HTTPS válido, o el servicio está caído (`systemctl status ov-backend`). |
| `La base no tiene el esquema` al arrancar | Falta `alembic upgrade head` (paso 5). |
| `connection timed out` hacia RDS | Grupos de seguridad: el de RDS debe aceptar 5432 desde el de la EC2. |
| Al recargar una ruta como `/student/...` sale 404 | Falta la regla SPA en Amplify. |
| certbot falla | El puerto 80 no está abierto o el dominio no apunta a la IP elástica. Si es un límite de `sslip.io`, se usa un dominio de DuckDNS u otro propio. |

## Costos y limpieza

EC2, RDS y la IP elástica cobran por hora mientras existan (la IP elástica también cobra). Para pausar, se detienen la instancia EC2 y la base RDS (RDS vuelve a encenderse sola a los 7 días). Conviene activar un presupuesto en Billing > Budgets para recibir aviso.
