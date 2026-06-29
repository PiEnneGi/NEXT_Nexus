#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "[Nexus] Avvio server (porta 3001)..."
npm run dev -w server &
SERVER_PID=$!

echo "[Nexus] Avvio client (porta 5173)..."
npm run dev -w client &
CLIENT_PID=$!

trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit" INT TERM
echo "[Nexus] http://localhost:5173"
wait
