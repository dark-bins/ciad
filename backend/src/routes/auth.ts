/**
 * Rutas de autenticación (login, register, logout)
 */

import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import {
  createUser,
  findUserByUsername,
  findUserByEmail,
  verifyPassword,
  updateLastLogin,
} from "../models/User";
import { generateToken, authenticate, AuthRequest } from "../middleware/authenticate";

const router = Router();

/**
 * POST /api/auth/register
 * ⚠️ DESACTIVADO PARA BETA CERRADA
 * Los usuarios deben ser creados por el administrador
 */
router.post(
  "/register",
  [
    body("username")
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage("El username debe tener entre 3 y 50 caracteres")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage("El username solo puede contener letras, números y guiones bajos"),
    body("email").isEmail().withMessage("Email inválido"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("La contraseña debe tener al menos 6 caracteres"),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { username, email, password } = req.body;

      // Verificar si el usuario ya existe
      const existingUser = await findUserByUsername(username);
      if (existingUser) {
        res.status(409).json({ error: "El username ya está en uso" });
        return;
      }

      const existingEmail = await findUserByEmail(email);
      if (existingEmail) {
        res.status(409).json({ error: "El email ya está registrado" });
        return;
      }

      // Crear usuario
      const user = await createUser({
        username,
        email,
        password,
        role: "user",
        plan: "FREE",
        credits: 100,
      });

      // Generar token
      const token = generateToken(user);

      res.status(201).json({
        message: "Usuario registrado exitosamente",
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          plan: user.plan,
          credits: user.credits,
        },
      });
    } catch (error: any) {
      console.error("Error en registro:", error);
      res.status(500).json({ error: "Error al registrar usuario" });
    }
  }
);

/**
 * POST /api/auth/login
 * Inicia sesión
 */
router.post(
  "/login",
  [
    body("username").trim().notEmpty().withMessage("Username requerido"),
    body("password").notEmpty().withMessage("Contraseña requerida"),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { username, password } = req.body;

      // Buscar usuario
      const user = await findUserByUsername(username);
      if (!user) {
        res.status(401).json({ error: "Credenciales inválidas" });
        return;
      }

      // Verificar contraseña
      const isValidPassword = await verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        res.status(401).json({ error: "Credenciales inválidas" });
        return;
      }

      // Verificar si el usuario está activo
      if (!user.is_active) {
        res.status(403).json({ error: "Usuario inactivo. Contacta al administrador." });
        return;
      }

      // Actualizar último login
      await updateLastLogin(user.id);

      // Generar token
      const token = generateToken(user);

      res.json({
        message: "Login exitoso",
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          plan: user.plan,
          credits: user.credits,
        },
      });
    } catch (error: any) {
      console.error("Error en login:", error);
      res.status(500).json({ error: "Error al iniciar sesión" });
    }
  }
);

/**
 * GET /api/auth/me
 * Obtiene información del usuario actual
 */
router.get("/me", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        plan: req.user.plan,
        credits: req.user.credits,
        created_at: req.user.created_at,
        last_login: req.user.last_login,
      },
    });
  } catch (error: any) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({ error: "Error al obtener información del usuario" });
  }
});

/**
 * POST /api/auth/logout
 * Cierra sesión (en el cliente se debe eliminar el token)
 */
router.post("/logout", authenticate, (req: Request, res: Response): void => {
  // El logout es principalmente del lado del cliente (eliminar token)
  res.json({ message: "Logout exitoso" });
});

export default router;
