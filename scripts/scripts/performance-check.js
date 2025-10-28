#!/usr/bin/env node

/**
 * Performance Monitoring Script
 * Monitors Core Web Vitals and performance metrics
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function measurePerformance(url) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Enable performance monitoring
    await page.setViewport({ width: 1920, height: 1080 });

    // Collect performance metrics
    const metrics = {};

    // Measure Core Web Vitals
    page.on('metrics', ({ title, metrics: pageMetrics }) => {
      if (title === 'Timestamp') {
        metrics.timestamp = pageMetrics.Timestamp;
      }
    });

    // Start navigation
    const startTime = Date.now();
    await page.goto(url, { waitUntil: 'networkidle0' });
    const loadTime = Date.now() - startTime;

    // Get performance entries
    const performanceEntries = await page.evaluate(() => {
      const entries = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: entries.domContentLoadedEventEnd - entries.domContentLoadedEventStart,
        loadComplete: entries.loadEventEnd - entries.loadEventStart,
        ttfb: entries.responseStart - entries.requestStart,
        totalSize: entries.transferSize
      };
    });

    // Get Core Web Vitals
    const coreWebVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        let cls = 0;
        let lcp = 0;
        let fid = 0;

        // CLS - Cumulative Layout Shift
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              cls += entry.value;
            }
          }
        }).observe({ entryTypes: ['layout-shift'] });

        // LCP - Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          lcp = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // FID - First Input Delay
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            fid = entry.processingStart - entry.startTime;
          }
        }).observe({ entryTypes: ['first-input'] });

        // Wait a bit for metrics to collect
        setTimeout(() => {
          resolve({ cls, lcp, fid });
        }, 2000);
      });
    });

    // Get bundle size information
    const bundleInfo = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

      return {
        scriptCount: scripts.length,
        styleCount: styles.length,
        totalResources: performance.getEntriesByType('resource').length
      };
    });

    return {
      url,
      loadTime,
      ...performanceEntries,
      ...coreWebVitals,
      ...bundleInfo,
      timestamp: new Date().toISOString()
    };

  } finally {
    await browser.close();
  }
}

function evaluateMetrics(metrics) {
  const results = {
    score: 0,
    issues: [],
    warnings: [],
    passed: []
  };

  // Load time (target: < 3s)
  if (metrics.loadTime > 3000) {
    results.issues.push(`Load time is ${metrics.loadTime}ms (target: < 3000ms)`);
  } else {
    results.passed.push(`Load time: ${metrics.loadTime}ms`);
    results.score += 25;
  }

  // TTFB (target: < 800ms)
  if (metrics.ttfb > 800) {
    results.issues.push(`TTFB is ${metrics.ttfb}ms (target: < 800ms)`);
  } else {
    results.passed.push(`TTFB: ${metrics.ttfb}ms`);
    results.score += 20;
  }

  // CLS (target: < 0.1)
  if (metrics.cls > 0.1) {
    results.issues.push(`CLS is ${metrics.cls} (target: < 0.1)`);
  } else {
    results.passed.push(`CLS: ${metrics.cls}`);
    results.score += 20;
  }

  // LCP (target: < 2500ms)
  if (metrics.lcp > 2500) {
    results.warnings.push(`LCP is ${metrics.lcp}ms (target: < 2500ms)`);
  } else {
    results.passed.push(`LCP: ${metrics.lcp}ms`);
    results.score += 20;
  }

  // FID (target: < 100ms)
  if (metrics.fid > 100) {
    results.warnings.push(`FID is ${metrics.fid}ms (target: < 100ms)`);
  } else {
    results.passed.push(`FID: ${metrics.fid}ms`);
    results.score += 15;
  }

  return results;
}

async function saveResults(results, outputPath) {
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  const data = {
    timestamp: new Date().toISOString(),
    results
  };

  await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
  console.log(`📊 Results saved to ${outputPath}`);
}

async function main() {
  console.log('⚡ Running performance audit...\n');

  const pages = [
    '/',
    '/search',
    '/apartments',
  ];

  const results = [];

  for (const page of pages) {
    try {
      console.log(`Measuring ${page}...`);
      const url = BASE_URL + page;
      const metrics = await measurePerformance(url);
      const evaluation = evaluateMetrics(metrics);

      console.log(`Score: ${evaluation.score}/100`);

      if (evaluation.issues.length > 0) {
        console.log('❌ Issues:');
        evaluation.issues.forEach(issue => console.log(`  - ${issue}`));
      }

      if (evaluation.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        evaluation.warnings.forEach(warning => console.log(`  - ${warning}`));
      }

      if (evaluation.passed.length > 0) {
        console.log('✅ Passed:');
        evaluation.passed.forEach(pass => console.log(`  - ${pass}`));
      }

      console.log('');

      results.push({
        page,
        metrics,
        evaluation
      });

    } catch (error) {
      console.log(`❌ Failed to measure ${page}: ${error.message}\n`);
      results.push({
        page,
        error: error.message
      });
    }
  }

  // Save results
  const outputPath = path.join(process.cwd(), 'reports', 'performance-audit.json');
  await saveResults(results, outputPath);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { measurePerformance, evaluateMetrics };