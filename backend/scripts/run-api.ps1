$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& "$scriptDir\stop-api.ps1"
Start-Sleep -Seconds 1
Set-Location (Join-Path $scriptDir '..\MosqueOS.API')
dotnet run --urls http://localhost:5000
