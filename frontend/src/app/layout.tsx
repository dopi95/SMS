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
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#fff',
                  color: '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                  style: {
                    border: '1px solid #10b981',
                    background: '#f0fdf4',
                    color: '#065f46',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                  style: {
                    border: '1px solid #ef4444',
                    background: '#fef2f2',
                    color: '#991b1b',
                  },
                },
                loading: {
                  iconTheme: {
                    primary: '#3b82f6',
                    secondary: '#fff',
                  },
                  style: {
                    border: '1px solid #3b82f6',
                    background: '#eff6ff',
                    color: '#1e40af',
                  },
                },
              }}
            />
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
                      
                      // Update service worker when new version is available
                      registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                          newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              // New version available, reload page
                              window.location.reload();
                            }
                          });
                        }
                      });
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