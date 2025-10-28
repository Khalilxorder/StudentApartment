// Health Check Script for CI/CD Pipeline Verification
// Validates all critical services and endpoints

import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

interface HealthCheckResult {
  service: string;
  endpoint: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  statusCode?: number;
  latency: number;
  error?: string;
  timestamp: string;
}

interface HealthCheckReport {
  environment: string;
  timestamp: string;
  totalChecks: number;
  healthyChecks: number;
  degradedChecks: number;
  unhealthyChecks: number;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  results: HealthCheckResult[];
  averageLatency: number;
}

const HEALTH_CHECKS: Record<string, string[]> = {
  staging: [
    'https://staging.studentapartments.com/',
    'https://staging.studentapartments.com/api/health',
    'https://staging.studentapartments.com/api/search',
    'https://staging.studentapartments.com/api/apartments',
  ],
  production: [
    'https://studentapartments.com/',
    'https://studentapartments.com/api/health',
    'https://studentapartments.com/api/search',
    'https://studentapartments.com/api/apartments',
  ],
};

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function checkEndpoint(
  endpoint: string,
  retries: number = MAX_RETRIES
): Promise<HealthCheckResult> {
  const serviceName = new URL(endpoint).pathname || 'root';
  let lastError: string | undefined;
  let lastStatusCode: number | undefined;
  let latency = 0;

  for (let i = 0; i < retries; i++) {
    try {
      const startTime = Date.now();
      const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const client = endpoint.startsWith('https') ? https : http;
        const request = client.get(endpoint, (res) => {
          let body = '';
          res.on('data', chunk => (body += chunk));
          res.on('end', () => {
            resolve({ status: res.statusCode || 500, body });
          });
        });

        request.on('error', reject);
        request.setTimeout(DEFAULT_TIMEOUT, () => {
          request.destroy();
          reject(new Error('Request timeout'));
        });
      });

      latency = Date.now() - startTime;
      lastStatusCode = response.status;

      if (response.status === 200) {
        console.log(`✓ ${endpoint} (${latency}ms)`);
        return {
          service: serviceName,
          endpoint,
          status: 'healthy',
          statusCode: response.status,
          latency,
          timestamp: new Date().toISOString(),
        };
      } else if (response.status >= 400 && response.status < 500) {
        console.log(`⚠ ${endpoint} (${response.status})`);
        return {
          service: serviceName,
          endpoint,
          status: 'degraded',
          statusCode: response.status,
          latency,
          timestamp: new Date().toISOString(),
        };
      } else {
        console.log(`⚠ ${endpoint} (${response.status})`);
        return {
          service: serviceName,
          endpoint,
          status: 'degraded',
          statusCode: response.status,
          latency,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error: any) {
      lastError = error.message;

      if (i < retries - 1) {
        console.log(
          `  Retry ${i + 1}/${retries - 1} for ${endpoint} in ${RETRY_DELAY}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  console.log(`✗ ${endpoint} (${lastError})`);
  return {
    service: serviceName,
    endpoint,
    status: 'unhealthy',
    statusCode: lastStatusCode,
    latency,
    error: lastError,
    timestamp: new Date().toISOString(),
  };
}

async function runHealthChecks(environment: 'staging' | 'production'): Promise<HealthCheckReport> {
  console.log(`\n🏥 Running health checks for ${environment.toUpperCase()} environment...\n`);

  const endpoints = HEALTH_CHECKS[environment];
  if (!endpoints) {
    throw new Error(`Unknown environment: ${environment}`);
  }

  const results: HealthCheckResult[] = [];

  for (const endpoint of endpoints) {
    const result = await checkEndpoint(endpoint);
    results.push(result);
  }

  const healthyChecks = results.filter(r => r.status === 'healthy').length;
  const degradedChecks = results.filter(r => r.status === 'degraded').length;
  const unhealthyChecks = results.filter(r => r.status === 'unhealthy').length;

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (unhealthyChecks > 0) {
    overallStatus = 'unhealthy';
  } else if (degradedChecks > 0) {
    overallStatus = 'degraded';
  }

  const averageLatency =
    results.reduce((sum, r) => sum + r.latency, 0) / results.length;

  const report: HealthCheckReport = {
    environment,
    timestamp: new Date().toISOString(),
    totalChecks: results.length,
    healthyChecks,
    degradedChecks,
    unhealthyChecks,
    overallStatus,
    results,
    averageLatency: Math.round(averageLatency),
  };

  return report;
}

function printReport(report: HealthCheckReport): void {
  console.log(`\n📊 Health Check Report`);
  console.log(`Environment: ${report.environment}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Overall Status: ${report.overallStatus.toUpperCase()}`);
  console.log(`\nSummary:`);
  console.log(`  Healthy: ${report.healthyChecks}/${report.totalChecks}`);
  console.log(`  Degraded: ${report.degradedChecks}/${report.totalChecks}`);
  console.log(`  Unhealthy: ${report.unhealthyChecks}/${report.totalChecks}`);
  console.log(`  Average Latency: ${report.averageLatency}ms`);

  console.log(`\nDetailed Results:`);
  for (const result of report.results) {
    const statusIcon =
      result.status === 'healthy' ? '✓' : result.status === 'degraded' ? '⚠' : '✗';
    console.log(`  ${statusIcon} ${result.service}: ${result.status} (${result.latency}ms)`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  }
}

function saveReport(report: HealthCheckReport, filename: string = 'health-check-report.json'): void {
  const reportPath = path.join(process.cwd(), filename);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📁 Report saved to: ${reportPath}`);
}

async function main(): Promise<void> {
  try {
    const environment = (process.argv[2] as 'staging' | 'production') || 'staging';
    const saveToFile = process.argv.includes('--save');

    const report = await runHealthChecks(environment);

    printReport(report);

    if (saveToFile) {
      saveReport(report);
    }

    // Exit with error code if unhealthy
    if (report.overallStatus === 'unhealthy') {
      console.log(`\n❌ Health check FAILED`);
      process.exit(1);
    } else if (report.overallStatus === 'degraded') {
      console.log(`\n⚠️ Health check DEGRADED`);
      process.exit(0); // Don't fail on degraded for non-blocking checks
    } else {
      console.log(`\n✅ Health check PASSED`);
      process.exit(0);
    }
  } catch (error) {
    console.error('Health check error:', error);
    process.exit(1);
  }
}

main();
