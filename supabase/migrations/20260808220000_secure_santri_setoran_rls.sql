-- Security hotfix tahap 4: lockdown RLS pada public.santri dan public.setoran.
--
-- KONTEKS: verifikasi pg_policies produksi (dijalankan manual oleh pemilik proyek)
-- mengonfirmasi kedua tabel masih berpolicy permisif penuh:
--   santri:  "full_access_santri"  ALL USING true WITH CHECK true
--   setoran: "full_access_setoran" ALL USING true WITH CHECK true
-- Audit read-only Tahap 4A (call-site inventory penuh atas app/admin, app/guru,
-- app/kepsek, app/wali, dan seluruh route API) menjadi dasar target akses di bawah.
--
-- KEPUTUSAN BISNIS FINAL (disetujui pemilik proyek, termasuk resolusi konflik
-- OPSI A atas mapping jenis_kelas guru):
--   1. Batas akses Guru adalah jenis_kelas (bukan jenjang) -- lintas jenjang
--      Ula/Wustha/Ulya tetap boleh (guru pengganti lintas jenjang tetap hidup).
--   2. Mapping jenis_kelas guru -> jenis_kelas santri yang boleh diakses BUKAN
--      equality murni (persis mapping wing yang sudah berjalan produksi di
--      app/guru/page.tsx sebelum perubahan ini, baris ~814-819):
--        profiles.jenis_kelas = 'banin' -> santri.jenis_kelas = 'banin'
--        profiles.jenis_kelas = 'banat' -> santri.jenis_kelas IN ('banat','tn_a','tn_b')
--        profiles.jenis_kelas = 'tn'    -> santri.jenis_kelas IN ('tn_a','tn_b')
--        selain itu -> tidak ada akses
--   3. Wali TIDAK diberi base-table SELECT ke santri/setoran teman sekelas --
--      ranking kelas dipindah ke endpoint server (app/api/wali/ranking-data,
--      lihat commit kode terpisah), wali hanya SELECT anak sendiri
--      (wali_id = auth.uid()) langsung dari base table.
--
-- Nama-nama policy lama di atas dipakai eksplisit di bawah -- TIDAK ada dynamic
-- DROP/loop pg_policies pada migration ini. Migration ini aman dijalankan ulang:
-- setiap policy TARGET (baru) juga di-drop-if-exists sebelum dibuat, supaya
-- rerun tidak gagal karena "policy already exists".
--
-- Helper role dipakai: public.current_user_role() (dibuat di migration Tahap 1,
-- 20260808150000_secure_nilai_ujian_rls.sql). TIDAK diubah di sini.
--
-- Helper BARU: public.current_user_can_access_jenis_kelas(text) -- SECURITY
-- DEFINER, sama gaya dengan current_user_role(), dipakai untuk mengevaluasi
-- mapping jenis_kelas di atas di dalam RLS tanpa memicu recursion (function ini
-- membaca public.profiles dengan privilese pemilik function, bukan privilese
-- caller, sehingga tidak dievaluasi ulang lewat RLS profiles/santri/setoran).
--
-- TIDAK menyentuh: profiles, nilai_ujian, nilai_rapot, periode_rapot,
-- kalender_akademik, absensi_guru, surah, master_segment_ujian,
-- push_subscriptions, dan tidak mengubah current_user_role() itu sendiri.

