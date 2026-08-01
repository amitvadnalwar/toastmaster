import { useAlertStore } from '@/store/alertStore';
import Button from './Button';

// Mounted once at the app root (see App.tsx) — reads from useAlertStore, so
// any component can trigger it via showAlert(message) without local state.
export default function AlertDialog() {
  const { open, title, message, close } = useAlertStore();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
        <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-5 whitespace-pre-line">{message}</p>
        <Button fullWidth onClick={close}>OK</Button>
      </div>
    </div>
  );
}
