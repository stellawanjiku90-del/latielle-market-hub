# Latielle Market Hub

React + Vite marketplace application.

## Project layout

- `src/` — frontend source code
- `public/` — static browser assets
- `data/` — flat backend/data export, with no subfolders
- root files — npm, Vite, Tailwind, and deployment configuration

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Render

Use a Static Site:

- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Root Directory: leave blank

Do not expose payment or SMS secrets as `VITE_` variables.
