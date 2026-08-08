# BASELINE REGRESSION CHECKLIST — Hafalan Digital

**Baseline commit:** `2dc109a`
**Tanggal dibuat:** 2026-08-09
**Branch:** `master`
**Status:** Baseline sebelum Fase Modularisasi (Tahap 1 — dokumentasi saja, tidak ada kode diubah)

Dokumen ini adalah patokan permanen. Setiap modularisasi/refactor berikutnya **harus dibandingkan terhadap checklist ini** — jika suatu item berubah perilakunya tanpa keputusan bisnis eksplisit, itu regresi, bukan perbaikan. Dokumen ini **tidak** mengaudit ulang arsitektur atau security dari nol — sumbernya adalah audit arsitektur, audit RLS Access Matrix, audit Tahap 4A, dan kode aktual HEAD `2dc109a` yang sudah diverifikasi sepanjang Security Fix Tahap 1–4 pada sesi ini.

Security Fix Tahap 1–4 (RLS `nilai_ujian`, `absensi_guru`/`kalender_akademik`/`surah`, `profiles`, `santri`/`setoran`) sudah selesai dan **tidak diaudit ulang di sini** — hanya dicatat sebagai invariant di Bagian 5.

---

## 1. GURU (`app/guru/page.tsx`, `app/api/setoran/route.ts`, `app/api/nilai-ujian/route.ts`, `app/api/guru/rapot-digital-rekap-kelas/route.ts`)

### Auth / Dashboard
- [ ] CRITICAL — Guru dapat login, diarahkan ke `/guru`, profile (termasuk `jenis_kelas`) terbaca dan dashboard terbuka

### Santri
- [ ] CRITICAL — Guru melihat daftar santri penugasan utama (`guru_id`/`guru_id_2 = self`, `status='aktif'`, digabung-dedupe)
- [ ] Hanya santri `status='aktif'` yang tampil untuk operasional harian (input setoran, pilih santri)
- [ ] CRITICAL — Mapping jenis_kelas Guru → santri yang bisa diakses: `banin`→`banin`; `banat`→`banat`+`tn_a`+`tn_b`; `tn`→`tn_a`+`tn_b` (bukan equality murni); Guru `banin` DENY ke Banat/TN

### Guru Pengganti
- [ ] CRITICAL — Toggle "Guru Pengganti" tetap berfungsi (state client, kolom `setoran.guru_pengganti` sebagai catatan, bukan otorisasi)
- [ ] Guru pengganti tetap bisa lintas jenjang (Ula/Wustha/Ulya) selama jenis_kelas santri sesuai mapping wing guru — DENY/ALLOW mengikuti mapping yang sama seperti operasional normal, bukan diperluas
- [ ] `setoran.guru_id` selalu ter-force ke identitas guru yang login (server), tidak pernah dikirim dari client

### Setoran
- [ ] CRITICAL — Guru dapat input Hafalan Baru (jenis=`baru`) dan Hafalan Lama/Murojaah (jenis=`lama`)
- [ ] Guru dapat input kehadiran-saja (status_kehadiran ≠ `hadir`: sakit/izin/alpha) tanpa data hafalan
- [ ] CRITICAL — Duplicate-check setoran (santri_id+tanggal+jenis+status_kehadiran) tetap mencegah input ganda, termasuk lintas guru (guru pengganti vs guru asli)
- [ ] CRITICAL — Guru dapat edit setoran miliknya sendiri, TIDAK bisa edit setoran guru lain (ditegakkan RLS `setoran_update_guru_own`, bukan hanya UI-trust)
- [ ] Riwayat setoran (tab Riwayat) menampilkan seluruh entri milik guru sendiri, termasuk untuk santri yang sekarang sudah alumni/nonaktif

### Business Rule Jenjang
- [ ] Ula: wajib setor Murojaah (lama) hari ini sebelum bisa input Hafalan Baru; Wustha: dua sesi (lama+baru); Ulya: hanya Hafalan Lama
- [ ] CRITICAL — Wustha: Hafalan Baru terkunci jika record Hafalan Lama terbaru berstatus **Rosib**; terbuka lagi setelah **Najih (lancar)**

### Auto Progress Santri
- [ ] CRITICAL — Setelah input Hafalan Baru sukses, posisi hafalan santri (`total_hafalan_juz`, `surah_terakhir_nomor`, `ayat_terakhir`) tetap ter-update — sekarang server-side di `/api/setoran`, bukan direct browser UPDATE
- [ ] Baseline pertama (santri belum punya data hafalan) tetap dihitung dari surah yang diinput sampai An-Nas (114)
- [ ] Update posisi hafalan HANYA berjalan untuk jenis=`baru`, status=`lancar`, dengan kemajuan maju (bukan mundur/statis)

