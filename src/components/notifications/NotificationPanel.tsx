import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import {
  Bell,
  X,
  Package,
  Receipt,
  ClipboardList,
  AlertTriangle,
  Clock,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import { useNotificationStore } from '@/stores/notificationStore';
import { formatDate } from '@/lib/format';

const TYPE_ICONS: Record<string, typeof Bell> = {
  LOW_STOCK: Package,
  PENDING_PAYMENT: Receipt,
  JOB_READY: ClipboardList,
  WAITING_PARTS: AlertTriangle,
  JOB_OVERDUE: Clock,
};

const PRIORITY_STYLES: Record<string, string> = {
  high: 'border-l-brand-error bg-brand-error-bg/40',
  medium: 'border-l-brand-warning bg-brand-warning-bg/30',
  low: 'border-l-brand-mid bg-brand-light',
};

export function NotificationPanel() {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const { items, unreadCount, isOpen, isLoading, error } = useNotificationStore(
    useShallow((s) => ({
      items: s.items,
      unreadCount: s.unreadCount,
      isOpen: s.isOpen,
      isLoading: s.isLoading,
      error: s.error,
    }))
  );
  const setOpen = useNotificationStore((s) => s.setOpen);
  const fetch = useNotificationStore((s) => s.fetch);
  const dismiss = useNotificationStore((s) => s.dismiss);
  const dismissAll = useNotificationStore((s) => s.dismissAll);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const bell = document.getElementById('notification-bell');
        if (bell?.contains(e.target as Node)) return;
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isOpen, setOpen]);

  const handleOpen = async () => {
    const next = !isOpen;
    setOpen(next);
    if (next) await fetch();
  };

  const handleClick = (link: string, id: string, type: string) => {
    setOpen(false);
    if (type === 'LOW_STOCK' && id.startsWith('low-stock-')) {
      navigate(`/stock-alerts?focus=${id.replace('low-stock-', '')}`);
      return;
    }
    navigate(link);
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      await dismissAll();
    } finally {
      setMarkingAllRead(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        id="notification-bell"
        onClick={handleOpen}
        className="btn-ghost relative rounded-[10px] p-2.5"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-terracotta px-1 text-[10px] font-bold text-brand-parchment">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[360px] max-h-[min(480px,70vh)] overflow-hidden rounded-[14px] border border-brand-mid/50 bg-brand-white shadow-card-hover animate-slide-up flex flex-col">
          <div className="flex items-center justify-between border-b border-brand-mid/30 px-4 py-3 shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-brand-charcoal">Notifications</h3>
              <p className="text-xs text-brand-mid">
                {unreadCount === 0 ? 'All caught up' : `${unreadCount} alert${unreadCount > 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex gap-1">
              {items.length > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAllRead || isLoading}
                  className="btn-ghost p-1.5 text-xs disabled:opacity-50"
                  title="Mark all as read"
                  aria-label="Mark all as read"
                >
                  {markingAllRead ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                </button>
              )}
              <button onClick={() => setOpen(false)} className="btn-ghost p-1.5" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {isLoading && items.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-brand-mid">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : error ? (
              <div className="py-10 text-center px-4">
                <AlertTriangle className="h-8 w-8 mx-auto text-brand-error mb-2" />
                <p className="text-sm font-medium text-brand-error">Could not load alerts</p>
                <p className="text-xs text-brand-mid mt-1">{error}</p>
                <button onClick={() => fetch()} className="btn-secondary mt-3 text-xs">
                  Retry
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center px-4">
                <Bell className="h-8 w-8 mx-auto text-brand-mid/50 mb-2" />
                <p className="text-sm text-brand-charcoal font-medium">No notifications</p>
                <p className="text-xs text-brand-mid mt-1">Stock, payments & jobs will appear here</p>
              </div>
            ) : (
              <ul className="divide-y divide-brand-mid/20">
                {items.map((n) => {
                  const Icon = TYPE_ICONS[n.type] ?? Bell;
                  return (
                    <li
                      key={n.id}
                      className={`border-l-4 ${PRIORITY_STYLES[n.priority] ?? PRIORITY_STYLES.medium}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleClick(n.link, n.id, n.type)}
                        className="w-full text-left px-4 py-3 hover:bg-brand-light/80 transition-colors"
                      >
                        <div className="flex gap-3">
                          <div className="mt-0.5 shrink-0 rounded-[8px] bg-brand-terracotta/10 p-2">
                            <Icon className="h-4 w-4 text-brand-terracotta" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-brand-charcoal">{n.title}</p>
                            <p className="text-xs text-brand-mid mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-brand-mid/80 mt-1">{formatDate(n.createdAt)}</p>
                          </div>
                        </div>
                      </button>
                      <div className="px-4 pb-2 flex justify-end -mt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismiss(n.id);
                          }}
                          className="text-[11px] text-brand-mid hover:text-brand-terracotta"
                        >
                          Mark read
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
