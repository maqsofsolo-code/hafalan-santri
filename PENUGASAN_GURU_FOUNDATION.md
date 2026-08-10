# Fondasi Sistem Penugasan Guru (Tahap 9B)

Status: **fondasi struktur data saja**. Belum ada UI, belum ada API CRUD,
belum dipakai untuk authorization apapun. Ditulis setelah audit read-only
Tahap 9A (lihat riwayat percakapan / laporan Tahap 9A untuk detail audit
lengkap).

## Tujuan model baru

Menyediakan satu tempat resmi untuk mencatat "guru ini ditugaskan sebagai
apa, untuk siapa/kelas mana, di periode akademik mana" — sebagai fondasi
sebelum menu Penugasan Guru, Guru Mapel, dan perluasan Rapot Digital
dibangun. Tahap 9B **hanya** membangun struktur tabel + RLS dasar; belum
menggantikan mekanisme lama manapun.

## Perbedaan Wing vs Assignment

Sistem existing (diaudit di Tahap 9A) memakai **tiga mekanisme paralel**
yang tidak saling merujuk:

| Mekanisme | Field | Sifat | Dipakai untuk |
|---|---|---|---|
| **Wing** | `profiles.jenis_kelas` (guru) | Kelompok (banyak santri sekaligus), single-value per guru | Input Setoran harian, Guru Pengganti, RLS `santri`/`setoran` |
| **Assignment langsung** | `santri.guru_id` / `guru_id_2` | Per-santri, maks. 2 guru tetap ("Guru Musami'") | Nilai Ujian (Rapot Hifzh), Rapot Digital |
| **Wali Kelas** | `profiles.is_wali_kelas` + `wali_kelas_num` + `wali_kelas_jenis` | Metadata guru, 1 kelas, selalu TERKINI (tanpa periode) | Nama di dokumen cetak, notifikasi WA (saat ini nonaktif) |

Tabel baru di Tahap 9B **tidak menggantikan** ketiganya. Wing
(`profiles.jenis_kelas`) tetap menjadi satu-satunya dasar akses Input
Setoran/Guru Pengganti/RLS `santri`+`setoran` — ini adalah keputusan bisnis
final, bukan kelalaian. Tabel baru memperkenalkan konsep **assignment resmi
per periode akademik**, yang selama ini tidak ada sama sekali di sistem
lama (baik wing maupun `guru_id`/`guru_id_2` maupun `is_wali_kelas` sama
sekali tidak punya dimensi periode/histori).

## Tabel baru

Migration: `supabase/migrations/20260810090000_add_penugasan_guru_foundation.sql`

### `periode_akademik`

Entitas periode resmi (tahun ajaran + semester), terpisah dari
`periode_rapot` existing (label rapot cetak, string bebas tanpa integritas)
dan `kalender_akademik` existing (rentang tanggal event ujian, tanpa label
tahun ajaran). Kolom: `id`, `tahun_ajaran`, `semester` (1/2),
`tanggal_mulai`, `tanggal_selesai`, `is_aktif` (boolean sederhana, belum ada
enforcement "hanya satu aktif" di DB — disengaja, sesuai instruksi tahap
ini), `created_at`, `updated_at`. Unique: `(tahun_ajaran, semester)`.

### `penugasan_hafalan`

Penugasan Guru Hafalan **per santri** per periode. Kolom: `id`, `guru_id`
(FK `profiles.id`), `santri_id` (FK `santri.id`), `periode_id` (FK
`periode_akademik.id`), `is_aktif`, `created_at`, `updated_at`. Unique:
`(guru_id, santri_id, periode_id)`. Maksimal **2 baris aktif** per
kombinasi `santri_id`+`periode_id`, ditegakkan lewat trigger (bukan unique
constraint — lihat bagian Business Rules).

### `wali_kelas_assignment`

