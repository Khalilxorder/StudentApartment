#!/usr/bin/env tsx
/**
 * 🚀 One-Click Setup Script
 * 
 * Runs all setup steps in sequence:
 * 1. Verify environment variables
 * 2. Setup storage bucket
 * 3. Seed demo apartments
 * 4. Health check
 * 
 * Usage: npm run setup:all
 */

import * as dotenv from 'dotenv';
import { spawn } from 'child_process';

dotenv.config({ path: '.env.local' });

console.log('🚀 Student Apartments - One-Click Setup\n');
console.log('═══════════════════════════════════════\n');

// Check environment variables
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'DATABASE_URL'
];

let missing = false;
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing: ${key}`);
    missing = true;
  } else {
    console.log(`✅ Found: ${key}`);
  }
}

if (missing) {
  console.error('\n❌ Please set missing environment variables in .env.local\n');
  process.exit(1);
}

console.log('\n✅ Environment variables verified!\n');

// Helper to run command
function runCommand(command: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    console.log(`\n🔧 Running: ${command} ${args.join(' ')}\n`);
    
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

async function main() {
  try {
    // Step 1: Setup storage
    console.log('═══════════════════════════════════════');
    console.log('STEP 1: Setting up storage bucket');
    console.log('═══════════════════════════════════════\n');
    
    await runCommand('npm', ['run', 'setup:storage']);
    
    // Step 2: Seed database
    console.log('\n═══════════════════════════════════════');
    console.log('STEP 2: Seeding demo apartments');
    console.log('═══════════════════════════════════════\n');
    
    await runCommand('npm', ['run', 'seed:realistic']);
    
    // Success!
    console.log('\n═══════════════════════════════════════');
    console.log('🎉 SETUP COMPLETE!');
    console.log('═══════════════════════════════════════\n');
    console.log('✅ Storage bucket configured');
    console.log('✅ Demo apartments seeded');
    console.log('\n📋 Next steps:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Open: http://localhost:3000');
    console.log('   3. Test: Sign up → Upload apartment');
    console.log('\n📖 Full guide: DEPLOYMENT_READY_CHECKLIST.md\n');
    
  } catch (err: any) {
    console.error('\n❌ Setup failed:', err.message);
    console.log('\n📋 Manual fallback:');
    console.log('   1. npm run setup:storage');
    console.log('   2. Run migration in Supabase Dashboard');
    console.log('   3. npm run seed:realistic');
    console.log('   4. npm run dev\n');
    process.exit(1);
  }
}

main();
