-- Fondasi Sistem Penugasan Guru (Tahap 9B) -- STRUKTUR SAJA, coexist penuh
-- dengan model lama. Migration ini TIDAK menyalin/mengubah data existing dan
-- TIDAK mengubah authorization existing manapun.
--
-- KONTEKS: audit read-only Tahap 9A menyimpulkan sistem penugasan guru saat
-- ini adalah TIGA mekanisme paralel yang tidak saling merujuk:
--   1. Wing (profiles.jenis_kelas guru -> mapping ke santri.jenis_kelas),
--      dipakai untuk Input Setoran + Guru Pengganti + RLS santri/setoran.
--   2. Assignment langsung (santri.guru_id/guru_id_2, "Guru Musami'"),
--      dipakai untuk Nilai Ujian + Rapot Digital.
--   3. Wali Kelas (profiles.is_wali_kelas/wali_kelas_num/wali_kelas_jenis),
--      dipakai untuk lookup nama dokumen cetak + notifikasi (saat ini
--      nonaktif secara struktural via allowlist WhatsApp).
--
-- KEPUTUSAN BISNIS FINAL (Tahap 9B, disetujui pemilik proyek):
--   1. Role dasar tetap 'guru' (tidak ada role baru).
--   2. profiles.jenis_kelas TETAP dipertahankan sebagai WING/SECURITY ACCESS
--      untuk Input Setoran + Guru Pengganti + RLS santri/setoran -- TIDAK
--      disentuh sama sekali di migration ini.
--   3. Guru Hafalan resmi ditugaskan PER SANTRI (bukan per kelas/wing).
--   4. Satu santri maksimal 2 Guru Hafalan aktif per periode.
--   5. Satu kelas (jenjang+kelas_num+jenis_kelas) hanya 1 Wali Kelas aktif
--      per periode.
--   6. Guru Mapel/mata pelajaran BELUM dibuat di tahap ini (lihat bagian E).
--   7. Semua assignment baru terikat periode_akademik (bukan periode_rapot
--      yang existing -- periode_rapot secara semantik berbeda, lihat audit
--      Tahap 9A bagian 8: string bebas tanpa integritas, bukan entitas waktu
--      resmi).
--   8. Assignment lama wajib disimpan sebagai histori -- baris TIDAK pernah
--      di-hard-delete oleh aplikasi, cukup is_aktif=false lalu baris baru
--      dibuat (pola sama seperti guru pengganti/absensi_guru: append,
--      bukan overwrite).
--   9. Guru Pengganti TETAP memakai wing/jenis_kelas existing, BUKAN
--      penugasan_hafalan -- tabel ini tidak dipakai untuk otorisasi setoran
--      sama sekali di tahap ini (lihat bagian J).
--  10. TN: profiles.jenis_kelas guru tetap boleh 'tn' (wing gabungan), tapi
--      assignment per-kelas (wali_kelas_assignment.jenis_kelas) memakai
--      domain SANTRI yang lebih spesifik: tn_a / tn_b (bukan 'tn' gabungan)
--      -- karena wali kelas adalah peran per-kelas fisik, bukan per-wing.
--  11. santri.guru_id/guru_id_2, profiles.is_wali_kelas/wali_kelas_num/
--      wali_kelas_jenis TIDAK dihapus/diubah sekarang -- sistem lama harus
--      tetap 100% berjalan selama masa transisi. Data migration (copy dari
--      kolom lama ke tabel baru) SENGAJA belum dilakukan di migration ini --
--      akan jadi tahap terpisah setelah preview mapping diaudit lebih dulu.
--
-- SCOPE MIGRATION INI:
--   - Tabel baru: periode_akademik, penugasan_hafalan, wali_kelas_assignment.
--   - RLS pada ketiga tabel baru (admin full; guru/kepsek SELECT sesuai
--     scope; wali tanpa akses langsung).
--   - Trigger updated_at (fungsi generik baru, dipakai ketiga tabel).
--   - Trigger enforce "maksimal 2 Guru Hafalan aktif per santri+periode"
--     pada penugasan_hafalan (tidak bisa unique constraint biasa -- lihat
--     bagian 3). Diserialisasi antar transaksi konkuren lewat
--     pg_advisory_xact_lock berdasarkan pasangan santri_id+periode_id
--     (koreksi Tahap 9B -- lihat komentar bagian 3 untuk detail lock
--     ordering-nya).
--   - Partial unique index enforce "1 Wali Kelas aktif per kelas+periode"
--     pada wali_kelas_assignment (bisa unique index karena batasnya adalah
--     1, bukan 2 -- lihat bagian 4).
--
-- TIDAK menyentuh (dan TIDAK BOLEH disentuh tahap ini): profiles, santri,
-- setoran, nilai_ujian, nilai_rapot, periode_rapot, kalender_akademik,
-- absensi_guru, surah, master_segment_ujian, push_subscriptions,
-- current_user_role(), current_user_can_access_jenis_kelas(), dan seluruh
-- policy RLS existing pada tabel-tabel tsb. Tabel baru di sini TIDAK dipakai
-- untuk authorization setoran/nilai ujian/rapot di tahap ini -- foundation
-- only, murni struktur data + RLS dasar untuk tabel baru itu sendiri.

