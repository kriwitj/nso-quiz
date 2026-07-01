'use client';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Users, BookOpen, Play, Zap, Clock, Shield } from 'lucide-react';

interface Metrics {
  totalUsers: number;
  totalQuizzes: number;
  totalSessions: number;
  activeSessions: number;
  recentUsers: Array<{ id: string; name: string; email: string; role: string; createdAt: string; avatar?: string }>;
  recentSessions: Array<{
    id: string; roomCode: string; status: string; createdAt: string;
    quiz: { title: string }; host: { name: string }; _count: { playerSessions: number };
  }>;
}

const ROLE_LABEL: Record<string, string> = { ADMIN: 'แอดมิน', HOST: 'โฮสต์', PLAYER: 'ผู้เล่น' };
const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'bg-destructive/10 text-destructive',
  HOST: 'bg-nso-primary/10 text-nso-primary',
  PLAYER: 'bg-muted text-muted-foreground',
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  COMPLETED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-red-50 text-red-600',
  ABORTED: 'bg-red-50 text-red-600',
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'กำลังเล่น', PENDING: 'รอเริ่ม', COMPLETED: 'เสร็จสิ้น',
  CANCELLED: 'ยกเลิก', ABORTED: 'หยุดก่อนกำหนด',
};

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery<Metrics>({
    queryKey: ['admin', 'metrics'],
    queryFn: () => adminApi.metrics().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const stats = [
    { label: 'ผู้ใช้ทั้งหมด', value: data?.totalUsers ?? 0, icon: Users, bg: 'bg-nso-primary/10', color: 'text-nso-primary' },
    { label: 'ควิซทั้งหมด', value: data?.totalQuizzes ?? 0, icon: BookOpen, bg: 'bg-purple-50', color: 'text-nso-secondary' },
    { label: 'เซสชันทั้งหมด', value: data?.totalSessions ?? 0, icon: Play, bg: 'bg-teal-50', color: 'text-nso-tertiary' },
    { label: 'กำลังเล่นอยู่', value: data?.activeSessions ?? 0, icon: Zap, bg: 'bg-amber-50', color: 'text-amber-600' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card p-5 h-28 animate-pulse bg-muted/30" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card p-5">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent users */}
        <div className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-5 h-5 text-nso-primary" />
            <h2 className="text-base font-bold text-foreground">ผู้ใช้ล่าสุด</h2>
          </div>
          <div className="space-y-3">
            {data?.recentUsers?.length ? data.recentUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-nso-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-nso-primary">
                  {u.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_COLOR[u.role] ?? 'bg-muted text-muted-foreground'}`}>
                  {ROLE_LABEL[u.role] ?? u.role}
                </span>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีข้อมูล</p>
            )}
          </div>
        </div>

        {/* Recent sessions */}
        <div className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Play className="w-5 h-5 text-nso-tertiary" />
            <h2 className="text-base font-bold text-foreground">เซสชันล่าสุด</h2>
          </div>
          <div className="space-y-3">
            {data?.recentSessions?.length ? data.recentSessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <Play className="w-4 h-4 text-nso-tertiary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.quiz.title}</p>
                  <p className="text-xs text-muted-foreground">
                    โดย {s.host.name} · <span className="font-mono">{s.roomCode}</span> · {s._count.playerSessions} คน
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLOR[s.status] ?? 'bg-muted text-muted-foreground'}`}>
                  {STATUS_LABEL[s.status] ?? s.status}
                </span>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีข้อมูล</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
