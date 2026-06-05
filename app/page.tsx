'use client'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tahun, setTahun] = useState(2026)

  useEffect(() => {
    setTahun(new Date().getFullYear())
  }, [])

  const handleLogin = async () => {
    if (!email || !password) { setError('Email dan password wajib diisi!'); return }
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email atau password salah!')
      setLoading(false)
      return
    }
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single()

    if (profile?.role === 'guru') window.location.href = '/guru'
    else if (profile?.role === 'admin') window.location.href = '/admin'
    else if (profile?.role === 'kepsek') window.location.href = '/kepsek'
    else if (profile?.role === 'wali') window.location.href = '/wali'
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f2744 0%, #1a3a5c 40%, #2563a8 100%)' }}>

      {/* Dekorasi lingkaran background */}
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-10 bg-white" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-10 bg-white" />
      <div className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full opacity-5 bg-white" />

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10">

        {/* Header */}
        <div className="px-8 py-8 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10 bg-white" />

          <div className="relative z-10">
            <div className="flex justify-center mb-4">
              <div className="bg-white bg-opacity-20 rounded-full p-3 shadow-lg">
                <Image
                  src="/logo.png"
                  alt="Logo Daarus Salaf"
                  width={80}
                  height={80}
                  className="object-contain drop-shadow-lg"
                />
              </div>
            </div>

            <h1 className="text-white font-bold text-xl leading-tight tracking-wide">
              PONDOK PESANTREN
            </h1>
            <h2 className="text-white font-bold text-2xl leading-tight tracking-wide">
              DAARUS SALAF
            </h2>
            <p className="text-blue-200 text-sm mt-1 tracking-widest uppercase">
              Sukoharjo — Jawa Tengah
            </p>

            <div className="mt-4 mx-4 bg-white bg-opacity-15 rounded-2xl px-4 py-2.5 border border-white border-opacity-20">
              <p className="text-white text-sm font-semibold tracking-wide">
                📖 Sistem Informasi Hafalan Santri
              </p>
            </div>
          </div>
        </div>

        {/* Form Login */}
        <div className="px-8 py-7">
          <h3 className="text-gray-700 font-bold text-lg mb-1 text-center">
            Selamat Datang
          </h3>
          <p className="text-gray-400 text-xs text-center mb-6">
            Masuk dengan akun yang telah diberikan
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Masukkan email"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm bg-gray-50 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="Masukkan password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm bg-gray-50 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg px-1">
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl text-center flex items-center justify-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full text-white py-3.5 rounded-xl font-bold transition disabled:opacity-50 text-sm shadow-lg active:opacity-90 mt-2"
              style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memproses...
                </span>
              ) : 'Masuk →'}
            </button>
          </div>

          {/* Info roles */}
          <div className="mt-5 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-600 font-semibold mb-1.5 text-center">Akses Tersedia:</p>
            <div className="grid grid-cols-4 gap-1 text-center">
              {[
                { icon: '👨‍💼', label: 'Admin' },
                { icon: '👨‍🏫', label: 'Guru' },
                { icon: '🏫', label: 'Kepsek' },
                { icon: '👨‍👩‍👦', label: 'Wali' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-lg py-1.5 border border-blue-100">
                  <div className="text-base">{item.icon}</div>
                  <div className="text-xs text-gray-500 font-medium">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-gray-300 text-xs mt-5">
            © {tahun} Pondok Pesantren Daarus Salaf Sukoharjo
          </p>
        </div>
      </div>
    </div>
  )
}