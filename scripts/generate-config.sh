#!/usr/bin/env bash
set -euo pipefail

# Gera js/config.js a partir de js/config.example.js usando a variável
# de ambiente SUPABASE_ANON_KEY. Saída: js/config.js

TEMPLATE="js/config.example.js"
OUT="js/config.js"

if [ ! -f "$TEMPLATE" ]; then
  echo "Template $TEMPLATE não encontrado. Execute a partir da raiz do projeto." >&2
  exit 1
fi

if [ -z "${SUPABASE_ANON_KEY:-}" ]; then
  echo "Variável SUPABASE_ANON_KEY não definida. Gerando arquivo com placeholder." >&2
  cp "$TEMPLATE" "$OUT"
  exit 0
fi

cp "$TEMPLATE" "$OUT"
sed -i "s/sua-anon-key/${SUPABASE_ANON_KEY//\//\/}/g" "$OUT"
echo "Gerado $OUT a partir de $TEMPLATE"
