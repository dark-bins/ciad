# ChatWeb

ChatWeb is a full-stack platform that exposes a command driven chat interface backed by a Telegram provider and a PostgreSQL database. The project is split into two workspaces:

- `backend/`: Express + TypeScript API with JWT authentication, admin routes, real-time socket notifications, and PostgreSQL persistence.
- `frontend/`: React + Vite single page app that provides login/registration, the command chat UI, and an admin dashboard.

## Features

- User authentication with JWT (login, register, logout).
- Real-time command execution via WebSocket updates.
- Rate limiting, command validation, and Telegram provider integration.
- PostgreSQL persistence for users, chat sessions, command executions, messages, and attachments.
- Admin dashboard with statistics, user management, and configuration toggles.

## Requirements

- Node.js 18+
- PostgreSQL 12+
- npm 9+ (or another package manager)

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env  # update the placeholders with your values
npm run build
npm run dev            # or npm start after building
```

Environment variables (`backend/.env`):

```
PORT=4000
CORS_ORIGIN=http://localhost:5173
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chatweb
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=change-this-secret-in-production
JWT_EXPIRES_IN=7d
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION_STRING=your_session_string
TELEGRAM_BOT_CHAT_ID=your_bot_chat_id
```

### Database

Apply the schema contained in `backend/database/schema.sql`:

```bash
psql -U postgres -f backend/database/schema.sql
```

The script creates all required tables and seeds the default admin account (`admin` / `admin123`). Update that password before going to production.

## Frontend Setup

```bash
cd frontend
npm install
npm run lint
npm run build
npm run dev    # development server at http://localhost:5173
```

The frontend expects the backend to be available at `http://localhost:4000`. Configure alternative URLs through `frontend/.env` using `VITE_API_BASE_URL` and `VITE_SOCKET_URL`.

## Running the stack

1. Start PostgreSQL and ensure the schema is loaded.
2. Launch the backend: `npm run dev` inside `backend/`.
3. Launch the frontend: `npm run dev` inside `frontend/`.
4. Visit `http://localhost:5173` and log in with the seeded admin account or register a new user.

## Code Quality

- Backend: `npm run build`
- Frontend: `npm run lint` and `npm run build`

## Telegram Integration

The Telegram provider expects valid credentials and an existing session string. Without them the backend logs a warning and continues working with the mock provider so that the chat remains usable.

## Folder Structure

```
chatweb/
  backend/
    src/
      config/
      models/
      providers/
      routes/
      services/
      websocket/
      types/
  frontend/
    src/
      api/
      components/
      context/
      hooks/
      pages/
      types.ts
```

## Security Notes

- Replace the placeholder values in `.env` and rotate any previously committed secrets.
- Run the backend behind HTTPS and configure proper CORS origins before deploying.
- Update the default admin credentials immediately after installation.