Penugasan Wali Kelas per kelas (`jenjang`+`kelas_num`+`jenis_kelas`) per
periode. Kolom: `id`, `guru_id` (FK `profiles.id`), `periode_id` (FK
`periode_akademik.id`), `jenjang` (`ula`/`wustha`/`ulya`), `kelas_num`
(1–12), `jenis_kelas` (**domain santri**: `banin`/`banat`/`tn_a`/`tn_b` —
bukan domain guru `banin`/`banat`/`tn`), `is_aktif`, `created_at`,
`updated_at`. Maksimal **1 baris aktif** per kombinasi
`periode_id`+`jenjang`+`kelas_num`+`jenis_kelas`, ditegakkan lewat partial
unique index.

## Business rules final (Tahap 9B)

1. Role dasar tetap `guru` — tidak ada role baru.
2. `profiles.jenis_kelas` tetap wing/security access untuk setoran — tidak disentuh.
3. Guru Hafalan resmi ditugaskan **per santri**.
4. Satu santri maksimal **2** Guru Hafalan aktif per periode.
5. Satu kelas hanya **1** Wali Kelas aktif per periode.
6. Guru Mapel boleh mengajar mapel sama di banyak kelas — **belum diimplementasikan** (lihat "Belum dimigrasikan").
7. Satu mapel+kelas+periode hanya 1 Guru utama dulu — **belum diimplementasikan**.
8. Semua assignment baru terikat `periode_akademik`.
9. Assignment lama disimpan sebagai histori: baris **tidak pernah di-hard-delete** oleh aplikasi, cukup `is_aktif=false` lalu baris baru dibuat.
10. Guru Pengganti tetap memakai wing/`jenis_kelas` existing — **bukan** `penugasan_hafalan`.
11. TN: `profiles.jenis_kelas` guru tetap boleh `'tn'` (wing gabungan); assignment kelas (`wali_kelas_assignment.jenis_kelas`) boleh spesifik `tn_a`/`tn_b`.
12. `santri.guru_id`/`guru_id_2`, `profiles.is_wali_kelas`/`wali_kelas_num`/`wali_kelas_jenis` **tidak dihapus** sekarang.
13. Rapot Digital belum diperluas ke Guru Mapel sampai authorization-nya memakai assignment baru.

## Bagaimana batas "maksimal 2" dan "maksimal 1" ditegakkan

- **`wali_kelas_assignment` (maksimal 1 aktif per kelas+periode)**: partial
  unique index `wali_kelas_assignment_satu_aktif_per_kelas` pada
  `(periode_id, jenjang, kelas_num, jenis_kelas) WHERE is_aktif = true`.
  Batas "maksimal 1" bisa ditegakkan langsung oleh unique index karena
  index hanya perlu menolak baris kedua yang cocok — tidak butuh
  menghitung apa pun.
- **`penugasan_hafalan` (maksimal 2 aktif per santri+periode)**: unique
  index **tidak cukup** untuk batas N>1, karena unique index hanya bisa
  menegakkan "maksimal 1 baris cocok", bukan "maksimal 2". Ditegakkan lewat
  trigger `enforce_max_2_penugasan_hafalan_aktif_trigger` (BEFORE INSERT OR
  UPDATE) yang menghitung baris `is_aktif=true` lain untuk
  `santri_id`+`periode_id` yang sama, dan menolak (`RAISE EXCEPTION`) jika
  sudah ada 2 baris aktif lain.

  **Enforcement ini database-level dan diserialisasi per pasangan
  santri+periode — bukan hanya validasi UI, dan bukan sekadar SELECT
  COUNT tanpa pengaman (koreksi Tahap 9B).** Sebelum menghitung, trigger
  mengambil `pg_advisory_xact_lock` (transaction-scoped — otomatis lepas
  saat commit/rollback, tidak mungkin tertinggal menggantung seperti lock
  sesi manual) atas hash pasangan `santri_id`+`periode_id`
  (`hashtextextended`). Dua transaksi yang menyentuh pasangan **yang
  sama** akan diserialisasi (saling menunggu, giliran); pasangan
  **berbeda** tidak saling memblokir. UPDATE yang memindahkan sebuah
  penugasan dari satu pasangan santri+periode ke pasangan lain mengunci
  **kedua** pasangan (lama dan baru) dalam urutan numerik menaik
  berdasarkan nilai lock key-nya sendiri — bukan urutan "lama lalu
  baru" — supaya dua transaksi yang saling menukar pasangan tidak bisa
  saling menunggu secara siklik (deadlock). Race condition TOCTOU pada
  versi awal (COUNT tanpa lock) sudah ditutup dengan pendekatan ini.
  Fungsi trigger **bukan** `SECURITY DEFINER` — berjalan dengan
  privilese pemanggil DML, aman karena hanya admin yang punya RLS
  INSERT/UPDATE pada tabel ini dan admin punya RLS SELECT tanpa batas
  pada tabel yang sama; advisory lock adalah mekanisme concurrency murni,
  tidak mengubah authorization/RLS apa pun.

