import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AdminNav } from './admin-nav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') redirect('/dashboard');

  return (
    <div className="max-w-7xl space-y-6 animate-slide-up">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Admin Panel</h1>
        <p className="mt-1 text-sm text-muted-foreground">จัดการระบบ ผู้ใช้งาน และดูบันทึกกิจกรรม</p>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