-- ============================================================
-- 0. HELPER GENERIK BARU: set_updated_at()
-- ============================================================
-- Trigger function generik (bukan SECURITY DEFINER -- trigger BEFORE UPDATE
-- biasa, dijalankan dengan privilese pemanggil DML seperti pola
-- set_master_segment_ujian_updated_at() di migration 20260803120000, hanya
-- sekarang dibuat generik supaya bisa dipakai ulang oleh ketiga tabel baru
-- tanpa duplikasi fungsi per tabel).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS
  'Trigger BEFORE UPDATE generik: mengisi kolom updated_at = now(). Dipakai bersama oleh periode_akademik, penugasan_hafalan, wali_kelas_assignment -- bukan framework baru, sekadar satu fungsi kecil supaya tidak diduplikasi 3x.';

-- ============================================================
-- 1. TABEL periode_akademik
-- ============================================================
CREATE TABLE IF NOT EXISTS public.periode_akademik (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tahun_ajaran text NOT NULL,
  semester integer NOT NULL,
  tanggal_mulai date NOT NULL,
  tanggal_selesai date NOT NULL,
  is_aktif boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT periode_akademik_tahun_ajaran_check CHECK (btrim(tahun_ajaran) <> ''),
  CONSTRAINT periode_akademik_semester_check CHECK (semester IN (1, 2)),
  CONSTRAINT periode_akademik_tanggal_check CHECK (tanggal_selesai >= tanggal_mulai),
  CONSTRAINT periode_akademik_tahun_semester_key UNIQUE (tahun_ajaran, semester)
);

COMMENT ON TABLE public.periode_akademik IS
  'Entitas periode akademik resmi (tahun ajaran + semester) untuk sistem Penugasan Guru baru. SENGAJA terpisah dari periode_rapot existing (label rapot cetak, string bebas, tanpa integritas -- lihat audit Tahap 9A bagian 8) dan dari kalender_akademik existing (rentang tanggal event ujian, tanpa label tahun ajaran). is_aktif adalah boolean sederhana tanpa enforcement "hanya satu aktif" di level DB -- disengaja, sesuai instruksi Tahap 9B untuk tidak membuat logic otomatis rumit di tahap fondasi ini.';

DROP TRIGGER IF EXISTS set_periode_akademik_updated_at_trigger
  ON public.periode_akademik;
CREATE TRIGGER set_periode_akademik_updated_at_trigger
BEFORE UPDATE ON public.periode_akademik
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. TABEL penugasan_hafalan
-- ============================================================
CREATE TABLE IF NOT EXISTS public.penugasan_hafalan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guru_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  santri_id uuid NOT NULL REFERENCES public.santri(id) ON DELETE RESTRICT,
  periode_id uuid NOT NULL REFERENCES public.periode_akademik(id) ON DELETE RESTRICT,
  is_aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT penugasan_hafalan_guru_santri_periode_key UNIQUE (guru_id, santri_id, periode_id)
);

