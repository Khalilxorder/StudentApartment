#!/usr/bin/env node

/**
 * Sitemap Validation Script
 * Validates the generated sitemap for correctness and completeness
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const SITEMAP_URL = `${BASE_URL}/sitemap.xml`;

async function fetchSitemap(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    }).on('error', reject);
  });
}

async function validateSitemap() {
  console.log('🗺️  Validating sitemap...\n');

  try {
    // Fetch sitemap
    const sitemapXml = await fetchSitemap(SITEMAP_URL);
    console.log('✅ Sitemap fetched successfully');

    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });

    const sitemap = parser.parse(sitemapXml);

    if (!sitemap.urlset || !sitemap.urlset.url) {
      throw new Error('Invalid sitemap structure: missing urlset or urls');
    }

    const urls = Array.isArray(sitemap.urlset.url) ? sitemap.urlset.url : [sitemap.urlset.url];
    console.log(`📊 Found ${urls.length} URLs in sitemap`);

    // Validate each URL
    const issues = [];
    const warnings = [];
    const priorities = { high: 0, medium: 0, low: 0 };

    for (const urlEntry of urls) {
      const url = urlEntry.loc;
      const lastmod = urlEntry.lastmod;
      const changefreq = urlEntry.changefreq;
      const priority = urlEntry.priority;

      // Check URL format
      try {
        new URL(url);
      } catch {
        issues.push(`Invalid URL format: ${url}`);
        continue;
      }

      // Check lastmod format (ISO 8601)
      if (lastmod) {
        const date = new Date(lastmod);
        if (isNaN(date.getTime())) {
          issues.push(`Invalid lastmod date: ${lastmod} for ${url}`);
        }
      }

      // Check changefreq values
      const validChangefreq = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
      if (changefreq && !validChangefreq.includes(changefreq)) {
        issues.push(`Invalid changefreq: ${changefreq} for ${url}`);
      }

      // Check priority values
      if (priority !== undefined) {
        const priorityNum = parseFloat(priority);
        if (isNaN(priorityNum) || priorityNum < 0 || priorityNum > 1) {
          issues.push(`Invalid priority: ${priority} for ${url}`);
        } else {
          if (priorityNum >= 0.8) priorities.high++;
          else if (priorityNum >= 0.5) priorities.medium++;
          else priorities.low++;
        }
      }

      // Check for common important pages
      const path = new URL(url).pathname;
      if (path === '/' && (!priority || parseFloat(priority) < 0.8)) {
        warnings.push('Homepage priority is low (< 0.8)');
      }
    }

    // Summary
    console.log('\n📈 Priority Distribution:');
    console.log(`  High (≥0.8): ${priorities.high}`);
    console.log(`  Medium (≥0.5): ${priorities.medium}`);
    console.log(`  Low (<0.5): ${priorities.low}`);

    if (issues.length > 0) {
      console.log('\n❌ Issues:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (issues.length === 0 && warnings.length === 0) {
      console.log('\n✅ Sitemap validation passed!');
    }

    // Check for missing important pages
    const importantPages = ['/', '/search', '/apartments', '/login', '/signup'];
    const sitemapPaths = urls.map(u => new URL(u.loc).pathname);

    const missingPages = importantPages.filter(page => !sitemapPaths.includes(page));
    if (missingPages.length > 0) {
      console.log('\n⚠️  Potentially missing important pages:');
      missingPages.forEach(page => console.log(`  - ${page}`));
    }

  } catch (error) {
    console.log(`❌ Sitemap validation failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  validateSitemap().catch(console.error);
}

module.exports = { validateSitemap };