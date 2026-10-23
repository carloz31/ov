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
| `../amplify.yml` | Build del front (monorepo, `appRoot: ov_frontend`, Node 22). |
| `amplify/reescrituras.json` | Reglas de Amplify: `/api` → EC2 y la regla SPA de react-router. |
| `ec2/instalar.sh` | Preparación única de la instancia. |
| `ec2/actualizar.sh` | Cada nueva versión: pull de `deploy`, `uv sync`, migraciones y reinicio. |
| `ec2/ov-backend.service` | Servicio systemd (uvicorn, 2 workers). |
| `ec2/nginx-ov.conf` | Proxy inverso de nginx hacia uvicorn. |
| `ec2/env.produccion.example` | Plantilla del `.env` de producción. |

Elige una sola región para todo (por ejemplo `us-east-1`).

## 1. Rama deploy

```bash
git checkout main && git pull
git checkout -b deploy   # o: git checkout deploy && git merge main
git push -u origin deploy
```

Para publicar una versión nueva: integra `main` en `deploy` y haz push. Amplify compila solo; la EC2 se actualiza con `actualizar.sh` (paso 6).

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
sudo -u ov bash -c 'cd /opt/ov/ov_backend && ~/.local/bin/uv run --no-sync alembic upgrade head && ~/.local/bin/uv run --no-sync python -m datos.cargar plataforma'
sudo systemctl start ov-backend
curl -s -o /dev/null -w "%{http_code}\n" https://3-91-20-15.sslip.io/docs   # 200
```

`datos.cargar plataforma` crea también los usuarios de `datos/usuarios_prueba.txt`. Sirven para la primera prueba; antes de abrirlo a estudiantes reales, cambia esas contraseñas o crea cuentas propias.

## 6. Amplify (front)

1. Amplify > Crear una aplicación > GitHub > repo `carloz31/ov`, rama **`deploy`**.
2. Marca **Mi aplicación es un monorepo** y escribe `ov_frontend` como directorio raíz. Amplify detecta el `amplify.yml` de la raíz.
3. Variables de entorno: `VITE_DATOS=api` y `VITE_API_URL=/api` (el build ya las usa por defecto, pero así quedan visibles).
4. Guardar e implementar.
5. Hosting > **Reescrituras y redireccionamientos** > Administrar > editor JSON: pega `amplify/reescrituras.json` con tu dominio en lugar de `IP-CON-GUIONES`. El orden importa: primero `/api`, luego la regla SPA.

Prueba: `https://deploy.XXXX.amplifyapp.com/api/openapi.json` debe devolver el JSON del backend, y en la app el ingreso con un usuario de prueba debe llevar al inicio según el rol.

## 7. Actualizar

```bash
# en tu máquina
git checkout deploy && git merge main && git push
# en la EC2
sudo bash /opt/ov/despliegue/ec2/actualizar.sh
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