-- ============================================================
-- 0. HELPER BARU: current_user_can_access_jenis_kelas(text)
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_user_can_access_jenis_kelas(target_jenis_kelas text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE p.jenis_kelas
    WHEN 'banin' THEN target_jenis_kelas = 'banin'
    WHEN 'banat' THEN target_jenis_kelas IN ('banat', 'tn_a', 'tn_b')
    WHEN 'tn' THEN target_jenis_kelas IN ('tn_a', 'tn_b')
    ELSE false
  END
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
$$;

COMMENT ON FUNCTION public.current_user_can_access_jenis_kelas(text) IS
  'Mengembalikan true jika user yang sedang login (harus role guru) berhak mengakses target_jenis_kelas berdasarkan mapping wing produksi (banin->banin; banat->banat/tn_a/tn_b; tn->tn_a/tn_b). Mapping ini SENGAJA bukan equality murni -- ini adalah keputusan bisnis final (OPSI A) yang mereplikasi persis logic client-side lama di app/guru/page.tsx (mode guru pengganti), supaya perilaku produksi tidak berubah. SECURITY DEFINER + search_path kosong dengan alasan sama seperti current_user_role().';

REVOKE ALL ON FUNCTION public.current_user_can_access_jenis_kelas(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_can_access_jenis_kelas(text) TO authenticated;

-- ============================================================
-- 1. HAPUS POLICY LAMA
-- ============================================================
-- Nama policy terverifikasi langsung dari hasil query pg_policies yang
-- dijalankan pemilik proyek di Supabase SQL Editor produksi.
DROP POLICY IF EXISTS "full_access_santri" ON public.santri;
DROP POLICY IF EXISTS "full_access_setoran" ON public.setoran;

-- ============================================================
-- 2. SANTRI -- drop-if-exists policy target (supaya migration idempotent)
-- ============================================================
DROP POLICY IF EXISTS "santri_select_scoped" ON public.santri;
DROP POLICY IF EXISTS "santri_insert_admin" ON public.santri;
DROP POLICY IF EXISTS "santri_update_admin" ON public.santri;
DROP POLICY IF EXISTS "santri_delete_admin" ON public.santri;

-- SELECT:
--   Admin  -> semua santri, semua status (termasuk alumni/keluar).
--   Kepsek -> semua santri, semua status (monitoring, termasuk historis).
--   Guru   -> hanya santri status='aktif' DAN jenis_kelas cocok mapping wing
--             guru (helper di atas) -- TIDAK dibatasi guru_id/guru_id_2 dan
--             TIDAK dibatasi jenjang, supaya guru pengganti lintas jenjang
--             dalam wing yang sama tetap hidup.
--   Wali   -> hanya anak sendiri (wali_id = auth.uid()). TIDAK ada akses ke
--             santri teman sekelas dari base table -- ranking kelas wali
--             sekarang lewat endpoint server (service-role, proyeksi kolom
--             terbatas), bukan RLS langsung.
CREATE POLICY santri_select_scoped
  ON public.santri
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
    OR public.current_user_role() = 'kepsek'
    OR (
      public.current_user_role() = 'guru'
      AND status = 'aktif'
      AND public.current_user_can_access_jenis_kelas(jenis_kelas)
    )
    OR (
      public.current_user_role() = 'wali'
      AND wali_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: admin-only, browser-direct (sesuai perilaku aplikasi
-- saat ini -- admin/page.tsx melakukan CRUD santri langsung dari browser).
-- Guru TIDAK diberi UPDATE langsung sama sekali -- update progress hafalan
-- (total_hafalan_juz/surah_terakhir_nomor/ayat_terakhir) sekarang dieksekusi
-- server-side lewat service-role di app/api/setoran (bypass RLS, sudah
-- diverifikasi role+jenis_kelas di app-layer sebelum update dijalankan).
CREATE POLICY santri_insert_admin
  ON public.santri
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'admin'
  );

CREATE POLICY santri_update_admin
  ON public.santri
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
  )
  WITH CHECK (
    public.current_user_role() = 'admin'
  );

CREATE POLICY santri_delete_admin
  ON public.santri
  FOR DELETE
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
  );

-- ============================================================
-- 3. SETORAN -- drop-if-exists policy target (supaya migration idempotent)
-- ============================================================
DROP POLICY IF EXISTS "setoran_select_scoped" ON public.setoran;
DROP POLICY IF EXISTS "setoran_insert_guru" ON public.setoran;
DROP POLICY IF EXISTS "setoran_update_guru_own" ON public.setoran;

