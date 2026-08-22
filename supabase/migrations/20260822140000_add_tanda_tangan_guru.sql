-- Tahap 9P -- Tanda Tangan Digital Wali Kelas.
--
-- STATUS: MIGRATION LOKAL SAJA. BELUM DI-APPLY KE PRODUCTION. Sesuai
-- instruksi Tahap 9P Bagian D: perubahan schema harus STOP dan dilaporkan
-- dulu sebelum apply production -- file ini disiapkan supaya siap dijalankan
-- begitu pemilik proyek menyetujui, TIDAK dijalankan otomatis oleh siapa pun
-- di sesi ini.
--
-- KONTEKS: tanda tangan adalah atribut GURU (bukan atribut wali_kelas_assignment
-- atau kelas) -- satu guru satu tanda tangan, dipakai ulang di setiap kelas
-- yang dia wali-i, persis sesuai keputusan final instruksi Tahap 9P Bagian B.
-- profiles dipakai (bukan tabel baru) karena tanda tangan murni identitas
-- guru, tidak butuh histori/periode seperti wali_kelas_assignment.

-- ============================================================
-- 1. KOLOM profiles.tanda_tangan_path
-- ============================================================
-- Nullable -- guru tanpa tanda tangan tetap valid (Bagian H: raport tidak
-- boleh gagal generate kalau tanda tangan belum ada). Menyimpan PATH objek
-- di Supabase Storage (bukan URL publik permanen, karena bucket private --
-- lihat Bagian 2), format "<guru_id>/tanda-tangan.<ext>".
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tanda_tangan_path text;

COMMENT ON COLUMN public.profiles.tanda_tangan_path IS
  'Path file gambar tanda tangan digital guru di Supabase Storage bucket "tanda-tangan-guru" (private). NULL = guru belum upload tanda tangan. Hanya relevan untuk role guru, tapi tidak dibatasi CHECK constraint role -- pola sama seperti kolom profiles lain yang relevansinya per-role (mis. is_wali_kelas). Diisi/dihapus HANYA lewat app/api/admin/guru-tanda-tangan (admin-only, service role) -- tidak pernah ditulis langsung dari browser.';

-- ============================================================
-- 2. BUCKET STORAGE tanda-tangan-guru (PRIVATE)
-- ============================================================
-- Private (public=false): akses baca HANYA lewat signed URL yang di-generate
-- server (service role) -- baik untuk preview di Admin (Data Guru) maupun
-- saat Raport Hifzh men-download bytes gambar untuk di-embed ke file Excel.
-- Tidak ada policy storage.objects ditambahkan di sini secara sengaja --
-- bucket baru + RLS storage.objects default (enabled, tanpa policy apa pun)
-- berarti DENY TOTAL untuk role anon/authenticated; service role (dipakai
-- app/api/admin/guru-tanda-tangan/route.ts, createServiceRoleClient())
-- selalu bypass RLS sehingga tidak butuh policy eksplisit. Ini konsisten
-- dengan pola project: seluruh mutasi sensitif (create-user, salin-penugasan,
-- nilai-ujian-excel) lewat server API + service role, bukan client-direct.
INSERT INTO storage.buckets (id, name, public)
VALUES ('tanda-tangan-guru', 'tanda-tangan-guru', false)
ON CONFLICT (id) DO NOTHING;
