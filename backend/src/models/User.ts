/**
 * User model helpers.
 */

import bcrypt from "bcrypt";
import { query } from "../config/database";

export type UserRole = "user" | "premium" | "admin";
export type UserPlan = "FREE" | "BASIC" | "PREMIUM" | "GOLD" | "PLATINUM" | "ADMIN";

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  plan: UserPlan;
  credits: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
}

export interface UserCreateData {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
  plan?: UserPlan;
  credits?: number;
}

export interface UserUpdateData {
  email?: string;
  role?: UserRole;
  plan?: UserPlan;
  credits?: number;
  is_active?: boolean;
}

const SALT_ROUNDS = 10;

export const createUser = async (data: UserCreateData): Promise<User> => {
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  // Generate a random hex ID for SQLite compatibility
  const userId = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  ).join('').toUpperCase();

  const result = await query<User>(
    `INSERT INTO users (id, username, email, password_hash, role, plan, credits)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      userId,
      data.username,
      data.email,
      passwordHash,
      data.role ?? "user",
      data.plan ?? "FREE",
      data.credits ?? 100,
    ],
  );

  const created = result[0];
  if (!created) {
    throw new Error("No se pudo crear el usuario");
  }
  return created;
};

export const findUserById = async (id: string): Promise<User | null> => {
  const result = await query<User>("SELECT * FROM users WHERE id = $1", [id]);
  return result[0] ?? null;
};

export const findUserByUsername = async (username: string): Promise<User | null> => {
  const result = await query<User>("SELECT * FROM users WHERE username = $1", [username]);
  return result[0] ?? null;
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await query<User>("SELECT * FROM users WHERE email = $1", [email]);
  return result[0] ?? null;
};

export const verifyPassword = async (plainPassword: string, passwordHash: string): Promise<boolean> => {
  return bcrypt.compare(plainPassword, passwordHash);
};

export const updateLastLogin = async (userId: string): Promise<void> => {
  await query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [userId]);
};

export const updateUser = async (userId: string, data: UserUpdateData): Promise<User> => {
  // Verificar que el usuario existe primero
  const existingUser = await findUserById(userId);
  if (!existingUser) {
    throw new Error(`Usuario con ID ${userId} no encontrado`);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (data.email !== undefined) {
    fields.push(`email = $${index++}`);
    values.push(data.email);
  }
  if (data.role !== undefined) {
    fields.push(`role = $${index++}`);
    values.push(data.role);
  }
  if (data.plan !== undefined) {
    fields.push(`plan = $${index++}`);
    values.push(data.plan);
  }
  if (data.credits !== undefined) {
    fields.push(`credits = $${index++}`);
    values.push(data.credits);
  }
  if (data.is_active !== undefined) {
    fields.push(`is_active = $${index++}`);
    values.push(data.is_active ? 1 : 0);
  }

  if (fields.length === 0) {
    throw new Error("No hay campos para actualizar");
  }

  // Add updated_at timestamp
  fields.push(`updated_at = $${index++}`);
  values.push(new Date().toISOString());

  values.push(userId);

  // Execute UPDATE
  await query(
    `UPDATE users SET ${fields.join(", ")} WHERE id = $${index}`,
    values,
  );

  // Fetch updated user
  const updated = await findUserById(userId);
  if (!updated) {
    throw new Error("Usuario no encontrado después de actualización");
  }
  return updated;
};

export const getAllUsers = async (): Promise<User[]> => {
  return query<User>("SELECT * FROM users ORDER BY created_at DESC");
};

export const deleteUser = async (userId: string): Promise<void> => {
  await query("DELETE FROM users WHERE id = $1", [userId]);
};

export const deductCredits = async (userId: string, amount: number): Promise<number> => {
  const result = await query<{ credits: number }>(
    `UPDATE users
       SET credits = MAX(credits - $1, 0)
     WHERE id = $2
     RETURNING credits`,
    [amount, userId],
  );

  const record = result[0];
  if (!record) {
    throw new Error("Usuario no encontrado al descontar creditos");
  }
  return record.credits;
};

export const addCredits = async (userId: string, amount: number): Promise<number> => {
  const result = await query<{ credits: number }>(
    `UPDATE users
       SET credits = credits + $1
     WHERE id = $2
     RETURNING credits`,
    [amount, userId],
  );

  const record = result[0];
  if (!record) {
    throw new Error("Usuario no encontrado al agregar creditos");
  }
  return record.credits;
};

export const getUserStats = async () => {
  const result = await query<{
    total_users: number;
    admin_count: number;
    premium_count: number;
    active_users: number;
    active_24h: number;
  }>(
    `SELECT
       COUNT(*) as total_users,
       COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
       COUNT(CASE WHEN role = 'premium' THEN 1 END) as premium_count,
       COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
       COUNT(CASE WHEN last_login > NOW() - INTERVAL '24 hours' THEN 1 END) as active_24h
     FROM users`,
  );

  return result[0] ?? {
    total_users: 0,
    admin_count: 0,
    premium_count: 0,
    active_users: 0,
    active_24h: 0,
  };
};
