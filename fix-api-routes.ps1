# Fix all API routes with module-level Supabase client initialization
$files = @(
    'app/api/commute/matrix/route.ts',
    'app/api/verification/submit/route.ts',
    'app/api/verification/status/route.ts',
    'app/api/verification/review/route.ts',
    'app/api/payments/intents/route.ts',
    'app/api/digests/send/route.ts',
    'app/api/digests/preferences/route.ts',
    'app/api/moderation/reports/route.ts',
    'app/api/moderation/actions/route.ts',
    'app/api/media/optimize/route.ts'
)

foreach ($file in $files) {
    Write-Host "Processing $file..." -ForegroundColor Yellow
    
    $content = Get-Content $file -Raw
    
    # Check if file has the pattern we're looking for
    if ($content -match 'const supabase = createClient') {
        # Replace the module-level declaration with lazy function
        $content = $content -replace 'const supabase = createClient\([^)]+\);', @'
// Lazy-load Supabase client
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}
'@
        
        # Replace all uses of 'const supabase =' in the file (inside functions) with 'const supabase = getSupabaseClient()'
        $content = $content -replace '(\s+)const supabase\s*=\s*createClient', '$1const supabase = getSupabaseClient'
        
        # Also replace standalone 'supabase' references to use the function
        # But be careful not to replace 'supabase' in comments or the function name itself
        $content = $content -replace 'await supabase\.', 'await getSupabaseClient().'
        $content = $content -replace '(\s+)supabase\.', '$1getSupabaseClient().'
        $content = $content -replace '= supabase\.', '= getSupabaseClient().'
        $content = $content -replace '\(supabase\.', '(getSupabaseClient().'
        
        Set-Content $file $content -NoNewline
        Write-Host "✓ Fixed $file" -ForegroundColor Green
    } else {
        Write-Host "⊘ Skipped $file (no pattern found)" -ForegroundColor Gray
    }
}

Write-Host "`n✓ All files processed!" -ForegroundColor Cyan
