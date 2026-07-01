'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/admin', label: 'ภาพรวม', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'จัดการผู้ใช้', icon: Users },
  { href: '/admin/logs', label: 'บันทึกกิจกรรม', icon: ScrollText },
];

export function AdminNav() {
  const pathname = usePathname();
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

  return (
    <div className="flex gap-1 border-b border-nso-outline-variant/30 -mb-2">
      {tabs.map((tab) => {
        const fullHref = `${base}${tab.href}`;
        const active = tab.exact
          ? pathname === fullHref || pathname === tab.href
          : pathname.startsWith(fullHref) || pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              active
                ? 'border-destructive text-destructive'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-nso-outline-variant',
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
