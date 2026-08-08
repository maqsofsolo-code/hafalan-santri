-- Security hotfix tahap 2: lockdown RLS pada absensi_guru, kalender_akademik,
-- surah -- tabel dengan scope akses yang sudah jelas dan risiko relatif
-- rendah (bukan santri/setoran/nilai_ujian/nilai_rapot/periode_rapot/profiles).
--
-- KONTEKS: verifikasi pg_policies produksi (dijalankan manual oleh pemilik
-- proyek via AUDIT_RLS_TAHAP2_READONLY.sql) mengonfirmasi nama policy
-- permisif berikut, masing-masing "authenticated ALL USING true WITH CHECK
-- true":
--   absensi_guru: "Allow all for authenticated", "full_access_absensi"
--     (dua policy full-access yang tumpang tindih)
--   kalender_akademik: "full_access_kalender"
--   surah: "full_access_surah"
-- Nama-nama ini dipakai eksplisit di bawah -- TIDAK ada dynamic
-- DROP/loop pg_policies pada migration ini.
--
-- TIDAK diubah (dikonfirmasi sudah benar dari hasil audit yang sama):
--   master_segment_ujian: "master_segment_ujian_select_authenticated"
--     (authenticated SELECT true) -- dipertahankan apa adanya.
--   push_subscriptions: "Service role full access push subscriptions"
--     (service_role) + "Users manage own push subscriptions"
--     (auth.uid() = user_id) -- dipertahankan apa adanya.
--
-- Helper role dipakai: public.current_user_role() (dibuat di migration
-- Tahap 1, 20260808150000_secure_nilai_ujian_rls.sql) -- tidak dibuat
-- ulang, tidak diubah di sini.
--
-- TIDAK menyentuh: profiles, santri, setoran, nilai_ujian, nilai_rapot,
-- periode_rapot, master_segment_ujian, push_subscriptions.

-- ============================================================
-- 1. ABSENSI_GURU
-- ============================================================
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.absensi_guru;
DROP POLICY IF EXISTS "full_access_absensi" ON public.absensi_guru;

-- SELECT: guru hanya row miliknya sendiri; kepsek semua row; admin dan
-- wali tidak diberi policy (default-deny -- admin tidak butuh direct
-- browser access sekarang, wali memang tidak boleh sama sekali).
CREATE POLICY absensi_guru_select_own_or_kepsek
  ON public.absensi_guru
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'kepsek'
    OR (
      public.current_user_role() = 'guru'
      AND guru_id = auth.uid()
    )
  );

-- INSERT: hanya guru, dan hanya untuk guru_id = dirinya sendiri.
CREATE POLICY absensi_guru_insert_own
  ON public.absensi_guru
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'guru'
    AND guru_id = auth.uid()
  );

-- DELETE: hanya guru, hanya row miliknya sendiri (dipakai untuk toggle
-- absen: delete-lalu-insert, bukan update -- lihat app/guru/page.tsx).
CREATE POLICY absensi_guru_delete_own
  ON public.absensi_guru
  FOR DELETE
  TO authenticated
  USING (
    public.current_user_role() = 'guru'
    AND guru_id = auth.uid()
  );

-- Sengaja tidak ada UPDATE policy -- tidak ada fitur di aplikasi yang
-- meng-update baris absensi_guru (toggle dilakukan via delete+insert).

-- ============================================================
-- 2. KALENDER_AKADEMIK
-- ============================================================
DROP POLICY IF EXISTS "full_access_kalender" ON public.kalender_akademik;

-- SELECT: semua role authenticated (admin/guru/kepsek/wali) butuh baca
-- kalender akademik -- tidak dibatasi role.
CREATE POLICY kalender_akademik_select_authenticated
  ON public.kalender_akademik
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: admin only, sesuai perilaku aplikasi saat ini
-- (admin/page.tsx melakukan CRUD kalender langsung dari browser).
CREATE POLICY kalender_akademik_insert_admin
  ON public.kalender_akademik
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'admin'
  );

CREATE POLICY kalender_akademik_update_admin
  ON public.kalender_akademik
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
  )
  WITH CHECK (
    public.current_user_role() = 'admin'
  );

CREATE POLICY kalender_akademik_delete_admin
  ON public.kalender_akademik
  FOR DELETE
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
  );

-- ============================================================
-- 3. SURAH
-- ============================================================
DROP POLICY IF EXISTS "full_access_surah" ON public.surah;

-- SELECT-only untuk semua authenticated (termasuk wali) -- reference
-- data non-sensitif (114 baris data Al-Qur'an), tidak ada mutation path
-- di aplikasi manapun.
CREATE POLICY surah_select_authenticated
  ON public.surah
  FOR SELECT
  TO authenticated
  USING (true);

-- Sengaja tidak ada INSERT/UPDATE/DELETE policy -- reference data harus
-- read-only dari browser; service-role server tetap bisa membaca/menulis
-- (bypass RLS) jika suatu saat dibutuhkan.
