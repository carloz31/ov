#!/usr/bin/env bash
# Preparación única de una instancia EC2 Ubuntu 24.04 para el backend.
# Uso (como usuario ubuntu):
#   sudo bash instalar.sh <url-ssh-del-repo> <dominio-api> <correo-para-certbot>
# Ejemplo:
#   sudo bash instalar.sh git@github.com:carloz31/ov.git 3-91-20-15.sslip.io tu@correo.com
set -euo pipefail

REPO_URL="${1:?Falta la URL SSH del repositorio}"
DOMINIO_API="${2:?Falta el dominio de la API (p. ej. 3-91-20-15.sslip.io)}"
CORREO="${3:?Falta un correo para el certificado}"
RAMA="deploy"
DESTINO="/opt/ov"
AQUI="$(cd "$(dirname "$0")" && pwd)"

echo "==> Paquetes del sistema"
apt-get update -y
apt-get install -y git nginx certbot python3-certbot-nginx postgresql-client curl

echo "==> Usuario de servicio 'ov'"
id ov &>/dev/null || useradd --system --create-home --shell /bin/bash ov
mkdir -p "$DESTINO" && chown ov:ov "$DESTINO"

echo "==> Llave de despliegue (solo lectura) para GitHub"
if [ ! -f /home/ov/.ssh/id_ed25519 ]; then
  sudo -u ov mkdir -p /home/ov/.ssh
  sudo -u ov ssh-keygen -t ed25519 -N "" -f /home/ov/.ssh/id_ed25519 -C "ov-ec2-deploy"
  sudo -u ov bash -c 'ssh-keyscan github.com >> /home/ov/.ssh/known_hosts 2>/dev/null'
fi

echo "==> Código (rama $RAMA)"
if [ ! -d "$DESTINO/.git" ]; then
  if ! sudo -u ov git clone --branch "$RAMA" --single-branch "$REPO_URL" "$DESTINO"; then
    echo
    echo "No se pudo clonar. Agrega esta llave en GitHub > repo > Settings > Deploy keys (sin permiso de escritura):"
    echo
    cat /home/ov/.ssh/id_ed25519.pub
    echo
    echo "Luego vuelve a correr este script."
    exit 1
  fi
fi

echo "==> uv y dependencias del backend (Python lo instala uv según .python-version)"
sudo -u ov bash -c 'command -v ~/.local/bin/uv >/dev/null || curl -LsSf https://astral.sh/uv/install.sh | sh'
sudo -u ov bash -c "cd $DESTINO/ov_backend && ~/.local/bin/uv sync --frozen --no-dev --extra postgres"

if [ ! -f "$DESTINO/ov_backend/.env" ]; then
  cp "$AQUI/env.produccion.example" "$DESTINO/ov_backend/.env"
  chown ov:ov "$DESTINO/ov_backend/.env"
  chmod 600 "$DESTINO/ov_backend/.env"
  echo
  echo "Se creó $DESTINO/ov_backend/.env desde la plantilla."
  echo "Complétalo (DATABASE_URL de RDS y JWT_SECRETO) y vuelve a correr este script."
  exit 1
fi

echo "==> Servicio systemd"
cp "$AQUI/ov-backend.service" /etc/systemd/system/ov-backend.service
systemctl daemon-reload
systemctl enable ov-backend

echo "==> nginx"
sed "s/DOMINIO_API/$DOMINIO_API/" "$AQUI/nginx-ov.conf" > /etc/nginx/sites-available/ov
ln -sf /etc/nginx/sites-available/ov /etc/nginx/sites-enabled/ov
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> Certificado HTTPS (Let's Encrypt)"
certbot --nginx --non-interactive --agree-tos --redirect -m "$CORREO" -d "$DOMINIO_API"

echo
echo "Listo. Siguiente paso (una sola vez): migrar y cargar datos:"
echo "  sudo -u ov bash -c 'cd $DESTINO/ov_backend && ~/.local/bin/uv run --no-sync alembic upgrade head && ~/.local/bin/uv run --no-sync python -m datos.cargar ruta'"
echo "  sudo systemctl start ov-backend"
echo "Después, para cada actualización: sudo bash $DESTINO/despliegue/ec2/actualizar.sh"
