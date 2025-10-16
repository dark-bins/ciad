-- ChatWeb Database Schema
-- PostgreSQL 12+

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'premium', 'admin')),
    plan VARCHAR(20) NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'BASIC', 'PREMIUM', 'GOLD', 'PLATINUM', 'ADMIN')),
    credits INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Tabla de sesiones de chat
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    provider_chat_id BIGINT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de mensajes (historial completo)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author VARCHAR(20) NOT NULL CHECK (author IN ('user', 'provider')),
    body TEXT,
    has_attachments BOOLEAN DEFAULT false,
    command_execution_id UUID REFERENCES command_executions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de adjuntos
CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    filename VARCHAR(255),
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de comandos ejecutados (auditoría y límites)
CREATE TABLE IF NOT EXISTS command_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
    command VARCHAR(100) NOT NULL,
    raw_input TEXT,
    arguments TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    credits_used INTEGER DEFAULT 1,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

-- Índices para optimización
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_active ON chat_sessions(is_active);
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_command_executions_user_id ON command_executions(user_id);
CREATE INDEX idx_command_executions_executed_at ON command_executions(executed_at);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para users
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insertar configuración inicial del sistema
INSERT INTO system_config (key, value, description) VALUES
    ('maintenance_mode', 'false', 'Activa/desactiva el modo mantenimiento'),
    ('queries_enabled', 'true', 'Permite o bloquea las consultas'),
    ('rate_limit_cooldown', '15', 'Cooldown entre comandos en segundos'),
    ('default_credits', '100', 'Créditos iniciales para nuevos usuarios'),
    ('free_plan_limit', '50', 'Límite de consultas para plan FREE')
ON CONFLICT (key) DO NOTHING;

-- Insertar usuario admin por defecto
-- Password: scrall123
INSERT INTO users (username, email, password_hash, role, plan, credits) VALUES
    ('scrall', 'scrall@ciad.local', '$2b$10$leKwaHQ9fzw1wpija/kVk.KqcmCou1ECtzDJiOzoUi5C2m7lGdmIO', 'admin', 'PLATINUM', 999999)
ON CONFLICT (username) DO NOTHING;

COMMENT ON TABLE users IS 'Usuarios del sistema con autenticación';
COMMENT ON TABLE chat_sessions IS 'Sesiones de chat activas y archivadas';
COMMENT ON TABLE messages IS 'Historial completo de mensajes';
COMMENT ON TABLE command_executions IS 'Auditoría de comandos ejecutados';
COMMENT ON TABLE system_config IS 'Configuración global del sistema';
