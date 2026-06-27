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
  quiz: {
    id: string;
    title: string;
  };
  _count: {
    playerSessions: number;
  };
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
    <div className="max-w-5xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Session History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review live rooms you have started and reopen sessions that are still in progress.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Total sessions</p>
          <p className="mt-1 text-2xl font-semibold">{data?.total ?? 0}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="glass-card rounded-2xl p-6 animate-pulse">
              <div className="h-5 w-56 rounded bg-white/10" />
              <div className="mt-3 h-4 w-72 rounded bg-white/5" />
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
                className="glass-card rounded-2xl p-5 md:flex md:items-center md:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="truncate font-semibold">{session.quiz.title}</h2>
                    <StatusBadge status={session.status} />
                    <span className="font-mono text-sm text-violet-300">{session.roomCode}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {session._count.playerSessions} players
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-4 w-4" />
                      Created {timeAgo(session.createdAt)}
                    </span>
                    {session.startedAt && (
                      <span>Started {timeAgo(session.startedAt)}</span>
                    )}
                    {session.endedAt && <span>Ended {timeAgo(session.endedAt)}</span>}
                  </div>
                </div>

                <div className="mt-4 flex gap-3 md:mt-0 md:pl-6">
                  <Link
                    href={`/sessions/${session.id}/host`}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    {canResume ? <Play className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
                    {canResume ? 'Open host view' : 'View summary'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="font-display text-2xl font-bold">No sessions yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start a quiz from the dashboard or quizzes page to create your first live room.
          </p>
          <Link
            href="/quizzes"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-white"
          >
            Browse quizzes
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: SessionItem['status'] }) {
  const styles: Record<SessionItem['status'], string> = {
    PENDING: 'bg-amber-500/15 text-amber-300 ring-amber-400/30',
    ACTIVE: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
    COMPLETED: 'bg-slate-500/15 text-slate-200 ring-slate-400/30',
    CANCELLED: 'bg-rose-500/15 text-rose-300 ring-rose-400/30',
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles[status]}`}>
      {status.toLowerCase()}
    </span>
  );
}
