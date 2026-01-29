import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import ErrorSuppressor from '@/components/ErrorSuppressor'
import { SettingsProvider } from '@/contexts/SettingsContext'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Bluelight Academy - School Management System',
  description: 'Complete school management system for Bluelight Academy',
  manifest: '/manifest.json',
  icons: {
    icon: '/log.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <Script src="/suppress-errors.js" strategy="beforeInteractive" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <SettingsProvider>
          <ErrorSuppressor>
            {children}
            <Toaster position="top-right" />
          </ErrorSuppressor>
        </SettingsProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      // Silent success
                    })
                    .catch(function(registrationError) {
                      // Silent error handling
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}