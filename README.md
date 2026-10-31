# QA Workspace

QA Workspace is a centralized, multi-tenant test case management platform engineered with Next.js App Router and Neon Serverless PostgreSQL. It delivers end-to-end test case authoring, revision snapshots, test planning, immutable execution runs, append-only retests, and dual-perspective dashboards (QA & Developer).

---

## 🏗️ Architecture & Technology Stack

- **Framework**: Next.js 16 App Router (TypeScript strict mode, React 19 Server Components & Client Components)
- **Styling**: Tailwind CSS
- **Database**: Neon Serverless PostgreSQL (`org-wispy-truth-17567578`, `still-shape-19809042`, branch `production`)
- **ORM & Connection**: Drizzle ORM with `@neondatabase/serverless` using WebSocket connection pooling (`Pool` with `ws`) enabling full multi-statement interactive transactions.
- **Authentication & Security**: Relational session management in PostgreSQL, bcrypt password hashing, HTTP-only secure cookies, and server-side RBAC guards.
- **Validation**: Strict Zod schema validation across all Server Actions.
- **CSV Engine**: RFC 4180 compliant CSV export and two-phase dry-run import parser.

---

## 🚀 Key Modules & Capabilities

### 1. Multi-Tenant Workspaces & RBAC (Step 01)
- Multi-tenant architecture isolating users, workspaces, and team memberships.
- Role-based authorization matrix:
  - **Admin**: Full administrative control, member invitations, workspace management.
  - **Member**: Create, modify, and execute test cases, plans, and runs.
  - **Viewer**: Read-only access across all repository and run entities.

### 2. Projects & Hierarchical Modules (Step 02)
- Project keys normalized to uppercase alphanumeric (e.g., `CORE`, `AUTH`, `PAY`).
- Self-referencing hierarchical module tree per project for structured feature organization.
- Workspace-scoped authorization ensuring cross-tenant data isolation at the SQL query level.

### 3. Test Case Repository & Versioning (Step 03)
- **Sequential Readable IDs**: Zero-padded, project-scoped identifiers (e.g., `CORE-001`, `CORE-002`) generated via atomic database sequence counters.
- **Substantive Change Detection & Revision Snapshots**: Edits to critical fields (title, preconditions, postconditions, steps, expected results) generate an immutable revision record. Metadata changes (priority, type, module) update the live case without polluting the revision log.
- **RFC 4180 CSV Export & Dry-Run Import**: Full import verification phase validating structure, fields, and modules before database persistence.

### 4. Test Plans, Execution Runs & Retest Engine (Step 04)
- **Domain Separation**: Clean relational decoupling between Test Case, Test Plan, Test Run, and Test Execution Result.
- **Execution Snapshot Immutability**: Launching a Test Run binds the exact active revision of each case into `test_run_cases` with foreign key restrict deletion, preventing changes to test cases from altering historic audit trails.
- **Append-Only Retest Engine**: Each execution record in `test_execution_attempts` preserves all consecutive attempts (e.g., `Failed` -> `Failed` -> `Passed`), guaranteeing zero lost failure evidence.
- **Split Execution Runner UI**: Distraction-free two-pane runner (`/test-runs/[runId]`) with real-time test step review, attempt history logs, keyboard shortcuts, and live progress tracking.

### 5. Dual-Perspective Dashboards & Quality Analytics (Step 05)
- **Project Overview Tab**: Quick 3-card workflow hub, overall progress metrics, and recent test run timeline.
- **QA Perspective Tab**: Test case lifecycle distribution (Draft vs Active vs Deprecated), priority breakdowns, in-progress runs, and test plans approaching target completion dates.
- **Developer Perspective Tab**: Actionable defect insights including most recent failure symptoms with actual results, blocked cases requiring technical unblocking, and untested modules with zero test cases.
- **Real Database Aggregations**: 100% computed via SQL `GROUP BY`, `COUNT`, and relational joins. Zero mock metrics or synthetic coverage claims.

---

## 🛡️ Scope Invariants & Boundaries

- **Zero Mock Metrics**: All dashboard metrics reflect genuine records in Neon PostgreSQL. Test case volume is explicitly reported as case count and is never conflated with code coverage.
- **External Integrations Out of Scope**: In strict accordance with the product scope, this platform does not integrate with external third parties:
  - ❌ No Jira, Linear, or GitHub issue syncing.
  - ❌ No Slack or Teams notification webhooks.
  - ❌ No CI/CD automated test pipeline listeners.
  - ❌ No automated test runners (Cypress, Playwright, Jest, etc.).
  - ❌ No AI automated test generation agents.
  - ❌ No external object storage / file upload buckets.

---

## 🗄️ Database Migrations

Database schema files are managed via Drizzle Kit:

1. `drizzle/0000_clammy_shocker.sql`: `users`, `sessions`, `workspaces`, `workspace_members`.
2. `drizzle/0001_fancy_shatterstar.sql`: `projects`, `modules`.
3. `drizzle/0002_heavy_enchantress.sql`: `test_cases`, `test_case_steps`, `test_case_revisions`.
4. `drizzle/0003_past_lockjaw.sql`: `test_plans`, `test_plan_cases`, `test_runs`, `test_run_cases`, `test_execution_attempts`.

---

## 💻 Local Setup & Development

### 1. Prerequisites
- **Node.js**: >= 20.19.0 (v22.12.0 tested)
- **npm**: >= 10.9.0

### 2. Environment Configuration
Create `.env.local` in the project root:
```env
DATABASE_URL="postgresql://<user>:<password>@<neon-host>/tcms?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://<user>:<password>@<neon-host>/tcms?sslmode=require"
SESSION_SECRET="your-32-character-random-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Database Migrations
Apply migrations to your Neon database:
```bash
npm run db:migrate
```

To introspect or generate new migrations:
```bash
npm run db:generate
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm run start
```

---

## 🧪 Automated Verification Test Suite

Comprehensive automated verification scripts test the system end-to-end against the live Neon database:

| Script | Purpose | Command |
|---|---|---|
| `verify-e2e.ts` | Multi-tenant auth, user password hashing, session lifecycle, RBAC checks | `npx tsx src/scripts/verify-e2e.ts` |
| `verify-step-02.ts` | Project creation, key normalization, module hierarchy, role authorization | `npx tsx src/scripts/verify-step-02.ts` |
| `verify-step-03.ts` | Sequential IDs, substantive revision snapshotting, CSV RFC 4180 export/dry-run import | `npx tsx src/scripts/verify-step-03.ts` |
| `verify-step-04.ts` | Test plans, runs, execution snapshot immutability, append-only retest history | `npx tsx src/scripts/verify-step-04.ts` |
| `verify-step-05.ts` | Cross-workspace isolation, viewer restrictions, SQL aggregations, CSV malformed input rejection | `npx tsx src/scripts/verify-step-05.ts` |

Run all tests sequentially:
```bash
npx tsx src/scripts/verify-e2e.ts
npx tsx src/scripts/verify-step-02.ts
npx tsx src/scripts/verify-step-03.ts
npx tsx src/scripts/verify-step-04.ts
npx tsx src/scripts/verify-step-05.ts
```
