/**
 * Mapeo de comandos de ChatWeb a comandos del proveedor de Telegram
 *
 * Algunos comandos pueden tener nombres diferentes en el bot proveedor,
 * este archivo permite mapearlos correctamente.
 */

export interface CommandMapping {
  /** Comando que usa el proveedor (ej: "dnixx" para el proveedor) */
  providerCmd?: string;
  /** Descripción del comando */
  description?: string;
  /** Formato esperado de argumentos */
  argsFormat?: string;
  /** Provider ID: telegram (Search Data) or aurora (Private Data) */
  provider?: string;
  /** Validación de argumentos */
  validation?: {
    minArgs?: number;
    maxArgs?: number;
    pattern?: RegExp;
  };
}

export type CommandMappings = Record<string, CommandMapping>;

/**
 * Configuración de mapeo de comandos
 *
 * Basado en la configuración del bot datenshidox
 * @see datenshidox/config/commands.py
 */
export const COMMAND_MAPPINGS: CommandMappings = {
  // ===== RENIEC =====
  "/dni": {
    providerCmd: "/dni",
    description: "Consulta RENIEC nivel 1 - Foto + datos",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/dnif": {
    providerCmd: "/dnif",
    description: "Consulta RENIEC nivel 3 - Foto + firma + huellas",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/nm": {
    providerCmd: "/nm",
    description: "Consulta de nombres",
    argsFormat: "NOMBRE|APELLIDO1|APELLIDO2",
    validation: {
      minArgs: 1,
    },
  },
  "/dnivaz": {
    providerCmd: "/dnivaz",
    description: "DNI digital azul",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },

  // ===== TELEFONÍA =====
  "/tel": {
    providerCmd: "/tel",
    description: "Consulta OPSITEL (DNI o teléfono)",
    argsFormat: "DNI (8 dígitos) o Número (9 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8,9}$/,
    },
  },
  "/cel": {
    providerCmd: "/celx",
    description: "Consulta titular por número o DNI",
    argsFormat: "DNI (8 dígitos) o Número telefónico (9 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8,9}$/,
    },
  },
  "/osipdb": {
    providerCmd: "/osipdb",
    description: "OSIPTEL database",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/bitel": {
    providerCmd: "/bitel",
    description: "Consulta titular Bitel",
    argsFormat: "Número telefónico (9 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{9}$/,
    },
  },
  "/c4a": {
    providerCmd: "/c4a",
    description: "Ficha C4 azul PDF",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/c4b": {
    providerCmd: "/c4b",
    description: "Ficha C4 blanca PDF",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/c4c": {
    providerCmd: "/c4c",
    description: "Ficha RENIEC v2",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/c4i": {
    providerCmd: "/c4i",
    description: "Certificado electrónico RENIEC",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/dniv": {
    providerCmd: "/dniv",
    description: "DNI digital azul o amarillo ambas caras",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },

  // ===== ANTECEDENTES =====
  "/antpe": {
    providerCmd: "/antpe",
    description: "Antecedentes penales PDF",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/antpo": {
    providerCmd: "/antpo",
    description: "Antecedentes policiales PDF",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/antpj": {
    providerCmd: "/antpj",
    description: "Antecedentes judiciales PDF",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/rq": {
    providerCmd: "/rq",
    description: "Consulta de requisitorias",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/ant": {
    providerCmd: "/ant",
    description: "Consulta de antecedentes",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/antpev": {
    providerCmd: "/antpev",
    description: "Verificador antecedentes penales",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/antpov": {
    providerCmd: "/antpov",
    description: "Verificador antecedentes policiales",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/denuncias": {
    providerCmd: "/denuncias",
    description: "Denuncias asociadas al DNI en PDF",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/antpen": {
    providerCmd: "/antpen",
    description: "Antecedentes penales PDF",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/antpol": {
    providerCmd: "/antpol",
    description: "Antecedentes policiales PDF",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/antjud": {
    providerCmd: "/antjud",
    description: "Antecedentes judiciales PDF",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },

  // ===== VEHÍCULOS =====
  "/tive": {
    providerCmd: "/tive",
    description: "Tarjeta vehicular PDF",
    argsFormat: "Placa vehicular",
    validation: {
      minArgs: 1,
      maxArgs: 1,
    },
  },
  "/tivep": {
    providerCmd: "/tivep",
    description: "Tarjeta vehicular premium PDF",
    argsFormat: "Placa vehicular",
    validation: {
      minArgs: 1,
      maxArgs: 1,
    },
  },
  "/placa": {
    providerCmd: "/placa",
    description: "Información placa en texto",
    argsFormat: "Placa vehicular",
    validation: {
      minArgs: 1,
      maxArgs: 1,
    },
  },
  "/placab": {
    providerCmd: "/placab",
    description: "Movimientos de placa",
    argsFormat: "Placa vehicular",
    validation: {
      minArgs: 1,
      maxArgs: 1,
    },
  },
  "/placabpdf": {
    providerCmd: "/placabpdf",
    description: "Movimientos de placa en PDF",
    argsFormat: "Placa vehicular",
    validation: {
      minArgs: 1,
      maxArgs: 1,
    },
  },
  "/movplaca": {
    providerCmd: "/movplaca",
    description: "Historial completo de movimientos",
    argsFormat: "Placa vehicular",
    validation: {
      minArgs: 1,
      maxArgs: 1,
    },
  },
  "/licenciapdf": {
    providerCmd: "/licenciapdf",
    description: "Licencia de conducir PDF",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/placadenuncias": {
    providerCmd: "/placadenuncias",
    description: "Denuncias por placa PDF",
    argsFormat: "Placa vehicular",
    validation: {
      minArgs: 1,
      maxArgs: 1,
    },
  },

  // ===== PROPIEDADES =====
  "/ag": {
    providerCmd: "/ag",
    description: "Árbol genealógico",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/pro": {
    providerCmd: "/pro",
    description: "Propiedades SUNARP",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/prox": {
    providerCmd: "/prox",
    description: "Propiedades SUNARP detallado",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },

  // ===== FINANCIERO =====
  "/sentinel": {
    providerCmd: "/sentinel",
    description: "Análisis financiero completo con Sentinel",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/seguros": {
    providerCmd: "/seguros",
    description: "Consulta de seguros",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/sun": {
    providerCmd: "/sun",
    description: "Consulta SUNAT",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/sueldos": {
    providerCmd: "/sue",
    description: "Historial laboral 2024",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },

  // ===== TELEFONÍA AURORA =====
  "/valnum": {
    providerCmd: "/valnum",
    description: "Validador de teléfono",
    argsFormat: "Número (9 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{9}$/,
    },
  },
  "/valnumdni": {
    providerCmd: "/valnumdni",
    description: "Teléfonos por DNI",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/telx": {
    providerCmd: "/telx",
    description: "Consulta TELX",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/claro": {
    providerCmd: "/claro",
    description: "Titularidad Claro",
    argsFormat: "Número (9 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{9}$/,
    },
  },
  "/movistar": {
    providerCmd: "/movistar",
    description: "Titularidad Movistar",
    argsFormat: "Número (9 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{9}$/,
    },
  },
  "/serum": {
    providerCmd: "/serum",
    description: "Búsqueda SERUM",
    argsFormat: "Número (9 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{9}$/,
    },
  },

  // ===== SUNAT AURORA =====
  "/ruc": {
    providerCmd: "/ruc",
    description: "RUC información en texto",
    argsFormat: "RUC (11 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{11}$/,
    },
  },
  "/rucpdf": {
    providerCmd: "/rucpdf",
    description: "RUC información en PDF",
    argsFormat: "RUC (11 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{11}$/,
    },
  },
  "/rucdni": {
    providerCmd: "/rucdni",
    description: "RUC por DNI",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },

  // ===== SUNARP =====
  "/bolsunarp": {
    providerCmd: "/bolsunarp",
    description: "Boleta SUNARP PDF",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/insunarp": {
    providerCmd: "/insunarp",
    description: "Propiedades SUNARP",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/tarjsunarp": {
    providerCmd: "/tarjsunarp",
    description: "Tarjeta SUNARP",
    argsFormat: "Placa vehicular",
    validation: {
      minArgs: 1,
      maxArgs: 1,
    },
  },

  // ===== FAMILIA AURORA =====
  "/agv": {
    providerCmd: "/agv",
    description: "Árbol genealógico foto",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },

  // ===== BUSCADORES =====
  "/seekernumeros": {
    providerCmd: "/seekernumeros",
    description: "Seeker números",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/seekerrun": {
    providerCmd: "/seekerrun",
    description: "Seeker vehículos",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/seekercorreos": {
    providerCmd: "/seekercorreos",
    description: "Seeker correos",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },
  "/seeker": {
    providerCmd: "/seeker",
    description: "Seeker full",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },

  // ===== GENERADORES =====
  "/yape": {
    providerCmd: "/yape",
    description: "Generador Yape",
    argsFormat: "Nombre|Num|Tipo|Monto",
    validation: {
      minArgs: 1,
    },
  },
  "/plin": {
    providerCmd: "/plin",
    description: "Generador Plin",
    argsFormat: "Nombre|Num|Tipo|Monto",
    validation: {
      minArgs: 1,
    },
  },

  // ===== ACTAS =====
  "/actn": {
    providerCmd: "/actana",
    description: "Acta de nacimiento oficial PDF",
    argsFormat: "DNI (8 dígitos)",
    validation: {
      minArgs: 1,
      maxArgs: 1,
      pattern: /^\d{8}$/,
    },
  },

};