### Nilai Ujian & Rapot Digital (Guru)
- [ ] Guru dapat input nilai ujian per segment via `POST /api/nilai-ujian`, mengikuti `master_segment_ujian` (151 segmen aktif)
- [ ] Partial juz dan full juz existing tetap tertangani (termasuk tampilan "nilai lama" untuk juz yang sudah pernah dinilai)
- [ ] CRITICAL — Rekap Kelas Rapot Digital (termasuk fallback kelas_snapshot kosong) tetap menampilkan santri alumni/nonaktif sebagai arsip historis, via `/api/guru/rapot-digital-rekap-kelas`

Catatan: Rapot Digital belum dianggap sempurna (business logic existing) — jangan diperbaiki pada tahap modularisasi ini.

---

## 2. WALI (`app/wali/page.tsx`, `app/api/wali/ranking-data/route.ts`)

- [ ] CRITICAL — Wali dapat login, diarahkan ke `/wali`, dan hanya melihat data anak miliknya sendiri (`wali_id = auth.uid()`) — tidak ada santri lain di base-table
- [ ] Jika wali punya >1 anak, pemilihan santri (`handlePilihSantri`) tetap berfungsi dan memuat ulang data anak yang dipilih
- [ ] Ringkasan anak, laporan/setoran hari ini, dan riwayat setoran (30 terakhir) tetap tampil benar untuk anak yang dipilih

### Ranking
- [ ] CRITICAL — Ranking Total Hafalan, Konsistensi, dan Semangat tetap konsisten dengan data classmates dari `/api/wali/ranking-data` — rumus perhitungan (poin per hari aktif, dedup tanggal+jenis, aturan Ulya hanya `jenis='lama'`) TIDAK diubah, hanya sumber data classmates
- [ ] Posisi ranking anak wali harus SAMA dengan posisi yang dilihat Admin/Kepsek untuk santri yang sama pada periode yang sama (sumber data classmates lengkap, tidak terpotong)
- [ ] CRITICAL — Endpoint `/api/wali/ranking-data` tetap menjadi satu-satunya sumber classmates untuk Wali (tidak boleh kembali ke direct query `santri`/`setoran` classmates dari browser)
- [ ] CRITICAL — PII teman sekelas (NIK, NISN, alamat, tanggal lahir, wali_id, guru_id, catatan) tidak boleh terbuka ke Wali — hanya field minimal yang sudah ditentukan (lihat Bagian 5)

### Nilai Ujian (Wali)
- [ ] CRITICAL — Nilai Ujian sudah dihapus dari dashboard Wali (Security Fix Tahap 1) — jangan dimunculkan kembali pada modularisasi ini

---

## 3. ADMIN (`app/admin/page.tsx`)

### Santri
- [ ] CRITICAL — Admin dapat CRUD santri penuh (list, tambah, edit, hapus), termasuk mengelola alumni & santri keluar (`AlumniList`)
- [ ] Naik Kelas tetap berfungsi (mutasi `kelas_num`/`jenjang`/`status`, reset `guru_id`)
- [ ] Admin dapat melihat SEMUA status santri (termasuk non-aktif) di caller yang memang membutuhkannya (dashboard utama vs rekap alumni vs fallback rapot)

### Guru / Wali
- [ ] Admin dapat mengelola data Guru (tambah/edit, termasuk `jenis_kelas`, `is_wali_kelas`, `wali_kelas_num`/`jenis`) dan data Wali (relasi ke santri via `wali_id`)
- [ ] Update profile/penugasan existing (guru_id/guru_id_2 santri) tetap berfungsi
- [ ] Wali Kelas existing (`profiles.is_wali_kelas`+`wali_kelas_num`+`wali_kelas_jenis`) tetap terbaca untuk keperluan Raport Hifzh (signer)

### Monitoring & Ranking
- [ ] CRITICAL — Admin dapat memonitor setoran hari ini (semua santri), deteksi Rosib dan "belum input", dengan filter existing (jenjang/kelas/kelompok)
- [ ] Download monitoring Excel (`monitoring-setoran-excel`) tetap berfungsi dan tetap admin-gated
- [ ] Ranking Total Hafalan, Konsistensi, Semangat tetap tampil di Admin sesuai algoritma existing

### Nilai Ujian (Admin)
- [ ] Rekap Nilai Ujian Admin (`AdminRekapNilaiUjian`) dan filter existing (periode/jenjang/kelas/kelompok) tetap berfungsi
- [ ] Export/download Raport Hifzh Excel (`nilai-ujian-excel`) tetap berfungsi, admin-gated

