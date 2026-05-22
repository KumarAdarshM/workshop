import type { LucideIcon } from 'lucide-react';

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-[12px] border border-brand-mid/40 bg-brand-light p-4">
        <Icon className="h-7 w-7 text-brand-mid" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-medium text-brand-charcoal">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-brand-mid">{description}</p>}
    </div>
  );
}
