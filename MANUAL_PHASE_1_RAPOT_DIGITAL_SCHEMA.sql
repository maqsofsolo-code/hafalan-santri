-- =====================================================================
-- MANUAL_PHASE_1_RAPOT_DIGITAL_SCHEMA.sql
-- =====================================================================
-- PENTING:
-- File ini disiapkan HANYA untuk dijalankan MANUAL oleh OWNER melalui
-- Supabase Dashboard > SQL Editor.
--
-- JANGAN MENJALANKAN DARI CLI ATAU AGENT OTOMATIS.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. PRE-CHECK INTEGRITAS: Fail-Closed jika nilai_rapot tidak kosong
-- ---------------------------------------------------------------------
-- Migrasi FK dan penguatan NOT NULL hanya aman diaplikasikan jika
-- tabel nilai_rapot masih bersih (0 baris). Jika tidak kosong,
-- transaksi akan langsung di-abort dan di-rollback otomatis.
DO $$
DECLARE
  v_cnt integer;
BEGIN
  SELECT count(*) INTO v_cnt FROM public.nilai_rapot;
  IF v_cnt > 0 THEN
    RAISE EXCEPTION 'PRE-CHECK GAGAL: public.nilai_rapot tidak kosong (ditemukan % baris). Migrasi skema FK dan NOT NULL dibatalkan demi keselamatan data!', v_cnt;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 1. Tambah kolom rapot_input_dibuka pada periode_akademik
-- ---------------------------------------------------------------------
ALTER TABLE public.periode_akademik
  ADD COLUMN IF NOT EXISTS rapot_input_dibuka boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.periode_akademik.rapot_input_dibuka IS
  'Kontrol jendela input nilai rapot: true jika Wali Kelas diizinkan menulis/mengedit nilai rapot digital; false jika ditutup. Admin tetap dapat menulis kapan pun.';

-- ---------------------------------------------------------------------
-- 2. Tambah kolom jenis_kelas_snapshot pada nilai_rapot
-- ---------------------------------------------------------------------
ALTER TABLE public.nilai_rapot
  ADD COLUMN IF NOT EXISTS jenis_kelas_snapshot text;

COMMENT ON COLUMN public.nilai_rapot.jenis_kelas_snapshot IS
  'Snapshot domain santri (banin/banat/tn_a/tn_b) saat nilai dicatat. Bersama kelas_snapshot dan jenjang_snapshot menjadi data historis resmi.';

-- ---------------------------------------------------------------------
-- 3. Retarget FK nilai_rapot.periode_id ke periode_akademik(id)
-- ---------------------------------------------------------------------
-- Lepas FK lama ke periode_rapot dan pasang FK baru ke periode_akademik
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'nilai_rapot'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'periode_id'
  ) LOOP
    EXECUTE 'ALTER TABLE public.nilai_rapot DROP CONSTRAINT ' || quote_ident(r.constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.nilai_rapot
  ADD CONSTRAINT nilai_rapot_periode_id_fkey
  FOREIGN KEY (periode_id)
  REFERENCES public.periode_akademik(id)
  ON DELETE RESTRICT;

-- ---------------------------------------------------------------------
-- 4. Pertahankan / Buat UNIQUE (santri_id, periode_id) tanpa duplikasi
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'nilai_rapot'
      AND c.contype = 'u'
      AND (
        SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
        FROM pg_attribute a
        WHERE a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
      ) = ARRAY['santri_id', 'periode_id']
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'nilai_rapot'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexdef ILIKE '%(santri_id, periode_id)%'
  ) THEN
    ALTER TABLE public.nilai_rapot
      ADD CONSTRAINT nilai_rapot_santri_id_periode_id_key UNIQUE (santri_id, periode_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 5. Penguatan NOT NULL pada kolom esensial nilai_rapot
-- ---------------------------------------------------------------------
-- Aman dilakukan karena telah lulus pre-check nilai_rapot = 0 baris
ALTER TABLE public.nilai_rapot
  ALTER COLUMN santri_id SET NOT NULL,
  ALTER COLUMN periode_id SET NOT NULL,
  ALTER COLUMN kelas_snapshot SET NOT NULL,
  ALTER COLUMN jenjang_snapshot SET NOT NULL,
  ALTER COLUMN jenis_kelas_snapshot SET NOT NULL;

-- ---------------------------------------------------------------------
-- 6. RLS Pengerasan nilai_rapot: ADMIN-ONLY SELECT, ZERO DIRECT MUTATION
-- ---------------------------------------------------------------------
-- Seluruh akses Guru (read maupun write) telah dialihkan 100% melalui
-- Route Handler server yang menggunakan service-role client.
-- Maka authenticated browser Guru, Wali, Kepsek, dan Anon TIDAK MEMILIKI
-- direct table access sama sekali (default-deny).
-- Direct table access hanya diberikan untuk ADMIN (SELECT murni).
ALTER TABLE public.nilai_rapot ENABLE ROW LEVEL SECURITY;

-- Drop policy lama (blanket maupun scoped) agar re-run aman
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.nilai_rapot;
DROP POLICY IF EXISTS nilai_rapot_select_scoped ON public.nilai_rapot;
DROP POLICY IF EXISTS nilai_rapot_select_admin ON public.nilai_rapot;
DROP POLICY IF EXISTS nilai_rapot_insert_scoped ON public.nilai_rapot;
DROP POLICY IF EXISTS nilai_rapot_update_scoped ON public.nilai_rapot;
DROP POLICY IF EXISTS nilai_rapot_delete_admin ON public.nilai_rapot;

-- SELECT policy:
-- ADMIN: boleh membaca seluruh nilai_rapot.
-- GURU / WALI / KEPSEK / ANON: tidak ada direct table access (default-deny).
CREATE POLICY nilai_rapot_select_admin
  ON public.nilai_rapot
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
  );

-- CATATAN KEAMANAN:
-- TIDAK ADA policy INSERT untuk authenticated.
-- TIDAK ADA policy UPDATE untuk authenticated.
-- TIDAK ADA policy DELETE untuk authenticated.
-- Semua mutasi nilai_rapot WAJIB melalui API Route Handler via service-role.

-- ---------------------------------------------------------------------
-- 7. Pengerasan RLS pada tabel legacy periode_rapot (ADMIN-ONLY)
-- ---------------------------------------------------------------------
ALTER TABLE public.periode_rapot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.periode_rapot;
DROP POLICY IF EXISTS periode_rapot_admin_all ON public.periode_rapot;

CREATE POLICY periode_rapot_admin_all
  ON public.periode_rapot
  FOR ALL
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
  )
  WITH CHECK (
    public.current_user_role() = 'admin'
  );

COMMIT;