## Coexist dengan model lama

Migration ini **tidak mengubah** satu pun dari:
`profiles.jenis_kelas`, `profiles.is_wali_kelas`, `profiles.wali_kelas_num`,
`profiles.wali_kelas_jenis`, `santri.guru_id`, `santri.guru_id_2`, RLS
`santri`/`setoran`/`profiles`/`nilai_ujian`, fungsi
`current_user_can_access_jenis_kelas()`/`current_user_role()`,
`app/api/setoran/route.ts`, `app/api/nilai-ujian/route.ts`, Raport Hifzh,
Rapot Digital, Guru Pengganti, atau Admin Data Guru existing. Ketiga tabel
baru **tidak dipakai** untuk authorization setoran/nilai ujian/rapot di
tahap ini — murni struktur data yang berdiri sendiri, kosong setelah
migration dijalankan.

## Apa yang BELUM dimigrasikan

- **Data**: tidak ada baris yang disalin dari `santri.guru_id`/`guru_id_2`
  ke `penugasan_hafalan`, atau dari `profiles.is_wali_kelas`/
  `wali_kelas_num`/`wali_kelas_jenis` ke `wali_kelas_assignment`. Ketiga
  tabel baru kosong setelah migration ini.
- **UI**: tidak ada halaman/form Admin untuk mengelola tabel-tabel ini.
- **API**: tidak ada endpoint CRUD baru.
- **Authorization**: RLS `santri`/`setoran`, `bisaAksesJenisKelas()`, dan
  seluruh gate akses existing tidak menyentuh tabel baru sama sekali.
- **Guru Mapel**: `mata_pelajaran`, `guru_mapel`, `nilai_mapel` belum
  dibuat sama sekali — menunggu fondasi ini stabil terlebih dahulu.
- **Rapot Digital**: belum diperluas untuk memakai assignment baru.
- **Notifikasi**: tidak ada notifikasi baru terkait assignment.

## Roadmap migrasi berikutnya (bukan bagian Tahap 9B, hanya arah)

1. Audit preview: bandingkan hasil mapping otomatis dari `santri.guru_id`/
   `guru_id_2` → `penugasan_hafalan` dan dari `profiles.is_wali_kelas`/
   `wali_kelas_num`/`wali_kelas_jenis` → `wali_kelas_assignment`, sebelum
   data migration nyata dijalankan.
2. UI Admin untuk CRUD `periode_akademik`, `penugasan_hafalan`,
   `wali_kelas_assignment`.
3. Data migration terpisah (setelah preview di atas disetujui).
4. Perluasan Rapot Digital memakai assignment baru sebagai authorization
   (menggantikan scope `guru_id`/`guru_id_2` untuk fitur ini).
5. Guru Mapel: `mata_pelajaran`, `guru_mapel`, `nilai_mapel` sebagai tahap
   terpisah setelah fondasi ini stabil.
6. Evaluasi apakah wing (`profiles.jenis_kelas`) untuk Input Setoran akan
   tetap dipertahankan permanen atau suatu saat digantikan — **belum
   diputuskan**, keputusan final Tahap 9B eksplisit mempertahankan wing.
