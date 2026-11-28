# EShop

A sample online store for learning AI-assisted development:

- **backend/**: Java 27, Spring Boot 4.2, JPA and Flyway on Microsoft SQL Server. It is an OAuth2 resource server.
- **cloud/auth-server**: Spring Authorization Server (OAuth2 / OpenID Connect). It owns the accounts and the sign-in, registration and Google/Facebook pages, and issues the JWTs that every service validates.
- **cloud/**: Spring Cloud (Eureka, Gateway), two small microservices, and a Spring AI service that writes product descriptions.
- **frontend/**: Angular 22 with standalone components, signals, Signal Forms, `httpResource`, NgRx (auth and cart) and Angular Material. Sign-in uses Authorization Code + PKCE.
- **Two UIs in one Angular app:**
  - the customer storefront at `/`
  - the back office at `/admin`, a lazy-loaded area for admins only

| Customers | Administrators |
|---|---|
| Register with email/password, or sign in with Google/Facebook | Sign in with email/password only (accounts are seeded, never self-registered) |
| Browse and search products, use the cart, check out | Browse the full product repository, including inactive items, and have product descriptions written with AI |
| See their own orders, edit their profile | See registered users' profiles and order history |
| | See current orders and order history, and move orders through PENDING → PAID → SHIPPED → DELIVERED (or CANCELLED) |

## Toolchain: everything is project-local

No global installs are needed or changed. These are downloaded into the repo (and gitignored):

| Folder | What |
|---|---|
| `maven/` | Apache Maven 3.10.2 |
| `.tools/node/` | Node.js 24 LTS (the machine's global Node is left alone) |
| `.tools/mssql-jdbc-auth/` | `mssql-jdbc_auth-13.6.2.x64.dll`, for Windows authentication to SQL Server |
| `.tools/ms-playwright/` | Playwright's Chromium |

**Open every shell through the dev-env script first.** It changes PATH and environment variables for that session only:

```powershell
. .\dev-env.ps1        # PowerShell
source ./dev-env.sh    # Git Bash
```

It sets:
- `JAVA_HOME` to JDK 27
- `PATH` to include the project's Node, Maven and the auth DLL
- `PLAYWRIGHT_BROWSERS_PATH`
- `JAVA_TOOL_OPTIONS=-Djavax.net.ssl.trustStoreType=Windows-ROOT`. This makes Java trust the Windows certificate store. Without it, Maven downloads (and Google/Facebook calls) fail with `PKIX path building failed` on networks whose proxy inspects TLS.

On a fresh clone, download the tools again with the versions above:
- Maven from maven.apache.org
- the Node win-x64 zip from nodejs.org
- the DLL from Maven Central (`com.microsoft.sqlserver:mssql-jdbc_auth:<driver version>.x64`); its version must match the `mssql-jdbc` version Spring Boot manages
- `npx playwright install chromium`, run inside a dev-env shell

## Database setup (once)

The backend uses the local SQL Server with **Windows authentication** (`integratedSecurity=true`), so no SQL login is needed.

```powershell
sqlcmd -S localhost -E -C -i db\create-database.sql            # "eshop": shop data (products, orders, profiles)
sqlcmd -S localhost -E -C -i db\create-identity-database.sql   # "eshop_identity": accounts (auth server)
copy backend\src\main\resources\application-local.yml.example backend\src\main\resources\application-local.yml
copy cloud\auth-server\src\main\resources\application-local.yml.example cloud\auth-server\src\main\resources\application-local.yml
```

Both `application-local.yml` files are gitignored:
- **The backend's** holds only the database connection.
- **The auth server's** holds the admin email and password (default `admin@eshop.local` / `Admin123!`) and, optionally, Google/Facebook credentials. The auth server reads it automatically.

Flyway creates the tables when each server starts. The backend also creates about 20 sample products.

## Run

```powershell
# terminal 1: sign-in (http://localhost:9000)
. .\dev-env.ps1; cd cloud\auth-server; mvn spring-boot:run
# terminal 2: the shop API
. .\dev-env.ps1; cd backend; mvn spring-boot:run "-Dspring-boot.run.profiles=local"
# terminal 3: the Angular app
. .\dev-env.ps1; cd frontend; npm start
# optional, terminal 4: AI product descriptions (see "AI product descriptions")
. .\dev-env.ps1; cd cloud\ai-service; mvn spring-boot:run
```

Then open:
- Shop: http://localhost:4200
- Back office: http://localhost:4200/admin (sign in as the admin from the auth server's `application-local.yml`)
- API docs: http://localhost:8080/swagger-ui.html

When nothing else is running, set `EUREKA_ENABLED=false` to avoid the Eureka connection warnings.

## Sign-in: OAuth2 / OpenID Connect

`cloud/auth-server` is a Spring Authorization Server on http://localhost:9000.
- **The Angular app** is a public client (`eshop-web`) using **Authorization Code + PKCE**:
  1. "Sign in" sends the browser to the auth server's sign-in page, which also offers registration and Google/Facebook.
  2. The auth server sends the browser back to `/auth/callback?code=…&state=…`.
  3. The app trades the code plus its PKCE verifier for an access token and an ID token.
  4. "Sign out" also ends the auth server's session (OpenID Connect logout).
- **Every API** validates the same tokens: the shop backend, arithmetic-service, string-service and ai-service. They only need the issuer URL (`AUTH_ISSUER`, default `http://localhost:9000`) and fetch the signing keys from it. No shared secret exists anywhere.
- **Tokens** carry `sub` (the account id), `email`, `role` (USER/ADMIN), `provider`, `given_name` and `family_name`. The first time the shop sees a user, it creates their shop record (profile, orders) from these claims.
- **The signing key** is generated at startup. Restarting the auth server therefore ends every session, and users simply sign in again.

### Google / Facebook

1. Create OAuth credentials:
   - **Google:** Google Cloud Console → APIs & Services → Credentials → OAuth client ID (type "Web application").
   - **Facebook:** developers.facebook.com → create an app → add Facebook Login.
2. Set the authorized redirect URI to `http://localhost:9000/login/oauth2/code/google` (or `.../facebook`). This is the auth server, not the shop.
3. Put the client ID and secret in `cloud/auth-server/src/main/resources/application-local.yml` (see the `.example` file).

The buttons only appear on the sign-in page for providers that are configured.

### Calling the APIs from a terminal

The `dev-cli` client gets a machine token, which has no user:
```powershell
$t = (Invoke-RestMethod -Method Post http://localhost:9000/oauth2/token -Body @{grant_type='client_credentials'; scope='api'} `
      -Headers @{Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes('dev-cli:dev-secret'))}).access_token
Invoke-RestMethod http://localhost:8090/api/strings/reverse?text=hello -Headers @{Authorization = "Bearer $t"}
```
- Machine tokens work for arithmetic-service and string-service.
- User APIs (orders, profile) and the admin API need a signed-in user's token.

## AI product descriptions (Spring AI)

`cloud/ai-service` (:8084, admins only) writes a product description from the name, category and a few keywords. It returns typed data (`description` and `highlights`) using Spring AI's structured output.

In the back office, under **Products**, a ✨ button opens a dialog: **Write with AI**, edit the text, then **Apply**. Applying saves it with `PUT /api/admin/products/{id}/description`.

Choose the model with `AI_PROVIDER` when you start the AI service:

| `AI_PROVIDER` | What you need |
|---|---|
| `none` (default) | Nothing. The service starts, and the dialog explains how to enable a model. |
| `anthropic` | `ANTHROPIC_API_KEY` from https://console.anthropic.com. This is billed per use and separate from a Claude Team/Pro subscription. The model is `claude-opus-5-5`; change it with `ANTHROPIC_MODEL`. |
| `ollama` | A free local model: `docker run -d -p 11434:11434 --name ollama ollama/ollama`. The model (`llama3.2`, ~2 GB, set with `OLLAMA_MODEL`) is downloaded on first start. |

```powershell
$env:AI_PROVIDER = 'anthropic'; $env:ANTHROPIC_API_KEY = 'sk-ant-...'; cd cloud\ai-service; mvn spring-boot:run
```

## Spring Cloud sample (`cloud/`)

`cloud/` is a separate Maven multi-module workspace (Spring Cloud 2026.0.0) that demonstrates service discovery and an API gateway. The shop backend also registers in Eureka, as `eshop`, so the whole shop can run through the gateway.

| Module | Port | What |
|---|---|---|
| `discovery-server` | 8761 | Eureka registry. Its dashboard at http://localhost:8761 lists the registered instances. |
| `gateway` | 8090 | Spring Cloud Gateway (Server WebMVC), the single entry point for APIs. It routes `/api/arithmetic/**` → `lb://arithmetic-service`, `/api/strings/**` → `lb://string-service`, `/api/ai/**` → `lb://ai-service`, and the rest of the shop (`/api/**`, Swagger) → `lb://eshop`. It passes the `Authorization` header through; each service checks the token itself. |
| `auth-server` | 9000 | OAuth2 / OpenID Connect authorization server (see "Sign-in"). Not behind the gateway: the issuer has one fixed URL. |
| `ai-service` | 8084 | Spring AI product descriptions (see "AI product descriptions"). |
| `arithmetic-service` | 8081 | `GET /api/arithmetic/{add,subtract,multiply,divide}?a=&b=` and `/power?base=&exponent=` |
| `string-service` | 8082 | `GET /api/strings/{reverse,uppercase,lowercase,capitalize,length,word-count,palindrome}?text=` |

The services register in Eureka under their `spring.application.name`. The gateway looks them up by that name and load-balances round-robin across all instances. Every response has a `servedBy` field, so you can watch the balancing happen.

```powershell
.\cloud\start-all.ps1            # each service in its own window (Eureka first)
.\cloud\start-all.ps1 -Second    # plus a 2nd arithmetic-service on :8083
```

To start the services by hand, run each one in its own dev-env shell, starting with `discovery-server`:
```powershell
cd cloud\<module>; mvn spring-boot:run
```
For an extra instance, run `$env:PORT=8083; mvn spring-boot:run`.

Try these with a token (see "Calling the APIs from a terminal"):
- `/api/arithmetic/divide?a=1&b=3`: call it repeatedly while two instances are up.
- `/api/strings/palindrome?text=Never%20odd%20or%20even`

In STS: **File → Import → Maven → Existing Maven Projects**, select `cloud/`, and run each `*Application` as a Spring Boot App.

### The shop through the gateway

1. Start `discovery-server` and `gateway`.
2. Start the backend as usual. It registers in Eureka as `eshop:8080`.
3. Start the frontend in gateway mode:
   ```powershell
   cd frontend; npm run start:gateway
   ```
   This sends all of `/api` to `:8090`, including `/api/ai`. Sign-in still goes directly to the auth server on `:9000`.

`npm start` talks to the backend (`:8080`) and the AI service (`:8084`) directly. The backend works without Eureka; it only logs connection warnings. To switch registration off entirely, set `EUREKA_ENABLED=false`.

## Serve the app from the backend (`/eshop`)

The backend can also serve the built Angular app from a folder on disk, so one server (:8080) hosts both the UI and `/api`:

```powershell
cd frontend; npm run build:backend     # ng build with <base href="/eshop/">, into frontend/dist/frontend/browser
cd backend; mvn spring-boot:run "-Dspring-boot.run.profiles=local"
```

Then open http://localhost:8080/eshop/. The auth server must be running as usual, and for AI descriptions also ai-service.

| Setting (env var) | Default | What |
|---|---|---|
| `FRONTEND_DIR` | `../frontend/dist/frontend/browser` (relative to `backend/`) | The folder served at `/eshop/`. If it has no `index.html`, the backend is API-only and logs that. |
| `AI_SERVICE_URL` | `http://localhost:8084` | Where the backend forwards `/api/ai/**`, together with the caller's token. |
| `ESHOP_BACKEND_URL` (auth server) | `http://localhost:8080` | The auth server accepts `<this>/eshop/auth/callback` as a redirect, and this origin for CORS, next to the dev server's. |

How it works:
- Files that exist are returned as they are. Every other path under `/eshop/` gets `index.html`, so deep links and reloads (`/eshop/admin/orders`) work. `/` and `/eshop` redirect to `/eshop/`.
- The folder is read on each request, so a new build shows up without restarting the backend.
- The app works under any base path, because its sign-in callback and sign-out URLs are resolved against `<base href>`.

## Tests

| Command (inside a dev-env shell) | What runs |
|---|---|
| `cd backend; mvn test` | Backend unit tests and `@WebMvcTest` slice tests (no DB, no Docker) |
| `cd backend; mvn verify` | Everything above, plus `*IT` integration tests against SQL Server 2022 in Docker (**Docker Desktop must be running**) |
| `cd frontend; npm test` | Angular unit tests (Vitest), in watch mode |
| `cd frontend; npm run test:ci` | Angular unit tests, single run |
| `cd cloud; mvn verify` | All `cloud/` modules, covering:<ul><li>unit and controller tests</li><li>gateway routing and load balancing against stub services</li><li>the AI service against a fake chat model (no API key)</li><li>the auth server's real OAuth2 flows (PKCE sign-in, registration, client credentials) against SQL Server in Docker (**Docker Desktop must be running**)</li></ul> |
| `cd frontend; npm run e2e` | Playwright end-to-end tests through the real sign-in pages. **The auth server and the backend must be running**, with the admin seeded. Override the admin with `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`. |
