'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Tab "Peringkat Ujian Hafalan" -- SATU-SATUNYA tipe ranking yang sumbernya API server
// (/api/ranking-ujian-hafalan), bukan Supabase langsung dari client seperti Total Hafalan/
// Konsistensi/Semangat (nilai_ujian RLS-locked ke admin/kepsek saja, lihat migration terkait).
// Komponen ini SENGAJA self-contained (filter + fetch sendiri) supaya TIDAK menyentuh state/props
// ketiga tab ranking lama sama sekali -- dipakai bersama oleh Admin & Kepsek RankingSection.
//
// Rumus (Nilai Ujian Keseluruhan/Nilai Hafalan/Nilai Peringkat/tie-breaker/eligibility) SEPENUHNYA
// dihitung server-side (hitungRankingUjianHafalanKelas, app/lib/ranking.ts) -- komponen ini murni
// menampilkan hasil yang sudah dihitung, sama sekali tidak menghitung ulang.

type PeriodeOption = { id: string, nama: string, tipe: string | null }

type PeringkatRow = {
  id: string
  nama: string
  total_hafalan_juz: number | null
  nilaiUjianKeseluruhan: number
  nilaiHafalan: number
  nilaiPeringkat: number
  peringkat: number
}

type BelumAdaHasilRow = {
  id: string
  nama: string
}

const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300'

function getKelasOptions(jenjang: string) {
  if (jenjang === 'ula') return [1, 2, 3, 4, 5, 6]
  if (jenjang === 'wustha') return [7, 8, 9]
  if (jenjang === 'ulya') return [10, 11, 12]
  return []
}

function labelTipePeriode(tipe: string | null) {
  if (tipe === 'mid_semester') return 'Mid Semester'
  if (tipe === 'semester') return 'Semester'
  return tipe || '-'
}

function formatNilai(value: number | null | undefined) {
  const nilai = Number(value)
  return Number.isFinite(nilai) ? nilai.toFixed(1) : '-'
}

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

const RankBadge = ({ i }: { i: number }) => (
  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
    ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
    {i + 1}
  </div>
)

