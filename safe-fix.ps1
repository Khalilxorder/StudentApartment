# Safely fix Supabase client initialization in specific API routes
# This version is more careful and validates each change

$filesToFix = @(
    'app/api/commute/matrix/route.ts'
)

foreach ($file in $filesToFix) {
    Write-Host "`nProcessing: $file" -ForegroundColor Cyan
    
    if (!(Test-Path $file)) {
        Write-Host "  ✗ File not found" -ForegroundColor Red
        continue
    }
    
    $content = Get-Content $file -Raw
    $originalLength = $content.Length
    
    # Only replace if we find the exact pattern
    if ($content -match 'const supabase = createClient\(\s+process\.env\.NEXT_PUBLIC_SUPABASE_URL.*?\);') {
        # Make the replacement
        $newContent = $content -replace `
            'const supabase = createClient\(\s+process\.env\.NEXT_PUBLIC_SUPABASE_URL \|\| '''',\s+process\.env\.SUPABASE_SERVICE_ROLE_KEY \|\| ''''\s+\);',
            @'
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}
'@
        
        # Replace uses: await supabase. -> await getSupabase().
        $newContent = $newContent -replace 'await supabase\.', 'await getSupabase().'
        $newContent = $newContent -replace '= supabase\.', '= getSupabase().'
        $newContent = $newContent -replace '\(supabase\.', '(getSupabase().'
        $newContent = $newContent -replace 'const \{ ([^}]+) \} = supabase\.', 'const { $1 } = getSupabase().'
        
        # Verify length didn't change drastically (safety check)
        if ([Math]::Abs($newContent.Length - $originalLength) -gt 500) {
            Write-Host "  ✗ SAFETY CHECK FAILED - length changed too much" -ForegroundColor Red
            Write-Host "    Original: $originalLength chars, New: $($newContent.Length) chars" -ForegroundColor Yellow
            continue
        }
        
        Set-Content $file -Value $newContent -NoNewline
        Write-Host "  ✓ Fixed successfully" -ForegroundColor Green
        Write-Host "    Length: $originalLength -> $($newContent.Length) chars" -ForegroundColor Gray
    } else {
        Write-Host "  ⊘ Pattern not found (already fixed or different structure)" -ForegroundColor Yellow
    }
}

Write-Host "`n✓ Done!" -ForegroundColor Green
