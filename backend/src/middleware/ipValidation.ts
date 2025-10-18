import { Request, Response, NextFunction } from "express";
import { query } from "../config/database-postgres";
import { logger } from "../config/logger";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

export const validateSingleIP = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next();
    }

    // Get client IP
    const clientIP =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (req.headers["x-real-ip"] as string) ||
      req.socket.remoteAddress ||
      "unknown";

    // Get user's last known IP from database
    const result = await query<{ last_ip: string | null }>(
      "SELECT last_ip FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.length === 0) {
      return next();
    }

    const lastIP = result[0].last_ip;

    // If this is the first login or IP hasn't changed, update and continue
    if (!lastIP || lastIP === clientIP) {
      await query(
        "UPDATE users SET last_ip = $1 WHERE id = $2",
        [clientIP, req.user.id]
      );
      return next();
    }

    // IP has changed - force logout
    logger.warn(`IP change detected for user ${req.user.username}: ${lastIP} -> ${clientIP}`);

    // Update to new IP
    await query(
      "UPDATE users SET last_ip = $1 WHERE id = $2",
      [clientIP, req.user.id]
    );

    res.status(401).json({
      error: "session_expired",
      message: "Tu sesión ha expirado porque se detectó un inicio de sesión desde otra ubicación."
    });
  } catch (error) {
    logger.error("Error validating IP", { error });
    next();
  }
};
