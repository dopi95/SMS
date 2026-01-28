'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Bluelight Academy SMS
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to Bluelight Academy
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              School Management System
            </p>
            <Link
              href="/login"
              className="bg-primary-600 text-white px-6 py-3 rounded-md text-lg hover:bg-primary-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}