### Kalender
- [ ] CRITICAL — Admin dapat CRUD Kalender Akademik (read/create/edit/delete); semua role authenticated tetap bisa membaca (SELECT terbuka)

### Raport Hifzh & Rapot Digital
- [ ] Download/export Raport Hifzh Excel existing tetap berfungsi dengan template `.xlsx` yang sama
- [ ] Signer Wali Kelas existing (dicari dari `profiles.is_wali_kelas`+`wali_kelas_num`+`wali_kelas_jenis`, assignment TERKINI) tetap berfungsi
- [ ] Kemampuan existing Rapot Digital Admin (input/edit nilai per periode, cetak PDF) tetap berfungsi, termasuk akses ke data historis/alumni (Admin SELECT=ALL)

Catatan: Rapot Digital belum dianggap sempurna dan Raport Hifzh belum punya Tajwid/tanda tangan digital — keduanya bukan cakupan modularisasi Tahap 1, lihat Bagian 7 (Deferred).

---

## 4. KEPSEK (`app/kepsek/page.tsx`)

- [ ] CRITICAL — Kepsek dapat login dan profile terbaca
- [ ] CRITICAL — Kepsek dapat memonitor SEMUA santri (termasuk non-aktif, tanpa filter status — perilaku existing)
- [ ] CRITICAL — Kepsek dapat memonitor SEMUA setoran (tanpa filter guru/santri, hanya tanggal)
- [ ] Ranking (Total/Konsistensi/Semangat) tetap tampil untuk Kepsek dengan cakupan sekolah penuh
- [ ] Kepsek dapat melihat Absensi Guru (`absensi_guru`, read-all sesuai RLS Tahap 2)
- [ ] Laporan yang sekarang tersedia (Laporan Bulanan PDF/Excel, admin+kepsek gated) tetap dapat diakses Kepsek
- [ ] CRITICAL — Kepsek tetap read-only — tidak ada mutation santri/setoran/absensi_guru dari dashboard Kepsek (0 call site mutation, jangan ditambah saat modularisasi)

---

## 5. SECURITY YANG SUDAH FINAL (INVARIANT — TIDAK DIAUDIT ULANG DI SINI)

Refactor/modularisasi berikutnya **tidak boleh mengembalikan** kondisi berikut ke keadaan sebelum Tahap 1–4:

- [ ] CRITICAL — `nilai_ujian`: Wali = NONE (SELECT/INSERT/UPDATE/DELETE semua ditolak); Kepsek = SELECT saja; Guru/Admin akses sesuai API existing (service-role setelah gate role)
- [ ] `profiles`: RLS scoped — own row untuk semua role; Admin SELECT/UPDATE semua; Kepsek SELECT tambahan `role='guru'`; tidak ada INSERT/DELETE `authenticated`
- [ ] `absensi_guru`: Guru hanya baca/tulis milik sendiri; Kepsek SELECT semua; tidak ada UPDATE policy
- [ ] `kalender_akademik`: SELECT terbuka untuk semua authenticated; mutation admin-only
- [ ] `surah`: SELECT-only untuk semua authenticated, tidak ada mutation dari browser
- [ ] CRITICAL — `santri`/`setoran`: sesuai target Security Fix Tahap 4 (Admin=ALL; Kepsek=SELECT-ALL; Guru=SELECT/INSERT scoped mapping jenis_kelas + status aktif, plus SELECT own-row setoran; Wali=own child saja)
- [ ] CRITICAL — Guru hanya bisa UPDATE setoran miliknya sendiri (`guru_id = auth.uid()`), ditegakkan RLS
- [ ] CRITICAL — Wali mengambil data classmates untuk ranking HANYA lewat endpoint server (`/api/wali/ranking-data`), tidak pernah raw PII/base-table langsung
- [ ] Helper `current_user_role()` dan `current_user_can_access_jenis_kelas()` tidak boleh diubah tanpa keputusan bisnis eksplisit baru

---

## 6. API / REPORT / AUTOMATION — ENDPOINT YANG TIDAK BOLEH HILANG

**Setoran**
- `POST /api/setoran` — input setoran + auto-update progress hafalan (Bearer, role=guru)

**Nilai Ujian**
- `GET/POST /api/nilai-ujian` — input & baca nilai ujian Guru (Bearer, `authorizeGuru`, service-role)
- `GET/PATCH /api/admin/nilai-ujian` — rekap & koreksi nilai ujian Admin (Bearer, `authorizeAdmin`)
- `GET /api/admin/nilai-ujian-excel` — export Raport Hifzh Excel (Bearer, admin)

