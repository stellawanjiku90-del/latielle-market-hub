# Latielle Market Hub final deployment

## One Render Web Service
Build command:
`npm install && npm run build`

Start command:
`npm start`

## PostgreSQL
Create a Render PostgreSQL database, then run `data/schema.sql` using Render's database shell or any PostgreSQL client.

Set the Web Service environment variables:
- `NODE_ENV=production`
- `DATABASE_URL` = Render PostgreSQL connection URL
- `JWT_SECRET` = long random secret
- `CLIENT_URL` = your public app URL
- `VITE_API_URL` = leave blank for the single-service deployment (the frontend already calls `/api/*`)

The Express server serves both the built React application and `/api/*`, so one public URL is used.
