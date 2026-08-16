'use client'
import { useEffect, useState } from 'react'
import {
  getKelasOptions, jenjangLabel, cocokKelompokMonitoring,
  cocokGuruUntukJenisKelasSantri, jenjangDariKelasNumLama,
  labelJenisKelasWaliLama, labelJenisKelasSantriUntukAssignment,
  cariDefaultPeriodeSumber,
} from '../utils'
import type { Guru, Santri, PeriodeAkademik, PenugasanHafalanRow, WaliKelasAssignmentRow } from '../types'
import type { useAdminPeriodeAkademik } from '../hooks/useAdminPeriodeAkademik'
import type { useAdminPenugasanGuru } from '../hooks/useAdminPenugasanGuru'
import { useAdminSalinPenugasan } from '../hooks/useAdminSalinPenugasan'

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-300"
const btnPrimary = "text-white px-6 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 shadow transition"
const GRADIENT = 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)'

type PeriodeAkademikHook = ReturnType<typeof useAdminPeriodeAkademik>
type PenugasanGuruHook = ReturnType<typeof useAdminPenugasanGuru>

function namaGuruDariId(guruList: Guru[], id: string | null | undefined): string {
  if (!id) return '-'
  return guruList.find(g => g.id === id)?.nama || '(guru tidak ditemukan)'
}