export function RankingUjianHafalanSection() {
  const [periodeOptions, setPeriodeOptions] = useState<PeriodeOption[]>([])
  const [filterPeriode, setFilterPeriode] = useState('')
  const [filterJenjang, setFilterJenjang] = useState('')
  const [filterKelas, setFilterKelas] = useState('')
  const [filterKelompok, setFilterKelompok] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [kalenderInfo, setKalenderInfo] = useState<{ nama: string, tipe: string | null } | null>(null)
  const [peringkat, setPeringkat] = useState<PeringkatRow[]>([])
  const [belumAdaHasil, setBelumAdaHasil] = useState<BelumAdaHasilRow[]>([])
  const [modeFinal, setModeFinal] = useState(false)

  // Ranking ujian WAJIB satu periode eksplisit -- TIDAK ada opsi "Semua Periode" di dropdown ini
  // sama sekali (Rule G), dan fetch baru terjadi setelah keempat filter terisi.
  const filterLengkap = Boolean(filterPeriode && filterJenjang && filterKelas && filterKelompok)

  useEffect(() => {
    let dibatalkan = false
    async function muatPeriode() {
      const { data } = await supabase
        .from('kalender_akademik')
        .select('id, nama, tipe')
        .in('tipe', ['mid_semester', 'semester'])
        .order('tanggal_mulai', { ascending: true })
      if (!dibatalkan) setPeriodeOptions(data || [])
    }
    muatPeriode()
    return () => { dibatalkan = true }
  }, [])

  const pilihPeriode = (value: string) => {
    setFilterPeriode(value)
    setFilterJenjang('')
    setFilterKelas('')
    setFilterKelompok('')
  }
  const pilihJenjang = (value: string) => {
    setFilterJenjang(value)
    setFilterKelas('')
    setFilterKelompok('')
  }
  const pilihKelas = (value: string) => {
    setFilterKelas(value)
    setFilterKelompok('')
  }

  useEffect(() => {
    let dibatalkan = false
    async function muatRanking() {
      if (!filterLengkap) {
        setPeringkat([])
        setBelumAdaHasil([])
        setKalenderInfo(null)
        setError('')
        return
      }
      setLoading(true)
      setError('')
      try {
        const accessToken = await getAccessToken()
        if (!accessToken) throw new Error('Sesi login sudah berakhir. Silakan login kembali.')
        const params = new URLSearchParams({
          periode: filterPeriode, jenjang: filterJenjang, kelas: filterKelas, kelompok: filterKelompok,
        })
        if (modeFinal) params.set('final', 'true')
        const response = await fetch(`/api/ranking-ujian-hafalan?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
          if (response.status === 401) throw new Error('Sesi login tidak valid atau sudah berakhir.')
          if (response.status === 403) throw new Error('Akun ini tidak memiliki akses.')
          throw new Error(result.error || 'Gagal memuat peringkat ujian hafalan.')
        }
        if (dibatalkan) return
        setKalenderInfo(result.kalender || null)
        setPeringkat(Array.isArray(result.peringkat) ? result.peringkat : [])
        setBelumAdaHasil(Array.isArray(result.belumAdaHasil) ? result.belumAdaHasil : [])
      } catch (fetchError) {
        if (dibatalkan) return
        setPeringkat([])
        setBelumAdaHasil([])
        setError(fetchError instanceof Error ? fetchError.message : 'Gagal memuat peringkat ujian hafalan.')
      } finally {
        if (!dibatalkan) setLoading(false)
      }
    }
    muatRanking()
    return () => { dibatalkan = true }
  }, [filterLengkap, filterPeriode, filterJenjang, filterKelas, filterKelompok, modeFinal])

  // Sementara selama ADA santri aktif kelas yang belum punya juz ujian selesai -- tidak menunggu
  // Tajwid (Tajwid memang tidak pernah masuk respons endpoint ini sama sekali).
  const statusSementara = belumAdaHasil.length > 0

  return (
    <div>
      <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-1">Peringkat Ujian Hafalan</h3>
        <p className="text-xs text-gray-500 mb-3">Pilih periode ujian, jenjang, kelas, dan kelompok untuk melihat peringkat.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Periode Ujian</label>
            <select value={filterPeriode} onChange={e => pilihPeriode(e.target.value)} className={inputClass}>
              <option value="">-- Pilih --</option>
              {periodeOptions.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
            <select value={filterJenjang} onChange={e => pilihJenjang(e.target.value)} className={inputClass} disabled={!filterPeriode}>
              <option value="">-- Pilih --</option>
              <option value="ula">Ula</option>
              <option value="wustha">Wustha</option>
              <option value="ulya">Ulya</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Kelas</label>
            <select value={filterKelas} onChange={e => pilihKelas(e.target.value)} className={inputClass} disabled={!filterJenjang}>
              <option value="">-- Pilih --</option>
              {getKelasOptions(filterJenjang).map(k => <option key={k} value={k}>Kelas {k}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Kelompok</label>
            <select value={filterKelompok} onChange={e => setFilterKelompok(e.target.value)} className={inputClass} disabled={!filterKelas}>
              <option value="">-- Pilih --</option>
              <option value="banin">Banin</option>
              <option value="banat">Banat</option>
              <option value="tn">TN</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 flex-wrap gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={modeFinal}
              onChange={e => setModeFinal(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Hitung Peringkat Final (santri yang belum menyelesaikan seluruh ujian wajib dikenakan nilai 0)
          </label>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

      {!filterLengkap ? (
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-10 text-center text-gray-400 text-sm">
          Pilih periode, jenjang, kelas, dan kelompok untuk melihat peringkat ujian hafalan.
        </div>
      ) : loading ? (
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-10 text-center text-gray-400">Memuat peringkat...</div>
      ) : (
        <>
          {kalenderInfo && (
            <div className="mb-3 text-xs text-gray-500">
              Periode: <span className="font-semibold text-gray-700">{kalenderInfo.nama}</span> ({labelTipePeriode(kalenderInfo.tipe)})
            </div>
          )}

          {modeFinal ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <div className="font-bold text-blue-800 text-sm">PERINGKAT FINAL (UJIAN SELESAI)</div>
              <p className="text-xs text-blue-700 mt-1">
                Hasil resmi ujian akhir. Seluruh santri dengan kewajiban ujian telah diperingkatkan secara definitif (juz yang belum selesai dihitung bernilai 0).
              </p>
            </div>
          ) : statusSementara ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
              <div className="font-bold text-yellow-800 text-sm">PERINGKAT SEMENTARA</div>
              <p className="text-xs text-yellow-700 mt-1">
                Masih ada {belumAdaHasil.length} santri yang belum memiliki juz ujian selesai. Peringkat dapat berubah sampai seluruh ujian selesai.
              </p>
            </div>
          ) : peringkat.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <div className="font-bold text-green-800 text-sm">Peringkat Ujian Hafalan</div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
            <div className="p-4 space-y-2">
              {peringkat.map((santri, i) => (
                <div key={santri.id} className={`flex items-center gap-3 p-3 rounded-xl ${i < 3 ? 'bg-gray-50' : ''}`}>
                  <RankBadge i={i} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-800 truncate">{santri.nama}</div>
                    <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3">
                      <span>Nilai Ujian: {formatNilai(santri.nilaiUjianKeseluruhan)}</span>
                      <span>Hafalan: {Number(santri.total_hafalan_juz || 0).toFixed(2)} juz</span>
                      <span>Nilai Hafalan: {formatNilai(santri.nilaiHafalan)}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px] text-gray-400">Nilai Peringkat</div>
                    <div className="font-bold text-sm text-blue-700">{formatNilai(santri.nilaiPeringkat)}</div>
                  </div>
                </div>
              ))}
              {peringkat.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-6">Belum ada santri yang eligible untuk peringkat pada periode/kelas ini.</p>
              )}
            </div>
          </div>

          {belumAdaHasil.length > 0 && (
            <div className="bg-white rounded-2xl shadow border border-gray-100 p-4 mt-4">
              <div className="font-semibold text-gray-700 text-sm mb-2">Belum memiliki hasil ujian ({belumAdaHasil.length})</div>
              <div className="flex flex-wrap gap-2">
                {belumAdaHasil.map(santri => (
                  <span key={santri.id} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{santri.nama}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
