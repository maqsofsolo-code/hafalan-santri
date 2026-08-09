'use client'
import type { GuruProfile } from '../types'

const PESAN_POPUP_WUSTHA = 'Santri ini belum lancar pada setoran hafalan lama sebelumnya. Silakan setorkan hafalan lama terlebih dahulu. Hafalan baru akan terbuka setelah mendapatkan status Najih.'

// Tiga popup halaman Guru (kunci hafalan baru Wustha, sukses setoran,
// konfirmasi absen) digabung satu file supaya tidak banyak file kecil --
// dipindah dari app/guru/page.tsx (Modularisasi Tahap 5A), JSX/className
// identik dengan sebelumnya, tidak ada perubahan tampilan.
export function GuruPopups(props: {
  showPopupKunciWustha: boolean
  onTutupPopupKunciWustha: () => void
  showPopupSukses: boolean
  popupSuksesMsg: string
  showPopupAbsen: boolean
  isBatalAbsen: boolean
  sesiAbsen: 'subuh' | 'pagi'
  guruProfile: GuruProfile | null
  onBatalAbsen: () => void
  onKonfirmasiAbsen: () => void
}) {
  const {
    showPopupKunciWustha, onTutupPopupKunciWustha,
    showPopupSukses, popupSuksesMsg,
    showPopupAbsen, isBatalAbsen, sesiAbsen, guruProfile, onBatalAbsen, onKonfirmasiAbsen,
  } = props

  return (
    <>
      {showPopupKunciWustha && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border-2 border-orange-200">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="font-bold text-gray-800 text-lg">Hafalan Baru Terkunci</h3>
              <p className="text-gray-600 text-sm mt-2 whitespace-pre-line">{PESAN_POPUP_WUSTHA}</p>
              <button
                onClick={onTutupPopupKunciWustha}
                className="mt-5 w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold text-sm transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

{/* POPUP SUKSES SETORAN */}
      {showPopupSukses && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl px-6 py-5 max-w-sm w-full pointer-events-auto border-2 border-green-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">✓</span>
              </div>
              <div>
                <div className="font-bold text-gray-800 text-base">Berhasil!</div>
                <div className="text-green-700 text-sm mt-0.5">{popupSuksesMsg}</div>
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-1.5 bg-green-500 rounded-full"
                style={{ animation: 'shrink 3s linear forwards' }} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>

      {/* POPUP KONFIRMASI ABSEN */}
      {showPopupAbsen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center mb-5">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: isBatalAbsen ? '#fee2e2' : 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                <span className="text-2xl text-white">{isBatalAbsen ? '↩' : '✓'}</span>
              </div>
              <h3 className="font-bold text-gray-800 text-lg">{isBatalAbsen ? 'Batalkan Absensi?' : 'Konfirmasi Absensi'}</h3>
              <p className="text-gray-500 text-sm mt-1">
                {isBatalAbsen ? `Batalkan absensi sesi ${sesiAbsen === 'subuh' ? 'Subuh' : 'Pagi'}?` : `Konfirmasi absen hadir sesi ${sesiAbsen === 'subuh' ? 'Subuh' : 'Pagi'}`}
              </p>
              <div className="mt-3 p-3 bg-gray-50 rounded-xl text-left text-sm space-y-1">
                <div>Nama: <span className="font-semibold">{guruProfile?.nama}</span></div>
                <div>Sesi: <span className="font-semibold">{sesiAbsen === 'subuh' ? 'Subuh (04.00 - 05.30)' : 'Pagi (08.00 - 09.45)'}</span></div>
                <div>Tanggal: <span className="font-semibold">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={onBatalAbsen} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm">Batal</button>
              <button onClick={onKonfirmasiAbsen} className="flex-1 text-white py-3 rounded-xl font-semibold text-sm"
                style={{ background: isBatalAbsen ? '#dc2626' : 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                {isBatalAbsen ? 'Ya, Batalkan' : 'Ya, Absen Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
