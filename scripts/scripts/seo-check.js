#!/usr/bin/env node

/**
 * SEO Audit Script
 * Performs comprehensive SEO checks on the Student Apartment platform
 */

const https = require('https');
const http = require('http');
const cheerio = require('cheerio');

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function checkPage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const $ = cheerio.load(data);
          resolve({ url, document: $, statusCode: res.statusCode });
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (err) => {
      console.error(`Request error for ${url}:`, err.message);
      reject(err);
    });
  });
}

function auditSEO({ url, document: $, statusCode }) {
  const issues = [];
  const warnings = [];
  const passed = [];

  // Check status code
  if (statusCode !== 200) {
    issues.push(`Status code is ${statusCode}, expected 200`);
  } else {
    passed.push('Status code is 200');
  }

  // Check title
  const title = $('title').text();
  if (!title) {
    issues.push('Missing title tag');
  } else if (title.length < 30) {
    warnings.push('Title is shorter than 30 characters');
  } else if (title.length > 60) {
    warnings.push('Title is longer than 60 characters');
  } else {
    passed.push('Title length is optimal');
  }

  // Check meta description
  const description = $('meta[name="description"]').attr('content');
  if (!description) {
    issues.push('Missing meta description');
  } else if (description.length < 120) {
    warnings.push('Meta description is shorter than 120 characters');
  } else if (description.length > 160) {
    warnings.push('Meta description is longer than 160 characters');
  } else {
    passed.push('Meta description length is optimal');
  }

  // Check H1 tag
  const h1s = $('h1');
  if (h1s.length === 0) {
    issues.push('Missing H1 tag');
  } else if (h1s.length > 1) {
    warnings.push('Multiple H1 tags found');
  } else {
    passed.push('Single H1 tag present');
  }

  // Check for structured data
  const structuredData = $('script[type="application/ld+json"]').length > 0;
  if (!structuredData) {
    warnings.push('No structured data found');
  } else {
    passed.push('Structured data present');
  }

  // Check for Open Graph tags
  const ogTags = $('meta[property^="og:"]');
  if (ogTags.length === 0) {
    warnings.push('No Open Graph tags found');
  } else {
    passed.push('Open Graph tags present');
  }

  // Check for images without alt text
  const images = $('img');
  let imagesWithoutAlt = 0;
  images.each((i, img) => {
    if (!$(img).attr('alt')) {
      imagesWithoutAlt++;
    }
  });
  if (imagesWithoutAlt > 0) {
    issues.push(`${imagesWithoutAlt} images missing alt text`);
  } else if (images.length > 0) {
    passed.push('All images have alt text');
  }

  return { issues, warnings, passed };
}

async function main() {
  console.log('🔍 Running SEO audit...\n');

  const pages = [
    '/',
    '/search',
    '/apartments',
  ];

  for (const page of pages) {
    try {
      console.log(`Checking ${page}...`);
      const result = await checkPage(BASE_URL + page);
      const audit = auditSEO(result);

      if (audit.issues.length > 0) {
        console.log('❌ Issues:');
        audit.issues.forEach(issue => console.log(`  - ${issue}`));
      }

      if (audit.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        audit.warnings.forEach(warning => console.log(`  - ${warning}`));
      }

      if (audit.passed.length > 0) {
        console.log('✅ Passed:');
        audit.passed.forEach(pass => console.log(`  - ${pass}`));
      }

      console.log('');
    } catch (error) {
      console.log(`❌ Failed to check ${page}: ${error.message}`);
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, checkPage, auditSEO };