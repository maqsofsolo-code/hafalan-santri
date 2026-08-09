'use client'
import type { useSetoranForm } from '../hooks/useSetoranForm'
import { hitungPenambahanJuz, hitungTargetMurojaah, hitungTargetUjianSemester, getJadwalJenjang } from '../utils'
import type { Surah } from '../types'

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"

type FormState = ReturnType<typeof useSetoranForm>

// Tab "Input Setoran" -- dipindah dari app/guru/page.tsx (Modularisasi
// Tahap 5A). JSX/className identik dengan sebelumnya; seluruh state dan
// handler datang dari useSetoranForm() (dipanggil di page.tsx) lewat prop
// `form`, supaya component ini murni presentasional. errorMsg/setErrorMsg
// tetap dipegang page.tsx (dipakai bersama Riwayat/Edit Setoran juga).
export function SetoranFormSection(props: {
  form: FormState
  surahList: Surah[]
  santriListCount: number
  tanggal: string
  isLibur: boolean
  isLiburMingguan: boolean
  hariMinggu: number
  kalenderAktifNama: string | undefined
  isUjian: boolean
  kalenderAktifTipe: string | undefined
  notifAktif: boolean
  notifLoading: boolean
  notifPesan: string
  onAktifkanNotif: () => void
  absenSubuh: boolean
  absenPagi: boolean
  onKlikAbsen: (sesi: 'subuh' | 'pagi') => void
  errorMsg: string
  setErrorMsg: (msg: string) => void
  successMsg: string
}) {
  const {
    form, surahList, santriListCount, tanggal, isLibur, isLiburMingguan, hariMinggu,
    kalenderAktifNama, isUjian, kalenderAktifTipe,
    notifAktif, notifLoading, notifPesan, onAktifkanNotif,
    absenSubuh, absenPagi, onKlikAbsen, errorMsg, setErrorMsg, successMsg,
  } = props

  const targetMurojaah = form.selectedSantri ? hitungTargetMurojaah(form.selectedSantri) : null
  const getSaranMurojaah = () => surahList.find(s => s.nomor === form.selectedSantri?.surah_terakhir_nomor)

  return (
    <div>
      <div className="rounded-2xl p-5 mb-4 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="absolute -bottom-8 right-10 w-32 h-32 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-white font-bold text-xl">Input Setoran</h2>
              <p className="text-blue-200 text-sm mt-1">{tanggal}</p>
              <p className="text-blue-100 text-xs mt-1">{santriListCount} santri dalam kelompok</p>
            </div>
            <div className="hidden md:flex flex-col gap-1.5">
              <button onClick={() => onKlikAbsen('subuh')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold text-center transition ${absenSubuh ? 'bg-green-500 text-white' : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'}`}>
                {absenSubuh ? '✓ Absen Subuh' : 'Klik — Absen Subuh'}
              </button>
              <button onClick={() => onKlikAbsen('pagi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold text-center transition ${absenPagi ? 'bg-green-500 text-white' : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'}`}>
                {absenPagi ? '✓ Absen Pagi' : 'Klik — Absen Pagi'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLibur && (
        <div className="mb-4 p-4 rounded-2xl border-2 border-orange-300 bg-orange-50 flex items-center gap-3">
          <span className="text-2xl">🏖</span>
          <div>
            <div className="font-bold text-orange-800 text-sm">
              {isLiburMingguan ? (hariMinggu === 0 ? 'Hari ini Ahad — Libur Mingguan' : 'Hari ini Jumat — Libur Mingguan') : kalenderAktifNama}
            </div>
            <div className="text-orange-600 text-xs">Tidak ada setoran hari ini</div>
          </div>
        </div>
      )}

      {isUjian && (
        <div className="mb-4 p-4 rounded-2xl border-2 border-red-300 bg-red-50 flex items-center gap-3">
          <span className="text-2xl">📝</span>
          <div>
            <div className="font-bold text-red-800 text-sm">{kalenderAktifNama}</div>
            <div className="text-red-600 text-xs">
              {kalenderAktifTipe === 'semester' ? 'Target ujian: 1/10 dari total hafalan. Gunakan menu Input Nilai Ujian.' : 'Periode ujian mid semester aktif. Gunakan menu Input Nilai Ujian.'}
            </div>
          </div>
        </div>
      )}

{!notifAktif && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 overflow-hidden mb-4">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="text-3xl flex-shrink-0">🔔</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 text-sm mb-1">Aktifkan Notifikasi Pengingat</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">
                  Dapatkan pengingat input setoran langsung di HP, tanpa tergantung WhatsApp. Cukup aktifkan sekali.
                </p>
                <button onClick={onAktifkanNotif} disabled={notifLoading}
                  className="w-full text-white py-2.5 rounded-xl font-semibold text-sm shadow disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                  {notifLoading ? 'Memproses...' : '🔔 Aktifkan Notifikasi Sekarang'}
                </button>
                {notifPesan && (
                  <p className={`text-xs mt-2 ${notifAktif ? 'text-green-600' : 'text-red-500'}`}>{notifPesan}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {notifAktif && (
        <div className="bg-green-50 rounded-2xl border border-green-200 p-3 mb-4 flex items-center gap-2">
          <span className="text-lg">✅</span>
          <span className="text-sm text-green-700 font-medium">Notifikasi pengingat sudah aktif di perangkat ini</span>
        </div>
      )}
      {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✓ {successMsg}</div>}

      <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
        {/* Toggle Guru Pengganti */}
        <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={form.handleToggleGuruPengganti}
              className={`w-12 h-6 rounded-full transition-all flex-shrink-0 ${form.guruPengganti ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-all ${form.guruPengganti ? 'ml-6' : 'ml-0.5'}`} />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700">Mode Guru Pengganti</div>
              <div className="text-xs text-gray-400">Aktifkan untuk simak santri kelompok lain</div>
            </div>
          </label>
        </div>

        {/* Pilih Santri */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Pilih Santri {form.guruPengganti && <span className="text-blue-500 text-xs">(mode pengganti)</span>}
          </label>
          <input type="text" value={form.searchSantri} onChange={e => form.setSearchSantri(e.target.value)}
            placeholder="🔍 Cari nama santri..." className={inputClass + ' mb-2'} />
          {!form.selectedSantri && (
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
              {form.santriTampil.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-400 text-center">Tidak ditemukan</div>
              )}
              {form.santriTampil.map((s) => (
                <button key={s.id} onClick={() => form.handlePilihSantri(s)}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b last:border-0 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{s.nama}</span>
                      {s.kelas && <span className="text-gray-400 text-xs ml-2">{s.kelas}</span>}
                      {form.guruPengganti && <span className="text-blue-400 text-xs ml-2">({s.guru?.nama || '-'})</span>}
                    </div>
                    {s.jenjang && (
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${s.jenjang === 'ula' ? 'bg-green-100 text-green-700' : s.jenjang === 'wustha' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {s.jenjang}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          {form.selectedSantri && (
            <div className="mt-2 p-3 rounded-xl border bg-blue-50 border-blue-200">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-gray-800">{form.selectedSantri.nama}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Total: <span className="font-semibold text-blue-700">{form.selectedSantri.total_hafalan_juz?.toFixed(2) || 0} Juz</span>
                    {form.selectedSantri.jenjang && (
                      <span className="ml-2 bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-xs font-semibold capitalize">{form.selectedSantri.jenjang}</span>
                    )}
                  </div>
                  {targetMurojaah && !isUjian && (
                    <div className="text-xs text-green-600 mt-0.5">
                      Target Murojaah: <span className="font-semibold">{targetMurojaah.targetHalaman} hal/hari</span>
                      <span className="text-gray-400 ml-1">(≈ {targetMurojaah.targetLembar} lembar)</span>
                    </div>
                  )}
                  {isUjian && kalenderAktifTipe === 'semester' && form.selectedSantri.total_hafalan_juz > 0 && (() => {
                    const t = hitungTargetUjianSemester(form.selectedSantri)
                    return t ? (
                      <div className="text-xs text-red-600 mt-0.5 font-semibold">
                        Target Ujian Semester: {t.targetHalaman} hal (≈ {t.targetLembar} lembar)
                      </div>
                    ) : null
                  })()}
                  {form.guruPengganti && <div className="text-xs text-orange-500 mt-0.5">Guru tetap: {form.selectedSantri.guru?.nama || '-'}</div>}
                </div>
                <button onClick={form.handleBatalkanPilihSantri} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
              </div>

              {/* Info jadwal per jenjang */}
              {form.selectedSantri.jenjang && (
                <div className="mt-2 p-2 bg-white rounded-xl border border-blue-100">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Jadwal Setoran {form.selectedSantri.jenjang.charAt(0).toUpperCase() + form.selectedSantri.jenjang.slice(1)}:</p>
                  <div className="flex gap-3 flex-wrap">
                    <span className="text-xs text-gray-600">Hafalan Baru: <span className="font-semibold text-blue-700">{getJadwalJenjang(form.selectedSantri.jenjang).baru}</span></span>
                    {getJadwalJenjang(form.selectedSantri.jenjang).adaLama && (
                      <span className="text-xs text-gray-600">Murojaah: <span className="font-semibold text-purple-700">{getJadwalJenjang(form.selectedSantri.jenjang).lama}</span></span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Kehadiran */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Status Kehadiran Santri</label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              { value: 'hadir', label: 'Hadir', color: 'border-green-500 bg-green-50 text-green-700' },
              { value: 'sakit', label: 'Sakit', color: 'border-yellow-500 bg-yellow-50 text-yellow-700' },
              { value: 'izin', label: 'Izin', color: 'border-blue-500 bg-blue-50 text-blue-700' },
            ].map(s => (
              <button key={s.value} onClick={() => form.setStatusKehadiran(s.value)}
                className={`py-2.5 rounded-xl text-xs font-bold border-2 transition ${form.statusKehadiran === s.value ? s.color : 'border-gray-200 bg-white text-gray-500'}`}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => form.setStatusKehadiran('alpha')}
              className={`py-2.5 rounded-xl text-xs font-bold border-2 transition ${form.statusKehadiran === 'alpha' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-500'}`}>
              Alpha
            </button>
            <button onClick={() => form.setStatusKehadiran('hadir_tidak_setor')}
              className={`py-2.5 rounded-xl text-xs font-bold border-2 transition ${form.statusKehadiran === 'hadir_tidak_setor' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-500'}`}>
              Hadir, Tdk Setor
            </button>
          </div>
        </div>

        {form.statusKehadiran === 'hadir' && (
          <>
            {/* Jenis Setoran */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Jenis Setoran</label>

              {/* Peringatan khusus Ula */}
              {form.selectedSantri?.jenjang === 'ula' && (
                <div className="mb-3 p-3 rounded-xl border-2 border-yellow-300 bg-yellow-50">
                  <p className="text-xs font-bold text-yellow-800 mb-1">Ketentuan Jenjang Ula:</p>
                  <p className="text-xs text-yellow-700">Santri wajib setor <strong>Murojaah</strong> terlebih dahulu dan dinyatakan <strong>Lancar</strong> sebelum boleh setor Hafalan Baru.</p>
                  {form.setoranLamaHariIni && (
                    <div className={`mt-2 p-2 rounded-lg text-xs font-semibold ${form.setoranLamaHariIni.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {form.setoranLamaHariIni.status === 'lancar'
                        ? '✓ Murojaah hari ini: Lancar — Boleh setor hafalan baru'
                        : '✗ Murojaah hari ini: Rosib — Hafalan baru tidak boleh disetorkan'}
                    </div>
                  )}
                  {!form.setoranLamaHariIni && (
                    <div className="mt-2 p-2 rounded-lg text-xs bg-gray-100 text-gray-600">
                      Belum ada setoran murojaah hari ini — setor murojaah terlebih dahulu
                    </div>
                  )}
                </div>
              )}

              {form.selectedSantri?.jenjang === 'wustha' && (form.wusthaKunciLoading || form.wusthaHafalanBaruTerkunci) && (
                <div className="mb-3 p-3 rounded-xl border-2 border-orange-300 bg-orange-50">
                  <p className="text-xs font-bold text-orange-800 mb-1">Ketentuan Jenjang Wustha:</p>
                  <p className="text-xs text-orange-700">
                    {form.wusthaKunciLoading
                      ? 'Memeriksa status hafalan lama terakhir...'
                      : 'Hafalan baru terkunci karena hafalan lama terakhir berstatus Rosib. Setorkan hafalan lama hingga Najih terlebih dahulu.'}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={form.hafalanBaruDisabled}
                  onClick={() => {
                    if (form.selectedSantri?.jenjang === 'ulya') {
                      setErrorMsg('Santri Ulya tidak menyetorkan hafalan baru — hafalan baru bersifat mandiri!')
                      return
                    }
                    if (form.selectedSantri?.jenjang === 'ula') {
                      if (!form.setoranLamaHariIni) {
                        setErrorMsg('Santri Ula wajib setor Murojaah terlebih dahulu!')
                        return
                      }
                      if (form.setoranLamaHariIni.status === 'rosib') {
                        setErrorMsg('Murojaah rosib — Hafalan Baru tidak boleh disetorkan hari ini!')
                        return
                      }
                    }
                    form.setJenis('baru')
                    setErrorMsg('')
                  }}
                  className={`p-4 rounded-xl border-2 transition text-left ${form.jenis === 'baru' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} ${form.hafalanBaruDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
      <div className="text-sm font-bold text-gray-800">Hafalan Baru</div>
      <div className="text-xs text-gray-400 mt-0.5">
        {form.selectedSantri?.jenjang === 'ulya'
          ? 'Mandiri (tidak disetorkan)'
          : form.selectedSantri?.jenjang === 'ula'
            ? 'Setelah murojaah lancar'
            : form.selectedSantri?.jenjang === 'wustha' && form.wusthaBlokHafalanBaru
              ? 'Terkunci sampai hafalan lama Najih'
              : 'Tambah hafalan baru'}
      </div>
                </button>
                <button
                  onClick={() => { form.setJenis('lama'); setErrorMsg('') }}
                  disabled={false}
      className={`p-4 rounded-xl border-2 transition text-left ${form.jenis === 'lama' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
      <div className="text-sm font-bold text-gray-800">Murojaah</div>
      <div className="text-xs text-gray-400 mt-0.5">
        {form.selectedSantri?.jenjang === 'ula' ? 'Wajib setor dulu' : 'Mengulang hafalan lama'}
      </div>
                </button>
              </div>
            </div>

            {form.jenis === 'baru' && (
              <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Detail Hafalan Baru</label>
                <input type="text" value={form.searchSurahBaru} onChange={e => form.setSearchSurahBaru(e.target.value)}
                  placeholder="🔍 Cari surah..." className={inputClass + ' mb-2'} />
                {!form.surahBaru && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto mb-3">
                    {surahList
                      .filter(s => !form.searchSurahBaru || s.nama_latin.toLowerCase().includes(form.searchSurahBaru.toLowerCase()) || String(s.nomor).includes(form.searchSurahBaru))
                      .map(s => (
                        <button key={s.nomor} onClick={() => { form.setSurahBaru(String(s.nomor)); form.setAyatMulaiBaru('1') }}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-0 text-sm">
                          <span className="font-medium">{s.nama_latin}</span>
                          <span className="text-gray-400 text-xs ml-2">{s.nomor} • {s.jumlah_ayat} ayat</span>
                        </button>
                      ))}
                  </div>
                )}
                {form.surahBaru && (
                  <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl mb-3">
                    <span className="text-sm font-semibold text-blue-700">
                      {surahList.find(s => s.nomor === parseInt(form.surahBaru))?.nama_latin}
                      <span className="text-gray-400 font-normal ml-2 text-xs">
                        ({surahList.find(s => s.nomor === parseInt(form.surahBaru))?.jumlah_ayat} ayat)
                      </span>
                    </span>
                    <button onClick={() => { form.setSurahBaru(''); form.setSearchSurahBaru(''); form.setAyatMulaiBaru(''); form.setAyatSelesaiBaru('') }} className="text-gray-400 text-lg">×</button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Ayat Mulai</label>
                    <input type="number" value={form.ayatMulaiBaru} onChange={e => form.setAyatMulaiBaru(e.target.value)} placeholder="1" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Ayat Selesai</label>
                    <input type="number" value={form.ayatSelesaiBaru} onChange={e => form.setAyatSelesaiBaru(e.target.value)} placeholder="5" className={inputClass} />
                  </div>
                </div>
                {form.surahBaru && form.ayatMulaiBaru && form.ayatSelesaiBaru && (() => {
      const sNomor = parseInt(form.surahBaru)
      const aMulai = parseInt(form.ayatMulaiBaru)
      const aSelesai = parseInt(form.ayatSelesaiBaru)
      const sTerakhir = form.selectedSantri?.surah_terakhir_nomor
      const aTerakhir = form.selectedSantri?.ayat_terakhir || 0
      let preview = 0
      if (form.status === 'rosib') {
        preview = 0
      } else if (!sTerakhir) {
        preview = hitungPenambahanJuz(surahList, sNomor, aMulai, aSelesai)
      } else if (sNomor > sTerakhir) {
        preview = 0
      } else if (sNomor === sTerakhir) {
        preview = aSelesai > aTerakhir ? hitungPenambahanJuz(surahList, sNomor, aTerakhir + 1, aSelesai) : 0
      } else {
        preview = hitungPenambahanJuz(surahList, sNomor, aMulai, aSelesai)
      }
      return (
        <div className={`mt-2 text-xs font-medium ${preview > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
          {preview > 0 ? `+ ${preview.toFixed(4)} Juz` : '± 0 Juz (tidak ada penambahan)'}
        </div>
      )
    })()}
              </div>
            )}

            {form.jenis === 'lama' && (
              <div className="mb-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Detail Murojaah</label>
                {targetMurojaah && (
                  <div className="mb-3 p-3 bg-white rounded-xl border border-purple-200">
                    <p className="text-xs font-semibold text-purple-700 mb-1">Target Murojaah Hari Ini:</p>
                    <p className="text-xs text-gray-600">
                      ± <span className="font-bold text-purple-700">{targetMurojaah.targetHalaman} halaman</span>
                      <span className="text-gray-400 ml-1">(≈ {targetMurojaah.targetLembar} lembar)</span>
                    </p>
                    {getSaranMurojaah() && (
                      <p className="text-xs text-gray-500 mt-1">Posisi terakhir: <span className="font-semibold">{getSaranMurojaah()?.nama_latin}</span></p>
                    )}
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Dari Surah</label>
                    <input type="text" value={form.searchSurahMulai} onChange={e => form.setSearchSurahMulai(e.target.value)}
                      placeholder="🔍 Cari surah mulai..." className={inputClass + ' mb-1'} />
                    {!form.surahMulai && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto mb-1">
                        {surahList
                          .filter(s => !form.searchSurahMulai || s.nama_latin.toLowerCase().includes(form.searchSurahMulai.toLowerCase()) || String(s.nomor).includes(form.searchSurahMulai))
                          .map(s => (
                            <button key={s.nomor} onClick={() => { form.setSurahMulai(String(s.nomor)); form.setAyatMulaiMurojaah('1') }}
                              className="w-full text-left px-3 py-2 hover:bg-purple-50 border-b last:border-0 text-sm">
                              <span className="font-medium">{s.nama_latin}</span>
                              <span className="text-gray-400 text-xs ml-2">{s.nomor}</span>
                            </button>
                          ))}
                      </div>
                    )}
                    {form.surahMulai && (
                      <div className="flex items-center justify-between px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl mb-1">
                        <span className="text-sm font-semibold text-purple-700">
                          {surahList.find(s => s.nomor === parseInt(form.surahMulai))?.nama_latin}
                        </span>
                        <button onClick={() => { form.setSurahMulai(''); form.setSearchSurahMulai('') }} className="text-gray-400 text-lg">×</button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Ayat Mulai</label>
                    <input type="number" value={form.ayatMulaiMurojaah} onChange={e => form.setAyatMulaiMurojaah(e.target.value)} placeholder="1" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Surah Selesai</label>
                    <input type="text" value={form.searchSurahSelesai} onChange={e => form.setSearchSurahSelesai(e.target.value)}
                      placeholder="🔍 Cari surah selesai..." className={inputClass + ' mb-1'} />
                    {!form.surahSelesai && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                        {surahList
                          .filter(s => !form.searchSurahSelesai || s.nama_latin.toLowerCase().includes(form.searchSurahSelesai.toLowerCase()) || String(s.nomor).includes(form.searchSurahSelesai))
                          .map(s => (
                            <button key={s.nomor} onClick={() => form.handleSurahSelesaiChange(String(s.nomor))}
                              className="w-full text-left px-3 py-2 hover:bg-purple-50 border-b last:border-0 text-sm">
                              <span className="font-medium">{s.nama_latin}</span>
                              <span className="text-gray-400 text-xs ml-2">{s.nomor}</span>
                            </button>
                          ))}
                      </div>
                    )}
                    {form.surahSelesai && (
                      <div className="flex items-center justify-between px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl">
                        <span className="text-sm font-semibold text-purple-700">
                          {surahList.find(s => s.nomor === parseInt(form.surahSelesai))?.nama_latin}
                        </span>
                        <button onClick={() => { form.setSurahSelesai(''); form.setSearchSurahSelesai('') }} className="text-gray-400 text-lg">×</button>
                      </div>
                    )}
                  </div>
                  {form.surahSelesai && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Ayat Selesai</label>
                      <input type="number" value={form.ayatSelesaiMurojaah} onChange={e => form.setAyatSelesaiMurojaah(e.target.value)} className={inputClass} />
                    </div>
                  )}
                </div>
                {form.surahMulai && form.surahSelesai && (
                  <div className="mt-2 p-2 bg-white rounded-lg text-xs text-purple-600">
                    {surahList.find(s => s.nomor === parseInt(form.surahMulai))?.nama_latin} → {surahList.find(s => s.nomor === parseInt(form.surahSelesai))?.nama_latin}
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status Hafalan</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => form.setStatus('lancar')}
                  className={`p-4 rounded-xl border-2 transition ${form.status === 'lancar' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <div className="text-sm font-bold text-gray-800">Lancar</div>
                  <div className="text-xs text-gray-400">Hafalan baik</div>
                </button>
                <button onClick={() => form.setStatus('rosib')}
                  className={`p-4 rounded-xl border-2 transition ${form.status === 'rosib' ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                  <div className="text-sm font-bold text-gray-800">Rosib</div>
                  <div className="text-xs text-gray-400">Perlu diulang</div>
                </button>
              </div>
            </div>
          </>
        )}

        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Catatan (Opsional)</label>
          <textarea value={form.catatan} onChange={e => form.setCatatan(e.target.value)}
            placeholder={form.statusKehadiran === 'hadir_tidak_setor' ? 'Alasan tidak setor (opsional)...' : form.statusKehadiran !== 'hadir' ? 'Keterangan tambahan...' : 'Catatan untuk wali santri...'}
            rows={2} className={inputClass} />
        </div>

        {errorMsg && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">{errorMsg}</div>}

        <button onClick={form.handleInputSetoran} disabled={form.loading || !form.selectedSantri}
          className="w-full text-white py-4 rounded-xl font-bold transition disabled:opacity-50 text-base shadow-lg"
          style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
          {form.loading ? 'Menyimpan...' : form.statusKehadiran === 'hadir_tidak_setor' ? 'Simpan Status' : form.statusKehadiran !== 'hadir' ? 'Simpan Ketidakhadiran' : 'Simpan Setoran'}
        </button>
      </div>
    </div>
  )
}
