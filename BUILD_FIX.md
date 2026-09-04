# Render build

Use the build command that matches the current dependency manifest:

`npm install --include=dev --no-audit --no-fund && npm run build`

The repository intentionally does not carry a stale package-lock.json. Render generates a fresh lock during `npm install`, avoiding the previous `npm ci` package-sync failure.
