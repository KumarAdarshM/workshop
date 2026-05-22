import { Search, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';

export function Header() {
  const { user, logout } = useAuthStore();
  const { globalSearch, setGlobalSearch } = useUiStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-brand-mid/40 bg-brand-white px-5">
      <div className="relative max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-mid" strokeWidth={1.75} />
        <input
          type="search"
          placeholder="Search customers, vehicles, jobs…"
          className="input pl-10 py-2 text-[13px] bg-brand-parchment/80"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && globalSearch) navigate(`/customers?search=${encodeURIComponent(globalSearch)}`);
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <NotificationPanel />

        <div className="flex items-center gap-2.5 rounded-[10px] border border-brand-mid/40 bg-brand-light px-2.5 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-brand-terracotta/15">
            <User className="h-3.5 w-3.5 text-brand-terracotta" strokeWidth={1.75} />
          </div>
          <div className="hidden sm:block pr-1">
            <p className="text-[13px] font-medium leading-tight text-brand-charcoal">{user?.name}</p>
            <p className="text-[10px] capitalize text-brand-mid">{user?.role?.toLowerCase()}</p>
          </div>
        </div>

        <button onClick={handleLogout} className="btn-ghost rounded-[10px] p-2.5" title="Sign out" aria-label="Sign out">
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}
