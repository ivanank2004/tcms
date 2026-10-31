# QA Workspace

Centralized, multi-project test case management platform designed for QA and engineering teams.

---

## Architecture & Technology Stack

- **Framework**: Next.js App Router (TypeScript strict, React 19)
- **Styling**: Tailwind CSS
- **Database**: Neon Serverless PostgreSQL
- **ORM & Migrations**: Drizzle ORM (`@neondatabase/serverless` with WebSocket connection pooling & transaction support)
- **Authentication**: Secure HTTP-only session management with bcrypt credential hashing, relational session tracking in PostgreSQL, and server-side authorization guards.
- **Validation**: Zod schema validation for all server actions.

---

## Provisioned Services Scope Status

Per Step 01 instructions, services were provisioned via Neon CLI:
- **Postgres**: Wired and fully verified end-to-end (transactions, migrations, relational queries).
- **Auth**: Fully operational via PostgreSQL session and user models. Neon Auth environment parameters (`NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`) are loaded for future JWT token verification.
- **Object Storage, Functions, Realtime**: Provisioned in Neon infrastructure, but **explicitly not wired into MVP application logic** at this phase to maintain lean MVP scope.
- **AI Gateway**: Disabled on Neon Free plan and explicitly out of scope for MVP.

---

## Local Setup & Development

### 1. Prerequisites
- Node.js >= 20.19.0 (v22.12.0 tested)
- npm >= 10.9.0

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Neon connection strings:
- `DATABASE_URL` (Pooled connection string)
- `DATABASE_URL_UNPOOLED` (Direct connection string for migrations)

### 3. Database Migrations
Generate SQL migrations from schema:
```bash
npm run db:generate
```
Apply migrations to Neon PostgreSQL:
```bash
npm run db:migrate
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 5. Production Build
```bash
npm run build
```

### 6. End-to-End Verification
To verify the full database connection, transaction integrity, user hashing, session creation, and authorization matrix against the live Neon database:
```bash
npx tsx src/scripts/verify-e2e.ts
```