COMMENT ON TABLE public.penugasan_hafalan IS
  'Penugasan resmi Guru Hafalan per santri per periode akademik (maksimal 2 aktif per santri+periode, enforced via trigger -- lihat enforce_max_2_penugasan_hafalan_aktif di bawah, bukan unique constraint biasa). Tabel ini adalah FONDASI SAJA di Tahap 9B: TIDAK dipakai untuk authorization Input Setoran (yang tetap memakai wing profiles.jenis_kelas, lihat current_user_can_access_jenis_kelas), TIDAK diisi dari data existing santri.guru_id/guru_id_2 (data migration adalah tahap terpisah setelah audit preview mapping).';

DROP TRIGGER IF EXISTS set_penugasan_hafalan_updated_at_trigger
  ON public.penugasan_hafalan;
CREATE TRIGGER set_penugasan_hafalan_updated_at_trigger
BEFORE UPDATE ON public.penugasan_hafalan
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 3. Enforce maksimal 2 Guru Hafalan AKTIF per santri+periode
-- ------------------------------------------------------------
-- Batas "maksimal 2" (bukan "maksimal 1") tidak bisa ditegakkan lewat unique
-- index biasa maupun partial unique index (partial unique index hanya bisa
-- menegakkan "maksimal 1 baris cocok" per kombinasi kolom). Untuk batas
-- N>1, satu-satunya cara yang benar-benar enforced di level DB (bukan hanya
-- di UI) adalah constraint trigger yang menghitung baris aktif lain sebelum
-- INSERT/UPDATE diizinkan.
--
-- KOREKSI TAHAP 9B: versi awal fungsi ini hanya melakukan SELECT count(*)
-- tanpa penguncian apa pun -- dua transaksi konkuren yang sama-sama lolos
-- COUNT sebelum salah satunya commit bisa menghasilkan 3 baris aktif
-- sekaligus (race condition, TOCTOU klasik). Versi ini menutup celah itu
-- dengan pg_advisory_xact_lock (BUKAN pg_advisory_lock/pg_advisory_unlock
-- sesi biasa -- xact-scoped berarti lock otomatis dilepas saat transaksi
-- COMMIT/ROLLBACK, tidak mungkin tertinggal menggantung di sesi seperti
-- lock sesi manual).
--
-- CARA KERJA LOCK KEY: pasangan (santri_id, periode_id) di-hash jadi satu
-- bigint deterministik lewat hashtextextended(text, seed) -- built-in
-- Postgres (dipakai juga untuk hash partitioning), seed tetap 0 supaya
-- hasil selalu sama untuk pasangan yang sama. Dua transaksi yang menyentuh
-- PASANGAN santri+periode yang SAMA akan mengunci bigint yang sama dan
-- saling menunggu (diserialisasi); pasangan yang BERBEDA menghasilkan
-- bigint (nyaris pasti) berbeda dan TIDAK saling memblokir.
--
-- UPDATE yang memindahkan baris aktif dari satu pasangan santri+periode ke
-- pasangan lain (ganti santri_id dan/atau periode_id sambil tetap
-- is_aktif=true) perlu mengunci KEDUA pasangan (lama & baru) -- kalau
-- hanya pasangan baru yang dikunci, transaksi lain yang sedang meng-INSERT
-- baris baru untuk pasangan LAMA (persis saat baris ini pergi dari sana)
-- bisa membaca hitungan basi. Kedua lock diambil dalam URUTAN NUMERIK
-- MENAIK berdasarkan nilai bigint-nya sendiri (bukan urutan "lama dulu
-- baru kemudian") -- supaya dua transaksi yang saling menukar pasangan
-- (transaksi P memindah X->Y, transaksi Q memindah Y->X di saat yang sama)
-- selalu mengunci dalam urutan GLOBAL yang sama dan tidak bisa saling
-- menunggu secara siklik (deadlock).
--
-- Referensi OLD hanya pernah muncul di dalam blok "IF TG_OP = 'UPDATE'
-- THEN ... END IF;" -- sengaja tidak digabung jadi satu ekspresi boolean
-- "TG_OP = 'UPDATE' AND OLD...." supaya tidak bergantung pada urutan
-- evaluasi AND (PostgreSQL tidak menjamin short-circuit pada level
-- optimizer/executor untuk semua konteks) -- pada trigger INSERT, record
-- OLD tidak pernah dirujuk sama sekali di jalur eksekusi manapun.
--
-- NULL handling: guru_id/santri_id/periode_id semuanya NOT NULL di skema
-- tabel, tapi constraint NOT NULL baru dicek SETELAH trigger BEFORE ROW
-- selesai -- jadi NEW.santri_id/NEW.periode_id secara teknis BISA NULL
-- saat fungsi ini berjalan (mis. percobaan INSERT eksplisit NULL). Fungsi
-- ini sengaja early-return kalau salah satunya NULL, membiarkan constraint
-- NOT NULL standar yang menolak dengan pesan error baku -- bukan meledak
-- di dalam hashtextextended()/pg_advisory_xact_lock() dengan error yang
-- membingungkan.
--
-- Fungsi ini BUKAN SECURITY DEFINER -- berjalan dengan privilese pemanggil
-- DML (sesuai pola set_master_segment_ujian_updated_at di migration
-- 20260803120000). Ini aman karena: (a) hanya admin yang punya RLS
-- INSERT/UPDATE pada penugasan_hafalan (lihat bagian 8 di bawah), dan admin
-- punya RLS SELECT tanpa batas pada tabel yang sama, sehingga SELECT count
-- di dalam fungsi ini melihat seluruh baris aktif yang relevan, bukan
-- terpotong RLS; (b) fungsi tidak membaca/menulis tabel lain di luar
-- penugasan_hafalan dan tidak mengubah RLS/authorization apa pun -- lock
-- advisory adalah mekanisme concurrency PostgreSQL murni, bukan mekanisme
-- otorisasi. search_path dikunci ke public (bukan dikosongkan seperti
-- helper SECURITY DEFINER current_user_role/current_user_can_access_jenis_kelas)
-- karena fungsi ini SECURITY INVOKER biasa, sama seperti trigger fungsi
-- existing lain di migration 20260803120000.
--
-- Tidak ada risiko trigger recursion: fungsi ini hanya melakukan SELECT
-- (bukan INSERT/UPDATE/DELETE) ke public.penugasan_hafalan, dan trigger
-- ini hanya terpasang untuk event INSERT/UPDATE (bukan SELECT) -- SELECT
-- di dalam fungsi tidak memicu dirinya sendiri lagi.
CREATE OR REPLACE FUNCTION public.enforce_max_2_penugasan_hafalan_aktif()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  jumlah_aktif integer;
  lock_key_new bigint;
  lock_key_old bigint;
  ada_lock_old boolean := false;
BEGIN
  -- Menonaktifkan baris (atau INSERT langsung is_aktif=false) tidak pernah
  -- bisa melanggar batas atas "maksimal 2" -- aman dilewatkan tanpa lock.
  IF NEW.is_aktif IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Lihat catatan NULL handling di atas -- biarkan constraint NOT NULL
  -- standar yang menolak, bukan fungsi ini.
  IF NEW.santri_id IS NULL OR NEW.periode_id IS NULL THEN
    RETURN NEW;
  END IF;

  lock_key_new := hashtextextended(NEW.santri_id::text || ':' || NEW.periode_id::text, 0);

  -- Referensi ke OLD HANYA di dalam blok ini -- tidak pernah dieksekusi
  -- untuk TG_OP = 'INSERT' (OLD tidak pernah dirujuk sama sekali saat
  -- INSERT, jadi tidak ada risiko "record OLD is not assigned yet").
  IF TG_OP = 'UPDATE' THEN
    IF OLD.santri_id IS NOT NULL AND OLD.periode_id IS NOT NULL
       AND (OLD.santri_id IS DISTINCT FROM NEW.santri_id OR OLD.periode_id IS DISTINCT FROM NEW.periode_id) THEN
      lock_key_old := hashtextextended(OLD.santri_id::text || ':' || OLD.periode_id::text, 0);
      ada_lock_old := true;
    END IF;
  END IF;

  IF ada_lock_old THEN
    -- Urutan NUMERIK MENAIK berdasarkan nilai lock key -- deterministik
    -- lintas transaksi manapun, mencegah deadlock saat dua transaksi
    -- menukar pasangan santri+periode secara bersilangan.
    IF lock_key_old <= lock_key_new THEN
      PERFORM pg_advisory_xact_lock(lock_key_old);
      IF lock_key_new <> lock_key_old THEN
        PERFORM pg_advisory_xact_lock(lock_key_new);
      END IF;
    ELSE
      PERFORM pg_advisory_xact_lock(lock_key_new);
      PERFORM pg_advisory_xact_lock(lock_key_old);
    END IF;
  ELSE
    -- INSERT, atau UPDATE yang tidak berpindah pasangan santri+periode --
    -- cukup satu lock pada pasangan (baru = lama).
    PERFORM pg_advisory_xact_lock(lock_key_new);
  END IF;

  -- Titik ini hanya tercapai setelah lock pasangan NEW berhasil didapat --
  -- transaksi konkuren lain yang menyentuh pasangan yang sama (baik
  -- pasangan lama maupun baru) sudah pasti commit/rollback lebih dulu.
  -- SELECT ini otomatis mengambil snapshot BARU (READ COMMITTED: setiap
  -- statement dalam fungsi mengambil snapshot saat itu juga, bukan
  -- snapshot dari awal statement pemanggil), jadi melihat data terkini
  -- yang sudah ter-commit, bukan data basi.
  SELECT count(*) INTO jumlah_aktif
  FROM public.penugasan_hafalan
  WHERE santri_id = NEW.santri_id
    AND periode_id = NEW.periode_id
    AND is_aktif = true
    AND id <> NEW.id;

  IF jumlah_aktif >= 2 THEN
    RAISE EXCEPTION 'Santri % sudah memiliki 2 Guru Hafalan aktif pada periode %', NEW.santri_id, NEW.periode_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_max_2_penugasan_hafalan_aktif() IS
  'Constraint trigger: menolak INSERT/UPDATE yang membuat baris ke-3 is_aktif=true untuk kombinasi santri_id+periode_id yang sama. Batas 2 tidak bisa ditegakkan via unique index biasa (beda dari batas 1 pada wali_kelas_assignment). Diserialisasi antar transaksi konkuren lewat pg_advisory_xact_lock (transaction-scoped, otomatis lepas saat commit/rollback) berkunci pada hash pasangan santri_id+periode_id -- pasangan sama saling menunggu, pasangan beda tidak saling blokir. UPDATE yang berpindah pasangan mengunci pasangan lama & baru dalam urutan numerik menaik untuk mencegah deadlock.';

DROP TRIGGER IF EXISTS enforce_max_2_penugasan_hafalan_aktif_trigger
  ON public.penugasan_hafalan;
CREATE TRIGGER enforce_max_2_penugasan_hafalan_aktif_trigger
BEFORE INSERT OR UPDATE ON public.penugasan_hafalan
FOR EACH ROW
EXECUTE FUNCTION public.enforce_max_2_penugasan_hafalan_aktif();

-- ============================================================
-- 4. TABEL wali_kelas_assignment
-- ============================================================
-- jenis_kelas di sini SENGAJA memakai domain SANTRI (banin/banat/tn_a/
-- tn_b), BUKAN domain guru (banin/banat/tn) -- keputusan bisnis final poin
-- 10/11: Wali Kelas adalah peran per-kelas fisik (kelas TN tetap terbagi
-- tn_a/tn_b secara fisik), bukan per-wing gabungan seperti akses setoran.
CREATE TABLE IF NOT EXISTS public.wali_kelas_assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guru_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  periode_id uuid NOT NULL REFERENCES public.periode_akademik(id) ON DELETE RESTRICT,
  jenjang text NOT NULL,
  kelas_num integer NOT NULL,
  jenis_kelas text NOT NULL,
  is_aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wali_kelas_assignment_jenjang_check CHECK (jenjang IN ('ula', 'wustha', 'ulya')),
  CONSTRAINT wali_kelas_assignment_jenis_kelas_check CHECK (jenis_kelas IN ('banin', 'banat', 'tn_a', 'tn_b')),
  CONSTRAINT wali_kelas_assignment_kelas_num_check CHECK (kelas_num BETWEEN 1 AND 12)
);

