# Step 04 --- Test Plans, Test Runs, and Execution

Bertindak sebagai senior full-stack engineer dan QA workflow designer.
Implementasikan perencanaan serta pencatatan eksekusi menggunakan
repository dari Step 03. Inspeksi seluruh implementasi sebelumnya.

## Bedakan konsep

-   **Test Case:** definisi skenario reusable.
-   **Test Plan:** apa yang akan diuji dan scope kegiatan/release.
-   **Test Run:** satu sesi eksekusi pada environment/build tertentu.
-   **Test Result:** hasil satu attempt untuk satu test case dalam run.

Satu test case dapat digunakan di banyak run. Jangan menduplikasi test
case karena release berbeda.

## Test Plan

Field: name, project, description/objective, scope/notes, target
release/build opsional, environment opsional, planned start/due date
opsional, owner, status Draft/Active/Completed/Archived, timestamps.

Fitur: create/edit/view/archive, add test case dari repository, filter
case berdasarkan module/priority/type/lifecycle, tampilkan jumlah case.
Deprecated case tidak boleh masuk default; jika diizinkan, beri warning
dan minta konfirmasi. Update plan tidak boleh menghapus histori run.

## Test Run

Field: name, test plan, project, environment/build version, assigned
QA/executor, started/completed timestamps, status Not Started/In
Progress/Completed/Aborted, notes.

Fitur: - Buat beberapa run dari satu plan. - Simpan daftar test case
yang termasuk run. - Progress dan status tiap case. - Update plan/case
setelah run dibuat tidak mengubah run lama.

## Snapshot and revision integrity

Saat case masuk run: - Simpan referensi revision dan snapshot title,
preconditions, steps, expected result, serta informasi yang diperlukan
untuk reproduksi. - Update test case repository tidak boleh mengubah
snapshot run. - Detail run historis menampilkan instruksi yang dipakai
ketika eksekusi. - Jangan hard delete test case yang telah
direferensikan; gunakan archive/deprecation dan snapshot.

## Execution workflow

Status per case dalam run: Not Run, Passed, Failed, Blocked, Skipped.

Setiap attempt menyimpan status, actual result/notes, executor,
executed_at, optional duration. Belum perlu file upload/evidence.

### Retest/history

-   Setiap attempt adalah record baru.
-   Retest tidak menimpa result sebelumnya.
-   Tampilkan latest result dan attempt history.
-   Failed lalu Passed harus tetap memperlihatkan kedua attempt.
-   Latest status dapat mengikuti attempt terbaru, tetapi semua attempt
    tetap dapat diakses.
-   Gunakan transaction untuk menjaga konsistensi update attempt dan
    status.

## Progress

Tampilkan total case, Not Run, Passed, Failed, Blocked, Skipped.
Definisikan execution progress secara eksplisit; jangan menghitung Not
Run sebagai Passed. Jangan menyebut jumlah case sebagai test coverage.

## Permissions

Viewer read-only. Member dapat menjalankan test sesuai permission
project. Admin/Owner dapat mengelola plan/run. Periksa authorization
pada setiap server operation dan project scope.

## UI/UX

-   Test plan list/detail.
-   Test run list/detail.
-   Execution view yang efisien untuk QA: navigation antar case,
    snapshot steps, expected result, status controls, actual
    result/notes.
-   Progress indicator dan filter status.
-   Riwayat attempt mudah ditinjau.
-   Confirmation untuk perubahan status run yang berdampak.
-   Empty state yang membantu user memulai.

## Out of scope

Defect tracker, Fix Batch, developer handoff, evidence upload,
GitHub/GitLab, Jira, CI/CD, automated test execution, AI, notifications,
dan integrasi eksternal.

## Acceptance criteria

-   Plan dibuat dari repository.
-   Satu plan menghasilkan beberapa run.
-   Run menyimpan snapshot revision/steps.
-   QA dapat mencatat Passed/Failed/Blocked/Skipped.
-   Retest membuat attempt baru dan histori tidak hilang.
-   Progress sesuai data aktual dan definisi.
-   Update test case tidak mengubah snapshot run lama.
-   Permission/isolasi project benar.
-   Migration dan build lulus.
-   Laporkan schema, progress definition, retest flow, command/output
    verifikasi, dan limitations.
