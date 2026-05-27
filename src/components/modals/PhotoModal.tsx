import { useEffect } from 'react';
import { X } from 'lucide-react';

export interface PhotoData {
  src: string;
  caption: string;
}

interface PhotoModalProps {
  photo: PhotoData | null;
  onClose: () => void;
}

export function PhotoModal({ photo, onClose }: PhotoModalProps) {
  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [photo, onClose]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-white">Foto de Auditoria</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <img src={photo.src} alt="Foto de auditoria do registo" className="w-full rounded-2xl" />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">{photo.caption}</p>
        </div>
      </div>
    </div>
  );
}
