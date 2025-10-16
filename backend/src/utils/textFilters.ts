/**
 * Sistema avanzado de filtros de texto para limpiar respuestas del proveedor
 *
 * Elimina:
 * - Mensajes de estado y espera
 * - Marcas de agua y publicidad
 * - Emojis de estado
 * - Menciones y tags
 * - Formato excesivo
 */

// ===== PATRONES DE MENSAJES DE ESTADO =====
const STATUS_KEYWORDS = [
  "consultando",
  "procesando",
  "buscando",
  "espere",
  "momento",
  "cargando",
  "generando",
  "obteniendo",
  "recopilando",
  "extrayendo",
  "verificando",
  "validando",
  "analizando",
  "preparando",
  "descargando",
];

const STATUS_EMOJIS = [
  "⏳",
  "🔄",
  "⏰",
  "🔍",
  "🤖",
  "⌛",
  "🔎",
  "📡",
  "💫",
  "⚙️",
  "🛠️",
  "⏱️",
  "🕐",
  "🕑",
  "🕒",
];

// ===== PATRONES DE PUBLICIDAD Y MARCAS =====
const BRAND_PATTERNS = [
  /\[#ShizukaCloud.*?\]/gi,
  /\[#SHKAI.*?\]/gi,
  /\[#DATENSHI.*?\]/gi,
  /\[#.*?\]/gi, // Cualquier hashtag en corchetes
  /ShizukaCloud/gi,
  /SHKAI\s*INFORMATION/gi,
  /DATENSHI\s*DOX/gi,
  /@SHKAINFORMATIONASXBOT/gi,
  /@[A-Z0-9_]+BOT/gi, // Menciones de bots
  /\[BOT.*?\]/gi,
  /\[SHIZUKA.*?\]/gi,
  /\[SHKAI.*?\]/gi,
  /SHIZUKA_TOP/gi,
  /Yenes?/gi,
  /UBICGEOS/gi,
  /Proveedor\s*[:：].*$/gim,
  /Cr[eé]ditos\s*[:：].*$/gim,
  /\[[^\]]*\]\(tg:\/\/user\?id=\d+\)/g, // Links de usuario de Telegram
  // Nuevos patrones para Private Data
  /❰\s*#DELUXEDATAPERUX\s*❱/gi,
  /➣\s*DELUXEDATAPERU/gi,
  /DELUXEDATAPERU/gi,
  /DELUXEDATAPERUX/gi,
  /➥\s*CONSULTADO\s+POR:/gi,
  /CONSULTADO\s+POR:\s*USUARIO:\s*\d+/gi,
  /USUARIO:\s*\d+/gi,
  /NOMBRE:\s*\./gi,
  /CR[ÉE]DITOS:\s*∞/gi,
  /➥/g, // Flecha
  /➣/g, // Flecha
  /❰/g, // Bracket decorativo
  /❱/g, // Bracket decorativo
];

// ===== PATRONES DE MENSAJES COMPLETOS A ELIMINAR =====
const BLACKLISTED_MESSAGES = [
  /^.*consultando\s+base\s+de\s+datos.*$/gim,
  /^.*espere\s+un\s+momento.*$/gim,
  /^.*procesando\s+su\s+solicitud.*$/gim,
  /^.*obteniendo\s+informaci[oó]n.*$/gim,
  /^.*por\s+favor\s+espere.*$/gim,
  /^.*env[ií]a\s+tu\s+consulta.*$/gim,
  /^.*para\s+m[aá]s\s+informaci[oó]n.*$/gim,
  /^.*visita\s+nuestro.*$/gim,
  /^.*[uú]nete\s+a\s+nuestro.*$/gim,
  /^.*suscr[ií]bete.*$/gim,
  /^.*usa\s+el\s+c[oó]digo.*$/gim,
  /^.*invita\s+a\s+tus\s+amigos.*$/gim,
  // Líneas completas de Private Data
  /^.*❰.*#DELUXEDATAPERUX.*❱.*$/gim,
  /^.*➣.*DELUXEDATAPERU.*$/gim,
  /^.*➥.*CONSULTADO\s+POR:.*$/gim,
  /^.*USUARIO:\s*\d+.*$/gim,
  /^.*NOMBRE:\s*\..*$/gim,
  /^.*CR[ÉE]DITOS:\s*∞.*$/gim,
  /^.*DELUXEDATAPERU.*$/gim,
];

// ===== EMOJIS DE DECORACIÓN INNECESARIOS =====
const DECORATION_EMOJIS = [
  "\u267E", // ♾️
  "\u267E\uFE0F",
  "\u{1F380}", // 🎀
  "\u{1F389}", // 🎉
  "\u{1F4A5}", // 💥
  "\u{1F525}", // 🔥
  "\u{2728}", // ✨
  "\u{1F31F}", // 🌟
  "\u{1F4AB}", // 💫
  "🌑", // Luna negra (usado en algunos bots)
];

/**
 * Detecta si un mensaje es de estado y debe ser ignorado
 */
export const isStatusMessage = (text: string | null): boolean => {
  if (!text || text.trim().length === 0) {
    return false;
  }

  const lowerText = text.toLowerCase();

  // Verificar keywords de estado
  if (STATUS_KEYWORDS.some((keyword) => lowerText.includes(keyword))) {
    return true;
  }

  // Verificar emojis de estado
  if (STATUS_EMOJIS.some((emoji) => text.includes(emoji))) {
    return true;
  }

  // Verificar mensajes blacklisteados completos
  if (BLACKLISTED_MESSAGES.some((pattern) => pattern.test(text))) {
    return true;
  }

  return false;
};

/**
 * Limpia texto removiendo marcas, publicidad y formato excesivo
 */
export const cleanProviderText = (raw: string | null): string | null => {
  if (!raw) {
    return null;
  }

  let cleaned = raw;

  // 1. Eliminar patrones de marcas y publicidad
  for (const pattern of BRAND_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }

  // 2. Eliminar líneas completas blacklisteadas
  for (const pattern of BLACKLISTED_MESSAGES) {
    cleaned = cleaned.replace(pattern, "");
  }

  // 3. Eliminar emojis de decoración
  for (const emoji of DECORATION_EMOJIS) {
    cleaned = cleaned.replace(new RegExp(emoji, "g"), "");
  }

  // 4. Limpiar formato de markdown excesivo
  // Remover negritas dobles: **texto** -> texto
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1");

  // Remover itálicas solas en líneas: *texto* -> texto
  cleaned = cleaned.replace(/^\*([^*\n]+)\*$/gm, "$1");

  // Remover negritas en labels: *NOMBRE:* -> NOMBRE:
  cleaned = cleaned.replace(/\*([A-ZÁÉÍÓÚÑ\s]+):\*/gi, "$1:");

  // Remover backticks: `texto` -> texto
  cleaned = cleaned.replace(/`([^`]*)`/g, "$1");

  // 5. Limpiar líneas y espacios excesivos
  // Máximo 2 saltos de línea consecutivos
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // Máximo 1 espacio consecutivo
  cleaned = cleaned.replace(/ {2,}/g, " ");

  // 6. Eliminar líneas que solo contengan símbolos
  cleaned = cleaned.replace(/^[-_*=~]{3,}$/gm, "");

  // 7. Eliminar líneas con solo emojis de luna (marca de algunos bots)
  cleaned = cleaned.replace(/^.*🌑.*$/gm, "");

  // 8. Trim general
  cleaned = cleaned.trim();

  // Si después de limpiar no queda nada, retornar null
  return cleaned.length > 0 ? cleaned : null;
};

/**
 * Limpia un conjunto de líneas removiendo las vacías y duplicadas
 */
export const cleanTextLines = (text: string): string => {
  const lines = text.split("\n");
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Ignorar líneas vacías
    if (trimmed.length === 0) {
      continue;
    }

    // Ignorar líneas duplicadas
    if (seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    cleaned.push(line); // Mantener indentación original
  }

  return cleaned.join("\n");
};

/**
 * Valida si un texto tiene contenido útil después de limpiar
 */
export const hasUsefulContent = (text: string | null): boolean => {
  if (!text) {
    return false;
  }

  const cleaned = cleanProviderText(text);
  if (!cleaned || cleaned.length < 5) {
    return false;
  }

  // Debe tener al menos una letra o número
  return /[a-zA-Z0-9]/.test(cleaned);
};

/**
 * Trunca texto largo manteniendo información relevante
 */
export const truncateText = (text: string, maxLength: number = 4000): string => {
  if (text.length <= maxLength) {
    return text;
  }

  // Truncar y agregar indicador
  const truncated = text.substring(0, maxLength - 50);
  const lastNewline = truncated.lastIndexOf("\n");

  if (lastNewline > maxLength * 0.8) {
    return truncated.substring(0, lastNewline) + "\n\n... (texto truncado)";
  }

  return truncated + "... (texto truncado)";
};

/**
 * Limpia y valida texto de proveedor (función principal)
 */
export const processProviderText = (
  raw: string | null,
  options: {
    checkStatus?: boolean;
    removeDuplicateLines?: boolean;
    truncate?: number;
  } = {}
): string | null => {
  const { checkStatus = true, removeDuplicateLines = true, truncate } = options;

  if (!raw) {
    return null;
  }

  // 1. Verificar si es mensaje de estado
  if (checkStatus && isStatusMessage(raw)) {
    return null;
  }

  // 2. Limpiar texto
  let processed = cleanProviderText(raw);
  if (!processed) {
    return null;
  }

  // 3. Remover líneas duplicadas
  if (removeDuplicateLines) {
    processed = cleanTextLines(processed);
  }

  // 4. Truncar si es necesario
  if (truncate && processed.length > truncate) {
    processed = truncateText(processed, truncate);
  }

  // 5. Validar contenido útil
  if (!hasUsefulContent(processed)) {
    return null;
  }

  return processed;
};
