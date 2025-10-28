#!/usr/bin/env node
/**
 * Quick verification script for auth changes
 * Run: node scripts/verify-auth-setup.mjs
 */

import fs from 'fs';
import path from 'path';

const errors = [];
const warnings = [];
const checks = [];

// Check 1: Verify utils/supabaseClient.ts has correct exports
console.log('🔍 Checking utils/supabaseClient.ts...');
try {
  const supabaseClientPath = path.join(process.cwd(), 'utils', 'supabaseClient.ts');
  const content = fs.readFileSync(supabaseClientPath, 'utf-8');
  
  if (content.includes('createServerComponentClient')) {
    checks.push('✅ createServerComponentClient() exists');
  } else {
    errors.push('❌ Missing createServerComponentClient() function');
  }
  
  if (content.includes('createServiceRoleClient')) {
    checks.push('✅ createServiceRoleClient() exists');
  } else {
    errors.push('❌ Missing createServiceRoleClient() function');
  }
  
  if (content.includes('next/headers')) {
    checks.push('✅ Imports next/headers for SSR');
  } else {
    errors.push('❌ Missing next/headers import');
  }
  
  if (content.includes('SUPABASE_SERVICE_ROLE_KEY') && content.includes('createServiceRoleClient')) {
    checks.push('✅ Service role key only used in explicit admin factory');
  }
  
  // Check for old dangerous pattern
  if (content.includes('serviceKey || anonKey') || content.includes('keyToUse = serviceKey')) {
    warnings.push('⚠️  Found potential service-role fallback pattern');
  } else {
    checks.push('✅ No default service-role fallback');
  }
  
} catch (error) {
  errors.push(`❌ Cannot read utils/supabaseClient.ts: ${error.message}`);
}

// Check 2: Verify app/page.tsx uses correct client
console.log('🔍 Checking app/page.tsx...');
try {
  const pageContent = fs.readFileSync(path.join(process.cwd(), 'app', 'page.tsx'), 'utf-8');
  
  if (pageContent.includes('createServerComponentClient')) {
    checks.push('✅ app/page.tsx uses createServerComponentClient()');
  } else {
    errors.push('❌ app/page.tsx not using createServerComponentClient()');
  }
  
  if (pageContent.includes("redirect('/dashboard')")) {
    checks.push("✅ Redirects to '/dashboard' (correct path)");
  } else if (pageContent.includes("redirect('/(app)/dashboard')")) {
    errors.push("❌ Still redirecting to '/(app)/dashboard' (should be '/dashboard')");
  } else {
    warnings.push("⚠️  Could not verify redirect path");
  }
  
  if (pageContent.includes('createClient()') && !pageContent.includes('createServerComponentClient')) {
    warnings.push('⚠️  Found old createClient() usage');
  }
  
} catch (error) {
  errors.push(`❌ Cannot read app/page.tsx: ${error.message}`);
}

// Check 3: Verify environment variables are configured
console.log('🔍 Checking .env.local...');
try {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    
    if (envContent.includes('NEXT_PUBLIC_SUPABASE_URL=')) {
      checks.push('✅ NEXT_PUBLIC_SUPABASE_URL configured');
    } else {
      errors.push('❌ Missing NEXT_PUBLIC_SUPABASE_URL');
    }
    
    if (envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      checks.push('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY configured');
    } else {
      errors.push('❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
    
    if (envContent.includes('SUPABASE_SERVICE_ROLE_KEY=')) {
      checks.push('✅ SUPABASE_SERVICE_ROLE_KEY configured (for admin use)');
    } else {
      warnings.push('⚠️  Missing SUPABASE_SERVICE_ROLE_KEY (needed for admin operations)');
    }
  } else {
    errors.push('❌ .env.local file not found');
  }
} catch (error) {
  errors.push(`❌ Cannot read .env.local: ${error.message}`);
}

// Check 4: Verify migration file exists
console.log('🔍 Checking migration file...');
try {
  const migrationPath = path.join(process.cwd(), 'RUN_THIS_IN_SUPABASE_ALL_IN_ONE.sql');
  if (fs.existsSync(migrationPath)) {
    const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
    if (migrationContent.includes('balcony') && migrationContent.includes('kitchen')) {
      checks.push('✅ Migration file includes missing columns (balcony, kitchen, etc.)');
    } else {
      warnings.push('⚠️  Migration file may be incomplete');
    }
  } else {
    errors.push('❌ RUN_THIS_IN_SUPABASE_ALL_IN_ONE.sql not found');
  }
} catch (error) {
  warnings.push(`⚠️  Cannot verify migration file: ${error.message}`);
}

// Print Results
console.log('\n' + '='.repeat(60));
console.log('📋 VERIFICATION RESULTS');
console.log('='.repeat(60) + '\n');

if (checks.length > 0) {
  console.log('✅ PASSING CHECKS:\n');
  checks.forEach(check => console.log(`  ${check}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:\n');
  warnings.forEach(warning => console.log(`  ${warning}`));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ ERRORS:\n');
  errors.forEach(error => console.log(`  ${error}`));
  console.log('');
}

console.log('='.repeat(60));

if (errors.length === 0) {
  console.log('✅ AUTH SETUP VERIFICATION PASSED!');
  console.log('\n📋 NEXT STEPS:');
  console.log('  1. Run migration in Supabase (RUN_THIS_IN_SUPABASE_ALL_IN_ONE.sql)');
  console.log('  2. Run: npm run seed:realistic');
  console.log('  3. Run: npm run dev');
  console.log('  4. Test at http://localhost:3000');
  process.exit(0);
} else {
  console.log('❌ AUTH SETUP HAS ISSUES - Please fix errors above');
  process.exit(1);
}
