#!/usr/bin/env bash
# Builds the whole app into one self-contained dist/ folder:
#   dist/src              server source
#   dist/package.json     server package.json (has "type":"module" + "start" script)
#   dist/physics-engine   built shared package, as real files (no symlink)
#   dist/public            built client static assets
#
# dist/ has no node_modules — run `npm install --omit=dev` inside it on the
# target machine (see deploy.sh), which also ensures native deps like
# better-sqlite3 get built for the target's OS/arch instead of the build
# machine's.

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Building shared"
npm ci --prefix shared
npm run build --prefix shared

echo "==> Building client"
npm ci --prefix client
npm run build --prefix client

echo "==> Assembling dist/"
rm -rf dist
mkdir -p dist
cp -r server/src dist/src

# Vendor the built shared package as a plain top-level folder (not a symlink,
# not under node_modules) so dist/ is portable on its own — the target
# machine has no ../shared to link against.
mkdir -p dist/physics-engine
cp -r shared/dist dist/physics-engine/dist
cp shared/package.json dist/physics-engine/package.json

# A minimal package.json instead of copying server's: dist/ has no ../shared
# to build against, so build:shared/dev/test scripts wouldn't work standalone.
# The @polygon-pong/shared dependency is repointed at dist/physics-engine.
# NODE_ENV=production is baked into "start" so it can't be forgotten — the
# server only serves the built client (dist/public) in production mode.
node -e "
const pkg = JSON.parse(require('fs').readFileSync('server/package.json', 'utf8'))
const distPkg = {
  name: pkg.name,
  version: pkg.version,
  private: true,
  type: pkg.type,
  scripts: {
    start: 'NODE_ENV=production node --env-file-if-exists=../.env src/index.js',
  },
  dependencies: {
    ...pkg.dependencies,
    '@polygon-pong/shared': 'file:./physics-engine',
  },
}
require('fs').writeFileSync('dist/package.json', JSON.stringify(distPkg, null, 2) + '\n')
"

mkdir -p dist/public
cp -r client/dist/. dist/public/

echo "==> Done. dist/ is ready to deploy."
echo "    Copy dist/ to the server, add a .env file (see server/.env.example) at dist/.env,"
echo "    then run: cd dist && npm install --omit=dev && NODE_ENV=production npm start"
