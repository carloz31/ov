# Despliegue en AWS (primer despliegue)

La rama `deploy` es la que se publica. Arquitectura:

```
Navegador ──HTTPS──▶ Amplify (ov_frontend/dist)
                        │  /api/<*>  (reescritura 200, del lado de AWS)
                        ▼
                 EC2: nginx :443 ──▶ uvicorn 127.0.0.1:8000 (ov_backend)
                        │
                        ▼
                 RDS PostgreSQL :5432 (solo accesible desde la EC2)
```

El front sigue llamando a `/api`, como con el proxy de Vite en desarrollo. Amplify reenvía `/api/...` a la EC2, así que el navegador nunca habla directo con el backend: no hace falta CORS ni hay contenido mixto. Amplify solo hace de proxy hacia destinos **HTTPS**, por eso la EC2 lleva nginx con certificado de Let's Encrypt. Sin dominio propio se usa `sslip.io`: `3-91-20-15.sslip.io` resuelve a `3.91.20.15`.

Archivos de esta carpeta:

| Archivo | Para qué |
|---|---|
| `../.github/workflows/despliegue.yml` | Pruebas de front y back; si pasan, despliega EC2 y luego Amplify. |
| `../amplify.yml` | Build del front (monorepo, `appRoot: ov_frontend`, Node 22). |
| `amplify/reescrituras.json` | Reglas de Amplify: `/api` → EC2 y la regla SPA de react-router. |
| `ec2/instalar.sh` | Preparación única de la instancia. |
| `ec2/actualizar.sh` | Cada nueva versión: pull de `deploy`, `uv sync`, migraciones y reinicio. Con `--recargar`, borra la base y carga `contenido` con los estudiantes de ejemplo del panel; con `--recargar --sin-ejemplos`, sin ellos. |
| `ec2/ov-backend.service` | Servicio systemd (uvicorn, 2 workers). |
| `ec2/nginx-ov.conf` | Proxy inverso de nginx hacia uvicorn, con gzip para el JSON. En una instancia ya instalada, el gzip se aplica a mano (paso 8.3). |
| `ec2/env.produccion.example` | Plantilla del `.env` de producción. |

Elige una sola región para todo (aquí, Ohio: `us-east-2`).

## 1. Rama deploy

```bash
git checkout main && git pull
git checkout -b deploy   # o: git checkout deploy && git merge main
git push -u origin deploy
```

Para publicar una versión nueva: integra `main` en `deploy` y haz push. GitHub Actions corre las pruebas y, si pasan, despliega back y front (paso 7).

## 2. EC2

