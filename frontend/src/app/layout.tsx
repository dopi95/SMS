import './globals.css'
import { Toaster } from 'react-hot-toast'
import ErrorSuppressor from '@/components/ErrorSuppressor'
import LoadingScreen from '@/components/LoadingScreen'
import { SettingsProvider } from '@/contexts/SettingsContext'

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
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <SettingsProvider>
          <ErrorSuppressor>
            <LoadingScreen />
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
                      console.log('SW registered: ', registration);
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