#!/usr/bin/env bash
cd "$(dirname "$0")"

# === Rilevamento automatico Node.js ===
# Supporto nvm (il più comune su macOS/Linux)
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Supporto fnm (alternativa moderna)
if ! command -v npm &>/dev/null; then
  FNM_PATH="$HOME/.local/share/fnm"
  [ -s "$FNM_PATH/fnm" ] && eval "$("$FNM_PATH/fnm" env)"
fi

# Supporto asdf
if ! command -v npm &>/dev/null; then
  [ -s "$HOME/.asdf/asdf.sh" ] && \. "$HOME/.asdf/asdf.sh"
fi

# Se ancora non trovato, mostra errore bloccante
if ! command -v npm &>/dev/null; then
  echo "================================================"
  echo "  [ERRORE] Node.js / npm non trovato."
  echo ""
  echo "  Scarica e installa Node.js da:"
  echo "  https://nodejs.org/"
  echo ""
  echo "  Oppure installa nvm:"
  echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash"
  echo "================================================"
  read -rp "Premi Invio per chiudere..."
  exit 1
fi

echo "[Nexus] Installazione dipendenze..."
npm install || { echo "[ERRORE] npm install fallito."; read -rp "Premi Invio per chiudere..."; exit 1; }

echo "[Nexus] Avvio server (porta 3001)..."
npm run dev -w server &
SERVER_PID=$!

echo "[Nexus] Avvio client (porta 5173)..."
npm run dev -w client &
CLIENT_PID=$!

cleanup() {
  kill "$SERVER_PID" "$CLIENT_PID" 2>/dev/null || true
  exit
}
trap cleanup INT TERM

echo "[Nexus] http://localhost:5173"
echo "[Nexus] Premi Ctrl+C per fermare tutto."
wait
