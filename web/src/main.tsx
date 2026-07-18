import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App';

// Leave VITE_SENTRY_DSN unset to disable (SDK becomes a safe no-op).
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 1.0,
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const rawBase = import.meta.env.VITE_BASE_PATH as string | undefined;
const basename = rawBase ? rawBase.replace(/\/$/, '') : '';

// Plain inline styles (not Tailwind classes) — this must render even if
// something about the app's own CSS failed to load.
function ErrorFallback() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 24,
        textAlign: 'center',
        fontFamily: 'Roboto, -apple-system, sans-serif',
      }}
    >
      <h1 style={{ color: '#8B1A1A', fontSize: 20, fontWeight: 700, margin: 0 }}>
        Something went wrong
      </h1>
      <p style={{ color: '#6b7280', marginTop: 8, marginBottom: 20 }}>
        Please reload the app. If this keeps happening, let us know.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: '#8B1A1A',
          color: '#fff',
          border: 'none',
          borderRadius: 12,
          padding: '12px 24px',
          fontWeight: 600,
          fontSize: 15,
        }}
      >
        Reload
      </button>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <BrowserRouter basename={basename}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