COMMENT ON TABLE public.wali_kelas_assignment IS
  'Penugasan resmi Wali Kelas per kelas (jenjang+kelas_num+jenis_kelas) per periode akademik. jenis_kelas memakai domain SANTRI (banin/banat/tn_a/tn_b), bukan domain guru. Maksimal 1 aktif per kelas+periode, enforced via partial unique index (lihat wali_kelas_assignment_satu_aktif_per_kelas di bawah). FONDASI SAJA di Tahap 9B: TIDAK dipakai untuk lookup nama dokumen cetak atau notifikasi (yang tetap memakai profiles.is_wali_kelas/wali_kelas_num/wali_kelas_jenis existing), TIDAK diisi dari data existing (data migration adalah tahap terpisah).';

DROP TRIGGER IF EXISTS set_wali_kelas_assignment_updated_at_trigger
  ON public.wali_kelas_assignment;
CREATE TRIGGER set_wali_kelas_assignment_updated_at_trigger
BEFORE UPDATE ON public.wali_kelas_assignment
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 5. Enforce maksimal 1 Wali Kelas AKTIF per kelas+periode
-- ------------------------------------------------------------
-- Beda dari penugasan_hafalan (batas 2, butuh trigger), batas di sini
-- adalah 1 -- ini BISA dan SEBAIKNYA ditegakkan lewat partial unique index
-- (lebih murah dan lebih sulit dilewati race condition dibanding trigger,
-- karena unique index ditegakkan oleh index itu sendiri saat commit, bukan
-- oleh SELECT count yang bisa balapan di level statement biasa).
CREATE UNIQUE INDEX IF NOT EXISTS wali_kelas_assignment_satu_aktif_per_kelas
  ON public.wali_kelas_assignment (periode_id, jenjang, kelas_num, jenis_kelas)
  WHERE is_aktif = true;

