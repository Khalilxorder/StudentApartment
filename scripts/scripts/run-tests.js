#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Student Apartments Platform
 * Runs unit tests, integration tests, E2E tests, and performance benchmarks
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.results = {
      unit: { passed: 0, failed: 0, duration: 0 },
      integration: { passed: 0, failed: 0, duration: 0 },
      e2e: { passed: 0, failed: 0, duration: 0 },
      performance: { passed: 0, failed: 0, duration: 0 },
    };
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m',
    };
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        ...options,
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        if (code === 0) {
          resolve({ code, duration });
        } else {
          reject({ code, duration });
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async runUnitTests() {
    this.log('Running Unit Tests...', 'info');
    try {
      const result = await this.runCommand('npx', ['vitest', 'run', 'tests/unit']);
      this.results.unit = { passed: 1, failed: 0, duration: result.duration };
      this.log(`✅ Unit tests passed in ${result.duration}ms`, 'success');
    } catch (error) {
      this.results.unit = { passed: 0, failed: 1, duration: error.duration };
      this.log(`❌ Unit tests failed in ${error.duration}ms`, 'error');
    }
  }

  async runIntegrationTests() {
    this.log('Running Integration Tests...', 'info');
    try {
      const result = await this.runCommand('npx', ['vitest', 'run', 'tests/integration']);
      this.results.integration = { passed: 1, failed: 0, duration: result.duration };
      this.log(`✅ Integration tests passed in ${result.duration}ms`, 'success');
    } catch (error) {
      this.results.integration = { passed: 0, failed: 1, duration: error.duration };
      this.log(`❌ Integration tests failed in ${error.duration}ms`, 'error');
    }
  }

  async runE2ETests() {
    this.log('Running E2E Tests...', 'info');
    try {
      // Start the development server
      this.log('Starting development server...', 'info');
      const serverProcess = spawn('npm', ['run', 'dev'], {
        detached: true,
        stdio: 'ignore',
      });

      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 5000));

      try {
        const result = await this.runCommand('npx', ['playwright', 'test']);
        this.results.e2e = { passed: 1, failed: 0, duration: result.duration };
        this.log(`✅ E2E tests passed in ${result.duration}ms`, 'success');
      } finally {
        // Clean up server
        try {
          process.kill(-serverProcess.pid);
        } catch (e) {
          // Server might already be stopped
        }
      }
    } catch (error) {
      this.results.e2e = { passed: 0, failed: 1, duration: error.duration };
      this.log(`❌ E2E tests failed in ${error.duration}ms`, 'error');
    }
  }

  async runPerformanceTests() {
    this.log('Running Performance Tests...', 'info');
    try {
      // Start the development server
      const serverProcess = spawn('npm', ['run', 'dev'], {
        detached: true,
        stdio: 'ignore',
      });

      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 5000));

      try {
        const result = await this.runCommand('npx', ['playwright', 'test', 'performance.spec.ts']);
        this.results.performance = { passed: 1, failed: 0, duration: result.duration };
        this.log(`✅ Performance tests passed in ${result.duration}ms`, 'success');
      } finally {
        // Clean up server
        try {
          process.kill(-serverProcess.pid);
        } catch (e) {
          // Server might already be stopped
        }
      }
    } catch (error) {
      this.results.performance = { passed: 0, failed: 1, duration: error.duration };
      this.log(`❌ Performance tests failed in ${error.duration}ms`, 'error');
    }
  }

  async runLighthouseAudit() {
    this.log('Running Lighthouse Performance Audit...', 'info');
    try {
      // Start the development server
      const serverProcess = spawn('npm', ['run', 'dev'], {
        detached: true,
        stdio: 'ignore',
      });

      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 5000));

      try {
        const result = await this.runCommand('npx', ['lighthouse', 'http://localhost:3000', '--output=json', '--output-path=./lighthouse-results.json']);
        this.log(`✅ Lighthouse audit completed in ${result.duration}ms`, 'success');

        // Parse results
        if (fs.existsSync('./lighthouse-results.json')) {
          const results = JSON.parse(fs.readFileSync('./lighthouse-results.json', 'utf8'));
          const scores = {
            performance: results.categories.performance.score * 100,
            accessibility: results.categories.accessibility.score * 100,
            seo: results.categories.seo.score * 100,
          };

          this.log(`📊 Lighthouse Scores:`, 'info');
          this.log(`   Performance: ${scores.performance.toFixed(1)}/100`, scores.performance >= 90 ? 'success' : 'warning');
          this.log(`   Accessibility: ${scores.accessibility.toFixed(1)}/100`, scores.accessibility >= 90 ? 'success' : 'warning');
          this.log(`   SEO: ${scores.seo.toFixed(1)}/100`, scores.seo >= 90 ? 'success' : 'warning');
        }
      } finally {
        // Clean up
        try {
          process.kill(-serverProcess.pid);
          if (fs.existsSync('./lighthouse-results.json')) {
            fs.unlinkSync('./lighthouse-results.json');
          }
        } catch (e) {
          // Cleanup might fail
        }
      }
    } catch (error) {
      this.log(`❌ Lighthouse audit failed in ${error.duration}ms`, 'error');
    }
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const totalTests = Object.values(this.results).reduce((sum, result) => sum + result.passed + result.failed, 0);
    const totalPassed = Object.values(this.results).reduce((sum, result) => sum + result.passed, 0);
    const totalFailed = Object.values(this.results).reduce((sum, result) => sum + result.failed, 0);

    this.log('\n' + '='.repeat(60), 'info');
    this.log('🧪 TEST EXECUTION REPORT', 'info');
    this.log('='.repeat(60), 'info');

    Object.entries(this.results).forEach(([type, result]) => {
      const status = result.failed === 0 ? '✅' : '❌';
      this.log(`${status} ${type.charAt(0).toUpperCase() + type.slice(1)} Tests: ${result.passed} passed, ${result.failed} failed (${result.duration}ms)`, 'info');
    });

    this.log('-'.repeat(60), 'info');
    this.log(`📊 SUMMARY: ${totalPassed}/${totalTests} tests passed in ${totalDuration}ms`, 'info');

    if (totalFailed === 0) {
      this.log('🎉 All tests passed! Ready for deployment.', 'success');
      return 0;
    } else {
      this.log(`⚠️  ${totalFailed} test(s) failed. Please review and fix before deployment.`, 'error');
      return 1;
    }
  }

  async runAll() {
    this.log('🚀 Starting Comprehensive Test Suite', 'info');
    this.log('='.repeat(60), 'info');

    try {
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runE2ETests();
      await this.runPerformanceTests();
      await this.runLighthouseAudit();
    } catch (error) {
      this.log(`💥 Test execution failed: ${error.message}`, 'error');
    }

    return this.generateReport();
  }
}

// Run the test suite
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAll().then((exitCode) => {
    process.exit(exitCode);
  }).catch((error) => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;