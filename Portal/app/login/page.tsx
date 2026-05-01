'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const USERS = [
  { email: 'student@bluelight.com', password: 'student123', role: 'student' },
  { email: 'teacher@bluelight.com', password: 'teacher123', role: 'teacher' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const user = USERS.find(u => u.email === email && u.password === password)
    if (!user) { toast.error('Invalid credentials'); return }
    localStorage.setItem('portal_user', JSON.stringify(user))
    router.push(user.role === 'student' ? '/student' : '/teacher')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Bluelight Academy</h1>
          <p className="text-gray-500 text-sm mt-1">Student & Teacher Portal</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition">
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}
