param([string]$Destination)
# Compatibility wrapper. The Node implementation needs no PowerShell policy changes.
if ($Destination) {
    & node (Join-Path $PSScriptRoot 'package-source.mjs') $Destination
} else {
    & node (Join-Path $PSScriptRoot 'package-source.mjs')
}
exit $LASTEXITCODE
