import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { playDialClick } from '../utils/audio';

export function ConfirmationModal({ isOpen, title, message, confirmText = 'Confirm', confirmVariant = 'danger', onConfirm, onCancel, isSubmitting = false }) {
  if (!isOpen) return null;

  const handleCancel = () => {
    playDialClick();
    onCancel();
  };

  const handleConfirm = () => {
    playDialClick();
    onConfirm();
  };

  const confirmBtnStyles =
    confirmVariant === 'danger'
      ? 'bg-deadair-crimson hover:bg-red-600 text-white'
      : confirmVariant === 'warning'
      ? 'bg-deadair-amber hover:bg-amber-600 text-black font-bold'
      : 'bg-deadair-green hover:bg-emerald-600 text-black font-bold';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-deadair-900 border border-deadair-700 rounded-xl shadow-2xl overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-full bg-deadair-amber/10 text-deadair-amber border border-deadair-amber/30 flex-shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-tech text-base sm:text-lg font-bold text-zinc-100">{title}</h3>
              <p className="text-xs sm:text-sm text-zinc-400 font-mono leading-relaxed">{message}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-deadair-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg bg-deadair-850 hover:bg-deadair-800 text-zinc-300 text-xs font-mono transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirm}
              className={`px-4 py-2 rounded-lg text-xs font-mono transition shadow-lg flex items-center gap-2 ${confirmBtnStyles}`}
            >
              {isSubmitting ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
