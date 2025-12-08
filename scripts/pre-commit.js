#!/usr/bin/env node

/**
 * Pre-commit hook - runs before every commit
 * Ensures code quality and prevents common mistakes
 */

const { execSync } = require('child_process');

console.log('🔍 Running pre-commit checks...\n');

// Colors for output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
};

function run(command, description) {
    try {
        console.log(`⏳ ${description}...`);
        execSync(command, { stdio: 'inherit' });
        console.log(`${colors.green}✓${colors.reset} ${description} passed\n`);
        return true;
    } catch (error) {
        console.log(`${colors.red}✗${colors.reset} ${description} failed\n`);
        return false;
    }
}

let success = true;

// 1. Type check
if (!run('npm run type-check', 'Type checking')) {
    console.log(`${colors.yellow}💡 Hint: Fix TypeScript errors before committing${colors.reset}\n`);
    success = false;
}

// 2. Lint
if (!run('npm run lint', 'Linting')) {
    console.log(`${colors.yellow}💡 Hint: Run 'npm run lint:fix' to auto-fix issues${colors.reset}\n`);
    success = false;
}

// 3. Format check (if prettier is configured)
try {
    if (!run('npx prettier --check .', 'Format checking')) {
        console.log(`${colors.yellow}💡 Hint: Run 'npx prettier --write .' to format files${colors.reset}\n`);
        success = false;
    }
} catch {
    // Skip if prettier not installed
}

if (success) {
    console.log(`${colors.green}✅ All pre-commit checks passed!${colors.reset}\n`);
    process.exit(0);
} else {
    console.log(`${colors.red}❌ Pre-commit checks failed. Please fix the issues above.${colors.reset}\n`);
    process.exit(1);
}
