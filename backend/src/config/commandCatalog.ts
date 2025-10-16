export interface CommandProviderInfo {
  id: string;
  name: string;
  description: string;
  accentColor?: string;
  badge?: string;
  telegramBot?: string; // Telegram bot username for this provider
}

export interface CommandEntry {
  command: string;
  label: string;
  provider: string;
  description?: string;
  tags?: string[];
  availability?: "all" | "admin" | "premium";
  cooldownSeconds?: number;
  cost?: number; // créditos que cuesta el comando
}

export interface CommandCategory {
  id: string;
  title: string;
  icon: string;
  description: string;
  commands: CommandEntry[];
}

export interface CommandCatalog {
  providers: CommandProviderInfo[];
  categories: CommandCategory[];
  updatedAt: string;
}

const providers: CommandProviderInfo[] = [
  {
    id: "telegram",
    name: "Search Data",
    description: "Proveedor principal - Consultas en tiempo real",
    accentColor: "#3b82f6",
    badge: "Principal",
    telegramBot: "SHKAINFORMATIONASXBOT",
  },
  {
    id: "aurora",
    name: "Private Data",
    description: "Proveedor premium con comandos avanzados y generadores",
    accentColor: "#22d3ee",
    badge: "Premium",
    telegramBot: "DELUXEDATAA_BOT",
  },
];

