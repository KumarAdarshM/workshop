import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-brand-charcoal/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        className={`relative w-full ${sizes[size]} rounded-[14px] border border-brand-mid/50 bg-brand-white shadow-card-hover animate-slide-up`}
        role="dialog"
        aria-modal
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between border-b border-brand-mid/30 px-6 py-4">
          <h2 id="modal-title" className="text-base font-semibold text-brand-charcoal">
            {title}
          </h2>
          <button onClick={onClose} className="btn-ghost rounded-[8px] p-2" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
