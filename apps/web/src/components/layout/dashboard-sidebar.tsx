'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap,
  LayoutDashboard,
  BookOpen,
  Play,
  BarChart3,
  Settings,
  Users,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/quizzes', label: 'My Quizzes', icon: BookOpen },
  { href: '/sessions', label: 'Sessions', icon: Play },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/profile', label: 'Profile', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  return (
    <aside
      className={cn(
        'h-screen glass border-r border-white/10 flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="font-display font-bold text-lg gradient-text">QuizLive</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'ml-auto text-muted-foreground hover:text-foreground transition-colors',
            collapsed && 'mx-auto',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            className={cn('w-4 h-4 transition-transform duration-300', collapsed && 'rotate-180')}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                active
                  ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin"
            title={collapsed ? 'Admin Panel' : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
              pathname.startsWith('/admin')
                ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
            )}
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Admin Panel</span>}
          </Link>
        )}
      </nav>

      {/* Bottom user badge (collapsed state shows nothing extra) */}
      {!collapsed && session?.user && (
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg glass">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white">
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{session.user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{session.user.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