/**
 * Obtiene el comando del proveedor para un comando de usuario
 */
export const getProviderCommand = (userCommand: string): string => {
  const mapping = COMMAND_MAPPINGS[userCommand];
  return mapping?.providerCmd || userCommand;
};

/**
 * Valida los argumentos de un comando
 */
export const validateCommandArgs = (
  command: string,
  args: string[]
): { valid: boolean; error?: string } => {
  const mapping = COMMAND_MAPPINGS[command];
  if (!mapping?.validation) {
    return { valid: true };
  }

  const { minArgs, maxArgs, pattern } = mapping.validation;

  // Validar cantidad de argumentos
  if (minArgs !== undefined && args.length < minArgs) {
    return {
      valid: false,
      error: `El comando ${command} requiere al menos ${minArgs} argumento(s). Formato: ${mapping.argsFormat || "sin especificar"}`,
    };
  }

  if (maxArgs !== undefined && args.length > maxArgs) {
    return {
      valid: false,
      error: `El comando ${command} acepta máximo ${maxArgs} argumento(s). Formato: ${mapping.argsFormat || "sin especificar"}`,
    };
  }

  // Validar patrón si existe
  if (pattern && args[0]) {
    if (!pattern.test(args[0])) {
      return {
        valid: false,
        error: `Formato inválido para ${command}. Formato esperado: ${mapping.argsFormat || "sin especificar"}`,
      };
    }
  }

  return { valid: true };
};

/**
 * Lista todos los comandos disponibles
 */
export const listAvailableCommands = (): Array<{
  command: string;
  description: string;
  format: string;
}> => {
  return Object.entries(COMMAND_MAPPINGS).map(([cmd, info]) => ({
    command: cmd,
    description: info.description || "Sin descripción",
    format: info.argsFormat || "Sin formato especificado",
  }));
};
