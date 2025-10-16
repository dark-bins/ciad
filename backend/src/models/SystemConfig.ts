/**
 * Modelo de configuración del sistema
 */

import { query } from "../config/database";

export interface SystemConfigItem {
  key: string;
  value: string;
  description: string | null;
  updated_at: Date;
  updated_by: string | null;
}

/**
 * Obtiene un valor de configuración
 */
export const getConfig = async (key: string): Promise<string | null> => {
  const result = await query<SystemConfigItem>(
    "SELECT value FROM system_config WHERE key = $1",
    [key]
  );
  return result[0]?.value || null;
};

/**
 * Obtiene un valor de configuración como boolean
 */
export const getConfigBoolean = async (key: string): Promise<boolean> => {
  const value = await getConfig(key);
  return value === "true";
};

/**
 * Obtiene un valor de configuración como número
 */
export const getConfigNumber = async (key: string): Promise<number | null> => {
  const value = await getConfig(key);
  return value ? parseInt(value, 10) : null;
};

/**
 * Establece un valor de configuración
 */
export const setConfig = async (
  key: string,
  value: string,
  updatedBy?: string
): Promise<void> => {
  await query(
    `INSERT INTO system_config (key, value, updated_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP`,
    [key, value, updatedBy || null]
  );
};

/**
 * Obtiene toda la configuración
 */
export const getAllConfig = async (): Promise<SystemConfigItem[]> => {
  return query<SystemConfigItem>("SELECT * FROM system_config ORDER BY key");
};

/**
 * Actualiza múltiples configuraciones
 */
export const updateMultipleConfig = async (
  configs: Record<string, string>,
  updatedBy?: string
): Promise<void> => {
  for (const [key, value] of Object.entries(configs)) {
    await setConfig(key, value, updatedBy);
  }
};

/**
 * Verifica si las consultas están habilitadas
 */
export const areQueriesEnabled = async (): Promise<boolean> => {
  return getConfigBoolean("queries_enabled");
};

/**
 * Verifica si está en modo mantenimiento
 */
export const isMaintenanceMode = async (): Promise<boolean> => {
  return getConfigBoolean("maintenance_mode");
};
