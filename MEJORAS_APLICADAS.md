# Cambios Aplicados (Octubre 2025)

## Backend
- Migrated sessions, command executions, messages, and attachments to PostgreSQL using the new `ChatHistory` model helpers.
- Added graceful rate limiting, input validation, and optional Telegram provider fallback without blocking startup.
- Replaced ad-hoc logging with ASCII-only messages and structured metadata.
- Refactored authentication middleware to use typed JWT helpers and removed stale dependencies.
- Added configuration helpers for database transactions and tightened TypeScript types across services and models.

## Frontend
- Implemented a React authentication context with dedicated hook, aligning with the backend JWT flow.
- Rebuilt the chat page to rely on authenticated user IDs, live WebSockets, and cleaned command catalog sections.
- Replaced the admin dashboard to consume the new statistics, user management, and configuration endpoints using strict typing.
- Normalised documentation, environment handling, and linted all React components.

## Tooling & Docs
- Sanitised repository secrets and refreshed `.env` defaults.
- Updated the root README, database setup guide, and auxiliary documents to plain ASCII with accurate instructions.
- Added consistent build/lint scripts across both workspaces.