**Ranking / Laporan**
- `GET /api/laporan-peringkat-pdf` — ranking PDF (Bearer, admin)
- `GET /api/laporan-bulanan-pdf` / `GET /api/laporan-bulanan-excel` — laporan bulanan (Bearer, admin+kepsek)
- `GET /api/monitoring-setoran-excel` — monitoring Rosib/belum-input (Bearer, admin)

**Raport Hifzh / Rapot Digital**
- `GET /api/admin/nilai-ujian-excel` — Raport Hifzh (lihat di atas)
- `GET /api/rapot-pdf` — Rapot Digital PDF (Bearer, admin)
- `GET /api/guru/rapot-digital-rekap-kelas` — rekap kelas Rapot Digital Guru, termasuk alumni (Bearer, role=guru, service-role)

**Ranking Wali**
- `GET /api/wali/ranking-data` — classmates untuk 3 ranking Wali, field minimal (Bearer, role=wali, service-role)

**Notification / Cron**
- `POST /api/send-notif` — 6 fungsi notifikasi (WA+Push): notifWali, notifWaliPush, reminderGuru, reminderGuruPush, notifNaikPeringkat, notifWaliKelas (gate `CRON_SECRET`)
- `GET /api/cron` — relay scheduler eksternal → `send-notif` (gate `CRON_SECRET`)
- `POST /api/push/subscribe`, `POST /api/push/check`, `POST /api/push/test` — push subscription lifecycle (Bearer, guru/wali)

**Import / User Management**
- `POST /api/import-excel` — import massal santri (Bearer, admin)
- `POST /api/import-wali` — import/link akun wali (Bearer, admin)
- `POST /api/create-user` — buat akun guru/wali (Bearer, admin)

**Monitoring / Download**
- `GET /api/download-data` — export data santri+guru Excel (Bearer, admin)
- `GET /api/download-template` — template import (tanpa auth, tidak akses DB)

---

## 7. DEFERRED — JANGAN DIKERJAKAN SAAT MODULARISASI KECUALI DIMINTA

- Penyempurnaan Rapot Digital (logic/UI)
- Sistem Guru Mapel
- Sistem Penugasan Guru baru (formal, menggantikan mapping jenis_kelas + guru_id/guru_id_2)
- Tajwid manual per Juz
- Tanda tangan digital (Raport Hifzh / Rapot Digital)
- Modul alumni lebih lengkap (database alumni+wali terpisah)
- Cleanup duplicate/historical SQL (mis. 116 kelompok duplikat setoran historis)
- Perubahan business rule setoran (Ula/Wustha/Ulya, duplicate-check, guru pengganti)
- Redesign besar database / penambahan UNIQUE constraint pada `setoran`

---

## 8. TEMUAN — PERBEDAAN ANTARA ASUMSI LAMA DAN KODE AKTUAL

Dicatat di sini karena relevan untuk modularisasi berikutnya (bukan untuk diperbaiki sekarang):

- Draft audit arsitektur lama menyebut 4 route laporan (`rapot-pdf`, `laporan-peringkat-pdf`, `laporan-bulanan-pdf/excel`) dan `import-excel`/`import-wali` "tanpa auth sama sekali" — **sudah tidak akurat**, semua sudah admin/kepsek-gated sejak Security Fix awal sesi ini (commit `d623c7c`).
- Draft RLS Access Matrix awal menyatakan "Guru UPDATE/DELETE setoran: tidak ada kemampuan" — **ditemukan tidak akurat** saat Tahap 4A: `handleSimpanEditSetoran` memang melakukan UPDATE nyata (sudah diperbaiki jadi RLS-scoped di Tahap 4).
- Mapping jenis_kelas Guru→santri **bukan equality murni** seperti asumsi awal Security Fix Tahap 4 — ada kategori ketiga (`tn`) dan overlap (`banat` mengakses `tn_a`/`tn_b`) yang harus direplikasi eksplisit (helper `current_user_can_access_jenis_kelas`), bukan disederhanakan.
- Embedded join PostgREST (`nilai_rapot.select('*, santri:santri_id(...))')`) ikut tunduk pada RLS `santri`, bukan hanya query langsung — ditemukan saat memperbaiki fallback Rapot Digital, relevan untuk modularisasi mana pun yang menyentuh embedded relation ke `santri`/`setoran`.

---

## 9. KONFIRMASI

Dokumen ini murni dokumentasi. Tidak ada file `.ts`/`.tsx`/SQL/schema/UI/API yang diubah untuk menghasilkan checklist ini.
