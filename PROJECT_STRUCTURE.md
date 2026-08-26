# Latielle Market Hub structure

```
/
├── data/       Backend/data files only; no subfolders
├── public/     Static files served by Vite; no subfolders
├── src/        React application source
├── package.json
├── package-lock.json
├── index.html
├── vite.config.js
└── configuration files
```

## Backend export
Files in `data/` are intentionally flattened for easy GitHub upload.
Their original Base44 paths are encoded using `__`.

Before deploying Base44 functions directly, restore each file to its path
described in `data/manifest.json`, because Base44 expects its conventional
directory structure for entities and functions.
