'use client';
import { signOut } from 'next-auth/react';
import { LogOut, Bell } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import Image from 'next/image';

interface Props {
  user: {
    name: string;
    email: string;
    image?: string;
    role: string;
  };
}

export function DashboardHeader({ user }: Props) {
  return (
    <header className="glass border-b border-white/10 px-6 py-4 flex items-center justify-between flex-shrink-0">
      <div />
      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <button
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
        </button>

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-semibold overflow-hidden flex-shrink-0">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name}
                width={32}
                height={32}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white text-xs font-bold">{getInitials(user.name)}</span>
            )}
          </div>
          <div className="text-sm hidden md:block">
            <p className="font-medium leading-tight">{user.name}</p>
            <p className="text-muted-foreground text-xs capitalize">{user.role.toLowerCase()}</p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
