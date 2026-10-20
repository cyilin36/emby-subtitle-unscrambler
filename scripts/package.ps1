[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$project = Join-Path $root "src\Emby.SubtitleUnscrambler\Emby.SubtitleUnscrambler.csproj"
$artifactRoot = Join-Path $root "artifacts"
$bundleRoot = Join-Path $artifactRoot "Emby.SubtitleUnscrambler"
$projectXml = [xml](Get-Content -LiteralPath $project -Raw)
$version = [string]$projectXml.Project.PropertyGroup.Version
$zipPath = Join-Path $artifactRoot "Emby.SubtitleUnscrambler-$version.zip"

Push-Location $root
try {
    dotnet restore $project
    dotnet build $project --configuration Release --no-restore
    node .\tests\subtitle-unscrambler.test.js

    if (Test-Path -LiteralPath $bundleRoot) {
        Remove-Item -LiteralPath $bundleRoot -Recurse -Force
    }

    New-Item -ItemType Directory -Path $bundleRoot -Force | Out-Null

    $dllPath = Join-Path $root `
        "src\Emby.SubtitleUnscrambler\bin\Release\netstandard2.0\Emby.SubtitleUnscrambler.dll"
    if (-not (Test-Path -LiteralPath $dllPath)) {
        throw "Plugin DLL was not produced: $dllPath"
    }

    Copy-Item -LiteralPath $dllPath -Destination $bundleRoot
    Copy-Item -LiteralPath (Join-Path $root "README.md") -Destination $bundleRoot
    Copy-Item -LiteralPath (Join-Path $root "LICENSE") -Destination $bundleRoot
    Copy-Item -LiteralPath (Join-Path $root "CHANGELOG.md") -Destination $bundleRoot

    if (Test-Path -LiteralPath $zipPath) {
        Remove-Item -LiteralPath $zipPath -Force
    }

    Compress-Archive -Path (Join-Path $bundleRoot "*") -DestinationPath $zipPath
    Write-Host "Created $zipPath"
}
finally {
    Pop-Location
}
