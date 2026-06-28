'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Play,
  BarChart3,
  Settings,
  ShieldCheck,
  ChevronLeft,
  Plus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/quizzes', label: 'ควิซของฉัน', icon: BookOpen },
  { href: '/sessions', label: 'เซสชัน', icon: Play },
  { href: '/analytics', label: 'วิเคราะห์', icon: BarChart3 },
  { href: '/profile', label: 'โปรไฟล์', icon: Settings },
];

interface Props {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function DashboardSidebar({ mobileOpen = false, onMobileClose }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  /* Close mobile drawer on route change */
  useEffect(() => {
    onMobileClose?.();
  }, [pathname]);

  /* Prevent body scroll when mobile drawer is open */
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const SidebarContent = (
    <aside
      className={cn(
        'h-full bg-white border-r border-nso-outline-variant/40 flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-nso-outline-variant/30">
        <div className="w-9 h-9 rounded-xl bg-nso-primary flex items-center justify-center flex-shrink-0">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-nso-primary text-base leading-tight">NSO Quiz</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Data Insights</span>
          </div>
        )}
        {/* Close button: mobile = X, desktop = chevron */}
        <button
          onClick={mobileOpen ? onMobileClose : () => setCollapsed(!collapsed)}
          className={cn(
            'p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0',
            collapsed && !mobileOpen ? 'mx-auto' : 'ml-auto',
          )}
          aria-label={mobileOpen ? 'ปิดเมนู' : collapsed ? 'ขยายแถบด้านข้าง' : 'ย่อแถบด้านข้าง'}
        >
          {mobileOpen ? (
            <X className="w-4 h-4" />
          ) : (
            <ChevronLeft
              className={cn('w-4 h-4 transition-transform duration-300', collapsed && 'rotate-180')}
            />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed && !mobileOpen ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium',
                active
                  ? 'bg-nso-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-nso-surface-low',
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {(!collapsed || mobileOpen) && <span>{item.label}</span>}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin"
            title={collapsed && !mobileOpen ? 'Admin Panel' : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium',
              pathname.startsWith('/admin')
                ? 'bg-destructive text-white'
                : 'text-muted-foreground hover:text-foreground hover:bg-nso-surface-low',
            )}
          >
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            {(!collapsed || mobileOpen) && <span>Admin Panel</span>}
          </Link>
        )}
      </nav>

      {/* Create button */}
      <div className={cn('p-3 border-t border-nso-outline-variant/30', collapsed && !mobileOpen && 'px-2')}>
        <Link
          href="/quizzes/new"
          title={collapsed && !mobileOpen ? 'สร้างควิซใหม่' : undefined}
          className={cn(
            'flex items-center justify-center gap-2 py-3 rounded-xl bg-nso-primary text-white text-sm font-semibold hover:bg-nso-primary-container transition-all active:scale-95 shadow-primary',
            collapsed && !mobileOpen ? 'w-full px-0' : 'px-4',
          )}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {(!collapsed || mobileOpen) && <span>สร้างควิซใหม่</span>}
        </Link>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <div className="hidden lg:flex h-screen flex-shrink-0">
        {SidebarContent}
      </div>

      {/* Mobile drawer with backdrop */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <div className="relative z-10 h-full flex-shrink-0">
            {SidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
