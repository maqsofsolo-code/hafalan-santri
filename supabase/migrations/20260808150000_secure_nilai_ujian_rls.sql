-- Security hotfix tahap 1: role helper + lockdown RLS pada nilai_ujian.
--
-- KONTEKS: audit RLS produksi (dijalankan manual oleh pemilik proyek via
-- AUDIT_RLS_PRODUKSI_READONLY.sql) menemukan RLS aktif di semua tabel,
-- tetapi policy nilai_ujian saat ini adalah "authenticated ALL USING true
-- WITH CHECK true" -- setiap user yang login (role apapun) bisa
-- SELECT/INSERT/UPDATE/DELETE seluruh baris nilai_ujian langsung lewat
-- PostgREST, terlepas dari role/assignment mereka. Audit arsitektur kode
-- (app/kepsek/page.tsx, app/wali/page.tsx) mengonfirmasi kepsek dan wali
-- memang membaca tabel ini langsung dari browser tanpa scoping server-side.
--
-- KEPUTUSAN BISNIS FINAL: WALI tidak boleh mengakses nilai_ujian sama
-- sekali (SELECT/INSERT/UPDATE/DELETE = NONE, tanpa pengecualian).
--
-- SCOPE MIGRATION INI SENGAJA KECIL -- HANYA:
--   1. helper role `public.current_user_role()` (dipakai lintas tabel di
--      tahap-tahap security fix berikutnya, bukan hanya nilai_ujian)
--   2. policy pada public.nilai_ujian
-- TIDAK menyentuh: santri, setoran, profiles (policy existing dibiarkan),
-- nilai_rapot, periode_rapot, kalender_akademik, absensi_guru, surah,
-- master_segment_ujian, push_subscriptions.

-- ============================================================
-- 1. ROLE HELPER
-- ============================================================
-- SECURITY DEFINER supaya lookup ke public.profiles tidak terjebak dalam
-- RLS policy tabel profiles itu sendiri (recursion) saat helper ini nanti
-- dipakai di dalam policy profiles pada tahap berikutnya. Hanya membaca
-- role milik auth.uid() milik sesi yang sedang login -- tidak menerima
-- parameter user_id dari client, tidak mengubah data apapun.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.role
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
  LIMIT 1
$$;

COMMENT ON FUNCTION public.current_user_role() IS
  'Mengembalikan role (admin/guru/kepsek/wali) milik user yang sedang login (auth.uid()), atau NULL jika belum login / tidak ada profil cocok. SECURITY DEFINER agar tidak memicu recursive RLS saat dipakai di dalam policy tabel profiles maupun tabel lain. search_path dikosongkan (SET search_path = '''') dan semua referensi objek fully-qualified (public.profiles, auth.uid()) sebagai pengerasan standar untuk fungsi SECURITY DEFINER -- mencegah search_path hijacking. Tidak pernah menerima user id dari client, tidak mengubah data.';

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- ============================================================
-- 2. HAPUS POLICY LAMA PADA nilai_ujian
-- ============================================================
-- Nama policy terverifikasi langsung dari hasil query pg_policies yang
-- dijalankan pemilik proyek di Supabase SQL Editor produksi:
--   policyname=full_access_nilai_ujian, permissive=PERMISSIVE,
--   roles={authenticated}, cmd=ALL, qual=true, with_check=true
-- Drop eksplisit by name (bukan lagi dynamic loop) -- hanya policy ini
-- yang disentuh, tidak ada policy lain pada nilai_ujian maupun tabel lain
-- yang di-drop.
DROP POLICY IF EXISTS "full_access_nilai_ujian" ON public.nilai_ujian;

-- ============================================================
-- 3. POLICY BARU nilai_ujian
-- ============================================================
-- SELECT: hanya admin & kepsek. Guru TIDAK diberi policy SELECT
-- langsung -- akses guru yang sah (GET/POST /api/nilai-ujian) sudah
-- diverifikasi assignment-nya server-side lalu dieksekusi lewat
-- service-role client, yang bypass RLS sepenuhnya sehingga tidak butuh
-- policy authenticated di sini. Memberi guru policy SELECT langsung
-- hanya akan memperluas permukaan akses tanpa manfaat.
CREATE POLICY nilai_ujian_select_admin_kepsek
  ON public.nilai_ujian
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'kepsek'));

-- WALI: tidak diberi policy apapun pada nilai_ujian -> default-deny RLS
-- berlaku (tidak ada exception "boleh lihat nilai anak sendiri", sesuai
-- keputusan bisnis final).
--
-- INSERT/UPDATE/DELETE: sengaja TIDAK dibuatkan policy untuk role
-- `authenticated` sama sekali. Seluruh mutation yang sah (guru INSERT via
-- POST /api/nilai-ujian, admin UPDATE via PATCH /api/admin/nilai-ujian)
-- berjalan lewat service-role client setelah authorize()/assignment
-- check di server -- service-role bypass RLS, jadi tidak butuh policy
-- authenticated apapun untuk operasi ini. Tanpa policy INSERT/UPDATE/
-- DELETE, RLS default-deny keempat operasi tsb untuk SEMUA role di jalur
-- authenticated/browser (termasuk admin) -- ini disengaja, bukan celah,
-- karena tidak ada satupun fitur di aplikasi yang butuh browser-direct
-- write ke nilai_ujian (dikonfirmasi di audit: 0 site di admin/page.tsx,
-- 0 site di guru/page.tsx).
