#!/usr/bin/env bash
# Trae lo último de la rama deploy, sincroniza dependencias, migra y reinicia.
# Uso: sudo bash /opt/ov/despliegue/ec2/actualizar.sh
# No recarga datos: para eso, a mano, `uv run python -m datos.cargar plataforma` (con --vaciar borra el estado).
set -euo pipefail

DESTINO="/opt/ov"
UV="/home/ov/.local/bin/uv"

sudo -u ov git -C "$DESTINO" fetch origin deploy
sudo -u ov git -C "$DESTINO" reset --hard origin/deploy
sudo -u ov bash -c "cd $DESTINO/ov_backend && $UV sync --frozen --no-dev --extra postgres && $UV run --no-sync alembic upgrade head"
cp "$DESTINO/despliegue/ec2/ov-backend.service" /etc/systemd/system/ov-backend.service
systemctl daemon-reload
systemctl restart ov-backend
sleep 2
systemctl --no-pager --lines=5 status ov-backend
curl -fsS -o /dev/null -w "API local: HTTP %{http_code}\n" http://127.0.0.1:8000/docs