-- SELECT:
--   Admin/Kepsek -> semua setoran (dashboard hari ini, ranking sekolah,
--                   monitoring, laporan).
--   Guru   -> (a) SEMUA row miliknya sendiri (guru_id = auth.uid()), tanpa
--             syarat tambahan -- supaya tab Riwayat dan Edit Setoran Sendiri
--             tetap menampilkan seluruh riwayat guru ybs, termasuk entri lama
--             untuk santri yang sekarang sudah alumni/keluar atau pindah
--             jenis_kelas (data historis milik guru sendiri tidak boleh
--             hilang hanya karena status santri berubah belakangan); DITAMBAH
--             (b) setoran untuk santri status='aktif' DAN jenis_kelas cocok
--             mapping wing guru (via join ke santri), SENGAJA cross-guru
--             (TIDAK dibatasi guru_id=self) karena dibutuhkan oleh:
--               - duplicate-check (santri_id+tanggal+jenis lintas guru)
--               - kunci hafalan baru Wustha (baca setoran 'lama' lintas guru)
--               - mode guru pengganti (guru lain sudah input untuk santri yg
--                 sama harus tetap terlihat supaya tidak dobel-input)
--             Membatasi HANYA ke guru_id=self (tanpa klausa b) akan
--             mematahkan ketiga hal di atas.
--   Wali   -> hanya setoran milik anak sendiri, lewat relasi
--             setoran.santri_id -> santri.id -> santri.wali_id = auth.uid().
--             TIDAK ada akses ke setoran teman sekelas dari base table --
--             sama seperti santri, ranking kelas lewat endpoint server.
CREATE POLICY setoran_select_scoped
  ON public.setoran
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'kepsek')
    OR (
      public.current_user_role() = 'guru'
      AND (
        guru_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.santri AS s
          WHERE s.id = setoran.santri_id
            AND s.status = 'aktif'
            AND public.current_user_can_access_jenis_kelas(s.jenis_kelas)
        )
      )
    )
    OR (
      public.current_user_role() = 'wali'
      AND EXISTS (
        SELECT 1 FROM public.santri AS s
        WHERE s.id = setoran.santri_id
          AND s.wali_id = auth.uid()
      )
    )
  );

-- INSERT: hanya guru, guru_id wajib diri sendiri (server sudah memaksa ini di
-- app/api/setoran, policy ini adalah lapisan pertahanan kedua), dan target
-- santri wajib jenis_kelas-nya cocok mapping wing guru. SENGAJA tidak ada
-- pembatas jenjang (guru pengganti lintas jenjang tetap hidup) dan SENGAJA
-- tidak ada pembatas status='aktif' tambahan di sini -- mengikuti perilaku
-- app/api/setoran saat ini yang juga belum memvalidasi status aktif santri
-- saat INSERT (bukan perubahan business rule, murni mempertahankan perilaku
-- yang sudah berjalan).
CREATE POLICY setoran_insert_guru
  ON public.setoran
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'guru'
    AND guru_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.santri AS s
      WHERE s.id = setoran.santri_id
        AND public.current_user_can_access_jenis_kelas(s.jenis_kelas)
    )
  );

-- UPDATE: hanya guru, hanya row miliknya sendiri (guru_id = auth.uid()).
-- Ini MENUTUP celah yang ditemukan di audit Tahap 4A: sebelumnya
-- handleSimpanEditSetoran (app/guru/page.tsx) meng-UPDATE hanya dengan
-- filter `.eq('id', editSetoran.id)`, tanpa filter guru_id sama sekali --
-- aman secara UI-trust (editSetoran selalu berasal dari riwayat own-row)
-- tapi tidak ditegakkan di level query. Dengan policy ini, guru tetap bisa
-- edit setoran miliknya sendiri (fitur tidak berubah), tapi tidak lagi bisa
-- meng-UPDATE row guru lain lewat devtools/curl.
CREATE POLICY setoran_update_guru_own
  ON public.setoran
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'guru'
    AND guru_id = auth.uid()
  )
  WITH CHECK (
    public.current_user_role() = 'guru'
    AND guru_id = auth.uid()
  );

-- Sengaja TIDAK ada UPDATE policy untuk admin/kepsek/wali (nol call site
-- ditemukan di audit Tahap 4A -- tidak ada fitur yang membutuhkannya).
-- Sengaja TIDAK ada DELETE policy untuk role apa pun (nol call site setoran
-- DELETE ditemukan di seluruh aplikasi).
