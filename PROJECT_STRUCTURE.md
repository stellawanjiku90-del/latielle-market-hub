# Latielle Market Hub structure

```text
/
├── data/       Database schema and exported data/function definitions
├── public/     Static files and PWA assets
├── server/     Express API and database connection
├── src/        React application
├── package.json
├── package-lock.json
├── index.html
├── vite.config.js
└── configuration files
```

The production server serves both the Vite build and `/api/*`, so Render only needs one web service.
