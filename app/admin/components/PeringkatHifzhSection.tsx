'use client'
import { useEffect, useState } from 'react'

type SantriPeringkat = {
  santriId: string
  nama: string
  peringkat: number
  nilaiPeringkat: number
}

type KelasSummary = {
  kelasNum: number
  jenjang: 'ula' | 'wustha' | 'ulya'
  peringkat: SantriPeringkat[]
}

type PeriodeInfo = {
  tahun_ajaran: string
  semester: number
  label: string
}

type ApiResponse = {
  success: boolean
  periode: PeriodeInfo
  kelasList: KelasSummary[]
  error?: string
}

export function PeringkatHifzhSection() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periode, setPeriode] = useState<PeriodeInfo | null>(null)
  const [kelasList, setKelasList] = useState<KelasSummary[]>([])

  useEffect(() => {
    let isMounted = true

    async function loadPeringkatHifzh() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/admin/laporan/peringkat-hifzh', {
          headers: { 'Cache-Control': 'no-cache' },
        })
        const data: ApiResponse = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.error || `Gagal memuat data (HTTP ${res.status})`)
        }

        if (isMounted) {
          setPeriode(data.periode)
          setKelasList(data.kelasList || [])
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadPeringkatHifzh()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div>
      {/* Banner Header */}
      <div
        className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}
      >
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl flex items-center gap-2">
            <span>🏆</span> Peringkat Hifzh Banin
          </h2>
          <p className="text-blue-100 text-sm mt-1">
            {periode ? periode.label : 'Memuat data periode...'}
          </p>
        </div>
      </div>

      {/* State: Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm mb-5 flex items-start gap-2">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="font-semibold">Gagal Memuat Peringkat Hifzh</p>
            <p className="text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* State: Loading */}
      {loading && (
        <div className="bg-white rounded-2xl shadow p-12 text-center border border-gray-100 mb-5">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
          <p className="text-sm font-medium text-gray-500">Menghitung peringkat canonical hifzh seluruh kelas...</p>
        </div>
      )}

      {/* State: Grid 3 Kolom Desktop / 1 Kolom Mobile */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {kelasList.map(k => (
            <div
              key={k.kelasNum}
              className="bg-white rounded-2xl p-5 shadow border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                {/* Header Card */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">KELAS {k.kelasNum}</h3>
                    <p className="text-xs font-bold text-blue-600 tracking-wider uppercase">
                      {k.jenjang.toUpperCase()}
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold rounded-full">
                    Banin
                  </span>
                </div>

                {/* List Top 3 */}
                {k.peringkat && k.peringkat.length > 0 ? (
                  <div className="space-y-2">
                    {k.peringkat.map(p => {
                      const medal = p.peringkat === 1 ? '🥇' : p.peringkat === 2 ? '🥈' : '🥉'
                      // Format nilai desimal: 9.7 -> 9,7 di layer UI
                      const formattedNilai = typeof p.nilaiPeringkat === 'number'
                        ? p.nilaiPeringkat.toFixed(1).replace('.', ',')
                        : '-'

                      return (
                        <div
                          key={p.santriId}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="text-base flex-shrink-0">{medal}</span>
                            <span className="text-xs font-bold text-gray-400 flex-shrink-0 w-3">
                              {p.peringkat}
                            </span>
                            <span
                              className="text-sm font-semibold text-gray-800 truncate"
                              title={p.nama}
                            >
                              {p.nama}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-blue-700 font-mono flex-shrink-0 bg-blue-50 px-2 py-0.5 rounded-lg">
                            {formattedNilai}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-gray-400 text-xs italic">
                    Data peringkat belum tersedia
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
