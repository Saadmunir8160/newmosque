# Stops a running MosqueOS.API instance (dotnet run or MosqueOS.API.exe).
# Prevents MSB3027 "file is locked" errors on dotnet build.

Get-Process -Name 'MosqueOS.API' -ErrorAction SilentlyContinue |
    Stop-Process -Force -ErrorAction SilentlyContinue

Get-CimInstance Win32_Process -Filter "Name='dotnet.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*MosqueOS.API*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
