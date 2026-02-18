'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          fontFamily: 'DM Sans, system-ui, sans-serif',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '2rem',
            maxWidth: '480px',
          }}
        >
          {/* Logo / icône */}
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: '#1E3A5F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#C49A1A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#1E3A5F',
              marginBottom: '0.75rem',
            }}
          >
            Une erreur critique est survenue
          </h1>

          <p
            style={{
              fontSize: '0.9375rem',
              color: '#6b7280',
              marginBottom: '0.5rem',
              lineHeight: 1.6,
            }}
          >
            L&apos;application a rencontré une erreur inattendue.
          </p>

          {error.digest && (
            <p
              style={{
                fontSize: '0.75rem',
                color: '#9ca3af',
                fontFamily: 'monospace',
                marginBottom: '1.5rem',
              }}
            >
              Référence : {error.digest}
            </p>
          )}

          <button
            onClick={reset}
            style={{
              backgroundColor: '#1E3A5F',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.625rem 1.5rem',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
