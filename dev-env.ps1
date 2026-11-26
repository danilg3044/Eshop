# Puts the project-local toolchain on PATH for THIS PowerShell session only.
# Usage (from the repo root):   . .\dev-env.ps1
# Nothing machine-wide is changed; open a new shell to get the global tools back.

$root = $PSScriptRoot
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-27'
# Make Java trust the Windows certificate store (needed behind a TLS-inspecting proxy; harmless otherwise).
# Applies to Maven, forked test JVMs and the running app (which calls Google/Facebook over HTTPS).
$env:JAVA_TOOL_OPTIONS = '-Djavax.net.ssl.trustStoreType=Windows-ROOT'
# Playwright browsers live inside the project, not in the per-user cache.
$env:PLAYWRIGHT_BROWSERS_PATH = "$root\.tools\ms-playwright"
# .tools\mssql-jdbc-auth holds the DLL for Windows authentication to SQL Server (Java finds native DLLs via PATH).
$env:PATH = "$root\.tools\node;$root\.tools\mssql-jdbc-auth;$root\maven\bin;$env:JAVA_HOME\bin;$env:PATH"

Write-Host "EShop dev env:" -ForegroundColor Green
Write-Host "  node  $(node -v)"
Write-Host "  java  $(& java -version 2>&1 | Select-String ' version' | Select-Object -First 1)"
Write-Host "  mvn   $(& mvn -v 2>$null | Select-String 'Apache Maven' | Select-Object -First 1)"
