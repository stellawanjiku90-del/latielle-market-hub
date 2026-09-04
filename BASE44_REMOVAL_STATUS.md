# Backend migration status

LATIELLE MARKET HUB now uses its self-hosted Express/PostgreSQL backend. Base44 runtime/plugin wiring has been removed from the production build.

The `data/` directory now contains only the active PostgreSQL schema and its README. Legacy Base44 entity/function exports were removed from the deployment package.
