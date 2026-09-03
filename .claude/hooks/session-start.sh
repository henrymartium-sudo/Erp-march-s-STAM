#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# prisma.config.ts lit DATABASE_URL au chargement, y compris pour `prisma generate`
# (postinstall). Si la variable n'est pas déjà fournie par l'environnement, on
# utilise une valeur factice : `prisma generate` ne se connecte pas à une base,
# il compile seulement le schéma en client Prisma.
export DATABASE_URL="${DATABASE_URL:-postgresql://ci:ci@localhost:5432/ci?schema=public}"

npm install