-- ============================================================
-- 6. INDEX TAMBAHAN
-- ============================================================
CREATE INDEX IF NOT EXISTS penugasan_hafalan_guru_id_idx
  ON public.penugasan_hafalan (guru_id);
CREATE INDEX IF NOT EXISTS penugasan_hafalan_santri_id_idx
  ON public.penugasan_hafalan (santri_id);
CREATE INDEX IF NOT EXISTS penugasan_hafalan_periode_id_idx
  ON public.penugasan_hafalan (periode_id);
CREATE INDEX IF NOT EXISTS penugasan_hafalan_is_aktif_idx
  ON public.penugasan_hafalan (is_aktif);

CREATE INDEX IF NOT EXISTS wali_kelas_assignment_guru_id_idx
  ON public.wali_kelas_assignment (guru_id);
CREATE INDEX IF NOT EXISTS wali_kelas_assignment_periode_id_idx
  ON public.wali_kelas_assignment (periode_id);
CREATE INDEX IF NOT EXISTS wali_kelas_assignment_kelas_num_idx
  ON public.wali_kelas_assignment (kelas_num);
CREATE INDEX IF NOT EXISTS wali_kelas_assignment_jenis_kelas_idx
  ON public.wali_kelas_assignment (jenis_kelas);
CREATE INDEX IF NOT EXISTS wali_kelas_assignment_is_aktif_idx
  ON public.wali_kelas_assignment (is_aktif);

