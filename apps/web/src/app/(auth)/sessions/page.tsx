'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { sessionApi } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { ArrowRight, Clock3, Play, Trophy, Users } from 'lucide-react';

interface SessionItem {
  id: string;
  roomCode: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  quiz: { id: string; title: string };
  _count: { playerSessions: number };
}

interface SessionsResponse {
  items: SessionItem[];
  total: number;
}

export default function SessionsPage() {
  const { data, isLoading } = useQuery<SessionsResponse>({
    queryKey: ['sessions'],
    queryFn: () => sessionApi.list().then((res) => res.data),
  });

  return (
    <div className="max-w-5xl space-y-6 animate-slide-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">ประวัติเซสชัน</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ดูห้องที่เคยเปิดและกลับไปยังเซสชันที่ยังดำเนินอยู่
          </p>
        </div>
        <div className="bg-white rounded-xl border border-nso-outline-variant/30 shadow-card px-4 py-2.5 text-right flex-shrink-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">ทั้งหมด</p>
          <p className="text-xl font-bold text-foreground">{data?.total ?? 0}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-nso-outline-variant/30 p-6 animate-pulse">
              <div className="h-5 w-56 rounded bg-nso-surface-container mb-3" />
              <div className="h-4 w-72 rounded bg-nso-surface-low" />
            </div>
          ))}
        </div>
      ) : data?.items?.length ? (
        <div className="space-y-3">
          {data.items.map((session) => {
            const canResume = session.status === 'PENDING' || session.status === 'ACTIVE';
            return (
              <div
                key={session.id}
                className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card p-4 md:p-5 hover:shadow-card-hover transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <StatusBadge status={session.status} />
                      <span className="font-mono text-xs text-nso-primary bg-nso-primary-fixed/30 px-2 py-0.5 rounded">
                        {session.roomCode}
                      </span>
                    </div>
                    <h2 className="font-semibold text-foreground text-sm md:text-base truncate">{session.quiz.title}</h2>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs md:text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {session._count.playerSessions} ผู้เล่น
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {timeAgo(session.createdAt)}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/sessions/${session.id}/host`}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 md:px-4 py-2 text-xs md:text-sm font-semibold text-white transition-colors flex-shrink-0 ${
                      canResume
                        ? 'bg-nso-primary hover:bg-nso-primary-container'
                        : 'bg-nso-secondary hover:bg-nso-secondary-container'
                    }`}
                  >
                    {canResume ? <Play className="h-3.5 w-3.5" /> : <Trophy className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{canResume ? 'เปิด Host' : 'ดูสรุป'}</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-nso-secondary/10 flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-7 w-7 text-nso-secondary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">ยังไม่มีเซสชัน</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            เริ่มควิซจากหน้า Dashboard หรือ ควิซของฉัน เพื่อเปิดห้องแรก
          </p>
          <Link
            href="/quizzes"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-nso-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-nso-primary-container transition-colors"
          >
            ดูควิซ
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: SessionItem['status'] }) {
  const styles: Record<SessionItem['status'], string> = {
    PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
    ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    COMPLETED: 'bg-nso-surface-container text-muted-foreground ring-nso-outline-variant/50',
    CANCELLED: 'bg-red-50 text-red-700 ring-red-200',
  };
  const labels: Record<SessionItem['status'], string> = {
    PENDING: 'รอเริ่ม',
    ACTIVE: 'กำลังดำเนินอยู่',
    COMPLETED: 'เสร็จสิ้น',
    CANCELLED: 'ยกเลิก',
  };

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
