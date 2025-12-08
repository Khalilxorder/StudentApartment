/**
 * Script to batch replace console.error with logger.error in API routes
 * Run with: npx ts-node scripts/migrate-console-to-logger.ts
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const API_DIR = path.join(__dirname, '..', 'app', 'api');

// Find all TypeScript files with console.error
const files = glob.sync('**/*.ts', { cwd: API_DIR, absolute: true });

let totalUpdated = 0;
let totalInstances = 0;

for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf-8');

    // Skip if no console.error
    if (!content.includes('console.error')) {
        continue;
    }

    // Skip if already has logger import
    if (content.includes("import { logger }")) {
        // Just replace console.error with logger.error
        const pattern = /console\.error\((.*?)\);/g;
        let match;
        let instances = 0;

        while ((match = pattern.exec(content)) !== null) {
            instances++;
        }

        if (instances > 0) {
            // Simple replacement - convert console.error('msg', error) to logger.error({ error }, 'msg')
            content = content.replace(/console\.error\('([^']+)',\s*(\w+)\);/g, "logger.error({ $2 }, '$1');");
            content = content.replace(/console\.error\('([^']+)':\s*,\s*(\w+)\);/g, "logger.error({ $2 }, '$1');");
            content = content.replace(/console\.error\(`([^`]+)`,\s*(\w+)\);/g, "logger.error({ $2 }, '$1');");
            content = content.replace(/console\.error\('([^']+)'\);/g, "logger.error('$1');");

            fs.writeFileSync(filePath, content, 'utf-8');
            totalUpdated++;
            totalInstances += instances;
        }
        continue;
    }

    // Add logger import
    const importMatch = content.match(/^(import\s+.*?from\s+['"].*?['"];?\r?\n)/m);
    if (importMatch) {
        const insertPos = content.lastIndexOf(importMatch[0]) + importMatch[0].length;
        const before = content.slice(0, insertPos);
        const after = content.slice(insertPos);

        // Check if next line is also an import
        if (!after.startsWith("import { logger }")) {
            content = before + "import { logger } from '@/lib/logger';\n" + after;
        }
    }

    // Replace console.error patterns
    const originalContent = content;

    // Pattern: console.error('message:', variable);
    content = content.replace(/console\.error\('([^']+)'[,:]?\s*(\w+)\);/g, "logger.error({ $2 }, '$1');");

    // Pattern: console.error(`message ${var}:`, error);
    content = content.replace(/console\.error\(`[^`]+`[,:]?\s*(\w+)\);/g, "logger.error({ $1 }, 'Error occurred');");

    // Pattern: console.error('message');
    content = content.replace(/console\.error\('([^']+)'\);/g, "logger.error('$1');");

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf-8');
        totalUpdated++;
        console.log(`Updated: ${path.relative(API_DIR, filePath)}`);
    }
}

console.log(`\nTotal files updated: ${totalUpdated}`);
console.log(`Total instances replaced: ${totalInstances}`);
