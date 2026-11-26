# Puts the project-local toolchain on PATH for THIS bash session only.
# Usage (from the repo root):   source ./dev-env.sh
# Nothing machine-wide is changed; open a new shell to get the global tools back.

ESHOP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export JAVA_HOME="/c/Program Files/Java/jdk-27"
# Make Java trust the Windows certificate store (needed behind a TLS-inspecting proxy; harmless otherwise).
# Applies to Maven, forked test JVMs and the running app (which calls Google/Facebook over HTTPS).
export JAVA_TOOL_OPTIONS="-Djavax.net.ssl.trustStoreType=Windows-ROOT"
# Playwright browsers live inside the project, not in the per-user cache.
export PLAYWRIGHT_BROWSERS_PATH="$ESHOP_ROOT/.tools/ms-playwright"
export PATH="$ESHOP_ROOT/.tools/node:$ESHOP_ROOT/.tools/mssql-jdbc-auth:$ESHOP_ROOT/maven/bin:$JAVA_HOME/bin:$PATH"

echo "EShop dev env: node $(node -v), $(java -version 2>&1 | grep -m1 ' version'), $(mvn -v 2>/dev/null | grep -m1 'Apache Maven')"
