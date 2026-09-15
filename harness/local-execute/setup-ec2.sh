#!/usr/bin/env bash
# EC2 g5.4xlarge — one-time setup script
# Run once after first SSH login:
#   bash harness/local-execute/setup-ec2.sh
set -euo pipefail

echo "=== Harness EC2 Setup — g5.4xlarge (A10G) ==="

# ── 1. Docker ─────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo ">>> Installing Docker..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$(whoami)"
  echo ">>> Docker installed. NOTE: re-login or run: newgrp docker"
else
  echo ">>> Docker already installed: $(docker --version)"
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
  echo ">>> NVIDIA Container Toolkit installed."
else
  echo ">>> NVIDIA Container Toolkit already installed."
fi

# ── 3. Verify GPU ──────────────────────────────────────────────────────────────
echo ">>> GPU check:"
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader

# ── 4. Kernel tuning for GPU workloads ────────────────────────────────────────
echo ">>> Applying kernel tuning..."
sudo sysctl -w vm.swappiness=10
sudo sysctl -w vm.overcommit_memory=1
sudo sysctl -w kernel.perf_event_paranoid=-1

# ── 5. Create .env from example ───────────────────────────────────────────────
ENV_FILE="harness/local-execute/.env"
if [ ! -f "$ENV_FILE" ]; then
  cp harness/local-execute/.env.example "$ENV_FILE"
  # Switch to GPU profile
  sed -i 's/^OLLAMA_MODEL=qwen3.5:4b/# OLLAMA_MODEL=qwen3.5:4b/' "$ENV_FILE"
  sed -i 's/^# OLLAMA_MODEL=harness-coder/OLLAMA_MODEL=harness-coder/' "$ENV_FILE"
  echo ">>> Created $ENV_FILE with GPU profile (OLLAMA_MODEL=harness-coder)"
else
  echo ">>> $ENV_FILE already exists — skipped."
fi

# ── 6. Start Ollama ────────────────────────────────────────────────────────────
echo ">>> Starting Ollama container..."
docker compose -f harness/local-execute/docker-compose.dev.yml up -d ollama

echo ""
echo ">>> Waiting for Ollama to be healthy..."
until docker inspect harness-ollama --format '{{.State.Health.Status}}' 2>/dev/null | grep -q healthy; do
  printf "."
  sleep 5
done
echo " healthy!"

# ── 7. Pull model + create harness-coder ──────────────────────────────────────
echo ">>> Running model-init (pulling ~19 GB + creating harness-coder model)..."
echo ">>> This may take 20-40 minutes on first run."
docker compose -f harness/local-execute/docker-compose.dev.yml up model-init
docker compose -f harness/local-execute/docker-compose.dev.yml logs model-init | tail -5

# ── 8. Verify ─────────────────────────────────────────────────────────────────
echo ""
echo ">>> Available models:"
curl -s http://localhost:11434/api/tags \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>JSON.parse(d).models.forEach(m=>console.log(' -',m.name)))" \
  2>/dev/null || curl -s http://localhost:11434/api/tags

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Test with:"
echo "  node harness/local-execute/index.js <handoff-json>"
echo ""
echo "Manage Ollama:"
echo "  docker compose -f harness/local-execute/docker-compose.dev.yml ps"
echo "  docker compose -f harness/local-execute/docker-compose.dev.yml logs -f ollama"
echo "  docker stats harness-ollama"