// Tab "Penugasan Guru" -- fitur baru Tahap 9D. Mengelola FONDASI tabel baru
// dari Tahap 9B (periode_akademik, penugasan_hafalan, wali_kelas_assignment)
// lewat UI Admin. SENGAJA tidak menyentuh/menyinkronkan sistem lama
// (santri.guru_id/guru_id_2, profiles.is_wali_kelas/wali_kelas_num/
// wali_kelas_jenis) -- ditampilkan hanya sebagai referensi "Data Lama" di
// kedua sub-tab. Batas max-2 Guru Hafalan & 1 Wali Kelas aktif ditegakkan
// DATABASE (trigger/partial unique index Tahap 9B); filter guru per wing di
// sini murni UX (cocokGuruUntukJenisKelasSantri), bukan aturan keamanan --
// app/lib/wingAkses.ts (dipakai Input Setoran & Nilai Ujian) TIDAK disentuh.
export function PenugasanGuruSection(props: {
  periodeAkademik: PeriodeAkademikHook
  penugasan: PenugasanGuruHook
  guruList: Guru[]
  santriList: Santri[]
}) {
  const { periodeAkademik: pa, penugasan: pg, guruList, santriList } = props
  const [activeTab, setActiveTab] = useState<'periode' | 'guru-hafalan' | 'wali-kelas'>('periode')
  const [showSalinModal, setShowSalinModal] = useState(false)
  const { fetchPenugasanHafalan, fetchWaliKelasAssignment } = pg

  // Histori per periode (Tahap 9D bagian M): setiap kali selector periode
  // berganti, muat ulang penugasan Guru Hafalan & Wali Kelas UNTUK periode
  // itu saja -- tidak ada overwrite lintas periode, data periode lain tetap
  // tersimpan di database dan akan tampil lagi begitu periode itu dipilih.
  useEffect(() => {
    if (pa.periodeIdTerpilih) {
      fetchPenugasanHafalan(pa.periodeIdTerpilih)
      fetchWaliKelasAssignment(pa.periodeIdTerpilih)
    }
  }, [pa.periodeIdTerpilih, fetchPenugasanHafalan, fetchWaliKelasAssignment])

  const jumlahPeriodeAktif = pa.periodeList.filter(p => p.is_aktif).length
  const periodeTerpilih = pa.periodeList.find(p => p.id === pa.periodeIdTerpilih) || null

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg" style={{ background: GRADIENT }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Penugasan Guru</h2>
          <p className="text-purple-100 text-sm mt-1">Periode Akademik, Guru Hafalan, Wali Kelas</p>
          <p className="text-purple-200 text-xs mt-0.5">Fondasi baru -- coexist dengan sistem lama, belum menggantikan akses setoran/nilai ujian</p>
        </div>
      </div>

      {/* Selector periode -- selalu tampil (Tahap 9D bagian D) */}
      <div className="bg-white rounded-2xl shadow p-4 mb-4 border border-gray-100">
        <label className="block text-xs text-gray-500 mb-1">Periode</label>
        {pa.periodeList.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada periode akademik. Buat periode terlebih dahulu di tab &quot;Periode Akademik&quot; sebelum mengatur penugasan.</p>
        ) : (
          <select value={pa.periodeIdTerpilih} onChange={e => pa.setPeriodeIdTerpilih(e.target.value)} className={inputClass}>
            {pa.periodeList.map(p => (
              <option key={p.id} value={p.id}>
                {p.tahun_ajaran} - Semester {p.semester}{p.is_aktif ? ' (Aktif)' : ''}
              </option>
            ))}
          </select>
        )}
        {jumlahPeriodeAktif > 1 && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ Terdapat lebih dari satu periode aktif. Guru Hafalan dan Wali Kelas di bawah mengikuti periode yang DIPILIH pada selector ini, bukan otomatis periode aktif.
          </p>
        )}
        {pa.periodeIdTerpilih && pa.periodeList.length > 1 && (
          <button onClick={() => setShowSalinModal(true)}
            className="mt-3 text-sm font-semibold px-4 py-2 rounded-xl border-2 border-purple-300 text-purple-700 hover:bg-purple-50 transition">
            Salin dari Periode Sebelumnya
          </button>
        )}
      </div>

      {showSalinModal && pa.periodeIdTerpilih && (
        <SalinPenugasanModal
          pa={pa}
          onClose={() => setShowSalinModal(false)}
          onSelesai={() => {
            fetchPenugasanHafalan(pa.periodeIdTerpilih)
            fetchWaliKelasAssignment(pa.periodeIdTerpilih)
          }}
        />
      )}

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[
          { id: 'periode' as const, label: 'Periode Akademik' },
          { id: 'guru-hafalan' as const, label: 'Guru Hafalan' },
          { id: 'wali-kelas' as const, label: 'Wali Kelas' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition border-2 whitespace-nowrap ${activeTab === tab.id ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-500'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'periode' && <TabPeriodeAkademik pa={pa} />}
      {activeTab === 'guru-hafalan' && (
        <TabGuruHafalan pa={pa} pg={pg} guruList={guruList} santriList={santriList} periodeTerpilih={periodeTerpilih} />
      )}
      {activeTab === 'wali-kelas' && (
        <TabWaliKelas pa={pa} pg={pg} guruList={guruList} periodeTerpilih={periodeTerpilih} />
      )}
    </div>
  )
}

// ============================================================
// MODAL -- SALIN PENUGASAN DARI PERIODE SEBELUMNYA (Tahap 9H)
// ============================================================
// Preview & eksekusi SELALU lewat API server (useAdminSalinPenugasan ->
// /api/admin/salin-penugasan) -- rule "apa yang disalin/dilewati" TIDAK
// pernah dihitung ulang di sini, murni menampilkan angka yang sudah
// dihitung server (app/lib/salinPenugasan.ts).
function SalinPenugasanModal(props: {
  pa: PeriodeAkademikHook
  onClose: () => void
  onSelesai: () => void
}) {
  const { pa, onClose, onSelesai } = props
  const targetId = pa.periodeIdTerpilih
  const salin = useAdminSalinPenugasan()
  const sumberOptions = pa.periodeList.filter(p => p.id !== targetId)
  const [sourceId, setSourceId] = useState(() => cariDefaultPeriodeSumber(pa.periodeList, targetId))
  const [selesai, setSelesai] = useState(false)

  useEffect(() => {
    if (sourceId && targetId) salin.muatPreview(sourceId, targetId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId, targetId])

  const targetPeriode = pa.periodeList.find(p => p.id === targetId) || null
  const sourcePeriode = pa.periodeList.find(p => p.id === sourceId) || null

  const labelPeriode = (p: PeriodeAkademik | null) => p ? `${p.tahun_ajaran} — Semester ${p.semester}` : '-'

  const handlePilihSumber = (id: string) => {
    setSourceId(id)
    setSelesai(false)
    salin.resetHasil()
  }

  const handleSalinSekarang = async () => {
    if (!sourceId || !targetId) return
    if (!confirm(`Salin seluruh Guru Hafalan & Wali Kelas AKTIF dari ${labelPeriode(sourcePeriode)} ke ${labelPeriode(targetPeriode)}?\n\nAssignment yang sudah diatur manual di periode target TIDAK akan ditimpa.`)) return
    const ok = await salin.jalankanSalin(sourceId, targetId)
    if (ok) setSelesai(true)
  }

  const handleTutup = () => {
    if (selesai) onSelesai()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-gray-800 text-lg">Salin Penugasan dari Periode Sebelumnya</h3>
          <button onClick={handleTutup} className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1">&times;</button>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-1">Periode Target</label>
          <div className="px-3 py-2.5 rounded-xl bg-gray-100 text-sm text-gray-700 font-semibold">{labelPeriode(targetPeriode)}</div>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-1">Periode Sumber</label>
          {sumberOptions.length === 0 ? (
            <p className="text-sm text-gray-400">Tidak ada periode lain untuk disalin.</p>
          ) : (
            <select value={sourceId} onChange={e => handlePilihSumber(e.target.value)} className={inputClass}>
              <option value="">-- Pilih Periode Sumber --</option>
              {sumberOptions.map(p => (
                <option key={p.id} value={p.id}>{p.tahun_ajaran} — Semester {p.semester}{p.is_aktif ? ' (Aktif)' : ''}</option>
              ))}
            </select>
          )}
        </div>

        {!selesai && sourceId && (
          <>
            {salin.loadingPreview && <p className="text-sm text-gray-400 text-center py-4">Memuat preview...</p>}
            {salin.previewError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{salin.previewError}</div>}
            {!salin.loadingPreview && salin.previewGuruHafalan && salin.previewWaliKelas && (
              <div className="space-y-3 mb-4">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <div className="text-xs font-bold text-gray-600 mb-1.5">Guru Hafalan</div>
                  <ul className="text-xs text-gray-600 space-y-0.5">
                    <li>Aktif di sumber: <b>{salin.previewGuruHafalan.aktifSumber}</b></li>
                    <li className="text-green-700">Bisa disalin: <b>{salin.previewGuruHafalan.akanDisalin}</b></li>
                    <li>Sudah ada sama di target: {salin.previewGuruHafalan.sudahAdaSama}</li>
                    <li>Target sudah memiliki assignment manual: {salin.previewGuruHafalan.targetSudahDiatur}</li>
                    {salin.previewGuruHafalan.konflikMaxDua > 0 && (
                      <li className="text-amber-700">Konflik maks-2 (dilewati): {salin.previewGuruHafalan.konflikMaxDua}</li>
                    )}
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <div className="text-xs font-bold text-gray-600 mb-1.5">Wali Kelas</div>
                  <ul className="text-xs text-gray-600 space-y-0.5">
                    <li>Aktif di sumber: <b>{salin.previewWaliKelas.aktifSumber}</b></li>
                    <li className="text-green-700">Bisa disalin: <b>{salin.previewWaliKelas.akanDisalin}</b></li>
                    <li>Sudah ada sama di target: {salin.previewWaliKelas.sudahAdaSama}</li>
                    <li>Kelas target sudah terisi: {salin.previewWaliKelas.targetSudahTerisi}</li>
                  </ul>
                </div>
              </div>
            )}
            {salin.applyError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{salin.applyError}</div>}
            <button onClick={handleSalinSekarang} disabled={salin.applying || salin.loadingPreview}
              className="w-full text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50" style={{ background: GRADIENT }}>
              {salin.applying ? 'Menyalin...' : 'Salin Sekarang'}
            </button>
          </>
        )}

        {selesai && salin.hasilGuruHafalan && salin.hasilWaliKelas && (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <div className="text-xs font-bold text-green-800 mb-1.5">Guru Hafalan</div>
              <ul className="text-xs text-green-800 space-y-0.5">
                <li>{salin.hasilGuruHafalan.berhasil} berhasil disalin</li>
                <li>{salin.hasilGuruHafalan.sudahAdaSama} sudah ada</li>
                <li>{salin.hasilGuruHafalan.targetSudahDiatur} dilewati karena target sudah diatur</li>
                {salin.hasilGuruHafalan.konflikMaxDua > 0 && <li>{salin.hasilGuruHafalan.konflikMaxDua} dilewati karena konflik maks-2</li>}
                {salin.hasilGuruHafalan.gagalLain > 0 && <li>{salin.hasilGuruHafalan.gagalLain} gagal (error lain)</li>}
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <div className="text-xs font-bold text-green-800 mb-1.5">Wali Kelas</div>
              <ul className="text-xs text-green-800 space-y-0.5">
                <li>{salin.hasilWaliKelas.berhasil} berhasil disalin</li>
                <li>{salin.hasilWaliKelas.sudahAdaSama} sudah ada</li>
                <li>{salin.hasilWaliKelas.targetSudahTerisi} dilewati karena kelas target sudah diatur</li>
                {salin.hasilWaliKelas.gagalLain > 0 && <li>{salin.hasilWaliKelas.gagalLain} gagal (error lain)</li>}
              </ul>
            </div>
            <button onClick={handleTutup} className="w-full text-white text-sm font-semibold px-4 py-2.5 rounded-xl" style={{ background: GRADIENT }}>
              Selesai
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// TAB 1 -- PERIODE AKADEMIK
// ============================================================
function TabPeriodeAkademik({ pa }: { pa: PeriodeAkademikHook }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-800">Daftar Periode Akademik</h3>
        <button onClick={() => { pa.resetFormPeriode(); pa.setShowFormPeriode(true) }}
          className={btnPrimary} style={{ background: GRADIENT }}>+ Tambah Periode</button>
      </div>

      {pa.periodeSuccessMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✓ {pa.periodeSuccessMsg}</div>}
      {pa.periodeFetchError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{pa.periodeFetchError}</div>}

      {pa.showFormPeriode && (
        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 mb-4">
          <h4 className="font-bold text-gray-800 mb-3">{pa.editPeriodeId ? 'Edit Periode' : 'Tambah Periode Baru'}</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tahun Ajaran</label>
              <input placeholder="Contoh: 2026/2027" value={pa.formTahunAjaran} onChange={e => pa.setFormTahunAjaran(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Semester</label>
              <select value={pa.formSemester} onChange={e => pa.setFormSemester(e.target.value)} className={inputClass}>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tanggal Mulai</label>
                <input type="date" value={pa.formTanggalMulai} onChange={e => pa.setFormTanggalMulai(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tanggal Selesai</label>
                <input type="date" value={pa.formTanggalSelesai} onChange={e => pa.setFormTanggalSelesai(e.target.value)} className={inputClass} />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-xl border border-purple-200">
              <div onClick={() => pa.setFormIsAktif(!pa.formIsAktif)}
                className={`w-10 h-5 rounded-full transition-all flex-shrink-0 ${pa.formIsAktif ? 'bg-purple-600' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-all ${pa.formIsAktif ? 'ml-5' : 'ml-0.5'}`} />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700">Jadikan Periode Aktif</div>
                <div className="text-xs text-gray-400">Tidak otomatis menonaktifkan periode lain</div>
              </div>
            </label>
          </div>
          {pa.periodeErrorMsg && <p className="text-red-500 mt-2 text-sm">{pa.periodeErrorMsg}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={pa.editPeriodeId ? pa.handleUpdatePeriode : pa.handleTambahPeriode} disabled={pa.periodeLoading}
              className={btnPrimary} style={{ background: GRADIENT }}>
              {pa.periodeLoading ? 'Menyimpan...' : pa.editPeriodeId ? 'Update' : 'Simpan'}
            </button>
            <button onClick={() => { pa.setShowFormPeriode(false); pa.resetFormPeriode() }} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl text-sm">Batal</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {pa.loadingPeriode && <div className="text-center text-gray-400 py-6 text-sm">Memuat periode...</div>}
        {!pa.loadingPeriode && pa.periodeList.length === 0 && (
          <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-400">
            Belum ada periode akademik.<br />Buat periode terlebih dahulu sebelum mengatur penugasan.
          </div>
        )}
        {pa.periodeList.map(p => (
          <div key={p.id} className={`rounded-xl shadow p-4 border-2 ${p.is_aktif ? 'border-purple-400 bg-purple-50' : 'border-gray-100 bg-white'}`}>
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div>
                <div className="font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
                  {p.tahun_ajaran} — Semester {p.semester}
                  {p.is_aktif && <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">Aktif</span>}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(p.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' — '}
                  {new Date(p.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div className="flex gap-1 flex-wrap">
                <button onClick={() => pa.handleToggleAktifPeriode(p)} className="text-purple-600 text-xs px-3 py-1.5 rounded-lg hover:bg-purple-100 border border-purple-200">
                  {p.is_aktif ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button onClick={() => pa.handleEditPeriode(p)} className="text-blue-500 text-xs px-3 py-1.5 rounded-lg hover:bg-blue-50">Edit</button>
                <button onClick={() => pa.handleHapusPeriode(p.id)} className="text-red-400 text-xs px-3 py-1.5 rounded-lg hover:bg-red-50">Hapus</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// TAB 2 -- GURU HAFALAN
// ============================================================
function SantriHafalanCard(props: {
  santri: Santri
  guruList: Guru[]
  assignmentsAktif: PenugasanHafalanRow[]
  onAssign: (guruId: string) => Promise<{ ok: boolean, pesan: string }>
  onNonaktifkan: (id: string) => void
  onHapus: (id: string) => void
}) {
  const { santri, guruList, assignmentsAktif, onAssign, onNonaktifkan, onHapus } = props
  const [guruPilihan, setGuruPilihan] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [pesan, setPesan] = useState('')

  const guruWing = guruList.filter(g => cocokGuruUntukJenisKelasSantri(g.jenis_kelas, santri.jenis_kelas))

  const handleKlikTambah = async () => {
    if (!guruPilihan) return
    setAssigning(true); setPesan('')
    const hasil = await onAssign(guruPilihan)
    setAssigning(false)
    setPesan(hasil.pesan)
    if (hasil.ok) setGuruPilihan('')
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
      <div className="font-semibold text-gray-800">{santri.nama}</div>
      <div className="text-xs text-gray-400 mb-2">
        {jenjangLabel(santri.jenjang || '')} · Kelas {santri.kelas_num || '-'} · {labelJenisKelasSantriUntukAssignment(santri.jenis_kelas)}
      </div>

      <div className="mt-1">
        <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Penugasan Baru</div>
        {assignmentsAktif.length === 0 ? (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 inline-block">Belum Ditugaskan</p>
        ) : (
          <div className="space-y-1">
            {assignmentsAktif.map((a, idx) => (
              <div key={a.id} className="flex items-center justify-between gap-2 bg-purple-50 border border-purple-200 rounded-lg px-2 py-1.5 flex-wrap">
                <span className="text-xs text-purple-800">Guru Hafalan {idx + 1}: <span className="font-semibold">{a.guru?.nama || namaGuruDariId(guruList, a.guru_id)}</span></span>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => onNonaktifkan(a.id)} className="text-[10px] px-2 py-0.5 rounded bg-white border border-purple-300 text-purple-700">Nonaktifkan</button>
                  <button onClick={() => onHapus(a.id)} className="text-[10px] px-2 py-0.5 rounded bg-white border border-red-300 text-red-500">Hapus</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-[10px] font-semibold text-gray-400 uppercase">Data Lama</div>
        <div className="text-xs text-gray-500">Guru Musami&apos; 1: {namaGuruDariId(guruList, santri.guru_id)}</div>
        <div className="text-xs text-gray-500">Guru Musami&apos; 2: {santri.guru_id_2 ? namaGuruDariId(guruList, santri.guru_id_2) : '-'}</div>
      </div>

      {assignmentsAktif.length < 2 && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-2">
            <select value={guruPilihan} onChange={e => setGuruPilihan(e.target.value)}
              className="flex-1 min-w-[140px] border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-gray-50">
              <option value="">-- Pilih Guru --</option>
              {guruWing.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
            </select>
            <button disabled={!guruPilihan || assigning} onClick={handleKlikTambah}
              className="text-xs px-3 py-1.5 rounded-lg text-white font-semibold disabled:opacity-50" style={{ background: GRADIENT }}>
              {assigning ? 'Menyimpan...' : '+ Tambah'}
            </button>
          </div>
          {pesan && <p className={`mt-1 text-xs ${pesan.includes('berhasil') ? 'text-green-600' : 'text-red-500'}`}>{pesan}</p>}
        </div>
      )}
    </div>
  )
}

function TabGuruHafalan(props: {
  pa: PeriodeAkademikHook
  pg: PenugasanGuruHook
  guruList: Guru[]
  santriList: Santri[]
  periodeTerpilih: PeriodeAkademik | null
}) {
  const { pa, pg, guruList, santriList, periodeTerpilih } = props
  const [filterJenjang, setFilterJenjang] = useState('semua')
  const [filterKelas, setFilterKelas] = useState('semua')
  const [filterKelompok, setFilterKelompok] = useState('semua')
  const [searchSantri, setSearchSantri] = useState('')
  const [selectedSantriIds, setSelectedSantriIds] = useState<Set<string>>(new Set())
  const [bulkGuruId, setBulkGuruId] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkMsg, setBulkMsg] = useState('')

  if (!pa.periodeIdTerpilih) {
    return (
      <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400 border border-gray-100">
        Belum ada periode akademik.<br />Buat periode terlebih dahulu sebelum mengatur penugasan.
      </div>
    )
  }

  const santriFiltered = santriList.filter(s => {
    if (filterJenjang !== 'semua' && s.jenjang !== filterJenjang) return false
    if (filterKelas !== 'semua' && s.kelas_num?.toString() !== filterKelas) return false
    if (filterKelompok !== 'semua' && !cocokKelompokMonitoring(s, filterKelompok)) return false
    if (searchSantri && !s.nama?.toLowerCase().includes(searchSantri.toLowerCase())) return false
    return true
  })

  const assignmentBySantri = (santriId: string) =>
    pg.penugasanHafalanList.filter(p => p.santri_id === santriId && p.is_aktif)

  const semuaTampilTercentang = santriFiltered.length > 0 && santriFiltered.every(s => selectedSantriIds.has(s.id))
  const toggleCentangSemua = () => {
    setSelectedSantriIds(prev => {
      const next = new Set(prev)
      if (semuaTampilTercentang) santriFiltered.forEach(s => next.delete(s.id))
      else santriFiltered.forEach(s => next.add(s.id))
      return next
    })
  }
  const toggleSelect = (id: string) => {
    setSelectedSantriIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleTerapkanBulk = async () => {
    if (selectedSantriIds.size === 0 || !bulkGuruId || !pa.periodeIdTerpilih) return
    const namaGuru = guruList.find(g => g.id === bulkGuruId)?.nama || 'guru terpilih'
    if (!confirm(`Tetapkan "${namaGuru}" sebagai Guru Hafalan untuk ${selectedSantriIds.size} santri terpilih?`)) return
    setBulkLoading(true); setBulkMsg('')
    const hasil = await pg.handleBulkAssignGuruHafalan(Array.from(selectedSantriIds), bulkGuruId, pa.periodeIdTerpilih, santriList, guruList)
    setBulkLoading(false)
    const bagian: string[] = []
    if (hasil.berhasil > 0) bagian.push(`${hasil.berhasil} berhasil ditugaskan`)
    if (hasil.dilewatiPenuh > 0) bagian.push(`${hasil.dilewatiPenuh} dilewati karena sudah memiliki 2 Guru`)
    if (hasil.dilewatiDuplikat > 0) bagian.push(`${hasil.dilewatiDuplikat} sudah memiliki Guru yang sama`)
    if (hasil.dilewatiWing > 0) bagian.push(`${hasil.dilewatiWing} dilewati karena Guru tidak sesuai kelompok santri`)
    if (hasil.gagalLain > 0) bagian.push(`${hasil.gagalLain} gagal karena error lain`)
    setBulkMsg(bagian.length > 0 ? bagian.join('. ') + '.' : 'Tidak ada santri diproses.')
    setSelectedSantriIds(new Set())
    setBulkGuruId('')
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow p-4 mb-4 border border-gray-100">
        <p className="text-xs text-gray-500 mb-3">
          Periode: <span className="font-semibold text-gray-700">{periodeTerpilih ? `${periodeTerpilih.tahun_ajaran} - Semester ${periodeTerpilih.semester}` : '-'}</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select value={filterJenjang} onChange={e => { setFilterJenjang(e.target.value); setFilterKelas('semua') }} className={inputClass}>
            <option value="semua">Semua Jenjang</option>
            <option value="ula">Ula</option>
            <option value="wustha">Wustha</option>
            <option value="ulya">Ulya</option>
          </select>
          <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className={inputClass}>
            <option value="semua">Semua Kelas</option>
            {getKelasOptions(filterJenjang).map(k => <option key={k} value={k}>Kelas {k}</option>)}
          </select>
          <select value={filterKelompok} onChange={e => setFilterKelompok(e.target.value)} className={inputClass}>
            <option value="semua">Semua Kelompok</option>
            <option value="banin">Banin</option>
            <option value="banat">Banat</option>
            <option value="tn">TN</option>
          </select>
          <input placeholder="Cari nama santri..." value={searchSantri} onChange={e => setSearchSantri(e.target.value)} className={inputClass} />
        </div>
        <p className="text-xs text-gray-400 mt-2">Menampilkan {santriFiltered.length} dari {santriList.length} santri</p>
      </div>

      {/* Bulk assignment (Tahap 9D bagian I) */}
      <div className="bg-white rounded-2xl shadow p-4 mb-4 border border-gray-100">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={semuaTampilTercentang} onChange={toggleCentangSemua} className="w-4 h-4" />
            Centang Semua yang Tampil ({santriFiltered.length})
          </label>
          <span className="text-xs font-semibold text-gray-600">{selectedSantriIds.size} santri dipilih</span>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={bulkGuruId} onChange={e => setBulkGuruId(e.target.value)}
            className="flex-1 min-w-[160px] border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-300">
            <option value="">-- Pilih Guru --</option>
            {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
          </select>
          <button onClick={handleTerapkanBulk} disabled={selectedSantriIds.size === 0 || !bulkGuruId || bulkLoading}
            className="text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50" style={{ background: GRADIENT }}>
            {bulkLoading ? 'Menerapkan...' : 'Tetapkan Guru'}
          </button>
        </div>
        {bulkMsg && <p className="text-xs mt-2 text-gray-600">{bulkMsg}</p>}
      </div>

      {pg.penugasanHafalanError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{pg.penugasanHafalanError}</div>}
      {pg.loadingPenugasanHafalan && <div className="text-center text-gray-400 py-6 text-sm">Memuat penugasan...</div>}

      <div className="space-y-3">
        {!pg.loadingPenugasanHafalan && santriFiltered.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Tidak ada santri sesuai filter</div>
        )}
        {santriFiltered.map(santri => (
          <div key={santri.id} className="flex items-start gap-2">
            <input type="checkbox" checked={selectedSantriIds.has(santri.id)} onChange={() => toggleSelect(santri.id)} className="w-4 h-4 mt-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <SantriHafalanCard
                santri={santri}
                guruList={guruList}
                assignmentsAktif={assignmentBySantri(santri.id)}
                onAssign={(guruId) => pg.handleAssignGuruHafalan(guruId, santri.id, pa.periodeIdTerpilih, guruList.find(g => g.id === guruId)?.jenis_kelas, santri.jenis_kelas)}
                onNonaktifkan={(id) => pg.handleNonaktifkanPenugasanHafalan(id, pa.periodeIdTerpilih)}
                onHapus={(id) => pg.handleHapusPenugasanHafalan(id, pa.periodeIdTerpilih)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// TAB 3 -- WALI KELAS
// ============================================================
function TabWaliKelas(props: {
  pa: PeriodeAkademikHook
  pg: PenugasanGuruHook
  guruList: Guru[]
  periodeTerpilih: PeriodeAkademik | null
}) {
  const { pa, pg, guruList, periodeTerpilih } = props
  const [formJenjang, setFormJenjang] = useState('')
  const [formKelasNum, setFormKelasNum] = useState('')
  const [formJenisKelas, setFormJenisKelas] = useState('')
  const [formGuruId, setFormGuruId] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [formPesan, setFormPesan] = useState('')

  if (!pa.periodeIdTerpilih) {
    return (
      <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400 border border-gray-100">
        Belum ada periode akademik.<br />Buat periode terlebih dahulu sebelum mengatur penugasan.
      </div>
    )
  }

  const guruWing = guruList.filter(g => cocokGuruUntukJenisKelasSantri(g.jenis_kelas, formJenisKelas))

  const handleSubmit = async () => {
    setFormLoading(true); setFormPesan('')
    const hasil = await pg.handleAssignWaliKelas(formGuruId, pa.periodeIdTerpilih, formJenjang, parseInt(formKelasNum, 10), formJenisKelas)
    setFormLoading(false)
    setFormPesan(hasil.pesan)
    if (hasil.ok) setFormGuruId('')
  }

  // Kelompokkan berdasarkan jenjang -> kelas -> jenis kelas (Tahap 9D bagian J)
  const grup: Record<string, WaliKelasAssignmentRow[]> = {}
  pg.waliKelasList.forEach(w => {
    if (!grup[w.jenjang]) grup[w.jenjang] = []
    grup[w.jenjang].push(w)
  })

  // Data Wali Kelas Lama -- murni referensi dari profiles existing (Tahap 9D bagian L), tidak auto-import.
  const waliKelasLama = guruList.filter(g => g.is_wali_kelas)

  return (
    <div>
      <div className="bg-white rounded-2xl shadow p-4 mb-4 border border-gray-100">
        <p className="text-xs text-gray-500 mb-3">
          Periode: <span className="font-semibold text-gray-700">{periodeTerpilih ? `${periodeTerpilih.tahun_ajaran} - Semester ${periodeTerpilih.semester}` : '-'}</span>
        </p>
        <h3 className="font-bold text-gray-800 mb-3">Tetapkan Wali Kelas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
            <select value={formJenjang} onChange={e => { setFormJenjang(e.target.value); setFormKelasNum('') }} className={inputClass}>
              <option value="">-- Pilih Jenjang --</option>
              <option value="ula">Ula</option>
              <option value="wustha">Wustha</option>
              <option value="ulya">Ulya</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Kelas</label>
            <select value={formKelasNum} onChange={e => setFormKelasNum(e.target.value)} className={inputClass} disabled={!formJenjang}>
              <option value="">-- Pilih Kelas --</option>
              {getKelasOptions(formJenjang).map(k => <option key={k} value={k}>Kelas {k}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Jenis Kelas</label>
            <select value={formJenisKelas} onChange={e => { setFormJenisKelas(e.target.value); setFormGuruId('') }} className={inputClass}>
              <option value="">-- Pilih --</option>
              <option value="banin">Banin</option>
              <option value="banat">Banat</option>
              <option value="tn_a">TN A</option>
              <option value="tn_b">TN B</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Guru</label>
            <select value={formGuruId} onChange={e => setFormGuruId(e.target.value)} className={inputClass} disabled={!formJenisKelas}>
              <option value="">-- Pilih Guru --</option>
              {guruWing.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
            </select>
          </div>
        </div>
        {formPesan && <p className={`mt-2 text-sm ${formPesan.includes('berhasil') ? 'text-green-600' : 'text-red-500'}`}>{formPesan}</p>}
        <button onClick={handleSubmit} disabled={!formJenjang || !formKelasNum || !formJenisKelas || !formGuruId || formLoading}
          className={`${btnPrimary} mt-3`} style={{ background: GRADIENT }}>
          {formLoading ? 'Menyimpan...' : 'Tetapkan Wali Kelas'}
        </button>
      </div>

      {pg.waliKelasError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{pg.waliKelasError}</div>}
      {pg.loadingWaliKelas && <div className="text-center text-gray-400 py-6 text-sm">Memuat wali kelas...</div>}

      <div className="space-y-4 mb-5">
        {!pg.loadingWaliKelas && pg.waliKelasList.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Belum ada Wali Kelas untuk periode ini</div>
        )}
        {(['ula', 'wustha', 'ulya'] as const).filter(j => grup[j]?.length).map(j => (
          <div key={j}>
            <h4 className="text-sm font-bold text-gray-700 mb-2">{jenjangLabel(j)}</h4>
            <div className="space-y-2">
              {grup[j].map(w => (
                <div key={w.id} className={`rounded-xl shadow p-3 border-2 flex justify-between items-center flex-wrap gap-2 ${w.is_aktif ? 'border-purple-300 bg-purple-50' : 'border-gray-100 bg-gray-50 opacity-70'}`}>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">
                      Kelas {w.kelas_num} {labelJenisKelasSantriUntukAssignment(w.jenis_kelas)}
                      {w.is_aktif
                        ? <span className="ml-2 text-[10px] bg-purple-500 text-white px-2 py-0.5 rounded-full">Aktif</span>
                        : <span className="ml-2 text-[10px] bg-gray-300 text-gray-600 px-2 py-0.5 rounded-full">Nonaktif</span>}
                    </div>
                    <div className="text-xs text-gray-500">{w.guru?.nama || namaGuruDariId(guruList, w.guru_id)}</div>
                  </div>
                  <div className="flex gap-1">
                    {w.is_aktif && (
                      <button onClick={() => pg.handleNonaktifkanWaliKelas(w.id, pa.periodeIdTerpilih)} className="text-purple-600 text-xs px-3 py-1.5 rounded-lg hover:bg-purple-100 border border-purple-200">Nonaktifkan</button>
                    )}
                    <button onClick={() => pg.handleHapusWaliKelas(w.id, pa.periodeIdTerpilih)} className="text-red-400 text-xs px-3 py-1.5 rounded-lg hover:bg-red-50">Hapus</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Data Wali Kelas Lama -- referensi saja, tidak auto-import (Tahap 9D bagian L) */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
        <h4 className="text-sm font-bold text-gray-700 mb-1">Data Wali Kelas Lama</h4>
        <p className="text-xs text-gray-400 mb-3">Referensi dari profiles.is_wali_kelas (sistem lama) -- tidak otomatis dipindah ke daftar di atas.</p>
        {waliKelasLama.length === 0 ? (
          <p className="text-xs text-gray-400">Tidak ada data wali kelas lama.</p>
        ) : (
          <div className="space-y-1.5">
            {waliKelasLama.map(g => {
              const jenjangLama = jenjangDariKelasNumLama(g.wali_kelas_num)
              return (
                <div key={g.id} className="text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-200">
                  <span className="font-semibold">{g.nama}</span>
                  {' — '}
                  {jenjangLama ? jenjangLabel(jenjangLama) : 'Jenjang tidak diketahui'}
                  {g.wali_kelas_num ? ` Kelas ${g.wali_kelas_num}` : ' (kelas kosong)'}
                  {' · '}
                  {labelJenisKelasWaliLama(g.wali_kelas_jenis)}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
