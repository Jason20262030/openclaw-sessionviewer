#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="4588"
OPENCLAW_DIR="${OPENCLAW_DIR:-$SCRIPT_DIR/../.openclaw}"

is_port_free() {
  local target_port="$1"
  node -e '
    const net = require("net");
    const port = Number(process.argv[1]);
    const server = net.createServer();
    server.once("error", () => process.exit(1));
    server.once("listening", () => server.close(() => process.exit(0)));
    server.listen(port, "0.0.0.0");
  ' "$target_port"
}

kill_port_owners() {
  local target_port="$1"
  local pids=""

  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -tiTCP:"$target_port" -sTCP:LISTEN 2>/dev/null || true)"
  elif command -v fuser >/dev/null 2>&1; then
    pids="$(fuser -n tcp "$target_port" 2>/dev/null || true)"
  fi

  if [[ -z "$pids" ]]; then
    return 1
  fi

  echo "[sessionviewer] 端口 $target_port 已被占用，尝试停止占用进程: $pids"
  kill $pids 2>/dev/null || true
  sleep 1

  if is_port_free "$target_port"; then
    return 0
  fi

  echo "[sessionviewer] 常规停止失败，尝试强制停止: $pids"
  kill -9 $pids 2>/dev/null || true
  sleep 1
  is_port_free "$target_port"
}

if ! is_port_free "$PORT"; then
  if ! kill_port_owners "$PORT"; then
    echo "[sessionviewer] 无法释放端口 $PORT，请手动处理后重试。"
    exit 1
  fi
fi

echo "[sessionviewer] PORT=$PORT"
echo "[sessionviewer] OPENCLAW_DIR=$OPENCLAW_DIR"

PORT="$PORT" OPENCLAW_DIR="$OPENCLAW_DIR" npm start