1. EC2 > Lanzar instancia: **Ubuntu Server 24.04 LTS**, `t3.small` (o `t3.micro` para probar), almacenamiento 20 GB, un par de llaves para SSH.
2. Grupo de seguridad `ov-ec2-sg`:
   - SSH 22 → **Mi IP**.
   - HTTP 80 y HTTPS 443 → `0.0.0.0/0` (Amplify sale desde IPs de AWS no fijas; el 80 lo usa Let's Encrypt).
   - No abras el 8000: uvicorn escucha solo en `127.0.0.1`.
3. EC2 > IP elásticas > Asignar y asociar a la instancia. Sin IP elástica, la IP cambia al reiniciar y el dominio `sslip.io` deja de apuntar.
4. Tu dominio de API queda como la IP elástica con guiones: `3.91.20.15` → `3-91-20-15.sslip.io`.

## 3. RDS PostgreSQL

1. RDS > Crear base de datos > Creación estándar > **PostgreSQL** (versión 16 o superior).
2. Plantilla **Capa gratuita** o Desarrollo/Pruebas; `db.t4g.micro`, 20 GB gp3, sin Multi-AZ.
3. Identificador `ov-db`, usuario maestro `ov_admin`, contraseña propia (guárdala).
4. Conectividad: **Conectar a un recurso de computación EC2** y elige la instancia del paso 2. Así RDS crea los grupos de seguridad que solo dejan entrar a la EC2 por el 5432. Acceso público: **No**.
5. Configuración adicional > Nombre de base de datos inicial: `ov`. Copias de seguridad automáticas: 7 días está bien.
6. Al terminar, copia el **endpoint** (Conectividad y seguridad).

## 4. Preparar la EC2

```bash
ssh -i tu-llave.pem ubuntu@IP-ELASTICA
git clone --branch deploy --depth 1 https://github.com/carloz31/ov.git /tmp/ov-kit   # si el repo es privado, sube la carpeta despliegue/ con scp
sudo bash /tmp/ov-kit/despliegue/ec2/instalar.sh git@github.com:carloz31/ov.git 3-91-20-15.sslip.io tu@correo.com
```

El script se detiene dos veces a propósito:

1. **Llave de despliegue**: imprime una llave pública. Agrégala en GitHub > `carloz31/ov` > Settings > Deploy keys (sin escritura) y vuelve a correrlo.
2. **`.env`**: crea `/opt/ov/ov_backend/.env` desde la plantilla. Edítalo:

   ```bash
   sudo -u ov nano /opt/ov/ov_backend/.env
   ```

   - `DATABASE_URL=postgresql+psycopg://ov_admin:CONTRASENA@ENDPOINT:5432/ov?sslmode=require` (si la contraseña tiene `@`, `/` o `:`, escápala en formato URL).
   - `JWT_SECRETO`: `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`.
   - `ENTORNO=produccion` (quita `/desarrollo/reiniciar` y exige el secreto).

   Vuelve a correr el script: termina instalando el servicio, nginx y el certificado.

Comprueba la conexión a RDS antes de migrar:

```bash
psql "postgresql://ov_admin:CONTRASENA@ENDPOINT:5432/ov?sslmode=require" -c "select version();"
```

## 5. Migrar, cargar datos y arrancar (una sola vez)

```bash
sudo -u ov bash -c 'cd /opt/ov/ov_backend && ~/.local/bin/uv run --no-sync alembic upgrade head && ~/.local/bin/uv run --no-sync python -m datos.cargar contenido'
sudo systemctl start ov-backend
curl -s -o /dev/null -w "%{http_code}\n" https://3-91-20-15.sslip.io/docs   # 200
```

`datos.cargar contenido` crea también los usuarios de `datos/usuarios_prueba.txt`, los apoderados de prueba de `contenido` y los estudiantes de ejemplo del panel de la orientadora (`est-panel-*` en 5A; `--sin-ejemplos` los omite). Sirven para la primera prueba; antes de abrirlo a estudiantes reales, crea las cuentas propias con `scripts/crear_cuentas.py` (paso 8.4) y desactiva esas.

## 6. Amplify (front)

1. Amplify > Crear una aplicación > GitHub > repo `carloz31/ov`, rama **`deploy`**.
2. Marca **Mi aplicación es un monorepo** y escribe `ov_frontend` como directorio raíz. Amplify detecta el `amplify.yml` de la raíz.
3. Variables de entorno: `VITE_DATOS=api` y `VITE_API_URL=/api` (el build ya las usa por defecto, pero así quedan visibles).
4. Guardar e implementar.
5. Hosting > **Reescrituras y redireccionamientos** > Administrar > editor JSON: pega `amplify/reescrituras.json` con tu dominio en lugar de `IP-CON-GUIONES`. El orden importa: primero `/api`, luego la regla SPA.

Prueba: `https://deploy.XXXX.amplifyapp.com/api/openapi.json` debe devolver el JSON del backend, y en la app el ingreso con un usuario de prueba debe llevar al inicio según el rol.

## 7. GitHub Actions: pruebas y despliegue automático

`.github/workflows/despliegue.yml` hace esto:

| Evento | Qué corre |
|---|---|
| PR hacia `deploy` | Front: `npm run lint`, `check:estructura`, `npm test`, `npm run build`. Back: un solo head de Alembic y `pytest -n auto` (incluye las pruebas `postgres` contra un PostgreSQL 17 temporal). |
| Push a `deploy` (o «Run workflow» a mano) | Las mismas pruebas y, si todo pasa: `actualizar.sh` en la EC2 por SSH, comprobación de `https://DOMINIO/docs` y después el build de Amplify. |

Si una prueba falla, no se despliega nada: ni la EC2 ni Amplify. El backend siempre se actualiza antes que el front.

### 7.1 Amplify: que compile solo cuando lo pida GitHub

1. Amplify > tu app > **Configuración de la aplicación > Configuración de la ramificación** > rama `deploy` > Editar > desmarca **Habilitar la compilación automática**. Así un push no publica el front sin pasar las pruebas.
2. Amplify > tu app > **Hosting > Configuración de compilación > Webhooks entrantes** > Crear webhook, para la rama `deploy`. Copia la URL que genera.

### 7.2 Llave SSH solo para GitHub

En tu máquina (no uses la `.pem` de AWS):

```bash
ssh-keygen -t ed25519 -N "" -f github-ec2 -C "github-actions"
ssh -i tu-llave.pem ubuntu@IP-ELASTICA "cat >> ~/.ssh/authorized_keys" < github-ec2.pub
```

Grupo de seguridad de la EC2: GitHub sale desde IPs que cambian, así que la regla de SSH 22 pasa de «Mi IP» a `0.0.0.0/0`. La instancia solo acepta llaves (Ubuntu en EC2 trae desactivado el ingreso por contraseña), así que el riesgo es bajo para este uso.

### 7.3 Secretos del repo

GitHub > `carloz31/ov` > Settings > **Environments** > New environment `produccion`. En ese entorno, agrega estos secretos:

| Secreto | Valor |
|---|---|
| `EC2_HOST` | La IP elástica (`3.151.84.94`). |
| `EC2_SSH_KEY` | Todo el contenido de `github-ec2` (la llave privada, con las líneas `BEGIN`/`END`). |
| `API_DOMINIO` | `3-151-84-94.sslip.io` |
| `AMPLIFY_WEBHOOK_URL` | La URL del webhook entrante del paso 7.1. |

Opcional: en Settings > Branches, protege `deploy` con «Require status checks to pass» y marca los trabajos de front y back. Así ni siquiera un merge directo entra a `deploy` sin pruebas en verde.

### 7.4 Publicar una versión

```bash
git checkout deploy && git merge main && git push
```

El avance se ve en la pestaña **Actions** del repo. Para desplegar a mano sin Actions, en la EC2: `sudo bash /opt/ov/despliegue/ec2/actualizar.sh`.

Un push **conserva los datos**: solo migra la estructura. Si cambiaste datos que viven en la base (`datos/contenido.py`, reglas, ítems, fichas) o una migración exige la base vacía, recarga:

### 7.5 Recargar el contenido (borra la base)

Actions > **Pruebas y despliegue** > **Run workflow** > rama `deploy` > marca **recargar_contenido** > Run. Corre las pruebas y, si pasan, en la EC2: detiene el backend, elimina el esquema completo (cuentas, progreso y catálogo), crea las tablas con `alembic upgrade head`, carga `contenido` (con los usuarios de `datos/usuarios_prueba.txt` y los estudiantes de ejemplo del panel), reinicia y publica el front. Marca también **sin_ejemplos** para cargarla sin los estudiantes de ejemplo.

A mano, en la EC2: `sudo bash /opt/ov/despliegue/ec2/actualizar.sh --recargar` (o `--recargar --sin-ejemplos`).

**Antes de una prueba con usuarios, recarga sin ejemplos** (**sin_ejemplos** o `--sin-ejemplos`): los estudiantes y apoderados de ejemplo son cuentas inventadas cuyas credenciales están en el repositorio (`CREDENCIALES` de `scripts/sembrar_panel_ejemplo.py`).

La siembra corre en un proceso aparte con `ENTORNO=desarrollo` solo para él (fija la fecha de cada acción) y con el cliente de prueba del LLM: no llama a Claude ni a la red, y el backend desplegado sigue en producción. Si falla, la base queda con `contenido` sin ejemplos, el backend se reinicia igual y el paso termina con error (código 3) después de comprobar la API.

Úsalo solo mientras no haya datos reales de estudiantes ni apoderados.

## 8. Una sesión con muchos estudiantes

Para una sesión con un salón entero (más de 20 estudiantes a la vez y sus apoderados). Los comandos son para la EC2, por SSH; ninguno toca la base salvo los de los pasos 8.4 y 8.6.

### 8.1 Instancia, memoria y swap

```bash
TOKEN=$(curl -s -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-type; echo
nproc
free -h
swapon --show
```

- **Con `t3.micro` (1 GB):** súbela a `t3.small` o `t3.medium` esos días (EC2 > Instancia > Detener > Cambiar tipo de instancia > Iniciar). La IP elástica se conserva.
- **Sin swap** (`swapon --show` vacío), crea 2 GB. Con swap, un pico de memoria se vuelve lento en lugar de matar un worker. Argon2 usa 64 MiB por ingreso y el backend verifica uno a la vez por worker, unos 128 MB en total.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf
sudo sysctl -p /etc/sysctl.d/99-swappiness.conf
```

### 8.2 Instantáneas de RDS

RDS > Bases de datos > la base > Acciones > Tomar instantánea: antes de desplegar, después de crear las cuentas (8.4) y al terminar cada sesión.

### 8.3 gzip en nginx (a mano)

`instalar.sh` copia `nginx-ov.conf` solo en la instalación y certbot le agrega el bloque `listen 443`; `actualizar.sh` no lo vuelve a copiar. Por eso, en una instancia ya instalada:

```bash
sudo cp /etc/nginx/sites-available/ov /etc/nginx/sites-available/ov.respaldo
sudo nano /etc/nginx/sites-available/ov
```

Dentro de **cada** bloque `server { … }` (el de 443 y el de 80), debajo de `client_max_body_size 5m;`, pega las seis líneas `gzip…` de `ec2/nginx-ov.conf`. No las pongas en `/etc/nginx/conf.d/`: el `nginx.conf` de Ubuntu ya trae `gzip on;` en el bloque `http` y nginx rechazaría el duplicado. Luego:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Si `nginx -t` falla, vuelve atrás con `sudo cp /etc/nginx/sites-available/ov.respaldo /etc/nginx/sites-available/ov`. Para comprobarlo, con un token de una cuenta de prueba:

```bash
curl -s -o /dev/null -D - -H 'Accept-Encoding: gzip' -H "Authorization: Bearer $TOKEN"   https://DOMINIO/cuentas/CODIGO_CUENTA/actividades | grep -iE 'content-encoding|content-length'
```

Debe aparecer `Content-Encoding: gzip`; una cuenta nueva baja de unos 55 KB a unos 10 KB.

### 8.4 Cuentas de la sesión

Con un CSV fuera del repo (por ejemplo, `/home/ov/cuentas-prueba.csv`; el formato está en `ov_backend/scripts/crear_cuentas.py` y en `scripts/cuentas_ejemplo.csv`), primero simulando:

```bash
cd /opt/ov/ov_backend
sudo -u ov /home/ov/.local/bin/uv run --no-sync python scripts/crear_cuentas.py /home/ov/cuentas-prueba.csv --simular
sudo -u ov /home/ov/.local/bin/uv run --no-sync python scripts/crear_cuentas.py /home/ov/cuentas-prueba.csv
```

Las contraseñas generadas quedan en `<csv>.resultado.csv`; el script nunca las imprime. Un estudiante cuyo apoderado no está en el CSV ve en Familia «Tu apoderado aún no se ha registrado en la plataforma.»: si quieres que tenga Familia aunque su apoderado no participe, crea igual la cuenta del apoderado.

### 8.5 Orden de ingreso

Los estudiantes ingresan conforme llegan a la sesión, sin esperar a que esté todo el salón para entrar juntos; los apoderados, unos minutos después. 50 ingresos a la vez pasan sin errores, pero tardan hasta 10 s cada uno con 2 núcleos; repartidos, menos de medio segundo. Si un ingreso pasa de 8 s, la pantalla pide esperar sin recargar.

### 8.6 Cuentas de `usuarios_prueba.txt`

Se pueden desactivar después del recorrido de comprobación sin afectar a las de la sesión (están en los salones 5A y 5B). Con psql y la `DATABASE_URL` del `.env`:

```sql
UPDATE cuenta SET activa = false WHERE codigo IN ('est-ana','est-luis','est-beto','est-mia','est-teo','est-sol','apo-rosa','ori-carmen');
```

Se revierte con `activa = true`, y una recarga de contenidos las vuelve a crear activas. En el recorrido de comprobación no publiques entrevistas: las Leyendas se arman con todo el colegio y se verían en el salón nuevo.

### 8.7 Durante la sesión

```bash
watch -n 2 'free -m; echo; ps -o pid,rss,pcpu,cmd -C uvicorn --sort=-rss | head -5'
```

```bash
sudo journalctl -kf | grep -iE --line-buffered 'out of memory|oom|killed process'
```

Señales de alarma: sin memoria disponible y la swap creciendo, un `Killed process … uvicorn` o un 502 en el navegador (nginx sin worker). Si aparecen, que el siguiente grupo ingrese de a pocos. Una `t3` se queda sin créditos de CPU con carga sostenida: revisa `CPUCreditBalance` en CloudWatch antes y después. Al terminar:

```bash
sudo journalctl -k --since '-4 hours' | grep -iE 'oom|killed process'
sudo journalctl -u ov-backend --since '-4 hours' | grep -iE 'error|exception|worker|timeout' | tail -50
```

## Diagnóstico

| Síntoma | Dónde mirar |
|---|---|
| El front carga pero el ingreso falla | `curl https://DOMINIO/docs` desde tu máquina; luego `sudo journalctl -u ov-backend -n 100`. |
| 502 o 504 en `/api/...` | La regla de Amplify apunta a un dominio sin HTTPS válido, o el servicio está caído (`systemctl status ov-backend`). |
| `La base no tiene el esquema` al arrancar | Falta `alembic upgrade head` (paso 5). |
| `connection timed out` hacia RDS | Grupos de seguridad: el de RDS debe aceptar 5432 desde el de la EC2. |
| Al recargar una ruta como `/student/...` sale 404 | Falta la regla SPA en Amplify. |
| certbot falla | El puerto 80 no está abierto o el dominio no apunta a la IP elástica. Si es un límite de `sslip.io`, usa un dominio de DuckDNS u otro propio. |

## Costos y limpieza

EC2, RDS y la IP elástica cobran por hora mientras existan (la IP elástica también cobra). Para pausar: detén la instancia EC2 y la base RDS (RDS vuelve a encenderse sola a los 7 días). Activa un presupuesto en Billing > Budgets para recibir aviso.
