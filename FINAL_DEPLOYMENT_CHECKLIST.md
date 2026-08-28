# Latielle Market Hub - Final Deployment Checklist

This package does not contain real secrets.

## Render
Build command:
`npm install && npm run build`

Start command:
`npm start`

Add the real values for every variable listed in `.env.example` under Render Environment.

Required for the server to start:
- DATABASE_URL
- JWT_SECRET

The PostgreSQL database must also have the schema from `data/schema.sql` applied before authentication and marketplace APIs can work.

## Important
Do not commit a real `.env` file to GitHub. Keep secrets only in Render environment variables.
