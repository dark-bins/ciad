import { getProviderCommand } from "../config/commandMappings";

/**
 * Mapea un comando de usuario al comando del proveedor
 *
 * Ejemplo:
 *   Input:  "/dnif 12345678"
 *   Output: "/dnixx 12345678"  (el proveedor usa "dnixx")
 */
export const mapCommandToProviderRaw = async (input: string): Promise<string> => {
  const parts = input.trim().split(/\s+/);
  const userCommand = parts[0];

  if (!userCommand) {
    return input;
  }

  // Obtener comando mapeado desde configuración local
  const providerCommand = getProviderCommand(userCommand);

  // Si el comando es diferente, reemplazarlo
  if (providerCommand !== userCommand) {
    parts[0] = providerCommand;
    return parts.join(" ");
  }

  return input;
};
