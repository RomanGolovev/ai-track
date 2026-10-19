param([string]$ProjectDirectory = $PSScriptRoot)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $ProjectDirectory
if (-not (Test-Path '.\package.json')) { throw 'Open PowerShell in the Life OS folder containing package.json.' }
Write-Host 'Updating Life OS source. Close the running Life OS server first (Ctrl+C).'
$tempDirectory = Join-Path $env:TEMP ('life-os-update-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $tempDirectory | Out-Null
try {
    Invoke-WebRequest -Uri 'https://github.com/RomanGolovev/ai-track/archive/refs/heads/main.zip' -OutFile (Join-Path $tempDirectory 'update.zip')
    Expand-Archive -LiteralPath (Join-Path $tempDirectory 'update.zip') -DestinationPath (Join-Path $tempDirectory 'files')
    $source = Get-ChildItem (Join-Path $tempDirectory 'files') -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'package.json') } | Select-Object -First 1
    if (-not $source) { throw 'The downloaded archive does not contain a Life OS project.' }
    # Explicit source allowlist: never replace data/, .env.local, node_modules/ or local backups.
    @('app','lib','tests','package.json','package-lock.json','tsconfig.json','postcss.config.mjs','README.md','AGENTS.md','START-WINDOWS.bat','UPDATE-WINDOWS.ps1','.env.example','.gitignore') | ForEach-Object {
        $item = Join-Path $source.FullName $_
        if (Test-Path -LiteralPath $item) { Copy-Item -LiteralPath $item -Destination $ProjectDirectory -Recurse -Force }
    }
} finally {
    if (Test-Path -LiteralPath $tempDirectory) { Remove-Item -LiteralPath $tempDirectory -Recurse -Force }
}
Write-Host 'Update complete. Your database and .env.local were preserved.'
& npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. Send a screenshot of this window.' }
Write-Host 'Starting Life OS at http://localhost:3001. Keep this window open.'
& npm.cmd run dev -- --port 3001
