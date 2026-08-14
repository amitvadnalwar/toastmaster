import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

// Poll for a new service worker while the app is open, and whenever it's
// brought back to the foreground — the browser's own update check is too
// infrequent to catch a fresh deploy on a typical open/close cycle.
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

// Mounted once at the app root (see App.tsx). registerType: 'prompt' in
// vite.config.ts means the new service worker installs but waits — it only
// takes over (and the page only reloads) once the user taps the banner
// below, so no one loses in-progress work to a silent background update.
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const check = () => registration.update().catch(() => {});
      const interval = setInterval(check, CHECK_INTERVAL_MS);
      const onVisible = () => {
        if (document.visibilityState === 'visible') check();
      };
      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('focus', check);
      // No cleanup needed — this runs once for a singleton mounted for the
      // whole app's lifetime (see App.tsx), never unmounted.
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[200] flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
      <div className="w-full max-w-sm bg-gray-900 text-white rounded-2xl shadow-xl px-4 py-3.5 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold">Update available</p>
          <p className="text-xs text-gray-300 mt-0.5">Refresh to get the latest version.</p>
        </div>
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex items-center gap-1.5 bg-brand text-white text-sm font-semibold rounded-xl px-3.5 py-2 shrink-0"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
    </div>
  );
}
