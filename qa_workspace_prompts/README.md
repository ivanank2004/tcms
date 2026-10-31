# QA Workspace --- AI Implementation Prompts

Berikan prompt kepada AI coding agent satu per satu sesuai urutan.
Selesaikan dan verifikasi satu tahap sebelum lanjut ke tahap berikutnya.

## Urutan

1.  `01-foundation-and-neon-setup.md` --- Next.js foundation, Neon,
    database, auth.
2.  `02-workspace-projects-and-modules.md` --- workspace, membership,
    project, module.
3.  `03-test-case-repository.md` --- reusable test case, steps,
    revision, CSV.
4.  `04-test-plans-and-execution.md` --- test plan, test run, execution,
    retest history.
5.  `05-dashboard-and-quality-polish.md` --- dashboard, UX/security
    audit, final MVP validation.

## Product scope

QA Workspace adalah aplikasi web ringan untuk mengelola test case secara
terpusat lintas aplikasi/project. QA dan developer memakai sumber data
yang sama.

Hierarki: Workspace → Project (satu aplikasi) → Module/Feature → Test
Case. Test case reusable lintas release. Test Plan menentukan apa yang
diuji; Test Run mencatat eksekusi aktual. Histori eksekusi tidak boleh
tertimpa ketika test case diperbarui atau diuji ulang.

## Termasuk

-   Next.js full-stack, Neon PostgreSQL, autentikasi dasar.
-   Workspace, project, module.
-   Test case repository, ordered steps, lifecycle, revision.
-   Test plan, test run, execution result, retest history.
-   Dashboard dasar berbasis data aktual.
-   CSV import/export test case.

## Tidak termasuk dalam rangkaian ini

GitHub/GitLab, Jira/Linear, Slack, webhook, CI/CD, deployment
verification, commit/PR association, automated test execution, AI
features, Fix Batch, evidence upload/object storage, realtime
collaboration, notifications, background jobs, billing, atau paywall.
Jangan membuat placeholder yang seolah-olah integrasi tersebut sudah
berfungsi.

## Prinsip teknis umum

-   TypeScript strict, Next.js App Router, Tailwind, dan shadcn/ui bila
    cocok.
-   Server Components untuk read-heavy pages; Server Actions untuk
    mutasi; Route Handlers hanya untuk endpoint HTTP khusus.
-   Pisahkan business logic ke service/repository layer.
-   Validasi input di server (mis. Zod).
-   Authorization wajib diperiksa pada setiap server action/query;
    menyembunyikan tombol bukan security.
-   Gunakan relational constraints, foreign keys, indexes, dan migration
    yang repeatable.
-   Jangan expose secret ke client atau commit `.env*`.
-   Jangan gunakan mock data untuk menggantikan operasi yang seharusnya
    sudah terhubung ke database.
-   Hindari overengineering dan dependency tanpa alasan.

## Cara melanjutkan antar tahap

Minta agent menginspeksi repository dan hasil tahap sebelumnya sebelum
mengubah kode. Pertahankan implementasi valid; jangan rewrite tanpa
alasan. Di akhir setiap tahap, laporkan file yang berubah, keputusan
teknis, migration, command verifikasi dan output aktual, kegagalan,
serta pekerjaan tersisa.

Pilot awal sebaiknya memakai data dummy/synthetic. Jangan masukkan data
internal perusahaan ke hosting/database personal tanpa persetujuan
perusahaan.
