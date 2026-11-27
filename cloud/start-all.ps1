# Starts the Spring Cloud sample, each service in its own PowerShell window (close a window to stop that service).
# Usage (from anywhere):   .\cloud\start-all.ps1            # one instance of each service
#                          .\cloud\start-all.ps1 -Second    # plus a 2nd arithmetic-service on :8083 (see load balancing)
param([switch]$Second)

$cloud = $PSScriptRoot
$devEnv = Join-Path (Split-Path $cloud -Parent) 'dev-env.ps1'

function Start-CloudService([string]$module, [string]$port) {
    $portArg = if ($port) { " `"-Dspring-boot.run.arguments=--server.port=$port`"" } else { '' }
    $title = if ($port) { "$module :$port" } else { $module }
    $cmd = "`$Host.UI.RawUI.WindowTitle = '$title'; . '$devEnv'; Set-Location '$cloud\$module'; mvn -q spring-boot:run$portArg"
    Start-Process powershell -ArgumentList '-NoExit', '-Command', $cmd
}

# Build once so every window starts from compiled classes.
. $devEnv | Out-Null
Push-Location $cloud
mvn -q -DskipTests compile
Pop-Location
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }

Start-CloudService 'discovery-server'
Write-Host 'Waiting for Eureka on :8761 ...'
while (-not (Test-NetConnection localhost -Port 8761 -InformationLevel Quiet -WarningAction SilentlyContinue)) { Start-Sleep 1 }

# Issues the tokens every other service checks (needs the eshop_identity database, db\create-identity-database.sql).
Start-CloudService 'auth-server'
Start-CloudService 'arithmetic-service'
Start-CloudService 'string-service'
if ($Second) { Start-CloudService 'arithmetic-service' '8083' }
# Set $env:AI_PROVIDER (anthropic + ANTHROPIC_API_KEY, or ollama) before running this script to enable AI.
Start-CloudService 'ai-service'
Start-CloudService 'gateway'

Write-Host @'
Started. Give the services ~30 s to register, then:
  Eureka dashboard  http://localhost:8761
  Sign-in pages     http://localhost:9000/login
  Through gateway   http://localhost:8090/api/...   (every API needs a token now, see README "Calling the APIs")
The shop backend and Angular app are started separately (backend: mvn spring-boot:run; frontend: npm run start:gateway).
'@
