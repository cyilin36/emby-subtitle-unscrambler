[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$DashboardUiPath
)

$ErrorActionPreference = "Stop"

$dashboard = (Resolve-Path -LiteralPath $DashboardUiPath).Path
$indexPath = Join-Path $dashboard "index.html"
$modulesPath = Join-Path $dashboard "modules"

if (-not (Test-Path -LiteralPath $indexPath)) {
    throw "Emby dashboard index.html was not found: $indexPath"
}

$index = [IO.File]::ReadAllText($indexPath)
$scriptPattern = '(?im)<script\s+src=["'']modules/emby-(?:subtitle-unscrambler|chinese-subtitle-fixer)[^"'']*["''][^>]*>\s*</script>\s*\r?\n?'
$patchedIndex = [Regex]::Replace($index, $scriptPattern, "")

if ($patchedIndex -ne $index) {
    [IO.File]::WriteAllText($indexPath, $patchedIndex, (New-Object Text.UTF8Encoding($false)))
    Write-Host "Removed the Subtitle Unscrambler script tag from $indexPath"
}
else {
    Write-Host "No Subtitle Unscrambler script tag was found in $indexPath"
}

if (Test-Path -LiteralPath $modulesPath) {
    Get-ChildItem -LiteralPath $modulesPath -File |
        Where-Object {
            $_.Name -match '^emby-(subtitle-unscrambler|chinese-subtitle-fixer)(-\d+\.\d+\.\d+)?\.js$'
        } |
        ForEach-Object {
            Remove-Item -LiteralPath $_.FullName -Force
            Write-Host "Removed $($_.FullName)"
        }
}
