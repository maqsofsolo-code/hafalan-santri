-- Snapshot Hafalan Ujian (Phase C: RAPORT_HIFZH_FINAL_EXAM_POLICY.md)
-- Mengunci posisi hafalan resmi santri (checkpoint surah/ayat dan total_hafalan_juz) pada awal periode ujian.
-- Mencegah required exam scope bergeser ketika santri menambah hafalan baru atau mengalami mutasi hafalan setelah ujian dimulai.
--
-- Dibuat lokal terlebih dahulu, TIDAK dieksekusi ke produksi sebelum persetujuan user.

CREATE TABLE IF NOT EXISTS public.santri_hafalan_exam_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id uuid NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
  kalender_id uuid NOT NULL REFERENCES public.kalender_akademik(id) ON DELETE CASCADE,
  surah_terakhir_nomor integer,
  ayat_terakhir integer,
  total_hafalan_juz numeric(4,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT santri_hafalan_exam_snapshot_santri_kalender_key UNIQUE (santri_id, kalender_id),
  CONSTRAINT santri_hafalan_exam_snapshot_surah_check CHECK (surah_terakhir_nomor IS NULL OR (surah_terakhir_nomor BETWEEN 1 AND 114)),
  CONSTRAINT santri_hafalan_exam_snapshot_ayat_check CHECK (ayat_terakhir IS NULL OR ayat_terakhir >= 1),
  CONSTRAINT santri_hafalan_exam_snapshot_juz_check CHECK (total_hafalan_juz IS NULL OR (total_hafalan_juz >= 0 AND total_hafalan_juz <= 30))
);

CREATE INDEX IF NOT EXISTS santri_hafalan_exam_snapshot_kalender_santri_idx
  ON public.santri_hafalan_exam_snapshot(kalender_id, santri_id);

CREATE OR REPLACE FUNCTION public.set_santri_hafalan_exam_snapshot_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_santri_hafalan_exam_snapshot_updated_at_trigger ON public.santri_hafalan_exam_snapshot;
CREATE TRIGGER set_santri_hafalan_exam_snapshot_updated_at_trigger
BEFORE UPDATE ON public.santri_hafalan_exam_snapshot
FOR EACH ROW
EXECUTE FUNCTION public.set_santri_hafalan_exam_snapshot_updated_at();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE public.santri_hafalan_exam_snapshot ENABLE ROW LEVEL SECURITY;

-- SELECT: admin & kepsek dapat membaca seluruh snapshot.
CREATE POLICY santri_hafalan_exam_snapshot_select_admin_kepsek
  ON public.santri_hafalan_exam_snapshot
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'kepsek', 'guru'));

-- Mutasi (INSERT/UPDATE/DELETE) dilakukan melalui API terotorisasi via service_role client.
-- RLS default deny berlaku untuk mutasi langsung dari client authenticated non-service-role.
