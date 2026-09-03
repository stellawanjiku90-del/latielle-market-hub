# Backend migration status

LATIELLE MARKET HUB now uses its self-hosted Express/PostgreSQL backend. Base44 runtime/plugin wiring has been removed from the production build.

The flattened files in `data/` are retained as project data/schema exports. They are not loaded as a Base44 runtime dependency.
