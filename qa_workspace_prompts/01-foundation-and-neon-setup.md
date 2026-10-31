# Step 01 --- Foundation, Neon Setup, and Authentication

Bertindak sebagai senior full-stack engineer. Siapkan fondasi QA
Workspace saja; jangan membangun seluruh produk. Baca `README.md`
terlebih dahulu dan inspeksi repository sebelum mengubah apa pun.

## Target stack

Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui bila
sesuai, Neon PostgreSQL, Drizzle ORM (kecuali Neon agent skills
menyarankan pendekatan lain), Zod, dan Neon Auth bila tersedia serta
sesuai.

Tidak perlu backend service terpisah. Next.js adalah full-stack
application: Server Components untuk read, Server Actions untuk mutasi,
Route Handlers untuk endpoint HTTP khusus.

## Neon setup --- ikuti instruksi ini

1.  Install Neon CLI:

    ``` bash
    npm i -g neon@latest
    ```

    If that fails, use `npx neon@latest` in place of `neon`.

    If a neon command opens a browser sign-in, tell me to finish it
    there. If that times out or fails, ask me to run `neon login`, then
    retry. Jangan melewati autentikasi atau meminta saya membagikan
    credential.

2.  In the project root:

    ``` bash
    neon init -y --org-id org-wispy-truth-17567578 --project-id still-shape-19809042 --branch production --services postgres,auth,ai-gateway,object-storage,functions,realtime
    ```

3.  Run:

    ``` bash
    neon deploy
    ```

    It provisions the services in `neon.ts` and pulls their environment
    variables into `.env.local` (or `.env` if it exists).

4.  Wire services into the app using those environment variables.
    Consult installed Neon agent skills for best practices, especially
    the database driver for the app architecture and hosting runtime.

5.  Prove it works:

    -   `npm run build` must pass.
    -   Start the app.
    -   Test each service that has actually been wired end-to-end.
    -   Report what changed, command output proving step 5, and anything
        that failed.

## Service scope clarification

Jalankan provisioning sesuai perintah di atas. Provisioning bukan
berarti semua service harus menjadi fitur produk saat ini: -
**Postgres:** wajib di-wire dan diuji end-to-end. - **Auth:** wire dan
uji jika Neon Auth tersedia dan cocok untuk autentikasi aplikasi. - **AI
Gateway, object storage, functions, realtime:** jangan membangun fitur
yang bergantung padanya pada tahap ini. Jika diprovision tetapi belum
digunakan, nyatakan secara eksplisit bahwa belum di-wire karena di luar
scope MVP. Jangan membuat integrasi dummy demi mengklaim semua service
telah digunakan. Jika provisioning mengharuskan keputusan tambahan,
jelaskan konsekuensinya; jangan diam-diam mengubah perintah.

## Tasks

1.  Inspect current repository, package manager, Next.js version,
    scripts, and existing implementation.
2.  Initialize/adapt Next.js App Router without overwriting valid work.
3.  Configure TypeScript, Tailwind, linting/formatting, and minimal app
    shell.
4.  Execute Neon setup. Jika browser sign-in diperlukan, stop dan minta
    saya menyelesaikannya.
5.  Read installed Neon agent skills. Follow their guidance for driver,
    pooling, serverless runtime, migrations, and env vars.
6.  Configure Drizzle and repeatable migration workflow.
7.  Create only initial schema needed now: user/profile mapping (as
    required by auth), workspace, workspace membership. Do not prebuild
    future tables.
8.  Implement sign-in/sign-out, server-side session retrieval, protected
    application area, and authorization utilities.
9.  Add minimal authenticated home page and useful empty state.
10. Add `.env.example` with variable names only. Ensure actual
    `.env`/`.env.local` and secrets are ignored by Git.
11. Document local setup and migration commands.

## Architecture/security

Use a Neon-compatible driver suited to selected runtime. Keep database
access server-side. Check session and authorization inside every
protected action. Avoid leaking SQL errors/secrets. Use migrations, not
ad hoc production schema mutation.

## Out of scope

Project/module management, test cases, test plans/runs, dashboard
analytics, CSV, GitHub, evidence upload, AI features, and notifications.

## Acceptance criteria

-   App starts locally; sign-in/sign-out work.
-   Unauthenticated users cannot access protected pages/actions.
-   Authenticated user can access minimal app shell.
-   Demonstrate safe database read/write.
-   Migration workflow is repeatable and documented.
-   `npm run build` passes.
-   Services not wired are explicitly listed; do not claim they were
    tested.
-   Report files changed, architecture decisions, commands and actual
    output, end-to-end checks, failures, and remaining work.

Do not fabricate command output. Stop for required browser sign-in or
permission approval.