const categories: CommandCategory[] = [
  // ========== RENIEC ==========
  {
    id: "reniec",
    title: "RENIEC",
    icon: "🪪",
    description: "Identidad ciudadana y datos oficiales",
    commands: [
      // Proveedor Telegram (SHKA)
      {
        command: "/dni",
        label: "Básico",
        provider: "telegram",
        description: "Fotografía y datos básicos de la identidad",
        tags: ["identidad", "foto"],
      },
      {
        command: "/dnif",
        label: "Completo",
        provider: "telegram",
        description: "Consulta completa - Foto + firma + huellas",
        tags: ["identidad", "biometría"],
        cost: 5,
      },
      {
        command: "/nm",
        label: "Búsqueda por nombres",
        provider: "telegram",
        description: "Retorna posibles coincidencias a partir de nombres y apellidos",
        tags: ["identidad", "búsqueda"],
      },
      {
        command: "/dnivaz",
        label: "DNI Vazquez",
        provider: "telegram",
        description: "DNI digital azul o amarillo ambas caras",
        cost: 3,
      },
      // Proveedor Aurora Data
      {
        command: "/dniv",
        label: "DNI Digital",
        provider: "aurora",
        description: "DNI azul o amarillo ambas caras",
        tags: ["documento", "digital"],
        cost: 3,
      },
      {
        command: "/c4i",
        label: "Certificado Electrónico",
        provider: "aurora",
        description: "Certificado electrónico RENIEC",
        cost: 5,
      },
      {
        command: "/c4a",
        label: "Ficha Azul",
        provider: "aurora",
        description: "Ficha RENIEC azul PDF",
        cost: 3,
      },
      {
        command: "/c4b",
        label: "Ficha Blanca",
        provider: "aurora",
        description: "Ficha RENIEC blanca PDF",
        cost: 3,
      },
      {
        command: "/c4c",
        label: "Ficha V2",
        provider: "aurora",
        description: "Ficha RENIEC v2",
        cost: 5,
      },
    ],
  },

  // ========== TELEFONÍA ==========
  {
    id: "telefonia",
    title: "Telefonía",
    icon: "📞",
    description: "Titulares, líneas móviles y operadores",
    commands: [
      // Proveedor Telegram (SHKA)
      {
        command: "/tel",
        label: "Teléfonos por DNI",
        provider: "telegram",
        description: "Listado de líneas asociadas a un documento",
        tags: ["telefonía", "titulares"],
      },
      {
        command: "/cel",
        label: "Titular por número",
        provider: "telegram",
        description: "Identifica al titular de una línea móvil",
        tags: ["telefonía", "inverso"],
      },
      {
        command: "/osipdb",
        label: "OSIPTEL Database",
        provider: "telegram",
        description: "Consulta consolidada OSIPTEL",
      },
      {
        command: "/bitel",
        label: "Bitel",
        provider: "telegram",
        description: "Consulta titular Bitel",
      },
      // Proveedor Aurora Data
      {
        command: "/valnum",
        label: "Validador Teléfono",
        provider: "aurora",
        description: "Valida un número de teléfono (operador y país)",
        cost: 10,
      },
      {
        command: "/valnumdni",
        label: "Teléfono por DNI",
        provider: "aurora",
        description: "Números de teléfono asociados a un DNI",
        cost: 2,
      },
      {
        command: "/telx",
        label: "Consulta TELX",
        provider: "aurora",
        description: "Información completa del DNI en tiempo real",
        cost: 4,
      },
      {
        command: "/claro",
        label: "Titularidad Claro",
        provider: "aurora",
        description: "Titularidad Claro en tiempo real",
        cost: 5,
      },
      {
        command: "/movistar",
        label: "Titularidad Movistar",
        provider: "aurora",
        description: "Titularidad Movistar en tiempo real",
        cost: 5,
      },
      {
        command: "/serum",
        label: "Búsqueda SERUM",
        provider: "aurora",
        description: "Búsqueda en todas las fuentes disponibles",
        cost: 12,
      },
    ],
  },

  // ========== ANTECEDENTES ==========
  {
    id: "antecedentes",
    title: "Antecedentes",
    icon: "⚖️",
    description: "Historiales legales, penales y judiciales",
    commands: [
      // Proveedor Telegram (SHKA)
      {
        command: "/antpe",
        label: "Penales",
        provider: "telegram",
        description: "Antecedentes penales PDF",
        tags: ["legales"],
      },
      {
        command: "/antpo",
        label: "Policiales",
        provider: "telegram",
        description: "Antecedentes policiales PDF",
        tags: ["legales"],
      },
      {
        command: "/antpj",
        label: "Judiciales",
        provider: "telegram",
        description: "Antecedentes judiciales PDF",
      },
      {
        command: "/rq",
        label: "Requisitorias",
        provider: "telegram",
        description: "Consulta de requisitorias",
      },
      {
        command: "/ant",
        label: "Completo",
        provider: "telegram",
        description: "Consulta de antecedentes completos",
      },
      {
        command: "/antpev",
        label: "Verificador Penales",
        provider: "telegram",
        description: "Verificador antecedentes penales",
      },
      {
        command: "/antpov",
        label: "Verificador Policiales",
        provider: "telegram",
        description: "Verificador antecedentes policiales",
      },
      // Proveedor Aurora Data
      {
        command: "/denuncias",
        label: "Denuncias",
        provider: "aurora",
        description: "Todas las denuncias asociadas al DNI en PDF",
        cost: 15,
      },
      {
        command: "/antpen",
        label: "Antecedentes Penales PDF",
        provider: "aurora",
        description: "Antecedentes penales en formato PDF",
        cost: 10,
      },
      {
        command: "/antpol",
        label: "Antecedentes Policiales PDF",
        provider: "aurora",
        description: "Antecedentes policiales en formato PDF",
        cost: 10,
      },
      {
        command: "/antjud",
        label: "Antecedentes Judiciales PDF",
        provider: "aurora",
        description: "Antecedentes judiciales en formato PDF",
        cost: 10,
      },
    ],
  },

  // ========== VEHÍCULOS ==========
  {
    id: "vehiculos",
    title: "Vehículos",
    icon: "🚗",
    description: "Registro vehicular, propietario y títulos",
    commands: [
      // Proveedor Telegram (SHKA)
      {
        command: "/tive",
        label: "Tarjeta Vehicular",
        provider: "telegram",
        description: "Tarjeta vehicular PDF",
      },
      // Proveedor Aurora Data
      {
        command: "/tivep",
        label: "Tarjeta Vehicular Premium",
        provider: "aurora",
        description: "Tarjeta de propiedad vehicular original en PDF",
        cost: 15,
      },
      {
        command: "/placa",
        label: "Información Placa",
        provider: "aurora",
        description: "Información en tiempo real de la placa en texto",
        cost: 10,
      },
      {
        command: "/placab",
        label: "Movimientos Placa",
        provider: "aurora",
        description: "Consulta los movimientos de un vehículo",
        cost: 3,
      },
      {
        command: "/placabpdf",
        label: "Movimientos PDF",
        provider: "aurora",
        description: "Obtén los movimientos de un vehículo en PDF",
        cost: 4,
      },
      {
        command: "/movplaca",
        label: "Historial Completo",
        provider: "aurora",
        description: "Historial completo de movimientos del vehículo",
        cost: 15,
      },
      {
        command: "/licenciapdf",
        label: "Licencia de Conducir PDF",
        provider: "aurora",
        description: "Documento oficial de licencia de conducir en PDF",
        cost: 15,
      },
      {
        command: "/placadenuncias",
        label: "Denuncias por Placa",
        provider: "aurora",
        description: "Todas las denuncias asociadas a la placa en PDF",
        cost: 15,
      },
    ],
  },

  // ========== PROPIEDADES ==========
  {
    id: "propiedades",
    title: "Propiedades",
    icon: "🏠",
    description: "Consultas SUNARP y propiedades",
    commands: [
      // Proveedor Telegram (SHKA)
      {
        command: "/pro",
        label: "Propiedades SUNARP",
        provider: "telegram",
        description: "Propiedades SUNARP",
      },
      {
        command: "/prox",
        label: "Propiedades Detallado",
        provider: "telegram",
        description: "Propiedades SUNARP detallado",
      },
      // Proveedor Aurora Data
      {
        command: "/bolsunarp",
        label: "Boleta SUNARP",
        provider: "aurora",
        description: "Boleta informativa en tiempo real en formato PDF",
        cost: 15,
      },
      {
        command: "/insunarp",
        label: "Propiedades SUNARP Info",
        provider: "aurora",
        description: "Propiedades registradas en SUNARP",
        cost: 20,
      },
      {
        command: "/tarjsunarp",
        label: "Tarjeta SUNARP",
        provider: "aurora",
        description: "Tarjeta de propiedad vehículo REVERSO y ANVERSO",
        cost: 25,
      },
    ],
  },

  // ========== FINANCIERO Y SUNAT ==========
  {
    id: "financiero",
    title: "Financiero",
    icon: "💳",
    description: "Actividad financiera, SUNAT y aseguradora",
    commands: [
      // Proveedor Telegram (SHKA)
      {
        command: "/finan",
        label: "Información Financiera",
        provider: "telegram",
        description: "Historial financiero SBS",
      },
      {
        command: "/sbs",
        label: "Reporte SBS",
        provider: "telegram",
        description: "Historial SBS gráfico",
      },
      {
        command: "/seguros",
        label: "Seguros",
        provider: "telegram",
        description: "Consulta de seguros",
      },
      {
        command: "/sun",
        label: "SUNAT",
        provider: "telegram",
        description: "Consulta SUNAT",
      },
      {
        command: "/sueldos",
        label: "Sueldos",
        provider: "telegram",
        description: "Historial laboral 2024",
      },
      // Proveedor Aurora Data
      {
        command: "/ruc",
        label: "RUC Información",
        provider: "aurora",
        description: "Información en tiempo real del RUC en texto",
        cost: 8,
      },
      {
        command: "/rucpdf",
        label: "RUC PDF",
        provider: "aurora",
        description: "Información en tiempo real del RUC en PDF",
        cost: 10,
      },
      {
        command: "/rucdni",
        label: "RUC por DNI",
        provider: "aurora",
        description: "Información del RUC asociado al DNI",
        cost: 4,
      },
    ],
  },

  // ========== FAMILIA ==========
  {
    id: "familia",
    title: "Familia",
    icon: "🌳",
    description: "Árbol genealógico y relaciones familiares",
    commands: [
      // Proveedor Telegram (SHKA)
      {
        command: "/ag",
        label: "Árbol Genealógico",
        provider: "telegram",
        description: "Árbol genealógico",
      },
      // Proveedor Aurora Data
      {
        command: "/agv",
        label: "Árbol Genealógico Foto",
        provider: "aurora",
        description: "Árbol genealógico en formato imagen",
        cost: 11,
      },
    ],
  },

  // ========== BUSCADORES AVANZADOS ==========
  {
    id: "buscadores",
    title: "Buscadores",
    icon: "🔍",
    description: "Herramientas de búsqueda avanzada",
    commands: [
      {
        command: "/seekernumeros",
        label: "Seeker Números",
        provider: "aurora",
        description: "Números telefónicos asociados mediante búsqueda VIP",
        cost: 8,
        availability: "premium",
      },
      {
        command: "/seekerrun",
        label: "Seeker Vehículos",
        provider: "aurora",
        description: "Vehículos registrados asociados al DNI",
        cost: 8,
        availability: "premium",
      },
      {
        command: "/seekercorreos",
        label: "Seeker Correos",
        provider: "aurora",
        description: "Correos electrónicos asociados mediante búsqueda VIP",
        cost: 8,
        availability: "premium",
      },
      {
        command: "/seeker",
        label: "Seeker Full",
        provider: "aurora",
        description: "Datos completos asociados al DNI proporcionado",
        cost: 17,
        availability: "premium",
      },
    ],
  },

  // ========== GENERADORES ==========
  {
    id: "generadores",
    title: "Generadores",
    icon: "⚡",
    description: "Generadores de documentos y capturas",
    commands: [
      {
        command: "/yape",
        label: "Generador Yape",
        provider: "aurora",
        description: "Generador de capturas Yape/Plin/Agora/BIM",
        cost: 2,
      },
      {
        command: "/plin",
        label: "Generador Plin",
        provider: "aurora",
        description: "Generador de capturas Plin/Yape/Agora/BIM",
        cost: 2,
      },
    ],
  },
];

const catalog: CommandCatalog = {
  providers,
  categories,
  updatedAt: new Date().toISOString(),
};

export const getCommandCatalog = (): CommandCatalog => catalog;

/**
 * Get the Telegram bot username for a given command
 * @param command The command to lookup (e.g., "/dni", "/dniv")
 * @returns The Telegram bot username or undefined if not found
 */
export const getTelegramBotForCommand = (command: string): string | undefined => {
  // Find the command in the catalog
  for (const category of categories) {
    const cmd = category.commands.find((c) => c.command === command);
    if (cmd) {
      // Find the provider for this command
      const provider = providers.find((p) => p.id === cmd.provider);
      return provider?.telegramBot;
    }
  }
  return undefined;
};
