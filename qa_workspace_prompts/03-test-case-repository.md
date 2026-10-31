# Step 03 --- Test Case Repository

Bertindak sebagai senior full-stack engineer yang memahami QA/test
management. Bangun repository test case reusable. Baca README dan
inspeksi implementasi workspace/project/module.

## Product intent

Test case disimpan terpusat dan digunakan ulang lintas release; jangan
menduplikasi seluruh test case untuk setiap release.

Hierarki: Workspace → Project → Module → Test Case.

## Test case fields

-   Stable ID, misalnya `APP-001`, berdasarkan project key.
-   Title, description/objective.
-   Project, module (opsional).
-   Preconditions.
-   Ordered test steps.
-   Expected result.
-   Priority: Critical, High, Medium, Low.
-   Test type: multi-label.
-   Tags, owner/assignee opsional.
-   Lifecycle: Draft, Ready, Deprecated.
-   Revision/version.
-   Created/updated by dan timestamps.

Test type taxonomy: Positive, Negative, Edge Case, Boundary Value,
Validation, Permission/Security, Integration, Regression, Error
Handling, Performance, Compatibility. Test type boleh lebih dari satu
dan tidak sama dengan priority/lifecycle.

**Pemisahan status:** lifecycle menjelaskan kesiapan test case
(Draft/Ready/Deprecated); execution status menjelaskan hasil satu kali
pengujian (Not Run/Passed/Failed/Blocked/Skipped) dan baru dibuat pada
Step 04. Jangan memakai Passed/Failed sebagai lifecycle.

## Test steps

Setiap step memiliki instruction/action dan optional expected result,
dengan kemampuan add/edit/delete/reorder. Simpan urutan secara
konsisten. Validasi minimum agar test case Ready memiliki title dan
expected result serta informasi yang cukup untuk diuji.

## Repository features

-   List, detail, create, edit, duplicate, deprecate.
-   Search ID/title/description.
-   Filter module, lifecycle, priority, type, owner, tags.
-   Server-side sorting dan pagination.
-   Bulk action aman, misalnya lifecycle atau module.
-   Tabel mudah discan: ID, title, module, priority, type, status,
    updated.
-   Detail page menampilkan seluruh data dan revision history.

## Revision integrity

-   Revision number bertambah pada perubahan substantif.
-   Simpan revision history; revision lama immutable.
-   Jelaskan aturan perubahan substantif vs metadata.
-   Step 04 akan menyimpan snapshot revision ketika test case masuk ke
    test run.
-   Jangan mengimplementasikan test run/execution di tahap ini.

## CSV import/export

-   Export test case ke CSV.
-   Import dengan template/header terdokumentasi.
-   Preview dan validasi sebelum penyimpanan; dukung dry-run.
-   Tampilkan row number dan alasan kegagalan.
-   Tidak boleh mengabaikan invalid row diam-diam.
-   Cegah duplikasi berdasarkan stable ID/aturan yang terdokumentasi.
-   Terapkan batas ukuran dan jumlah row.
-   Handle koma, quote, newline, nilai kosong, encoding, dan header
    invalid.
-   Import tidak boleh menyentuh execution history (belum ada pada tahap
    ini).

## Database

Rancang tabel sesuai kebutuhan, misalnya `test_cases`,
`test_case_steps`, relasi test types/tags, `test_case_revisions`, dan
snapshot revision steps. Sesuaikan konvensi project; hindari
over-normalization. Gunakan transaction untuk operasi multi-table,
FK/index relevan, dan selalu scope ke project/workspace yang authorized.

## UI/UX

Form memisahkan informasi umum, preconditions, steps, expected result.
Revision history mudah ditinjau. CSV flow: pilih file → preview → review
errors → confirm → import summary. Jangan membuat analytics.

## Out of scope

Test plan/run, execution results, evidence upload, Fix Batch,
GitHub/GitLab, Jira, AI, automated testing, dan integrasi eksternal.

## Acceptance criteria

-   CRUD test case dan ordered steps berfungsi.
-   Klasifikasi module/priority/type/tags/lifecycle berjalan.
-   Revision lama tetap dapat dibaca.
-   Search/filter/sort/pagination berfungsi.
-   CSV export valid; import punya preview dan tidak menulis sebelum
    konfirmasi.
-   Isolasi project/workspace terjaga.
-   Migration dan build lulus.
-   Laporkan schema, revision rules, CSV format, command/output
    verifikasi, dan limitations.

Jangan gunakan mock data untuk menggantikan operasi database. Jangan
membangun execution flow sebelum Step 04.
