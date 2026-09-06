-- ====================================================================
-- MANUAL_ADD_WUSTHA_ULYA_SUBJECT_COLUMNS.sql
-- ====================================================================
-- TUJUAN:
-- Menambahkan 6 kolom mata pelajaran akademik untuk Wustha & Ulya:
-- tahsin, nahwu, shorof, imla, usul_fiqih, mustholah
-- pada tabel public.nilai_rapot.
--
-- PENTING:
-- Dijalankan MANUAL oleh Owner melalui Supabase Dashboard > SQL Editor.
-- JANGAN dijalankan otomatis dari CLI / agent / migrasi.
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 0. PRE-FLIGHT ASSERTION: Fail-Closed jika kolom sudah ada bertipe non-integer
-- --------------------------------------------------------------------
DO $$
DECLARE
  v_bad_col record;
BEGIN
  FOR v_bad_col IN (
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'nilai_rapot'
      AND column_name IN ('tahsin', 'nahwu', 'shorof', 'imla', 'usul_fiqih', 'mustholah')
      AND data_type <> 'integer'
  ) LOOP
    RAISE EXCEPTION 'PRE-FLIGHT GAGAL: Kolom % sudah ada pada public.nilai_rapot namun bertipe % (bukan integer). Transaksi dibatalkan demi keselamatan skema!',
      v_bad_col.column_name, v_bad_col.data_type;
  END LOOP;
END $$;

-- --------------------------------------------------------------------
-- 1. ADD COLUMNS (IDEMPOTENT VIA IF NOT EXISTS)
-- --------------------------------------------------------------------
ALTER TABLE public.nilai_rapot
  ADD COLUMN IF NOT EXISTS tahsin integer,
  ADD COLUMN IF NOT EXISTS nahwu integer,
  ADD COLUMN IF NOT EXISTS shorof integer,
  ADD COLUMN IF NOT EXISTS imla integer,
  ADD COLUMN IF NOT EXISTS usul_fiqih integer,
  ADD COLUMN IF NOT EXISTS mustholah integer;

-- --------------------------------------------------------------------
-- 2. ADD CHECK CONSTRAINTS (SCOPED TO public.nilai_rapot)
-- --------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'nilai_rapot_tahsin_check'
      AND conrelid = 'public.nilai_rapot'::regclass
  ) THEN
    ALTER TABLE public.nilai_rapot
      ADD CONSTRAINT nilai_rapot_tahsin_check
      CHECK (tahsin IS NULL OR (tahsin >= 0 AND tahsin <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'nilai_rapot_nahwu_check'
      AND conrelid = 'public.nilai_rapot'::regclass
  ) THEN
    ALTER TABLE public.nilai_rapot
      ADD CONSTRAINT nilai_rapot_nahwu_check
      CHECK (nahwu IS NULL OR (nahwu >= 0 AND nahwu <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'nilai_rapot_shorof_check'
      AND conrelid = 'public.nilai_rapot'::regclass
  ) THEN
    ALTER TABLE public.nilai_rapot
      ADD CONSTRAINT nilai_rapot_shorof_check
      CHECK (shorof IS NULL OR (shorof >= 0 AND shorof <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'nilai_rapot_imla_check'
      AND conrelid = 'public.nilai_rapot'::regclass
  ) THEN
    ALTER TABLE public.nilai_rapot
      ADD CONSTRAINT nilai_rapot_imla_check
      CHECK (imla IS NULL OR (imla >= 0 AND imla <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'nilai_rapot_usul_fiqih_check'
      AND conrelid = 'public.nilai_rapot'::regclass
  ) THEN
    ALTER TABLE public.nilai_rapot
      ADD CONSTRAINT nilai_rapot_usul_fiqih_check
      CHECK (usul_fiqih IS NULL OR (usul_fiqih >= 0 AND usul_fiqih <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'nilai_rapot_mustholah_check'
      AND conrelid = 'public.nilai_rapot'::regclass
  ) THEN
    ALTER TABLE public.nilai_rapot
      ADD CONSTRAINT nilai_rapot_mustholah_check
      CHECK (mustholah IS NULL OR (mustholah >= 0 AND mustholah <= 100));
  END IF;
END $$;

COMMIT;
