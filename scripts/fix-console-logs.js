// Script to batch replace console.log/warn with logger
// Run this to automate console cleanup across all API routes

const fs = require('fs');
const path = require('path');

const replacements = [
    // Basic console.log patterns
    { pattern: /console\.log\(/g, replacement: 'logger.info(' },
    { pattern: /console\.warn\(/g, replacement: 'logger.warn(' },
    { pattern: /console\.error\(/g, replacement: 'logger.error(' },
];

const ensureLoggerImport = (content) => {
    if (!content.includes("from '@/lib/logger'")) {
        // Find the last import statement
        const importMatch = content.match(/^import .+ from .+;$/gm);
        if (importMatch) {
            const lastImport = importMatch[importMatch.length - 1];
            const importIndex = content.indexOf(lastImport) + lastImport.length;
            return content.slice(0, importIndex) +
                "\nimport { logger } from '@/lib/logger';" +
                content.slice(importIndex);
        }
    }
    return content;
};

const processFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check if file has console calls
    if (content.includes('console.log') || content.includes('console.warn') || content.includes('console.error')) {
        // Add logger import if needed
        content = ensureLoggerImport(content);

        // Apply replacements
        replacements.forEach(({ pattern, replacement }) => {
            if (pattern.test(content)) {
                content = content.replace(pattern, replacement);
                modified = true;
            }
        });

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✓ Fixed: ${filePath}`);
            return true;
        }
    }
    return false;
};

const walkDirectory = (dir) => {
    let count = 0;
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            count += walkDirectory(filePath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            if (processFile(filePath)) count++;
        }
    });

    return count;
};

const apiDir = path.join(__dirname, 'app', 'api');
const count = walkDirectory(apiDir);
console.log(`\n✅ Fixed ${count} files`);
