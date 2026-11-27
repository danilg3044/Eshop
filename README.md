# EShop

A sample online store for learning AI-assisted development:

- **backend/**: Java 27, Spring Boot 4.2, Spring Security (JWT + Google/Facebook OAuth2), JPA, and Flyway on Microsoft SQL Server.
- **frontend/**: Angular 22 with standalone components, signals, Signal Forms, `httpResource`, and Angular Material.
- **Two UIs in one Angular app:**
  - the customer storefront at `/`
  - the back office at `/admin`, a lazy-loaded area for admins only

| Customers | Administrators |
|---|---|
| Register with email/password, or sign in with Google/Facebook | Sign in with email/password only (accounts are seeded, never self-registered) |
| Browse and search products, use the cart, check out | Browse the full product repository, including inactive items |
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
sqlcmd -S localhost -E -C -i db\create-database.sql      # creates the empty "eshop" database
copy backend\src\main\resources\application-local.yml.example backend\src\main\resources\application-local.yml
```

Edit `application-local.yml` (it's gitignored):
- the admin email and password
- optionally, Google/Facebook credentials

Flyway creates the tables and about 20 sample products when the backend starts.

## Run

```powershell
# terminal 1
. .\dev-env.ps1; cd backend; mvn spring-boot:run "-Dspring-boot.run.profiles=local"
# terminal 2
. .\dev-env.ps1; cd frontend; npm start
```

- Shop: http://localhost:4200
- Back office: http://localhost:4200/admin (sign in as the admin from `application-local.yml`; the default is `admin@eshop.local` / `Admin123!`)
- API docs: http://localhost:8080/swagger-ui.html

## Google / Facebook login

1. Create OAuth credentials:
   - **Google:** Google Cloud Console → APIs & Services → Credentials → OAuth client ID (type "Web application").
   - **Facebook:** developers.facebook.com → create an app → add Facebook Login.
2. Set the authorized redirect URI to `http://localhost:8080/login/oauth2/code/google` (or `.../facebook`).
3. Put the client ID and secret in `application-local.yml` under `spring.security.oauth2.client.registration` (see the `.example` file).

The login buttons only appear for providers that are configured (`GET /api/auth/providers`).

## Spring Cloud sample (`cloud/`)

`cloud/` is a separate Maven multi-module workspace (Spring Cloud 2026.0.0) that demonstrates service discovery and an API gateway. The shop backend also registers in Eureka, as `eshop`, so the whole shop can run through the gateway.

| Module | Port | What |
|---|---|---|
| `discovery-server` | 8761 | Eureka registry. Its dashboard at http://localhost:8761 lists the registered instances. |
| `gateway` | 8090 | Spring Cloud Gateway (Server WebMVC), the single entry point. It routes `/api/arithmetic/**` → `lb://arithmetic-service`, `/api/strings/**` → `lb://string-service`, and everything else of the shop (`/api/**`, `/oauth2/**`, `/login/oauth2/**`, Swagger) → `lb://eshop`. |
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

Try:
- http://localhost:8090/api/arithmetic/divide?a=1&b=3 (call it repeatedly while two instances are up)
- http://localhost:8090/api/strings/palindrome?text=Never%20odd%20or%20even

In STS: **File → Import → Maven → Existing Maven Projects**, select `cloud/`, and run each `*Application` as a Spring Boot App.

### The shop through the gateway

1. Start `discovery-server` and `gateway`.
2. Start the backend as usual. It registers in Eureka as `eshop:8080`.
3. Start the frontend in gateway mode:
   ```powershell
   cd frontend; npm run start:gateway
   ```
   This sends `/api` to `:8090` instead of `:8080`. It also sets the Google/Facebook redirect origin to `:8090`, by swapping `config.ts` for `config.gateway.ts` (the `gateway` configuration in `angular.json`).

`npm start` keeps talking to the backend directly, and the backend works without Eureka: it only logs connection warnings. To switch registration off entirely, set `EUREKA_ENABLED=false`.

**Google/Facebook login through the gateway** also needs `http://localhost:8090/login/oauth2/code/google` (and `/facebook`) added as an authorized redirect URI at each provider. The gateway keeps the `Host` header (`PreserveHostHeader`), so the backend builds its redirect URIs with `:8090`.

## Tests

| Command (inside a dev-env shell) | What runs |
|---|---|
| `cd backend; mvn test` | Backend unit tests and `@WebMvcTest` slice tests (no DB, no Docker) |
| `cd backend; mvn verify` | Everything above, plus `*IT` integration tests against SQL Server 2022 in Docker (**Docker Desktop must be running**) |
| `cd frontend; npm test` | Angular unit tests (Vitest), in watch mode |
| `cd frontend; npm run test:ci` | Angular unit tests, single run |
| `cd cloud; mvn verify` | Spring Cloud sample: unit, controller and Eureka-server tests, plus gateway routing and load-balancing tests against stub services (no Eureka or Docker needed) |
| `cd frontend; npm run e2e` | Playwright end-to-end tests. **The backend must be running** with the admin seeded. Override the admin with `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`. |
