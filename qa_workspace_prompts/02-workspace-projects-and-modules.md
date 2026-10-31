# Step 02 --- Workspace, Projects, and Modules

Bertindak sebagai senior full-stack engineer. Implementasikan struktur
organisasi dasar di atas fondasi Step 01. Baca `README.md` dan inspeksi
schema/kode yang sudah ada.

## Model produk

-   User menjadi anggota workspace.
-   Satu workspace memiliki banyak project.
-   Satu project merepresentasikan satu aplikasi/produk.
-   Satu project memiliki banyak module/feature.
-   Semua data harus terisolasi sesuai workspace/project authorization.

Contoh ilustratif: Workspace → Project aplikasi → Module seperti
Submission, Approval Workflow, Distribution. Jangan seed data perusahaan
atau data nyata.

## Workspace

-   List dan create workspace.
-   Tampilkan nama, deskripsi opsional, creator, timestamp.
-   Role minimal: Owner, Admin, Member, Viewer.
-   Owner: kontrol penuh. Admin: mengelola workspace/project/member
    kecuali transfer atau hapus owner. Member: mengelola konten sesuai
    permission. Viewer: read-only.
-   Tidak perlu invitation email atau identity-provider integration.
    Jika perlu menambah anggota, gunakan mekanisme internal yang aman
    dan dokumentasikan batasannya.

## Project

-   List, create, view, edit, archive, dan restore project.
-   Field: name, key/slug unik per workspace, description, status
    Active/Archived, created_by, timestamps.
-   Project key stabil untuk membentuk ID test case pada tahap
    berikutnya.
-   Archived project tidak menerima perubahan konten baru kecuali
    restore oleh role berwenang.

## Module/Feature

-   CRUD module dalam project.
-   Field: name, description, parent_module_id opsional, status
    Active/Archived, timestamps.
-   Batasi satu level jika nested module menambah kompleksitas
    berlebihan; jelaskan keputusan.
-   Terapkan uniqueness nama module per project jika sesuai.
-   Archive module tanpa menghapus test case/histori terkait.

## UI/UX

-   Workspace/project navigation dan project switcher.
-   Breadcrumb Workspace → Project → Module.
-   Halaman list, detail, create/edit, empty state.
-   Form konsisten dengan loading, success, validation error, failure
    feedback.
-   Responsive desktop/tablet/mobile; jangan tampilkan menu integrasi/AI
    yang belum ada.

## Data/security

-   Buat Drizzle migrations.
-   Gunakan FK, unique constraints, dan indexes relevan.
-   Setiap query/mutation memverifikasi membership dan akses
    workspace/project; jangan percaya ID dari browser.
-   Validasi payload server-side dengan Zod.
-   Gunakan transaction untuk operasi multi-record.
-   Archive/restore, bukan hard delete untuk data yang punya relasi
    penting.
-   Jangan expose data workspace lain melalui query maupun error.

## Out of scope

Belum ada test case, test plan/run, dashboard analytics, CSV, GitHub,
Jira, evidence upload, atau integrasi eksternal.

## Acceptance criteria

-   Workspace dapat memiliki beberapa project; project memiliki beberapa
    module.
-   Permission dan isolasi antar-workspace/project terbukti.
-   Archive tidak menghapus data turunan.
-   Migration dapat dijalankan pada database Step 01.
-   Build dan pemeriksaan kualitas yang tersedia lulus.
-   Laporkan schema, permission matrix, file berubah, command dan output
    verifikasi, serta known limitations.

Jangan rewrite fondasi Step 01. Pilih perubahan schema terkecil yang
konsisten.
