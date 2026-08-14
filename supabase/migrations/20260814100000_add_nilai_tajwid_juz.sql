-- Nilai Tajwid: SATU nilai per (santri, juz, periode ujian) -- terpisah dari Nilai Kelancaran
-- (public.nilai_ujian, yang bersifat per-segmen dan append-only). Tajwid boleh diedit di tempat
-- (upsert), sehingga butuh identitas alami sendiri (santri_id + juz + kalender_id) yang tidak
-- append-only seperti nilai_ujian.
--
-- Gating "seluruh segmen juz ini sudah selesai dinilai" divalidasi di server (app/api/nilai-ujian
-- PUT) sebelum upsert, BUKAN oleh CHECK constraint DB -- status selesai bergantung pada cakupan
-- hafalan santri (checkpoint surah/ayat, lihat getCakupanSegment) yang tidak bisa dievaluasi oleh
-- constraint SQL sederhana tanpa duplikasi logic tersebut ke PL/pgSQL.
CREATE TABLE IF NOT EXISTS public.nilai_tajwid_juz (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id uuid NOT NULL REFERENCES public.santri(id) ON DELETE RESTRICT,
  juz integer NOT NULL,
  kalender_id uuid NOT NULL REFERENCES public.kalender_akademik(id) ON DELETE RESTRICT,
  nilai numeric(3,1) NOT NULL,
  guru_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nilai_tajwid_juz_juz_check CHECK (juz BETWEEN 1 AND 30),
  CONSTRAINT nilai_tajwid_juz_nilai_check CHECK (nilai >= 0 AND nilai <= 10),
  CONSTRAINT nilai_tajwid_juz_santri_juz_kalender_key UNIQUE (santri_id, juz, kalender_id)
);

CREATE INDEX IF NOT EXISTS nilai_tajwid_juz_santri_kalender_idx
  ON public.nilai_tajwid_juz(santri_id, kalender_id);

-- updated_at trigger: pola identik dengan
-- supabase/migrations/20260803120000_master_segment_ujian.sql
-- (set_master_segment_ujian_updated_at).
CREATE OR REPLACE FUNCTION public.set_nilai_tajwid_juz_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_nilai_tajwid_juz_updated_at_trigger ON public.nilai_tajwid_juz;
CREATE TRIGGER set_nilai_tajwid_juz_updated_at_trigger
BEFORE UPDATE ON public.nilai_tajwid_juz
FOR EACH ROW
EXECUTE FUNCTION public.set_nilai_tajwid_juz_updated_at();

-- ============================================================
-- RLS -- mirror persis pola public.nilai_ujian
-- (supabase/migrations/20260808150000_secure_nilai_ujian_rls.sql), termasuk reuse
-- public.current_user_role() yang sudah dibuat pada migration tsb.
-- ============================================================
ALTER TABLE public.nilai_tajwid_juz ENABLE ROW LEVEL SECURITY;

-- SELECT: admin & kepsek saja. Guru TIDAK diberi policy SELECT langsung -- akses guru yang sah
-- (GET/PUT /api/nilai-ujian, wing-scoped) sudah diverifikasi server-side lalu dieksekusi lewat
-- service-role client, yang bypass RLS sepenuhnya. Wali: tidak diberi policy apapun pada tabel ini
-- -> default-deny RLS berlaku (Wali tidak boleh mengakses Nilai Tajwid mentah sama sekali).
CREATE POLICY nilai_tajwid_juz_select_admin_kepsek
  ON public.nilai_tajwid_juz
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'kepsek'));

-- INSERT/UPDATE/DELETE: sengaja TIDAK dibuatkan policy untuk role `authenticated` sama sekali.
-- Seluruh mutation yang sah (guru PUT /api/nilai-ujian setelah wing check, admin PUT
-- /api/admin/nilai-ujian) berjalan lewat service-role client setelah authorize() di server --
-- service-role bypass RLS, jadi tidak butuh policy authenticated apapun untuk operasi ini. Tanpa
-- policy INSERT/UPDATE/DELETE, RLS default-deny keempat operasi tsb untuk SEMUA role di jalur
-- authenticated/browser (termasuk admin) -- disengaja, sama seperti nilai_ujian.
