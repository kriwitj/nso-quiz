'use client';
import { signOut } from 'next-auth/react';
import { LogOut, Bell, Settings, Menu } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import Image from 'next/image';

interface Props {
  user: {
    name: string;
    email: string;
    image?: string;
    role: string;
  };
  onMenuClick?: () => void;
}

export function DashboardHeader({ user, onMenuClick }: Props) {
  return (
    <header className="bg-white border-b border-nso-outline-variant/40 px-4 md:px-6 py-3 flex items-center justify-between flex-shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-nso-surface-low transition-colors"
        aria-label="เปิดเมนู"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-1.5 md:gap-2">
        <button
          className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-nso-surface-low transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
        </button>

        <button
          className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-nso-surface-low transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="w-px h-5 bg-nso-outline-variant/50 mx-1" />

        <div className="flex items-center gap-2.5">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-foreground leading-tight">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize leading-tight">{user.role.toLowerCase()}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-nso-primary flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-nso-primary-fixed">
            {user.image ? (
              <Image src={user.image} alt={user.name} width={36} height={36} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-white text-xs font-bold">{getInitials(user.name)}</span>
            )}
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="ออกจากระบบ"
          aria-label="ออกจากระบบ"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
