/**
 * Setup global para tests
 */

// Configurar variables de entorno para testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Solo errores durante tests
process.env.USE_SQLITE = 'true'; // Usar SQLite en tests

// Mock de console para tests más limpios
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

beforeAll(async () => {
  // Setup global antes de todos los tests
});

afterAll(async () => {
  // Cleanup después de todos los tests
});

beforeEach(() => {
  // Reset antes de cada test
  jest.clearAllMocks();
});
