#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Creates GitHub issues from the issue templates in .github/issues/
.DESCRIPTION
    This script reads all .md files in .github/issues/ and creates corresponding GitHub issues.
    Requires GitHub CLI (gh) to be installed and authenticated.
.EXAMPLE
    .\create-github-issues.ps1
#>

param(
    [string]$Repo = "",  # Will auto-detect if empty
    [switch]$DryRun
)

# Check if GitHub CLI is installed
if (!(Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "GitHub CLI (gh) is not installed. Please install it from https://cli.github.com/"
    exit 1
}

# Check if authenticated
try {
    $authCheck = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Not authenticated with GitHub CLI. Run 'gh auth login' first."
        exit 1
    }
} catch {
    Write-Error "GitHub CLI authentication check failed. Run 'gh auth login' first."
    exit 1
}

# Auto-detect repo if not provided
if ([string]::IsNullOrEmpty($Repo)) {
    try {
        $remoteUrl = git config --get remote.origin.url
        if ($remoteUrl -match 'github\.com[\/:]([^\/]+)\/([^\/\.]+)') {
            $Repo = "$($matches[1])/$($matches[2])"
            Write-Host "Auto-detected repository: $Repo"
        } else {
            Write-Error "Could not auto-detect repository. Please specify -Repo parameter."
            exit 1
        }
    } catch {
        Write-Error "Could not auto-detect repository. Please specify -Repo parameter."
        exit 1
    }
}

# Get all issue files
$issueFiles = Get-ChildItem -Path ".github/issues" -Filter "*.md" | Where-Object { $_.Name -ne "README.md" } | Sort-Object Name

if ($issueFiles.Count -eq 0) {
    Write-Error "No issue files found in .github/issues/"
    exit 1
}

Write-Host "Found $($issueFiles.Count) issue files to process"
Write-Host "Repository: $Repo"
Write-Host "Dry run: $DryRun"
Write-Host ""

foreach ($file in $issueFiles) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Cyan

    try {
        $content = Get-Content $file.FullName -Raw

        # Extract title from frontmatter
        if ($content -match 'title:\s*"([^"]+)"') {
            $title = $matches[1]
        } else {
            Write-Warning "Could not extract title from $($file.Name), skipping..."
            continue
        }

        # Extract labels
        $labels = @()
        if ($content -match 'labels:\s*\[([^\]]+)\]') {
            $labelsString = $matches[1]
            $labels = $labelsString -split ',' | ForEach-Object { $_.Trim().Trim('"') }
        }

        # Extract body (everything after frontmatter)
        $bodyStart = $content.IndexOf('---', 4) + 3
        if ($bodyStart -gt 3) {
            $body = $content.Substring($bodyStart).Trim()
        } else {
            $body = $content
        }

        if ($DryRun) {
            Write-Host "  Would create issue: $title" -ForegroundColor Yellow
            Write-Host "  Labels: $($labels -join ', ')" -ForegroundColor Yellow
            Write-Host "  Body length: $($body.Length) characters" -ForegroundColor Yellow
        } else {
            # Create the issue
            $ghArgs = @(
                "issue", "create",
                "--title", $title,
                "--body", $body,
                "--repo", $Repo
            )

            if ($labels.Count -gt 0) {
                $ghArgs += "--label"
                $ghArgs += ($labels -join ",")
            }

            & gh @ghArgs

            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Created issue: $title" -ForegroundColor Green
            } else {
                Write-Host "  ✗ Failed to create issue: $title" -ForegroundColor Red
            }
        }

    } catch {
        Write-Host "  ✗ Error processing $($file.Name): $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host ""
}

if ($DryRun) {
    Write-Host "Dry run completed. Run without -DryRun to actually create issues." -ForegroundColor Yellow
} else {
    Write-Host "Issue creation completed!" -ForegroundColor Green
}