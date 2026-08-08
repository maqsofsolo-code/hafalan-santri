-- Security hotfix tahap 3: lockdown RLS pada public.profiles.
--
-- KONTEKS: verifikasi pg_policies produksi (dijalankan manual oleh pemilik
-- proyek) mengonfirmasi 4 policy permisif pada profiles:
--   "full_access_profiles"              ALL    USING true WITH CHECK true
--   "Enable insert for authenticated users"  INSERT WITH CHECK true
--   "Enable read for authenticated users"    SELECT USING true
--   "Enable update for authenticated users"  UPDATE USING true
-- Artinya setiap user yang login (role apapun) bisa membaca DAN meng-
-- update SELURUH baris profiles (identitas semua akun admin/guru/kepsek/
-- wali) langsung lewat PostgREST.
--
-- Nama-nama di atas dipakai eksplisit di bawah -- TIDAK ada dynamic
-- DROP/loop pg_policies pada migration ini.
--
-- Helper role dipakai: public.current_user_role() (dibuat di migration
-- Tahap 1, 20260808150000_secure_nilai_ujian_rls.sql; SECURITY DEFINER,
-- SET search_path = ''). TIDAK diubah di sini. Policy di bawah sengaja
-- TIDAK memakai inline "EXISTS (SELECT 1 FROM public.profiles WHERE
-- id = auth.uid() AND role = 'admin')" di dalam policy profiles itu
-- sendiri -- itu akan memicu recursive RLS (policy profiles yang
-- meng-query ulang profiles, kena policy yang sama). current_user_role()
-- aman dipakai di sini justru karena SECURITY DEFINER-nya menjalankan
-- SELECT-nya dengan privilese pemilik function, bukan privilese caller,
-- sehingga tidak dievaluasi ulang lewat RLS profiles.
--
-- TIDAK menyentuh: santri, setoran, nilai_ujian, nilai_rapot,
-- periode_rapot, kalender_akademik, absensi_guru, surah,
-- master_segment_ujian, push_subscriptions, dan tidak mengubah
-- current_user_role() itu sendiri.

-- ============================================================
-- 1. DROP POLICY LAMA
-- ============================================================
DROP POLICY IF EXISTS "full_access_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.profiles;

-- ============================================================
-- 2. POLICY SELECT BARU
-- ============================================================
-- - Setiap user boleh baca row miliknya sendiri (dibutuhkan login/
--   redirect, app/lib/serverAuth.ts::authorize(), dan seluruh dashboard
--   guru/kepsek/wali yang membaca own profile).
-- - Admin boleh baca semua row (admin/page.tsx: daftar guru + daftar
--   wali).
-- - Kepsek boleh baca semua row role='guru' (kepsek/page.tsx: daftar
--   guru untuk monitoring/absensi) -- TIDAK melihat wali/admin lain atau
--   kepsek lain selain dirinya sendiri (sudah tercakup klausa pertama).
CREATE POLICY profiles_select_scoped
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.current_user_role() = 'admin'
    OR (
      public.current_user_role() = 'kepsek'
      AND role = 'guru'
    )
  );

-- ============================================================
-- 3. POLICY UPDATE BARU
-- ============================================================
-- Hanya admin yang boleh UPDATE row profiles apapun secara langsung dari
-- browser (admin/page.tsx: handleUpdateGuru/handleUpdateWali). Tidak ada
-- kebutuhan aplikasi untuk self-update oleh guru/kepsek/wali saat ini
-- (dikonfirmasi: 0 caller UPDATE profiles di guru/page.tsx, kepsek/
-- page.tsx, wali/page.tsx) -- sengaja tidak diberi policy self-update.
CREATE POLICY profiles_update_admin
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
  )
  WITH CHECK (
    public.current_user_role() = 'admin'
  );

-- ============================================================
-- 4. INSERT / DELETE
-- ============================================================
-- Sengaja TIDAK dibuatkan policy INSERT/DELETE untuk role `authenticated`
-- sama sekali. Create/delete akun (dan profile row-nya) berjalan
-- eksklusif lewat service-role API yang sudah admin-gated
-- (app/api/create-user/route.ts, app/api/import-excel/route.ts,
-- app/api/import-wali/route.ts) -- service-role bypass RLS, jadi tidak
-- butuh policy authenticated untuk operasi ini. Tanpa policy INSERT/
-- DELETE, RLS default-deny kedua operasi tsb untuk semua role di jalur
-- authenticated/browser (termasuk admin) -- disengaja, bukan celah,
-- karena tidak ada satupun fitur di aplikasi yang butuh browser-direct
-- insert/delete ke profiles.
