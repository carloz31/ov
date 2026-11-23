# Operación con usuarios

Lo que se hizo para preparar y acompañar una sesión con muchos estudiantes conectados a la vez: un salón entero, más de 20 estudiantes y sus apoderados. Parte de una plataforma ya desplegada según [README.md](README.md). Los comandos son para la EC2, por SSH; ninguno toca la base salvo los de los pasos 4 y 6.

## 1. Instancia, memoria y swap

```bash
TOKEN=$(curl -s -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-type; echo
nproc
free -h
swapon --show
```

- **Con `t3.micro` (1 GB):** se sube a `t3.small` o `t3.medium` esos días (EC2 > Instancia > Detener > Cambiar tipo de instancia > Iniciar). La IP elástica se conserva.
- **Sin swap** (`swapon --show` vacío), se crean 2 GB. Con swap, un pico de memoria se vuelve lento en lugar de matar un worker. Argon2 usa 64 MiB por ingreso y el backend verifica uno a la vez por worker, unos 128 MB en total.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf
sudo sysctl -p /etc/sysctl.d/99-swappiness.conf
```

## 2. Instantáneas de RDS

RDS > Bases de datos > la base > Acciones > Tomar instantánea: antes de desplegar, después de crear las cuentas (paso 4) y al terminar cada sesión. Además, RDS guarda copias automáticas (7 días) y `actualizar.sh` deja un `pg_dump` en `/home/ov/respaldos/` antes de cada despliegue (los últimos 15).

`pg_dump` debe ser de la misma versión mayor que el servidor o más nueva. Ubuntu 24.04 trae la 16; se comparan con `pg_dump --version` y `psql "$URL" -c 'show server_version;'`. Si RDS es más nueva (17), se instala el cliente de PGDG una vez:

```bash
sudo apt-get install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
sudo apt-get install -y postgresql-client-17
```

Para restaurar un respaldo (con el backend detenido; reemplaza todo lo que haya):

```bash
sudo systemctl stop ov-backend
sudo -u ov pg_restore --clean --if-exists --no-owner --dbname="postgresql://…" /home/ov/respaldos/ov-AAAAMMDD-HHMMSS.dump
sudo systemctl start ov-backend
```

## 3. gzip en nginx (a mano)

`instalar.sh` copia `nginx-ov.conf` solo en la instalación y certbot le agrega el bloque `listen 443`; `actualizar.sh` no lo vuelve a copiar. Por eso, en una instancia ya instalada:

```bash
sudo cp /etc/nginx/sites-available/ov /etc/nginx/sites-available/ov.respaldo
sudo nano /etc/nginx/sites-available/ov
```

Dentro de **cada** bloque `server { … }` (el de 443 y el de 80), debajo de `client_max_body_size 5m;`, se pegan las seis líneas `gzip…` de `ec2/nginx-ov.conf`. No van en `/etc/nginx/conf.d/`: el `nginx.conf` de Ubuntu ya trae `gzip on;` en el bloque `http` y nginx rechazaría el duplicado. Luego:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Si `nginx -t` falla, se vuelve atrás con `sudo cp /etc/nginx/sites-available/ov.respaldo /etc/nginx/sites-available/ov`. Para comprobarlo, con un token de una cuenta de prueba:

```bash
curl -s -o /dev/null -D - -H 'Accept-Encoding: gzip' -H "Authorization: Bearer $TOKEN"   https://DOMINIO-API/cuentas/CODIGO_CUENTA/actividades | grep -iE 'content-encoding|content-length'
```

Debe aparecer `Content-Encoding: gzip`; una cuenta nueva baja de unos 55 KB a unos 10 KB.

## 4. Cuentas de la sesión

Con un CSV fuera del repo (por ejemplo, `/home/ov/cuentas-prueba.csv`; el formato está en `ov_backend/scripts/crear_cuentas.py` y en `scripts/cuentas_ejemplo.csv`), primero simulando:

```bash
cd /opt/ov/ov_backend
sudo -u ov /home/ov/.local/bin/uv run --no-sync python scripts/crear_cuentas.py /home/ov/cuentas-prueba.csv --simular
sudo -u ov /home/ov/.local/bin/uv run --no-sync python scripts/crear_cuentas.py /home/ov/cuentas-prueba.csv
```

Las contraseñas generadas quedan en `<csv>.resultado.csv`; el script nunca las imprime. Un estudiante cuyo apoderado no está en el CSV ve en Familia «Tu apoderado aún no se ha registrado en la plataforma.»: para que tenga Familia aunque su apoderado no participe, se crea igual la cuenta del apoderado.

Con cuentas reales en la base, la recarga queda bloqueada ([README.md](README.md), 7.5): solo E99, A99 y O99 (las de comprobación, con nombre «Prueba») no cuentan como reales. Justo después se toma una instantánea de RDS (paso 2) y se borra el CSV de la EC2 (`shred -u /home/ov/cuentas-prueba.csv`): las contraseñas quedan solo como hash en la base.

## 5. Orden de ingreso

Los estudiantes ingresan conforme llegan a la sesión, sin esperar a que esté todo el salón para entrar juntos; los apoderados, unos minutos después. 50 ingresos a la vez pasan sin errores, pero tardan hasta 10 s cada uno con 2 núcleos; repartidos, menos de medio segundo. Si un ingreso pasa de 8 s, la pantalla pide esperar sin recargar.

## 6. Cuentas de prueba

Las contraseñas de estas cuentas están en el repositorio:

- las ocho de `ov_backend/datos/usuarios_prueba.txt`: `est-ana`, `est-luis`, `est-beto`, `est-mia`, `est-teo`, `est-sol`, `apo-rosa` y `ori-carmen`;
- los apoderados de prueba de `contenido` (`APODERADOS_PRUEBA` de `ov_backend/datos/contenido.py`): `apo-beto`, `apo-mia`, `apo-teo` y `apo-sol`;
- si la carga se hizo con ejemplos, los estudiantes y apoderados de ejemplo del panel (`CREDENCIALES` de `ov_backend/scripts/sembrar_panel_ejemplo.py`): `est-panel-1` a `est-panel-11` y `apo-panel-3` a `apo-panel-10`.

Por eso, en un despliegue con usuarios reales se desactivan antes de abrir el acceso, después del recorrido de comprobación. Desactivarlas no afecta a las cuentas de la sesión, que se crean en su propio salón (paso 4). Con psql y la `DATABASE_URL` del `.env`:

```sql
UPDATE cuenta SET activa = false WHERE codigo IN ('est-ana','est-luis','est-beto','est-mia','est-teo','est-sol','apo-rosa','ori-carmen','apo-beto','apo-mia','apo-teo','apo-sol');
```

Y, si la carga se hizo con ejemplos (todas sus cuentas comparten el prefijo `est-panel-` o `apo-panel-`):

```sql
UPDATE cuenta SET activa = false WHERE codigo LIKE 'est-panel-%' OR codigo LIKE 'apo-panel-%';
```

Se revierte con `activa = true`. Una recarga de contenidos las vuelve a crear activas, así que después de recargar se desactivan otra vez. En el recorrido de comprobación no se publican entrevistas: las Leyendas se arman con todo el colegio y se verían en el salón nuevo.

## 7. Durante la sesión

```bash
watch -n 2 'free -m; echo; ps -o pid,rss,pcpu,cmd -C uvicorn --sort=-rss | head -5'
```

```bash
sudo journalctl -kf | grep -iE --line-buffered 'out of memory|oom|killed process'
```

Señales de alarma: sin memoria disponible y la swap creciendo, un `Killed process … uvicorn` o un 502 en el navegador (nginx sin worker). Si aparecen, el siguiente grupo ingresa de a pocos. Una `t3` se queda sin créditos de CPU con carga sostenida: se revisa `CPUCreditBalance` en CloudWatch antes y después. Al terminar:

```bash
sudo journalctl -k --since '-4 hours' | grep -iE 'oom|killed process'
sudo journalctl -u ov-backend --since '-4 hours' | grep -iE 'error|exception|worker|timeout' | tail -50
```

## 8. Cambios durante la prueba con usuarios

- `datos/contenido.py` (reglas, ítems, fichas, batallas) queda **congelado**. Los JSON del front sí se pueden corregir: se publican con un push normal.
- Un cambio de reglas inevitable va como **migración de datos** de Alembic (`op.execute` / `op.bulk_insert` sobre las tablas de definición, nunca sobre las de estado) y se publica con un push normal. Después del despliegue, el reinicio rehace la caché de definiciones.
- Nunca se marca **recargar_contenido**; el candado lo rechazaría igual.
