#!/usr/bin/env bash
cd "$(dirname "$0")"

# === Rilevamento automatico Node.js ===
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

if ! command -v npm &>/dev/null; then
  FNM_PATH="$HOME/.local/share/fnm"
  [ -s "$FNM_PATH/fnm" ] && eval "$("$FNM_PATH/fnm" env)"
fi

if ! command -v npm &>/dev/null; then
  [ -s "$HOME/.asdf/asdf.sh" ] && \. "$HOME/.asdf/asdf.sh"
fi

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

# === Verifica pdftoppm (poppler-utils) ===
if ! command -v pdftoppm &>/dev/null; then
  echo "╔══════════════════════════════════════════════════╗"
  echo "║  [AVVISO] pdftoppm non trovato                   ║"
  echo "║  I PDF scansionati (solo immagini)               ║"
  echo "║  non potranno essere elaborati.                  ║"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "║  Per fixare: brew install poppler                ║"
  else
    echo "║  Per fixare: sudo apt install poppler-utils      ║"
  fi
  echo "║  (premi Invio per continuare lo stesso)           ║"
  echo "╚══════════════════════════════════════════════════╝"
  read -r
fi

# === Verifica .env ===
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "╔══════════════════════════════════════════════════╗"
    echo "║  [OK] .env creato da .env.example                ║"
    echo "║  MODIFICA .env con la tua chiave Cerebras!      ║"
    echo "╚══════════════════════════════════════════════════╝"
  else
    echo "================================================"
    echo "  [ERRORE] .env e .env.example mancanti."
    echo "================================================"
    read -rp "Premi Invio per chiudere..."
    exit 1
  fi
fi

# === Installazione dipendenze ===
echo "[Nexus] Installazione dipendenze..."
npm install
if [ $? -ne 0 ]; then
  echo "[Nexus] npm install fallito. Tento rebuild moduli nativi..."
  npm rebuild
  if [ $? -ne 0 ]; then
    echo "[ERRORE] Installazione dipendenze fallita."
    read -rp "Premi Invio per chiudere..."
    exit 1
  fi
fi

# === Assicura moduli nativi compilati (sharp su macOS ARM) ===
if [[ "$OSTYPE" == "darwin"* ]]; then
  npm rebuild sharp 2>/dev/null || true
fi

# === Avvio server e client ===
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
