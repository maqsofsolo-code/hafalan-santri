'use client'
import { useState } from 'react'
import { supabase } from './lib/supabase'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email atau password salah!')
      setLoading(false)
      return
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'guru') window.location.href = '/guru'
    else if (profile?.role === 'admin') window.location.href = '/admin'
    else if (profile?.role === 'kepsek') window.location.href = '/kepsek'
    else if (profile?.role === 'wali') window.location.href = '/wali'
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 50%, #1a3a5c 100%)' }}>

      {/* Card Login */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header Card */}
        <div className="px-8 py-8 text-center"
          style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-full p-2 shadow-lg">
              <Image src="/logo.png" alt="Logo Daarus Salaf" width={80} height={80} className="rounded-full" />
            </div>
          </div>
          <h1 className="text-white font-bold text-xl leading-tight">
            Pondok Pesantren
          </h1>
          <h2 className="text-white font-bold text-2xl">Daarus Salaf</h2>
          <p className="text-blue-200 text-sm mt-1">Sukoharjo</p>
          <div className="mt-3 border-t border-blue-400 pt-3">
            <p className="text-blue-100 text-sm">Sistem Informasi Santri</p>
          </div>
        </div>

        {/* Form Login */}
        <div className="px-8 py-8">
          <h3 className="text-gray-700 font-semibold text-lg mb-6 text-center">
            Silakan Login
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400">✉</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="Masukkan email"
                  className="w-full border border-gray-200 rounded-xl px-10 py-3 focus:outline-none focus:ring-2 focus:border-transparent text-base bg-gray-50"
                  style={{ focusRingColor: '#2563a8' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400">🔒</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="Masukkan password"
                  className="w-full border border-gray-200 rounded-xl px-10 py-3 focus:outline-none focus:ring-2 focus:border-transparent text-base bg-gray-50"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl text-center">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full text-white py-4 rounded-xl font-semibold transition disabled:opacity-50 text-base mt-2 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </div>

          <p className="text-center text-gray-400 text-xs mt-6">
            © 2025 Pondok Pesantren Daarus Salaf Sukoharjo
          </p>
        </div>
      </div>
    </div>
  )
}