-- ============================================================
-- 7. RLS -- periode_akademik
-- ============================================================
ALTER TABLE public.periode_akademik ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS periode_akademik_select_scoped ON public.periode_akademik;
DROP POLICY IF EXISTS periode_akademik_insert_admin ON public.periode_akademik;
DROP POLICY IF EXISTS periode_akademik_update_admin ON public.periode_akademik;
DROP POLICY IF EXISTS periode_akademik_delete_admin ON public.periode_akademik;

-- SELECT: admin, guru, kepsek boleh baca (guru butuh tahu periode aktif
-- untuk konteks penugasannya nanti; kepsek untuk monitoring). Wali TIDAK
-- diberi policy -> default-deny, tidak butuh akses langsung di tahap ini.
CREATE POLICY periode_akademik_select_scoped
  ON public.periode_akademik
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'guru', 'kepsek')
  );

CREATE POLICY periode_akademik_insert_admin
  ON public.periode_akademik
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'admin'
  );

CREATE POLICY periode_akademik_update_admin
  ON public.periode_akademik
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
  )
  WITH CHECK (
    public.current_user_role() = 'admin'
  );

CREATE POLICY periode_akademik_delete_admin
  ON public.periode_akademik
  FOR DELETE
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
  );

-- ============================================================
-- 8. RLS -- penugasan_hafalan
-- ============================================================
ALTER TABLE public.penugasan_hafalan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS penugasan_hafalan_select_scoped ON public.penugasan_hafalan;
DROP POLICY IF EXISTS penugasan_hafalan_insert_admin ON public.penugasan_hafalan;
DROP POLICY IF EXISTS penugasan_hafalan_update_admin ON public.penugasan_hafalan;
DROP POLICY IF EXISTS penugasan_hafalan_delete_admin ON public.penugasan_hafalan;

