#!/usr/bin/env node
/**
 * Script to replace console.error and console.log with structured logger
 * in API routes to prevent PII leaks
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const API_DIR = path.join(__dirname, '../app/api');
const DRY_RUN = process.argv.includes('--dry-run');

// Track changes
let filesModified = 0;
let replacements = 0;

// Files to skip (webhooks can keep some console.log for external debugging)
const SKIP_FILES = [];

function replaceConsoleLogging(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = content;
    let changeCount = 0;

    // Check if logger is already imported
    const hasLoggerImport = /import.*logger.*from.*@\/lib\/(dev-)?logger/.test(content);
    const hasDevLoggerImport = /import.*logger.*from.*@\/lib\/dev-logger/.test(content);

    // Replace console.error patterns
    const consoleErrorPattern = /console\.error\((.*?)\);/gs;
    const errorMatches = [...content.matchAll(consoleErrorPattern)];

    for (const match of errorMatches) {
        const args = match[1].trim();

        // Parse arguments - handle simple cases
        let replacement;
        if (args.includes('error:') || args.includes('Error')) {
            // Likely has error object
            // console.error('Message:', error) -> logger.error({ err: error }, 'Message')
            const parts = args.split(',').map(s => s.trim());
            if (parts.length === 2) {
                const message = parts[0].replace(/'/g, '').replace(/"/g, '');
                const errorVar = parts[1];
                replacement = `logger.error({ err: ${errorVar} }, '${message}')`;
            } else {
                // Fallback
                replacement = `logger.error(${args})`;
            }
        } else {
            replacement = `logger.error(${args})`;
        }

        modified = modified.replace(match[0], replacement + ';');
        changeCount++;
    }

    // Replace console.log patterns (but keep webhook logs)
    if (!filePath.includes('/webhooks/')) {
        const consoleLogPattern = /console\.log\((.*?)\);/gs;
        const logMatches = [...content.matchAll(consoleLogPattern)];

        for (const match of logMatches) {
            const args = match[1].trim();
            const replacement = `logger.info(${args})`;
            modified = modified.replace(match[0], replacement + ';');
            changeCount++;
        }
    }

    // Add logger import if needed and changes were made
    if (changeCount > 0 && !hasLoggerImport && !hasDevLoggerImport) {
        // Add import at top after other imports
        const importPattern = /^(import.*\n)+/m;
        const importMatch = modified.match(importPattern);

        if (importMatch) {
            const lastImport = importMatch[0];
            const loggerImport = "import { logger } from '@/lib/dev-logger';\n";
            modified = modified.replace(lastImport, lastImport + loggerImport);
        } else {
            // No imports found, add at top
            modified = "import { logger } from '@/lib/dev-logger';\n\n" + modified;
        }
    }

    if (changeCount > 0) {
        if (!DRY_RUN) {
            fs.writeFileSync(filePath, modified, 'utf8');
            console.log(`✅ Fixed ${changeCount} logging calls in ${path.relative(process.cwd(), filePath)}`);
        } else {
            console.log(`[DRY RUN] Would fix ${changeCount} logging calls in ${path.relative(process.cwd(), filePath)}`);
        }
        filesModified++;
        replacements += changeCount;
    }

    return changeCount;
}

// Find all TypeScript files in app/api
const apiFiles = glob.sync('**/*.ts', { cwd: API_DIR, absolute: true });

console.log(`\n🔍 Scanning ${apiFiles.length} files in app/api for console.* calls...\n`);

for (const file of apiFiles) {
    if (!SKIP_FILES.includes(path.basename(file))) {
        replaceConsoleLogging(file);
    }
}

console.log(`\n📊 Summary:`);
console.log(`   Files modified: ${filesModified}`);
console.log(`   Total replacements: ${replacements}`);

if (DRY_RUN) {
    console.log(`\n💡 Run without --dry-run to apply changes`);
} else {
    console.log(`\n✨ PII leak remediation complete!`);
    console.log(`\n🔍 Next steps:`);
    console.log(`   1. Run: npm run type-check`);
    console.log(`   2. Run: npm run lint`);
    console.log(`   3. Search for any remaining: grep -r "console\\\\.error" app/api/`);
}
