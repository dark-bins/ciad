/**
 * Pruebas de carga para el sistema CIAD
 * Simula múltiples usuarios concurrentes
 */

import http from 'http';

interface LoadTestConfig {
  url: string;
  totalRequests: number;
  concurrentUsers: number;
  rampUpTime: number; // segundos
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: Array<{ error: string; count: number }>;
}

class LoadTester {
  private responseTimes: number[] = [];
  private successCount = 0;
  private failureCount = 0;
  private errors: Map<string, number> = new Map();

  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    console.log('\n🚀 Iniciando prueba de carga...');
    console.log(`📊 Total de peticiones: ${config.totalRequests}`);
    console.log(`👥 Usuarios concurrentes: ${config.concurrentUsers}`);
    console.log(`⏱️  Tiempo de rampa: ${config.rampUpTime}s\n`);

    const startTime = Date.now();
    const requestsPerUser = Math.floor(config.totalRequests / config.concurrentUsers);
    const delayBetweenUsers = (config.rampUpTime * 1000) / config.concurrentUsers;

    const userPromises: Promise<void>[] = [];

    for (let i = 0; i < config.concurrentUsers; i++) {
      await this.sleep(delayBetweenUsers);

      const userPromise = this.simulateUser(i + 1, requestsPerUser, config.url);
      userPromises.push(userPromise);
    }

    await Promise.all(userPromises);

    const totalTime = (Date.now() - startTime) / 1000;

    const result: LoadTestResult = {
      totalRequests: this.successCount + this.failureCount,
      successfulRequests: this.successCount,
      failedRequests: this.failureCount,
      averageResponseTime: this.calculateAverage(this.responseTimes),
      minResponseTime: Math.min(...this.responseTimes),
      maxResponseTime: Math.max(...this.responseTimes),
      requestsPerSecond: (this.successCount + this.failureCount) / totalTime,
      errors: Array.from(this.errors.entries()).map(([error, count]) => ({ error, count })),
    };

    this.printResults(result, totalTime);
    return result;
  }

  private async simulateUser(userId: number, requestCount: number, url: string): Promise<void> {
    console.log(`👤 Usuario ${userId} iniciado (${requestCount} peticiones)`);

    for (let i = 0; i < requestCount; i++) {
      try {
        const responseTime = await this.makeRequest(url);
        this.responseTimes.push(responseTime);
        this.successCount++;
      } catch (error) {
        this.failureCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.errors.set(errorMessage, (this.errors.get(errorMessage) || 0) + 1);
      }

      // Pequeño delay entre peticiones del mismo usuario
      await this.sleep(100);
    }

    console.log(`✅ Usuario ${userId} completado`);
  }

  private makeRequest(url: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const req = http.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const responseTime = Date.now() - startTime;

          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseTime);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((a, b) => a + b, 0);
    return Math.round(sum / numbers.length);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private printResults(result: LoadTestResult, totalTime: number): void {
    console.log('\n' + '='.repeat(60));
    console.log('📈 RESULTADOS DE LA PRUEBA DE CARGA');
    console.log('='.repeat(60));
    console.log(`⏱️  Tiempo total:           ${totalTime.toFixed(2)}s`);
    console.log(`📊 Total de peticiones:    ${result.totalRequests}`);
    console.log(`✅ Exitosas:               ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`❌ Fallidas:               ${result.failedRequests} (${((result.failedRequests / result.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`\n⚡ Rendimiento:`);
    console.log(`   Peticiones/segundo:     ${result.requestsPerSecond.toFixed(2)} req/s`);
    console.log(`   Tiempo de respuesta:`);
    console.log(`      Promedio:            ${result.averageResponseTime}ms`);
    console.log(`      Mínimo:              ${result.minResponseTime}ms`);
    console.log(`      Máximo:              ${result.maxResponseTime}ms`);

    if (result.errors.length > 0) {
      console.log(`\n❌ Errores encontrados:`);
      result.errors.forEach(({ error, count }) => {
        console.log(`   ${error}: ${count} veces`);
      });
    }

    console.log('='.repeat(60) + '\n');
  }
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
  const loadTester = new LoadTester();

  const config: LoadTestConfig = {
    url: 'http://localhost:4000/health',
    totalRequests: 1000,
    concurrentUsers: 50,
    rampUpTime: 10,
  };

  loadTester.runLoadTest(config)
    .then(() => {
      console.log('✅ Prueba de carga completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en prueba de carga:', error);
      process.exit(1);
    });
}

export { LoadTester, LoadTestConfig, LoadTestResult };