-- SELECT: admin & kepsek semua baris; guru hanya baris miliknya sendiri
-- (guru_id = auth.uid()). Wali tidak diberi policy -> default-deny.
CREATE POLICY penugasan_hafalan_select_scoped
  ON public.penugasan_hafalan
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
    OR public.current_user_role() = 'kepsek'
    OR (
      public.current_user_role() = 'guru'
      AND guru_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: admin-only, browser-direct -- belum ada UI CRUD di
-- tahap ini, tapi policy disiapkan mengikuti pola profiles_update_admin dkk
-- (admin melakukan CRUD data referensi langsung dari browser).
CREATE POLICY penugasan_hafalan_insert_admin
  ON public.penugasan_hafalan
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'admin'
  );

CREATE POLICY penugasan_hafalan_update_admin
  ON public.penugasan_hafalan
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
  )
  WITH CHECK (
    public.current_user_role() = 'admin'
  );

CREATE POLICY penugasan_hafalan_delete_admin
  ON public.penugasan_hafalan
  FOR DELETE
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
  );

-- ============================================================
-- 9. RLS -- wali_kelas_assignment
-- ============================================================
ALTER TABLE public.wali_kelas_assignment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wali_kelas_assignment_select_scoped ON public.wali_kelas_assignment;
DROP POLICY IF EXISTS wali_kelas_assignment_insert_admin ON public.wali_kelas_assignment;
DROP POLICY IF EXISTS wali_kelas_assignment_update_admin ON public.wali_kelas_assignment;
DROP POLICY IF EXISTS wali_kelas_assignment_delete_admin ON public.wali_kelas_assignment;

-- SELECT: admin & kepsek semua baris; guru hanya baris miliknya sendiri
-- (guru_id = auth.uid()). Wali tidak diberi policy -> default-deny.
CREATE POLICY wali_kelas_assignment_select_scoped
  ON public.wali_kelas_assignment
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
    OR public.current_user_role() = 'kepsek'
    OR (
      public.current_user_role() = 'guru'
      AND guru_id = auth.uid()
    )
  );

CREATE POLICY wali_kelas_assignment_insert_admin
  ON public.wali_kelas_assignment
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'admin'
  );

CREATE POLICY wali_kelas_assignment_update_admin
  ON public.wali_kelas_assignment
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
  )
  WITH CHECK (
    public.current_user_role() = 'admin'
  );

CREATE POLICY wali_kelas_assignment_delete_admin
  ON public.wali_kelas_assignment
  FOR DELETE
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
  );

-- ============================================================
-- 10. TIDAK ADA DATA MIGRATION DI SINI
-- ============================================================
-- Sengaja tidak ada INSERT/UPDATE apapun ke ketiga tabel baru, dan tidak
-- ada pembacaan/penulisan ke santri.guru_id/guru_id_2 atau
-- profiles.is_wali_kelas/wali_kelas_num/wali_kelas_jenis. Ketiga tabel baru
-- di atas akan kosong setelah migration ini selesai dijalankan.
