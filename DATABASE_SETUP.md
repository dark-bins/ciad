# PostgreSQL Setup Guide

## 1. Install PostgreSQL

### Windows
1. Download the installer from https://www.postgresql.org/download/windows/
2. Run the installer and keep the default port (5432) unless you need a custom one.
3. Create the `postgres` superuser password when prompted.

### Docker (quick start)
```bash
docker run --name chatweb-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=chatweb \
  -p 5432:5432 \
  -d postgres:15
```

## 2. Create the database

### Using `psql`
```bash
psql -U postgres
CREATE DATABASE chatweb;
\q
```

### Using pgAdmin
1. Open pgAdmin and connect to your server.
2. Right-click **Databases** ? **Create** ? **Database**.
3. Enter `chatweb` and click **Save**.

## 3. Apply the schema

```bash
psql -U postgres -d chatweb -f backend/database/schema.sql
```

This script creates all tables and inserts the default admin user (`admin` / `admin123`). Change the password as soon as the system is running.

## 4. Verify the installation

```bash
psql -U postgres -d chatweb
\dt
```
You should see tables such as `users`, `chat_sessions`, `messages`, `command_executions`, and `system_config`.

## Troubleshooting

- **database chatweb does not exist**: run `createdb -U postgres chatweb`.
- **role postgres does not exist**: use the user created during PostgreSQL installation.
- **connection refused**: ensure the PostgreSQL service (or Docker container) is running and listening on port 5432.

