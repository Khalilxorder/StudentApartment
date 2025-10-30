$files = @(
    'app\api\verification\submit\route.ts',
    'app\api\verification\status\route.ts',
    'app\api\verification\review\route.ts',
    'app\api\payments\intents\route.ts',
    'app\api\digests\send\route.ts',
    'app\api\digests\preferences\route.ts',
    'app\api\moderation\reports\route.ts',
    'app\api\moderation\actions\route.ts',
    'app\api\media\[id]\route.ts',
    'app\api\media\optimize\route.ts'
)

foreach ($file in $files) {
    $path = "c:\Users\Administrator\Desktop\All Student apartment files\SA-GitHub-Upload\$file"
    if (Test-Path $path) {
        Write-Host "Fixing $file..."
        
        $content = Get-Content $path -Raw
        
        # Replace module-level const supabase with function
        $content = $content -replace 'const supabase = createClient\(\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL.*?\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY.*?\);', @'
// Lazy-load Supabase client to avoid process.env access at module load time
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}
'@
        
        # Replace supabase. with getSupabaseClient().
        $content = $content -replace '(?<!getSupabase)(?<!// )supabase\.', 'getSupabaseClient().'
        
        Set-Content $path $content -NoNewline
        Write-Host "Fixed $file" -ForegroundColor Green
    }
}

Write-Host "All files fixed!" -ForegroundColor Cyan
