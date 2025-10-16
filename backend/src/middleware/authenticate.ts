/**
 * JWT authentication middleware and helpers.
 */

import { Request, Response, NextFunction } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { findUserById, User } from "../models/User";

const JWT_SECRET: string = process.env.JWT_SECRET || "chatweb-secret-change-in-production";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"] | undefined;

export interface AuthRequest extends Request {
  user?: User;
  userId?: string;
}

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
}

export const generateToken = (user: User): string => {
  const payload: TokenPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  const options: SignOptions = {};
  if (JWT_EXPIRES_IN !== undefined) {
    options.expiresIn = JWT_EXPIRES_IN;
  }
  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error("Token invalido o expirado");
  }
};

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "No se proporciono token de autenticacion" });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    const user = await findUserById(payload.userId);
    if (!user) {
      res.status(401).json({ error: "Usuario no encontrado" });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ error: "Usuario inactivo" });
      return;
    }

    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Autenticacion fallida";
    res.status(401).json({ error: message });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Se requiere rol de administrador" });
    return;
  }

  next();
};

export const requirePremium = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  if (req.user.role !== "premium" && req.user.role !== "admin") {
    res.status(403).json({ error: "Se requiere plan premium" });
    return;
  }

  next();
};
