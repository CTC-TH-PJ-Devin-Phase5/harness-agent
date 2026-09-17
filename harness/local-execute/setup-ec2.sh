#!/usr/bin/env bash
# EC2 g5.4xlarge — one-time setup script
# Run once after first SSH login:
#   bash harness/local-execute/setup-ec2.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE="$SCRIPT_DIR/docker-compose.dev.yml"

echo "=== Harness EC2 Setup — g5.4xlarge (A10G) ==="

# ── 1. Docker ─────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo ">>> Installing Docker..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$(whoami)"
  # Apply group without re-login
  exec sg docker "$0 $*"
else
  echo ">>> Docker: $(docker --version)"
fi

# ── 2. NVIDIA Container Toolkit ───────────────────────────────────────────────
if ! dpkg -l 2>/dev/null | grep -q nvidia-container-toolkit; then
  echo ">>> Installing NVIDIA Container Toolkit..."
  curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
    | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
  curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \
    | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
    | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
  sudo apt-get update -qq
  sudo apt-get install -y nvidia-container-toolkit
  sudo nvidia-ctk runtime configure --runtime=docker
  sudo systemctl restart docker
else
  echo ">>> NVIDIA Container Toolkit: already installed"
fi

# ── 3. Verify GPU ──────────────────────────────────────────────────────────────
echo ">>> GPU:"
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader

# ── 4. Mount NVMe SSD → /data/ollama ─────────────────────────────────────────
NVME_DEVICE=""
for dev in /dev/nvme1n1 /dev/nvme2n1 /dev/sdb; do
  if [ -b "$dev" ] && ! grep -q "$dev" /proc/mounts; then
    NVME_DEVICE="$dev"
    break
  fi
done

if mountpoint -q /data/ollama; then
  echo ">>> /data/ollama already mounted ($(df -h /data/ollama | tail -1 | awk '{print $2}'))"
elif [ -n "$NVME_DEVICE" ]; then
  echo ">>> Formatting and mounting $NVME_DEVICE → /data/ollama..."
  sudo mkfs -t xfs "$NVME_DEVICE"
  sudo mkdir -p /data/ollama
  sudo mount "$NVME_DEVICE" /data/ollama
  sudo chown -R "$(whoami)":"$(whoami)" /data/ollama
  echo ">>> Mounted: $(df -h /data/ollama | tail -1 | awk '{print $2}') available"
else
  echo "ERROR: No unmounted NVMe device found. Check with: lsblk"
  exit 1
fi

# ── 5. Kernel tuning ──────────────────────────────────────────────────────────
echo ">>> Kernel tuning..."
sudo sysctl -w vm.swappiness=10
sudo sysctl -w vm.overcommit_memory=1
sudo sysctl -w kernel.perf_event_paranoid=-1

# ── 6. Tear down any existing harness containers ──────────────────────────────
echo ">>> Cleaning up old harness containers..."
docker compose -f "$COMPOSE" down --remove-orphans 2>/dev/null || true

# ── 7. Create .env with GPU profile ───────────────────────────────────────────
ENV_FILE="$SCRIPT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"
  sed -i 's/^OLLAMA_MODEL=qwen3.5:4b/# OLLAMA_MODEL=qwen3.5:4b/' "$ENV_FILE"
  sed -i 's/^# OLLAMA_MODEL=harness-coder/OLLAMA_MODEL=harness-coder/' "$ENV_FILE"
  echo ">>> Created $ENV_FILE (OLLAMA_MODEL=harness-coder)"
else
  echo ">>> $ENV_FILE already exists"
fi

# ── 8. Start Ollama ────────────────────────────────────────────────────────────
echo ">>> Starting Ollama container..."
docker compose -f "$COMPOSE" up -d ollama

echo ">>> Waiting for Ollama to be healthy..."
until docker inspect harness-ollama --format '{{.State.Health.Status}}' 2>/dev/null | grep -q "^healthy$"; do
  printf "."
  sleep 5
done
echo " ready!"

# ── 9. Pull model + create harness-coder ──────────────────────────────────────
echo ""
echo ">>> Pulling qwen3:32b (~20 GB) and creating harness-coder model..."
echo ">>> This takes 20-40 minutes on first run. Logs below:"
echo ""
docker compose -f "$COMPOSE" up model-init

# ── 10. Verify ────────────────────────────────────────────────────────────────
echo ""
echo ">>> Available models:"
curl -s http://localhost:11434/api/tags \
  | python3 -c "import sys,json; [print(' -', m['name']) for m in json.load(sys.stdin)['models']]"

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Usage:"
echo "  node $REPO_ROOT/harness/local-execute/index.js <handoff-json>"
echo ""
echo "Manage:"
echo "  docker compose -f $COMPOSE ps"
echo "  docker compose -f $COMPOSE logs -f ollama"
echo "  docker stats harness-ollama"
