# Step 05 --- Dashboard, UX Polish, and MVP Validation

Bertindak sebagai senior full-stack engineer dan product-minded QA
tooling engineer. Selesaikan MVP dengan dashboard berguna, UX konsisten,
dan validasi menyeluruh. Inspeksi semua implementasi Step 01--04; jangan
menganggap fitur selesai hanya karena UI ada.

## Dashboard

Semua metrik harus dihitung dari data database aktual dan difilter
berdasarkan authorization.

### Workspace overview

-   Project yang dapat diakses user.
-   Jumlah project aktif.
-   Ringkasan test case per project jika efisien.
-   Test plan/run terbaru.
-   Empty state untuk workspace baru.

### Project overview

-   Total test case dan breakdown lifecycle.
-   Breakdown priority.
-   Active test plans dan latest test runs.
-   Ringkasan hasil run: Passed, Failed, Blocked, Skipped, Not Run.
-   Module tanpa test case jika dapat ditentukan.

### QA perspective

-   Test run yang sedang berjalan.
-   Run progress.
-   Test case belum dieksekusi.
-   Failed/Blocked case.
-   Plan mendekati due date jika due date tersedia.

### Developer perspective

-   Failed case dari run terbaru.
-   Blocked case.
-   Module dengan kegagalan berulang jika histori cukup.
-   Area yang belum memiliki test case atau belum masuk plan jika dapat
    ditentukan.

Jangan mengklaim test coverage hanya dari jumlah test case. Coverage
membutuhkan model requirement/feature scope. Jika data belum cukup,
tampilkan empty state, bukan insight palsu.

## Metric definitions and performance

-   Dokumentasikan definisi setiap metric.
-   Tentukan run mana yang menjadi sumber ringkasan (misalnya latest run
    atau latest completed run).
-   Hindari query N+1; gunakan agregasi database bila sesuai.
-   Dashboard tidak boleh memperlambat halaman secara signifikan.
-   Jangan menampilkan sample metrics sebagai data aktual.

## CSV review

Pastikan import/export benar-benar usable: - Dokumentasikan header dan
contoh format. - Uji encoding, koma, quote, newline, empty value, header
invalid. - Preview/error per row dan hasil import yang jelas. - Export
mengikuti filter atau jelaskan bahwa export mencakup seluruh test case
project. - Import wajib menghormati authorization. - Invalid import
tidak boleh menghasilkan partial write tanpa penjelasan.

## UX audit

Audit sign-in/out, workspace, project, module, test case
CRUD/revision/search/filter, CSV, test plan, test run, execution,
retest, dashboard.

Periksa consistency navigation, breadcrumb, typography, spacing, forms,
tables, loading/empty/success/error states, responsive layout, keyboard
navigation, accessible labels, validation, confirmation. Tidak boleh ada
dead button, fake interaction, halaman kosong, atau menu integrasi yang
belum tersedia.

## Security/reliability audit

-   Authorization seluruh Server Actions, Route Handlers, dan data
    access.
-   Workspace/project isolation.
-   Input validation dan error handling.
-   Environment variable exposure.
-   Query/ORM usage.
-   CSV size/row limits.
-   Transaction untuk operasi multi-table atomik.
-   Revision, snapshot, dan execution history immutable terhadap update
    biasa.
-   Hindari hard delete data yang punya histori.
-   Jangan expose stack trace/secret.

## Testing

Tambahkan/lengkapi test sesuai tooling project: - Unit tests untuk
revision, snapshot, permission, progress. - Integration tests untuk
operasi DB penting bila environment tersedia. - E2E happy path bila
layak. - Manual verification checklist.

Minimal verifikasi: - Tanpa session tidak dapat mengakses protected
page/action. - User workspace lain tidak dapat membaca/mengubah data. -
Viewer tidak dapat mutation. - Update test case tidak mengubah snapshot
run lama. - Retest mempertahankan attempt history. - Dashboard
menghitung data sesuai definisi. - CSV invalid tidak disimpan
diam-diam. - Build, lint, typecheck, tests yang tersedia lulus.

## Tetap out of scope

Tidak ada GitHub/GitLab, Jira/Linear/Slack, webhook/CI/CD, Fix Batch,
developer-to-QA handoff, evidence file upload/object storage, automated
test execution, AI, realtime, notifications, billing, atau paywall.
Jangan menambahkan integrasi hanya untuk memanfaatkan service Neon yang
diprovision.

## Final acceptance

MVP siap untuk pilot dengan data dummy/synthetic jika semua alur utama
end-to-end, dashboard akurat, CSV aman, authorization/isolation
diverifikasi, revision/snapshot/history terjaga, tidak ada mock
interaction, build dan checks lulus, README menjelaskan
setup/env/migration/run, dan tidak ada credential/data internal
perusahaan ter-commit.

## Final report

Laporkan: 1. Fitur selesai. 2. Fitur belum selesai dan alasannya. 3.
Arsitektur dan keputusan data penting. 4. Migration. 5. Command dan
output verifikasi aktual. 6. Hasil test. 7. Known limitations/risks. 8.
Cara menjalankan lokal. 9. Konfirmasi integrasi eksternal belum dibuat.

Jangan klaim build/test lulus jika command belum dijalankan.
